import { useState, useEffect, useCallback, useRef } from 'react'
import './attendance.css'

const today = () => new Date().toISOString().slice(0, 10)

function formatTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function getStatus(row) {
  if (row.checked_out_at) return 'out'
  if (row.checked_in_at)  return 'in'
  return 'absent'
}

const STATUS_LABEL  = { absent: 'Not arrived', in: 'Checked in', out: 'Checked out' }
const STATUS_CLASS  = { absent: 'status--absent', in: 'status--in', out: 'status--out' }

export default function Attendance() {
  const [date, setDate]       = useState(today())
  const [register, setRegister] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(null) // child id currently being actioned
  const [search, setSearch]   = useState('')
  const searchRef             = useRef(null)

  const isToday = date === today()

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    window.electronAPI.attendance
      .getByDate(date)
      .then(rows => { setRegister(rows); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [date])

  useEffect(() => { load() }, [load])

  const handleCheckIn = async (childId) => {
    setBusy(childId)
    try {
      await window.electronAPI.attendance.checkIn(childId, date)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const handleCheckOut = async (childId) => {
    setBusy(childId)
    try {
      await window.electronAPI.attendance.checkOut(childId, date)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const filtered = search.trim()
    ? register.filter(row =>
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        `${row.last_name} ${row.first_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : register

  const counts = register.reduce(
    (acc, row) => {
      const s = getStatus(row)
      acc[s]++
      return acc
    },
    { absent: 0, in: 0, out: 0 }
  )

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Attendance Register</h2>
        <div className="date-picker-wrap">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="date-input"
          />
          {!isToday && (
            <button className="btn-secondary" onClick={() => setDate(today())}>
              Today
            </button>
          )}
        </div>
      </div>

      {!isToday && (
        <div className="past-date-banner">
          Viewing record for {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })} — read only
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!loading && !error && register.length > 0 && (
        <div className="attendance-summary">
          <div className="summary-pill summary-pill--total">
            <span className="summary-num">{register.length}</span>
            <span className="summary-label">Total</span>
          </div>
          <div className="summary-pill summary-pill--in">
            <span className="summary-num">{counts.in}</span>
            <span className="summary-label">In</span>
          </div>
          <div className="summary-pill summary-pill--out">
            <span className="summary-num">{counts.out}</span>
            <span className="summary-label">Out</span>
          </div>
          <div className="summary-pill summary-pill--absent">
            <span className="summary-num">{counts.absent}</span>
            <span className="summary-label">Not arrived</span>
          </div>
        </div>
      )}

      {!loading && !error && register.length > 0 && (
        <div className="search-bar">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by name… (Ctrl+K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading && <p className="state-msg">Loading…</p>}

      {!loading && !error && register.length === 0 && (
        <p className="state-msg">No active children found.</p>
      )}

      {!loading && !error && register.length > 0 && filtered.length === 0 && (
        <p className="state-msg">No children match your search.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="register-table-wrap">
          <table className="register-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Room</th>
                <th>Status</th>
                <th>Checked in</th>
                <th>Checked out</th>
                {isToday && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const status = getStatus(row)
                const isBusy = busy === row.id
                return (
                  <tr key={row.id} className={`register-row register-row--${status}`}>
                    <td className="cell-name">
                      {row.last_name}, {row.first_name}
                    </td>
                    <td className="cell-room">{row.room_name || '—'}</td>
                    <td className="cell-status">
                      <span className={`status-badge ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="cell-time">{formatTime(row.checked_in_at)  || '—'}</td>
                    <td className="cell-time">{formatTime(row.checked_out_at) || '—'}</td>
                    {isToday && (
                      <td className="cell-action">
                        {status === 'absent' && (
                          <button
                            className="btn-checkin"
                            disabled={isBusy}
                            onClick={() => handleCheckIn(row.id)}
                          >
                            {isBusy ? '…' : 'Check In'}
                          </button>
                        )}
                        {status === 'in' && (
                          <button
                            className="btn-checkout"
                            disabled={isBusy}
                            onClick={() => handleCheckOut(row.id)}
                          >
                            {isBusy ? '…' : 'Check Out'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
