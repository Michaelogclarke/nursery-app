import { useState, useEffect, useCallback } from 'react'
import './rota.css'

const today = () => new Date().toISOString().slice(0, 10)

const SHIFTS = [
  { key: 'morning',   label: 'Morning',   hours: '8:00 – 13:00' },
  { key: 'afternoon', label: 'Afternoon', hours: '13:00 – 18:00' },
  { key: 'fullday',   label: 'Full Day',  hours: '8:00 – 18:00'  },
]

// NI staff-to-child ratios: 1 staff per N children
const NI_RATIO = { under_2s: 3, two_to_three: 4, three_plus: 8 }

const AGE_GROUP_LABEL = {
  under_2s:     'Under 2s',
  two_to_three: '2–3 years',
  three_plus:   '3+ years',
}

function requiredStaff(room) {
  if (!room.age_group || !NI_RATIO[room.age_group] || room.children_in === 0) return 0
  return Math.ceil(room.children_in / NI_RATIO[room.age_group])
}

// Effective staff for a room in a given shift period (morning includes fullday, etc.)
function effectiveCount(entries, roomId, shiftKey) {
  return entries.filter(e => {
    if (e.room_id !== roomId) return false
    if (shiftKey === 'morning')   return e.shift === 'morning'   || e.shift === 'fullday'
    if (shiftKey === 'afternoon') return e.shift === 'afternoon'  || e.shift === 'fullday'
    return e.shift === 'fullday'
  }).length
}

function ratioStatus(room, entries, shiftKey) {
  const required = requiredStaff(room)
  if (required === 0) return 'ok'
  const staffCount = effectiveCount(entries, room.id, shiftKey)
  return staffCount >= required ? 'ok' : 'insufficient'
}

// ── Assign cell ───────────────────────────────────────────────────────────────

function AssignCell({ roomId, shift, entries, date, isToday, onAssign, onUnassign }) {
  const [open, setOpen]             = useState(false)
  const [available, setAvailable]   = useState([])
  const [loadingStaff, setLoading]  = useState(false)

  const cellEntries = entries.filter(e => e.room_id === roomId && e.shift === shift)

  const openAssign = async () => {
    setLoading(true)
    setOpen(true)
    const staff = await window.electronAPI.rota.getAvailableStaff(date, shift)
    setAvailable(staff)
    setLoading(false)
  }

  const handleSelect = async (e) => {
    const staffId = Number(e.target.value)
    if (!staffId) return
    await onAssign(staffId, roomId, shift)
    setOpen(false)
  }

  return (
    <div className="rota-cell">
      {cellEntries.map(entry => (
        <div key={entry.id} className="rota-assignment">
          <span>{entry.first_name} {entry.last_name}</span>
          {isToday && (
            <button className="btn-unassign" onClick={() => onUnassign(entry.id)} title="Remove">
              ×
            </button>
          )}
        </div>
      ))}

      {isToday && !open && (
        <button className="btn-assign" onClick={openAssign}>+ Assign</button>
      )}

      {isToday && open && (
        <div className="assign-dropdown">
          {loadingStaff ? (
            <span className="assign-loading">Loading…</span>
          ) : (
            <select autoFocus onChange={handleSelect} onBlur={() => setOpen(false)} defaultValue="">
              <option value="" disabled>Select staff…</option>
              {available.length === 0
                ? <option disabled>No staff available</option>
                : available.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.last_name}, {s.first_name}{s.job_title ? ` — ${s.job_title}` : ''}
                    </option>
                  ))
              }
            </select>
          )}
          <button className="btn-cancel-assign" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Rota() {
  const [date, setDate]       = useState(today())
  const [rooms, setRooms]     = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const isToday = date === today()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    window.electronAPI.rota
      .getByDate(date)
      .then(({ rooms, entries }) => {
        setRooms(rooms)
        setEntries(entries)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [date])

  useEffect(() => { load() }, [load])

  const handleAssign = async (staffId, roomId, shift) => {
    await window.electronAPI.rota.assign(staffId, roomId, date, shift)
    load()
  }

  const handleUnassign = async (entryId) => {
    await window.electronAPI.rota.unassign(entryId)
    load()
  }

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h2 className="page-title">Rota</h2>
        <div className="date-picker-wrap">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="date-input"
          />
          {!isToday && (
            <button className="btn-secondary" onClick={() => setDate(today())}>Today</button>
          )}
        </div>
      </div>

      {!isToday && (
        <div className="past-date-banner">
          Viewing rota for {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })} — read only
        </div>
      )}

      {error   && <p className="state-msg state-msg--error">Error: {error}</p>}
      {loading && <p className="state-msg">Loading…</p>}

      {!loading && !error && (
        <div className="rota-scroll">
          <table className="rota-table">
            <thead>
              <tr>
                <th className="rota-th-shift"></th>
                {rooms.map(room => {
                  const required = requiredStaff(room)
                  const hasRatioIssue = SHIFTS.some(
                    s => ratioStatus(room, entries, s.key) === 'insufficient'
                  )
                  return (
                    <th key={room.id} className="rota-th-room">
                      <div className="room-header-name">{room.name}</div>
                      {room.age_group && (
                        <div className="room-header-age">{AGE_GROUP_LABEL[room.age_group]}</div>
                      )}
                      {isToday && room.children_in > 0 && (
                        <div className={`room-header-ratio ${hasRatioIssue ? 'ratio--insufficient' : 'ratio--ok'}`}>
                          {room.children_in} child{room.children_in !== 1 ? 'ren' : ''}
                          {required > 0 && ` · needs ${required} staff`}
                          {hasRatioIssue && ' ⚠'}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map(shift => (
                <tr key={shift.key}>
                  <td className="rota-td-shift">
                    <div className="shift-label">{shift.label}</div>
                    <div className="shift-hours">{shift.hours}</div>
                  </td>
                  {rooms.map(room => {
                    const status = ratioStatus(room, entries, shift.key)
                    return (
                      <td
                        key={room.id}
                        className={`rota-td-cell ${isToday && status === 'insufficient' ? 'rota-td-cell--warning' : ''}`}
                      >
                        <AssignCell
                          roomId={room.id}
                          shift={shift.key}
                          entries={entries}
                          date={date}
                          isToday={isToday}
                          onAssign={handleAssign}
                          onUnassign={handleUnassign}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && isToday && (
        <p className="rota-ratio-note">
          Staff-to-child ratios per Northern Ireland childcare regulations:
          under 2s 1:3 · 2–3 years 1:4 · 3 years and over 1:8
        </p>
      )}
    </div>
  )
}
