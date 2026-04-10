import { useState, useEffect } from 'react'
import './rooms.css'

function occupancyLevel(current, max) {
  if (current >= max) return 'over'
  if (current >= max * 0.9) return 'near'
  return 'ok'
}

export default function Rooms() {
  const [rooms, setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    window.electronAPI.rooms
      .getWithOccupancy()
      .then(data => { setRooms(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Rooms</h2>
        <span className="page-meta">Live occupancy — today</span>
      </div>

      {loading && <p className="state-msg">Loading…</p>}
      {error   && <p className="state-msg state-msg--error">Error: {error}</p>}

      {!loading && !error && (
        <div className="rooms-grid">
          {rooms.map(room => {
            const level   = occupancyLevel(room.current_count, room.max_capacity)
            const pct     = Math.min(100, Math.round((room.current_count / room.max_capacity) * 100))
            const isOver  = room.current_count > room.max_capacity
            const isAtCap = room.current_count === room.max_capacity

            return (
              <div key={room.id} className={`room-card room-card--${level}`}>
                <div className="room-card-header">
                  <h3 className="room-name">{room.name}</h3>
                  {isOver  && <span className="capacity-flag capacity-flag--over">Over capacity</span>}
                  {isAtCap && <span className="capacity-flag capacity-flag--at">At capacity</span>}
                </div>

                <div className="room-count">
                  <span className="room-count-current">{room.current_count}</span>
                  <span className="room-count-sep"> / </span>
                  <span className="room-count-max">{room.max_capacity}</span>
                  <span className="room-count-label"> children</span>
                </div>

                <div className="capacity-bar-track">
                  <div
                    className={`capacity-bar-fill capacity-bar-fill--${level}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="room-footer">
                  <span className="room-footer-text">
                    {room.max_capacity - room.current_count > 0
                      ? `${room.max_capacity - room.current_count} place${room.max_capacity - room.current_count !== 1 ? 's' : ''} available`
                      : 'No places available'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="rooms-note">
        Rooms are configured directly in the database. Contact your system administrator to add or edit rooms.
      </p>
    </div>
  )
}
