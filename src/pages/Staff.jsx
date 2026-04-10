import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { accessNiWarning } from './staffUtils.js'
import './staff.css'

export default function Staff() {
  const navigate = useNavigate()
  const [staff, setStaff]   = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    window.electronAPI.staff
      .getAll()
      .then(data => { setStaff(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [])

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Staff</h2>
        <button className="btn-primary" onClick={() => navigate('/staff/new')}>
          + Add staff member
        </button>
      </div>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {loading && <p className="state-msg">Loading…</p>}
      {error   && <p className="state-msg state-msg--error">Error: {error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="state-msg">
          {search ? 'No staff match your search.' : 'No staff added yet.'}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="staff-list">
          {filtered.map(s => {
            const warning = accessNiWarning(s.access_ni_status, s.access_ni_expiry_date)
            return (
              <li
                key={s.id}
                className="staff-row"
                onClick={() => navigate(`/staff/${s.id}`)}
              >
                <div className="staff-row-left">
                  <div className="staff-row-name">
                    {s.last_name}, {s.first_name}
                  </div>
                  <div className="staff-row-title">{s.job_title || '—'}</div>
                </div>
                <div className="staff-row-right">
                  {warning && (
                    <span className={`ani-badge ani-badge--${warning}`}>
                      {warning === 'expired' ? 'Access NI Expired' : 'Access NI Expiring Soon'}
                    </span>
                  )}
                  <span className={`ni-status ni-status--${s.access_ni_status}`}>
                    {s.access_ni_status}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
