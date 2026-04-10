import { useState, useEffect } from 'react'
import './room-calendar.css'

function getMonday(date) {
  // Anchor to noon local time so getDay() is never shifted by timezone
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
  // Format as YYYY-MM-DD in local time (not UTC) to avoid date shifting
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
}

function fmtMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function RoomCalendar() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [dayData, setDayData] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 4-week window starting from weekStart
  const windowStart = fmt(weekStart)
  const windowEnd   = fmt(addDays(weekStart, 27)) // 4 weeks = 28 days, Mon to Fri

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

  const prevMonth = () => setWeekStart(w => addDays(w, -28))
  const nextMonth = () => setWeekStart(w => addDays(w, 28))
  const goToday   = () => setWeekStart(getMonday(new Date()))

  // Group days into 4 weeks of Mon–Fri
  const weeks = []
  for (let w = 0; w < 4; w++) {
    const week = []
    for (let d = 0; d < 5; d++) {
      const date = fmt(addDays(weekStart, w * 7 + d))
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
          <button className="btn-secondary" onClick={prevMonth}>← Back 4 weeks</button>
          <button className="btn-secondary" onClick={goToday}>Today</button>
          <button className="btn-secondary" onClick={nextMonth}>Next 4 weeks →</button>
        </div>
      </div>

      <p className="cal-range-label">
        {fmtMonthYear(weekStart)} — {fmtMonthYear(addDays(weekStart, 27))}
      </p>

      {loading && <p className="state-msg">Loading…</p>}
      {error   && <p className="state-msg state-msg--error">Error: {error}</p>}

      {!loading && !error && (
        <div className="cal-wrapper">
          {/* Column headers — day names */}
          <div className="cal-grid">
            <div className="cal-room-col" />
            {DAYS.map(d => (
              <div key={d} className="cal-day-header">{d}</div>
            ))}
          </div>

          {/* One block per room */}
          {rooms.map(room => (
            <div key={room.id} className="cal-room-block">
              <div className="cal-room-name">{room.name}</div>
              {weeks.map((week, wi) => (
                <div key={wi} className="cal-grid cal-grid--data">
                  <div className="cal-week-label">Wk {wi + 1}</div>
                  {week.map(({ date, data }) => {
                    const roomDay = data?.rooms.find(r => r.id === room.id)
                    const isToday = date === todayStr
                    const full    = roomDay && roomDay.spaces <= 0
                    const tight   = roomDay && roomDay.spaces > 0 && roomDay.spaces <= 2

                    return (
                      <div
                        key={date}
                        className={[
                          'cal-cell',
                          isToday  ? 'cal-cell--today'  : '',
                          full     ? 'cal-cell--full'   : '',
                          tight    ? 'cal-cell--tight'  : '',
                        ].join(' ').trim()}
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
      )}
    </div>
  )
}
