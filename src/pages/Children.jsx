import { useState, useEffect, useCallback } from 'react'
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
  const [graceEligible, setGraceEligible] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [moving, setMoving] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      window.electronAPI.children.getAll(),
      window.electronAPI.children.getGraceEligible(),
    ])
      .then(([all, grace]) => {
        setChildren(all)
        setGraceEligible(grace)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleMove = async (child) => {
    if (!child.next_room) return
    if (!confirm(`Move ${child.first_name} ${child.last_name} to ${child.next_room.name}?`)) return
    setMoving(child.id)
    try {
      await window.electronAPI.children.moveToRoom(child.id, child.next_room.id)
      load()
    } catch (err) {
      alert(`Move failed: ${err.message}`)
    } finally {
      setMoving(null)
    }
  }

  const graceIds = new Set(graceEligible.map(c => c.id))
  const graceMap  = Object.fromEntries(graceEligible.map(c => [c.id, c]))

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
          {filtered.map(child => {
            const inGrace = graceIds.has(child.id)
            const grace   = graceMap[child.id]
            return (
              <li
                key={child.id}
                className={`child-row${inGrace ? ' child-row--grace' : ''}`}
              >
                <div
                  className="child-row-info"
                  onClick={() => navigate(`/children/${child.id}`)}
                >
                  <div className="child-row-name">
                    {child.last_name}, {child.first_name}
                  </div>
                  <div className="child-row-meta">
                    <span className="tag">{child.room_name || 'No room'}</span>
                    <span className="age">{formatAge(child.dob)}</span>
                    {inGrace && (
                      <span className="tag tag--grace">
                        Grace — move by {grace.hard_move_date}
                      </span>
                    )}
                  </div>
                </div>
                {inGrace && grace.next_room && (
                  <button
                    className="btn-move"
                    disabled={moving === child.id}
                    onClick={() => handleMove(grace)}
                  >
                    {moving === child.id ? 'Moving…' : `Move to ${grace.next_room.name}`}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
