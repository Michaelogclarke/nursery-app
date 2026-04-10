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
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  // Active shift depends on current hour: before 13:00 = morning, after = afternoon
  const activeShifts = now.getHours() < 13 ? ['morning', 'fullday'] : ['afternoon', 'fullday']

  const { rows } = await getPool().query(`
    SELECT r.id, r.name, r.max_capacity, r.age_group,
      (SELECT COUNT(*) FROM children c
       JOIN attendance a ON a.child_id = c.id
       WHERE c.room_id = r.id AND c.is_active = true
       AND a.date = $1 AND a.checked_in_at IS NOT NULL AND a.checked_out_at IS NULL
      )::int AS current_count,
      (SELECT COUNT(*) FROM rota_entries re
       WHERE re.room_id = r.id AND re.date = $1 AND re.shift = ANY($2)
      )::int AS staff_count
    FROM rooms r
    ORDER BY r.name
  `, [today, activeShifts])
  return rows
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

// ── Staff ─────────────────────────────────────────────────────────────────────

ipcMain.handle('staff:getAll', async () => {
  const { rows } = await getPool().query(`
    SELECT id, first_name, last_name, job_title,
           access_ni_status, access_ni_expiry_date
    FROM staff
    WHERE is_active = true
    ORDER BY last_name, first_name
  `)
  return rows
})

ipcMain.handle('staff:getById', async (_event, id) => {
  const p = getPool()
  const [member, availability] = await Promise.all([
    p.query('SELECT * FROM staff WHERE id = $1', [id]),
    p.query('SELECT day_of_week FROM staff_availability WHERE staff_id = $1 ORDER BY day_of_week', [id]),
  ])
  if (!member.rows[0]) throw new Error('Staff member not found')
  return {
    ...member.rows[0],
    availability: availability.rows.map(r => r.day_of_week),
  }
})

