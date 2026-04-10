import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './room-calendar.css'

function getMonday(date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmt(date) {
  const y   = date.getFullYear()
  const m   = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
}

function fmtFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const TODAY_MONDAY = getMonday(new Date())
const MAX_WEEKS_AHEAD = 104  // 2 years

export default function RoomCalendar() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [dayData, setDayData]     = useState([])
  const [rooms, setRooms]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Panel state
  const [panel, setPanel]           = useState(null)
  const [panelKids, setPanelKids]   = useState([])
  const [panelLoading, setPanelLoading] = useState(false)

  const windowStart = fmt(weekStart)
  const windowEnd   = fmt(addDays(weekStart, 27))

  // How many weeks ahead is the current view from today's Monday
  const weeksAhead = Math.round((weekStart - TODAY_MONDAY) / (7 * 24 * 60 * 60 * 1000))

  // Next 4 weeks would land at weeksAhead + 4 — cap at MAX_WEEKS_AHEAD
  const canGoForward = weeksAhead + 4 <= MAX_WEEKS_AHEAD

  useEffect(() => {
    setLoading(true)
    window.electronAPI.rooms
      .getCalendarOccupancy(windowStart, windowEnd)
      .then(data => {
        setDayData(data)
        if (data.length > 0) setRooms(data[0].rooms.map(r => ({ id: r.id, name: r.name })))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [windowStart, windowEnd])

  const openPanel = (date, roomId, roomName) => {
    setPanel({ date, roomId, roomName })
    setPanelKids([])
    setPanelLoading(true)
    window.electronAPI.rooms
      .getChildrenOnDate(roomId, date)
      .then(kids => { setPanelKids(kids); setPanelLoading(false) })
      .catch(() => setPanelLoading(false))
  }

  const closePanel = () => setPanel(null)

  const prevMonth = () => setWeekStart(w => addDays(w, -28))
  const nextMonth = () => { if (canGoForward) setWeekStart(w => addDays(w, 28)) }
  const goToday   = () => setWeekStart(getMonday(new Date()))

  const weeks = []
  for (let w = 0; w < 4; w++) {
    const week = []
    for (let d = 0; d < 5; d++) {
      const date  = fmt(addDays(weekStart, w * 7 + d))
      const found = dayData.find(x => x.date === date)
      week.push({ date, data: found || null })
    }
    weeks.push(week)
  }

  const todayStr = fmt(new Date())

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Room Calendar</h2>
        <div className="cal-nav">
          <button className="btn-secondary" onClick={prevMonth} disabled={weeksAhead <= 0}>
            ← Back 4 weeks
          </button>
          <button className="btn-secondary" onClick={goToday}>Today</button>
          <button className="btn-secondary" onClick={nextMonth} disabled={!canGoForward}>
            Next 4 weeks →
          </button>
        </div>
      </div>

      <p className="cal-range-label">
        {fmtMonthYear(weekStart)} — {fmtMonthYear(addDays(weekStart, 27))}
        {weeksAhead > 0 && (
          <span className="cal-weeks-ahead">
            {weeksAhead} week{weeksAhead !== 1 ? 's' : ''} ahead
            {!canGoForward && ' — 2 year limit reached'}
          </span>
        )}
      </p>

      {loading && <p className="state-msg">Loading…</p>}
      {error   && <p className="state-msg state-msg--error">Error: {error}</p>}

      {!loading && !error && (
        <div className={`cal-layout${panel ? ' cal-layout--split' : ''}`}>
          <div className="cal-main">
            <div className="cal-wrapper">
              <div className="cal-grid">
                <div className="cal-room-col" />
                {DAYS.map(d => (
                  <div key={d} className="cal-day-header">{d}</div>
                ))}
              </div>

              {rooms.map(room => (
                <div key={room.id} className="cal-room-block">
                  <div className="cal-room-name">{room.name}</div>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="cal-grid cal-grid--data">
                      <div className="cal-week-label">Wk {wi + 1}</div>
                      {week.map(({ date, data }) => {
                        const roomDay  = data?.rooms.find(r => r.id === room.id)
                        const isToday  = date === todayStr
                        const isActive = panel?.date === date && panel?.roomId === room.id
                        const full     = roomDay && roomDay.spaces <= 0
                        const tight    = roomDay && roomDay.spaces > 0 && roomDay.spaces <= 2

                        return (
                          <div
                            key={date}
                            className={[
                              'cal-cell',
                              'cal-cell--clickable',
                              isToday  ? 'cal-cell--today'  : '',
                              full     ? 'cal-cell--full'   : '',
                              tight    ? 'cal-cell--tight'  : '',
                              isActive ? 'cal-cell--active' : '',
                            ].join(' ').trim()}
                            onClick={() => openPanel(date, room.id, room.name)}
                          >
                            <div className="cal-cell-date">{fmtDay(date)}</div>
                            {roomDay ? (
                              <>
                                <div className="cal-cell-count">{roomDay.count} / {roomDay.max_capacity}</div>
                                <div className="cal-cell-spaces">
                                  {roomDay.spaces > 0
                                    ? `${roomDay.spaces} space${roomDay.spaces !== 1 ? 's' : ''}`
                                    : 'Full'
                                  }
                                </div>
                              </>
                            ) : (
                              <div className="cal-cell-closed">Closed</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {panel && (
            <div className="cal-panel">
              <div className="cal-panel-header">
                <div>
                  <div className="cal-panel-room">{panel.roomName}</div>
                  <div className="cal-panel-date">{fmtFull(panel.date)}</div>
                </div>
                <button className="cal-panel-close" onClick={closePanel}>✕</button>
              </div>

              {panelLoading && <p className="cal-panel-empty">Loading…</p>}

              {!panelLoading && panelKids.length === 0 && (
                <p className="cal-panel-empty">No children scheduled this day.</p>
              )}

              {!panelLoading && panelKids.length > 0 && (
                <ul className="cal-panel-list">
                  {panelKids.map(kid => (
                    <li
                      key={kid.id}
                      className="cal-panel-kid"
                      onClick={() => navigate(`/children/${kid.id}`)}
                    >
                      <div className="cal-panel-kid-name">
                        {kid.last_name}, {kid.first_name}
                      </div>
                      <div className="cal-panel-kid-age">{kid.age}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
