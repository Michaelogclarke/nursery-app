const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { Pool } = require('pg')

// ── Database ──────────────────────────────────────────────────────────────────

const configPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'db.config.json')
  : path.join(__dirname, '..', 'db.config.json')

let pool = null

function initDb() {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const { connectionString } = JSON.parse(raw)
    pool = new Pool({ connectionString })
    console.log('Database pool created. Config path:', configPath)
  } catch (err) {
    console.error('Failed to load db.config.json:', err.message)
  }
}

function getPool() {
  if (!pool) throw new Error('Database not connected. Check db.config.json.')
  return pool
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

ipcMain.handle('rooms:getAll', async () => {
  const { rows } = await getPool().query('SELECT id, name, max_capacity FROM rooms ORDER BY name')
  return rows
})

ipcMain.handle('rooms:getWithOccupancy', async () => {
  const { rows } = await getPool().query(`
    SELECT r.id, r.name, r.max_capacity,
           COUNT(a.id) AS current_count
    FROM rooms r
    LEFT JOIN children c ON c.room_id = r.id AND c.is_active = true
    LEFT JOIN attendance a
      ON a.child_id = c.id
      AND a.date = CURRENT_DATE
      AND a.checked_in_at IS NOT NULL
      AND a.checked_out_at IS NULL
    GROUP BY r.id, r.name, r.max_capacity
    ORDER BY r.name
  `)
  return rows.map(r => ({ ...r, current_count: Number(r.current_count) }))
})

// ── Children ──────────────────────────────────────────────────────────────────

ipcMain.handle('children:getAll', async () => {
  const { rows } = await getPool().query(`
    SELECT c.id, c.first_name, c.last_name, c.dob, c.is_active,
           r.name AS room_name
    FROM children c
    LEFT JOIN rooms r ON c.room_id = r.id
    WHERE c.is_active = true
    ORDER BY c.last_name, c.first_name
  `)
  return rows
})

ipcMain.handle('children:getById', async (_event, id) => {
  const p = getPool()
  const [child, contacts, pickups] = await Promise.all([
    p.query(
      `SELECT c.*, r.name AS room_name
       FROM children c
       LEFT JOIN rooms r ON c.room_id = r.id
       WHERE c.id = $1`,
      [id]
    ),
    p.query(
      'SELECT * FROM emergency_contacts WHERE child_id = $1 ORDER BY priority',
      [id]
    ),
    p.query(
      'SELECT * FROM authorised_pickups WHERE child_id = $1 ORDER BY id',
      [id]
    ),
  ])
  if (!child.rows[0]) throw new Error('Child not found')
  return {
    ...child.rows[0],
    emergency_contacts: contacts.rows,
    authorised_pickups: pickups.rows,
  }
})

ipcMain.handle('children:add', async (_event, data) => {
  const { first_name, last_name, dob, room_id, allergies, medical_notes,
          emergency_contacts, authorised_pickups } = data
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO children (first_name, last_name, dob, room_id, allergies, medical_notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [first_name, last_name, dob, room_id || null, allergies || null, medical_notes || null]
    )
    const childId = rows[0].id

    for (const c of emergency_contacts) {
      if (c.name.trim()) {
        await client.query(
          `INSERT INTO emergency_contacts (child_id, name, relationship, phone, priority)
           VALUES ($1,$2,$3,$4,$5)`,
          [childId, c.name, c.relationship, c.phone, c.priority]
        )
      }
    }
    for (const p of authorised_pickups) {
      if (p.name.trim()) {
        await client.query(
          'INSERT INTO authorised_pickups (child_id, name) VALUES ($1,$2)',
          [childId, p.name]
        )
      }
    }

    await client.query('COMMIT')
    return childId
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ipcMain.handle('children:update', async (_event, id, data) => {
  const { first_name, last_name, dob, room_id, allergies, medical_notes,
          emergency_contacts, authorised_pickups } = data
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE children
       SET first_name=$1, last_name=$2, dob=$3, room_id=$4, allergies=$5, medical_notes=$6
       WHERE id=$7`,
      [first_name, last_name, dob, room_id || null, allergies || null, medical_notes || null, id]
    )

    await client.query('DELETE FROM emergency_contacts WHERE child_id=$1', [id])
    await client.query('DELETE FROM authorised_pickups WHERE child_id=$1', [id])

    for (const c of emergency_contacts) {
      if (c.name.trim()) {
        await client.query(
          `INSERT INTO emergency_contacts (child_id, name, relationship, phone, priority)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, c.name, c.relationship, c.phone, c.priority]
        )
      }
    }
    for (const p of authorised_pickups) {
      if (p.name.trim()) {
        await client.query(
          'INSERT INTO authorised_pickups (child_id, name) VALUES ($1,$2)',
          [id, p.name]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ipcMain.handle('children:deactivate', async (_event, id) => {
  await getPool().query('UPDATE children SET is_active=false WHERE id=$1', [id])
})

// ── Attendance ────────────────────────────────────────────────────────────────

ipcMain.handle('attendance:getByDate', async (_event, date) => {
  const { rows } = await getPool().query(`
    SELECT c.id, c.first_name, c.last_name,
           r.name AS room_name,
           a.checked_in_at, a.checked_out_at
    FROM children c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN attendance a ON a.child_id = c.id AND a.date = $1
    WHERE c.is_active = true
    ORDER BY c.last_name, c.first_name
  `, [date])
  return rows
})

ipcMain.handle('attendance:checkIn', async (_event, childId, date) => {
  await getPool().query(`
    INSERT INTO attendance (child_id, date, checked_in_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (child_id, date) DO UPDATE SET checked_in_at = NOW()
  `, [childId, date])
})

ipcMain.handle('attendance:checkOut', async (_event, childId, date) => {
  await getPool().query(`
    UPDATE attendance SET checked_out_at = NOW()
    WHERE child_id = $1 AND date = $2
  `, [childId, date])
})

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  initDb()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