ipcMain.handle('staff:add', async (_event, data) => {
  const { first_name, last_name, dob, phone, email, job_title, qualifications,
          access_ni_number, access_ni_issue_date, access_ni_expiry_date,
          access_ni_status, availability } = data
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO staff
         (first_name, last_name, dob, phone, email, job_title, qualifications,
          access_ni_number, access_ni_issue_date, access_ni_expiry_date, access_ni_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [first_name, last_name, dob||null, phone||null, email||null,
       job_title||null, qualifications||null, access_ni_number||null,
       access_ni_issue_date||null, access_ni_expiry_date||null, access_ni_status]
    )
    const staffId = rows[0].id
    for (const day of availability) {
      await client.query(
        'INSERT INTO staff_availability (staff_id, day_of_week) VALUES ($1,$2)',
        [staffId, day]
      )
    }
    await client.query('COMMIT')
    return staffId
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ipcMain.handle('staff:update', async (_event, id, data) => {
  const { first_name, last_name, dob, phone, email, job_title, qualifications,
          access_ni_number, access_ni_issue_date, access_ni_expiry_date,
          access_ni_status, availability } = data
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE staff SET
         first_name=$1, last_name=$2, dob=$3, phone=$4, email=$5,
         job_title=$6, qualifications=$7, access_ni_number=$8,
         access_ni_issue_date=$9, access_ni_expiry_date=$10, access_ni_status=$11
       WHERE id=$12`,
      [first_name, last_name, dob||null, phone||null, email||null,
       job_title||null, qualifications||null, access_ni_number||null,
       access_ni_issue_date||null, access_ni_expiry_date||null,
       access_ni_status, id]
    )
    await client.query('DELETE FROM staff_availability WHERE staff_id=$1', [id])
    for (const day of availability) {
      await client.query(
        'INSERT INTO staff_availability (staff_id, day_of_week) VALUES ($1,$2)',
        [id, day]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ipcMain.handle('staff:deactivate', async (_event, id) => {
  await getPool().query('UPDATE staff SET is_active=false WHERE id=$1', [id])
})

// ── Rota ──────────────────────────────────────────────────────────────────────

ipcMain.handle('rota:getByDate', async (_event, date) => {
  const p = getPool()
  const [roomsResult, entriesResult] = await Promise.all([
    p.query(`
      SELECT r.id, r.name, r.max_capacity, r.age_group,
        (SELECT COUNT(*) FROM children c
         JOIN attendance a ON a.child_id = c.id
         WHERE c.room_id = r.id AND c.is_active = true
         AND a.date = $1 AND a.checked_in_at IS NOT NULL AND a.checked_out_at IS NULL
        )::int AS children_in
      FROM rooms r
      ORDER BY r.name
    `, [date]),
    p.query(`
      SELECT re.id, re.staff_id, re.room_id, re.shift,
             s.first_name, s.last_name
      FROM rota_entries re
      JOIN staff s ON s.id = re.staff_id
      WHERE re.date = $1
      ORDER BY re.shift, s.last_name
    `, [date]),
  ])
  return { rooms: roomsResult.rows, entries: entriesResult.rows }
})

ipcMain.handle('rota:getAvailableStaff', async (_event, date, shift) => {
  // Use midday to avoid timezone edge cases when computing day-of-week
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  const { rows } = await getPool().query(`
    SELECT s.id, s.first_name, s.last_name, s.job_title
    FROM staff s
    JOIN staff_availability sa ON sa.staff_id = s.id AND sa.day_of_week = $2
    WHERE s.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM rota_entries re
      WHERE re.staff_id = s.id AND re.date = $1 AND re.shift = $3
    )
    ORDER BY s.last_name, s.first_name
  `, [date, dayOfWeek, shift])
  return rows
})

ipcMain.handle('rota:assign', async (_event, staffId, roomId, date, shift) => {
  await getPool().query(`
    INSERT INTO rota_entries (staff_id, room_id, date, shift)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (staff_id, date, shift) DO UPDATE SET room_id = EXCLUDED.room_id
  `, [staffId, roomId, date, shift])
})

ipcMain.handle('rota:unassign', async (_event, entryId) => {
  await getPool().query('DELETE FROM rota_entries WHERE id=$1', [entryId])
})

// ── Auto room assignment ──────────────────────────────────────────────────────
//
// Returns the correct room_id for a child based on their date of birth.
// Babies:      0  – under 2 years
// Toddlers:    2  – under 3 years
// Pre-School:  3  – under 4 (or 4+ but missed After School cutoff)
// After School: turned 4 on/before July 1, from Sep 1 of that year

ipcMain.handle('children:getAutoRoom', async (_event, dob) => {
  const birth = new Date(dob)
  const today = new Date()

  const ageInMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth())

  const ageYears = ageInMonths / 12

  let roomName
  if (ageYears < 2) {
    roomName = 'Babies'
  } else if (ageYears < 3) {
    roomName = 'Toddlers'
  } else if (ageYears < 4) {
    roomName = 'Pre-School'
  } else {
    // Check After School eligibility: turned 4 on/before July 1, and Sep 1 has passed
    const yearTheyTurn4 = birth.getFullYear() + 4
    const cutoff  = new Date(yearTheyTurn4, 6, 1)   // July 1
    const sepDate = new Date(yearTheyTurn4, 8, 1)   // Sep 1
    const birthday4 = new Date(yearTheyTurn4, birth.getMonth(), birth.getDate())

    if (birthday4 <= cutoff && today >= sepDate) {
      roomName = 'After School'
    } else {
      roomName = 'Pre-School'
    }
  }

  const { rows } = await getPool().query(
    'SELECT id, name, max_capacity FROM rooms WHERE name = $1',
    [roomName]
  )
  return rows[0] || null
})

// ── Grace period eligible children ───────────────────────────────────────────
//
// Returns children who are within their 4-month grace period —
// i.e. they have already passed their normal age-out threshold for their
// current room but have not yet hit the hard move deadline (threshold + 4 months).
// These children CAN be moved early to free up space.

ipcMain.handle('children:getGraceEligible', async () => {
  const today = new Date()
  const { rows: children } = await getPool().query(`
    SELECT c.id, c.first_name, c.last_name, c.dob, c.room_id,
           r.name AS room_name
    FROM children c
    JOIN rooms r ON r.id = c.room_id
    WHERE c.is_active = true
  `)

  // Age-out thresholds in years per room
  const AGE_OUT = { Babies: 2, Toddlers: 3, 'Pre-School': 4 }

  const eligible = []
  for (const child of children) {
    const threshold = AGE_OUT[child.room_name]
    if (!threshold) continue

    const dob = new Date(child.dob)
    const ageOutDate = new Date(dob)
    ageOutDate.setFullYear(ageOutDate.getFullYear() + threshold)

    const hardMoveDate = new Date(ageOutDate)
    hardMoveDate.setMonth(hardMoveDate.getMonth() + 4)

    // In grace period: past age-out but before hard move deadline
    if (today >= ageOutDate && today < hardMoveDate) {
      // Find the next room
      const { rows: nextRoom } = await getPool().query(`
        SELECT id, name FROM rooms WHERE name = $1
      `, [
        child.room_name === 'Babies'     ? 'Toddlers'
        : child.room_name === 'Toddlers' ? 'Pre-School'
        : 'After School'
      ])
      eligible.push({
        ...child,
        hard_move_date: hardMoveDate.toISOString().slice(0, 10),
        next_room: nextRoom[0] || null,
      })
    }
  }
  return eligible
})

// ── Move child to next room ───────────────────────────────────────────────────

ipcMain.handle('children:moveToRoom', async (_event, childId, roomId) => {
  await getPool().query(
    'UPDATE children SET room_id = $1 WHERE id = $2',
    [roomId, childId]
  )
})

// ── Room capacity projection ──────────────────────────────────────────────────
//
// Checks whether placing a child into a room is safe across a 2-year horizon.
// A placement is unsafe if it would leave no space for a child who MUST move
// into that room (hard move) at any point within the next 2 years.
//
// Hard move dates per room:
//   Babies     → Toddlers:    child turns 2  (+ up to 4 months grace in Babies)
//   Toddlers   → Pre-School:  child turns 3  (+ up to 4 months grace in Toddlers)
//   Pre-School → After School: child turns 4 on/before July 1, moves Sep 1
//
// Arguments:
//   room_id   — destination room being filled
//   child_id  — (optional) ID of child being moved; excluded from current count
//               so we don't double-count them
//
// Returns:
//   { ok: true }
//   { ok: false, conflicts: [{ child_id, name, move_date, room_name }] }

ipcMain.handle('children:checkRoomCapacity', async (_event, room_id, child_id = null) => {
  const p = getPool()

  // Room config — capacity and which feeder room feeds into this one
  const ROOM_PROGRESSION = {
    Toddlers:     { feeder: 'Babies',     ageAtMove: 2, gracePeriodMonths: 4 },
    'Pre-School': { feeder: 'Toddlers',   ageAtMove: 3, gracePeriodMonths: 4 },
    'After School': { feeder: 'Pre-School', ageAtMove: null, gracePeriodMonths: 0 },
  }

  // Fetch the destination room
  const { rows: roomRows } = await p.query(
    'SELECT id, name, max_capacity FROM rooms WHERE id = $1',
    [room_id]
  )
  if (!roomRows.length) throw new Error('Room not found')
  const room = roomRows[0]

  const progression = ROOM_PROGRESSION[room.name]

  // Current occupancy in destination room (excluding the child being moved)
  const occupancyQuery = child_id
    ? `SELECT COUNT(*)::int AS count FROM children
       WHERE room_id = $1 AND is_active = true AND id != $2`
    : `SELECT COUNT(*)::int AS count FROM children
       WHERE room_id = $1 AND is_active = true`
  const occupancyParams = child_id ? [room_id, child_id] : [room_id]
  const { rows: occRows } = await p.query(occupancyQuery, occupancyParams)
  const currentOccupancy = occRows[0].count

  // After placing this child, occupancy becomes currentOccupancy + 1
  const occupancyAfterPlacement = currentOccupancy + 1

  // If already over capacity, fail immediately
  if (occupancyAfterPlacement > room.max_capacity) {
    return {
      ok: false,
      conflicts: [{
        child_id: null,
        name: null,
        move_date: null,
        room_name: room.name,
        reason: 'Room is already at capacity',
      }],
    }
  }

  // If this room has no feeder (e.g. Babies), no forward projection needed
  if (!progression) return { ok: true }

  const today = new Date()
  const horizon = new Date(today)
  horizon.setFullYear(horizon.getFullYear() + 2)

  const conflicts = []

  // ── After School special case ────────────────────────────────────────────────
  // Kids move from Pre-School on Sep 1 of the year they turn 4,
  // provided their birthday is on or before July 1 of that year.
  if (room.name === 'After School') {
    const { rows: feederKids } = await p.query(`
      SELECT c.id, c.first_name, c.last_name, c.dob
      FROM children c
      JOIN rooms r ON r.id = c.room_id
      WHERE r.name = 'Pre-School' AND c.is_active = true
    `)

    for (const kid of feederKids) {
      const dob = new Date(kid.dob)
      // The year they turn 4
      const yearTheyTurn4 = dob.getFullYear() + 4
      const birthday = new Date(yearTheyTurn4, dob.getMonth(), dob.getDate())
      const cutoff   = new Date(yearTheyTurn4, 6, 1)  // July 1
      const moveDate = new Date(yearTheyTurn4, 8, 1)  // Sep 1

      if (birthday > cutoff) continue           // misses the July 1 cutoff
      if (moveDate <= today || moveDate > horizon) continue  // outside window

      // At the point of this child's hard move, how many will be in After School?
      // Count children already in After School whose move-out date is after moveDate
      // (simplified: count current After School kids + all hard movers before moveDate)
      // For the projection we track running occupancy at each move date
      conflicts.push({ kid, moveDate })
    }
  } else {
    // ── Standard age-based hard moves ───────────────────────────────────────────
    const { rows: feederKids } = await p.query(`
      SELECT c.id, c.first_name, c.last_name, c.dob
      FROM children c
      JOIN rooms r ON r.id = c.room_id
      WHERE r.name = $1 AND c.is_active = true
    `, [progression.feeder])

    for (const kid of feederKids) {
      const dob = new Date(kid.dob)
      // Hard move date = birthday at ageAtMove + grace period
      const hardMoveDate = new Date(dob)
      hardMoveDate.setFullYear(hardMoveDate.getFullYear() + progression.ageAtMove)
      hardMoveDate.setMonth(hardMoveDate.getMonth() + progression.gracePeriodMonths)

      if (hardMoveDate <= today || hardMoveDate > horizon) continue

      conflicts.push({ kid, moveDate: hardMoveDate })
    }
  }

  // ── Project occupancy at each hard move date ─────────────────────────────────
  // Sort moves chronologically
  conflicts.sort((a, b) => a.moveDate - b.moveDate)

  // Also find children currently in THIS room who will age out before each move date
  // so we can subtract leavers. A child leaves this room when they hit their own
  // hard move date into the NEXT room.
  const NEXT_ROOM_AGE = { Toddlers: 3, 'Pre-School': 4, 'After School': null }
  const nextAgeOut = NEXT_ROOM_AGE[room.name]

  const { rows: currentKids } = await p.query(`
    SELECT c.id, c.dob FROM children c
    WHERE c.room_id = $1 AND c.is_active = true
    ${child_id ? 'AND c.id != $2' : ''}
  `, child_id ? [room_id, child_id] : [room_id])

  const flaggedConflicts = []

  for (const { kid, moveDate } of conflicts) {
    // Count leavers from this room before the move date
    let leaversBefore = 0
    if (nextAgeOut) {
      for (const existing of currentKids) {
        const dob = new Date(existing.dob)
        const leaveDate = new Date(dob)
        leaveDate.setFullYear(leaveDate.getFullYear() + nextAgeOut)
        leaveDate.setMonth(leaveDate.getMonth() + progression.gracePeriodMonths)
        if (leaveDate <= moveDate) leaversBefore++
      }
    }

    const projectedOccupancy = occupancyAfterPlacement - leaversBefore + 1 // +1 = the incoming hard mover
    if (projectedOccupancy > room.max_capacity) {
      flaggedConflicts.push({
        child_id: kid.id,
        name: `${kid.first_name} ${kid.last_name}`,
        move_date: moveDate.toISOString().slice(0, 10),
        room_name: room.name,
        reason: `Room will be full when ${kid.first_name} ${kid.last_name} must move in (${moveDate.toISOString().slice(0, 10)})`,
      })
    }
  }

  return flaggedConflicts.length
    ? { ok: false, conflicts: flaggedConflicts }
    : { ok: true }
})

// ── Room calendar occupancy ───────────────────────────────────────────────────
//
// Returns per-room occupancy for every weekday in [startDate, endDate].
// For each day, a child's room is derived from their DOB + age progression rules,
// NOT their current room_id — so future dates reflect expected transitions.
//
// Progression (hard deadline = age threshold + 4-month grace):
//   Babies:      birth → 2y 4m
//   Toddlers:    2y 4m → 3y 4m
//   Pre-School:  3y 4m → After School eligibility (or indefinitely if ineligible)
//   After School: turned 4 on/before Jul 1 → from Sep 1 of that year
//
// A child only counts on days matching their child_scheduled_days (1=Mon…5=Fri).
// Returns: [{ date, rooms: [{ id, name, max_capacity, count, spaces }] }]

ipcMain.handle('rooms:getCalendarOccupancy', async (_event, startDate, endDate) => {
  const p = getPool()

  const { rows: rooms } = await p.query(
    'SELECT id, name, max_capacity FROM rooms ORDER BY id'
  )
  const roomByName = Object.fromEntries(rooms.map(r => [r.name, r]))

  // All active children with DOB and scheduled days
  const { rows: children } = await p.query(`
    SELECT c.id, c.dob,
           array_agg(csd.day_of_week) AS scheduled_days
    FROM children c
    JOIN child_scheduled_days csd ON csd.child_id = c.id
    WHERE c.is_active = true
    GROUP BY c.id, c.dob
  `)

  // Derive which room a child is in on a given date purely from DOB.
  // All date arithmetic uses local noon to avoid DST/timezone boundary issues.
  function roomOnDate(dob, targetDate) {
    const birth = new Date(dob)

    // Hard move deadlines (age threshold + 4-month grace)
    const leaveBabies = new Date(birth)
    leaveBabies.setMonth(leaveBabies.getMonth() + 2 * 12 + 4)   // 2y 4m

    const leaveToddlers = new Date(birth)
    leaveToddlers.setMonth(leaveToddlers.getMonth() + 3 * 12 + 4) // 3y 4m

    // After School: birthday must be on/before Jul 1, move from Sep 1 that year
    const yearTurn4  = birth.getFullYear() + 4
    const cutoffJul1 = new Date(yearTurn4, 6, 1)
    const sepDate    = new Date(yearTurn4, 8, 1)
    const birthday4  = new Date(yearTurn4, birth.getMonth(), birth.getDate())
    const afterSchoolEligible = birthday4 <= cutoffJul1

    if (targetDate < leaveBabies) {
      return roomByName['Babies'] || null
    } else if (targetDate < leaveToddlers) {
      return roomByName['Toddlers'] || null
    } else if (afterSchoolEligible && targetDate >= sepDate) {
      return roomByName['After School'] || null
    } else {
      return roomByName['Pre-School'] || null
    }
  }

  // Parse start/end at noon local time to avoid UTC midnight date shifts
  const start = new Date(startDate + 'T12:00:00')
  const end   = new Date(endDate   + 'T12:00:00')
  const days  = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // getDay() on a noon-anchored date is reliable: 0=Sun … 6=Sat
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue  // nursery closed weekends

    const dateStr   = d.toISOString().slice(0, 10)
    const snapshot  = new Date(d)  // stable copy for roomOnDate

    const roomCounts = {}
    for (const r of rooms) roomCounts[r.id] = 0

    for (const child of children) {
      // child_scheduled_days: 1=Mon…5=Fri — matches JS getDay() for weekdays
      if (!child.scheduled_days.includes(dow)) continue
      const room = roomOnDate(child.dob, snapshot)
      if (room) roomCounts[room.id] = (roomCounts[room.id] || 0) + 1
    }

    days.push({
      date: dateStr,
      rooms: rooms.map(r => ({
        id:           r.id,
        name:         r.name,
        max_capacity: r.max_capacity,
        count:        roomCounts[r.id] || 0,
        spaces:       r.max_capacity - (roomCounts[r.id] || 0),
      })),
    })
  }

  return days
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
