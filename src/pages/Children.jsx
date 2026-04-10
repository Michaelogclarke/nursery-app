import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './children.css'

function formatAge(dob) {
  const birth = new Date(dob)
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (totalMonths < 12) return `${totalMonths}mo`
  const years = Math.floor(totalMonths / 12)
  return `${years}y`
}

export default function Children() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.electronAPI.children
      .getAll()
      .then(data => { setChildren(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const filtered = children.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Children</h2>
        <button className="btn-primary" onClick={() => navigate('/children/new')}>
          + Add child
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
          {search ? 'No children match your search.' : 'No children added yet.'}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="children-list">
          {filtered.map(child => (
            <li
              key={child.id}
              className="child-row"
              onClick={() => navigate(`/children/${child.id}`)}
            >
              <div className="child-row-name">
                {child.last_name}, {child.first_name}
              </div>
              <div className="child-row-meta">
                <span className="tag">{child.room_name || 'No room'}</span>
                <span className="age">{formatAge(child.dob)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
