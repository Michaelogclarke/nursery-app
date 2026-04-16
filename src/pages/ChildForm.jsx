import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './children.css'

const emptyContact = (priority) => ({ name: '', relationship: '', phone: '', priority })

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
]

const emptyForm = {
  first_name: '',
  last_name: '',
  dob: '',
  start_date: '',
  room_id: '',
  scheduled_days: [],
  allergies: '',
  medical_notes: '',
  emergency_contacts: [emptyContact(1), emptyContact(2)],
  authorised_pickups: [{ name: '' }],
}

export default function ChildForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [autoRoom, setAutoRoom] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [roomBlocked, setRoomBlocked] = useState(null)
  const [nextAvailableDate, setNextAvailableDate] = useState(null)
  const [capacityWarnings, setCapacityWarnings] = useState([])
  const [overrideInput, setOverrideInput] = useState('')
  const [overrideConfirmed, setOverrideConfirmed] = useState(false)

  useEffect(() => {
    if (isEdit) {
      window.electronAPI.children
        .getById(Number(id))
        .then(child => {
          setForm({
            first_name: child.first_name,
            last_name:  child.last_name,
            dob:        child.dob ? child.dob.toString().slice(0, 10) : '',
            room_id:        child.room_id ?? '',
            start_date:     child.start_date ? child.start_date.toString().slice(0, 10) : '',
            scheduled_days: child.scheduled_days || [],
            allergies:      child.allergies      || '',
            medical_notes:  child.medical_notes  || '',
            emergency_contacts: [
              child.emergency_contacts.find(c => c.priority === 1) || emptyContact(1),
              child.emergency_contacts.find(c => c.priority === 2) || emptyContact(2),
            ],
            authorised_pickups:
              child.authorised_pickups.length > 0
                ? child.authorised_pickups
                : [{ name: '' }],
          })
          setLoading(false)
        })
        .catch(err => { setError(err.message); setLoading(false) })
    }
  }, [id])

  // ── Field helpers ────────────────────────────────────────────────────────────

  const set = async (field, value) => {
    setForm(f => ({ ...f, [field]: value }))

    if (field === 'dob' || field === 'start_date') {
      const dob        = field === 'dob'        ? value : form.dob
      const start_date = field === 'start_date' ? value : form.start_date
      if (!dob) return

      setAutoRoom(null)
      setRoomBlocked(null)
      setNextAvailableDate(null)
      setCapacityWarnings([])
      setOverrideInput('')
      setOverrideConfirmed(false)

      const room = await window.electronAPI.children.getAutoRoom(dob, start_date || null)

      if (!room || room.ineligible) {
        setRoomBlocked(room?.reason || 'Unable to assign a room for this child.')
        return
      }

      setAutoRoom(room)
      setForm(f => ({ ...f, [field]: value, room_id: room.id }))

      const result = await window.electronAPI.children.checkRoomCapacity(
        room.id,
        isEdit ? Number(id) : null,
        start_date || null
      )
      if (!result.ok) {
        const hard = result.conflicts.find(c => c.reason === 'Room is already at capacity')
        if (hard) {
          const msg = start_date
            ? `${room.name} will still be full on ${new Date(start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} and cannot accept any more children.`
            : `${room.name} is currently full and cannot accept any more children.`
          setRoomBlocked(msg)
          setNextAvailableDate(hard.next_available_date || null)
        } else {
          setCapacityWarnings(result.conflicts)
        }
      }
    }
  }

  const toggleDay = (day) =>
    setForm(f => ({
      ...f,
      scheduled_days: f.scheduled_days.includes(day)
        ? f.scheduled_days.filter(d => d !== day)
        : [...f.scheduled_days, day].sort(),
    }))

  const setContact = (i, field, value) =>
    setForm(f => {
      const contacts = [...f.emergency_contacts]
      contacts[i] = { ...contacts[i], [field]: value }
      return { ...f, emergency_contacts: contacts }
    })

  const setPickup = (i, value) =>
    setForm(f => {
      const pickups = [...f.authorised_pickups]
      pickups[i] = { name: value }
      return { ...f, authorised_pickups: pickups }
    })

  const addPickup = () =>
    setForm(f => ({ ...f, authorised_pickups: [...f.authorised_pickups, { name: '' }] }))

  const removePickup = (i) =>
    setForm(f => ({ ...f, authorised_pickups: f.authorised_pickups.filter((_, idx) => idx !== i) }))

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (roomBlocked && !overrideConfirmed) return
    if (form.scheduled_days.length === 0) { setError('Please select at least one attendance day.'); return }
    setSaving(true)
    setError(null)
    try {
      const data = {
        ...form,
        room_id:    form.room_id    || null,
        start_date: form.start_date || null,
      }
      if (isEdit) {
        await window.electronAPI.children.update(Number(id), data)
        navigate(`/children/${id}`)
      } else {
        const newId = await window.electronAPI.children.add(data)
        navigate(`/children/${newId}`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">{isEdit ? 'Edit Child' : 'Add Child'}</h2>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="child-form" noValidate>

        {/* ── Personal details ─────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Personal Details</h3>
          <div className="form-row">
            <div className="form-field">
              <label>First name <span className="req">*</span></label>
              <input
                required
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Last name <span className="req">*</span></label>
              <input
                required
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Date of birth <span className="req">*</span></label>
              <input
                type="date"
                required
                value={form.dob}
                onChange={e => set('dob', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Start date <span className="req">*</span></label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Room (auto-assigned from start date)</label>
              <div className="auto-room-display">
                {autoRoom
                  ? autoRoom.name
                  : form.room_id
                    ? <em>Assigned on file</em>
                    : <em>Enter date of birth and start date to assign</em>
                }
              </div>
            </div>
          </div>
        </section>

        {/* ── Attendance days ──────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Attendance Days <span className="req">*</span></h3>
          <div className="day-picker">
            {DAYS.map(d => (
              <button
                key={d.value}
                type="button"
                className={`day-btn${form.scheduled_days.includes(d.value) ? ' day-btn--active' : ''}`}
                onClick={() => toggleDay(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
          {form.scheduled_days.length === 0 && (
            <p className="day-picker-hint">Select at least one day.</p>
          )}
        </section>

        {/* ── Medical ──────────────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Medical Information</h3>
          <div className="form-field">
            <label>Allergies</label>
            <textarea
              rows={3}
              placeholder="List any known allergies…"
              value={form.allergies}
              onChange={e => set('allergies', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Medical notes</label>
            <textarea
              rows={3}
              placeholder="Any relevant medical information…"
              value={form.medical_notes}
              onChange={e => set('medical_notes', e.target.value)}
            />
          </div>
        </section>

        {/* ── Emergency contacts ───────────────────────────────────────────── */}
        {[0, 1].map(i => (
          <section key={i} className="form-section">
            <h3 className="form-section-title">
              Emergency Contact {i + 1} {i === 0 ? '(Primary)' : '(Secondary)'}
            </h3>
            <div className="form-row form-row--3">
              <div className="form-field">
                <label>Name {i === 0 && <span className="req">*</span>}</label>
                <input
                  required={i === 0}
                  value={form.emergency_contacts[i].name}
                  onChange={e => setContact(i, 'name', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Relationship {i === 0 && <span className="req">*</span>}</label>
                <input
                  required={i === 0}
                  value={form.emergency_contacts[i].relationship}
                  onChange={e => setContact(i, 'relationship', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Phone number {i === 0 && <span className="req">*</span>}</label>
                <input
                  type="tel"
                  required={i === 0}
                  value={form.emergency_contacts[i].phone}
                  onChange={e => setContact(i, 'phone', e.target.value)}
                />
              </div>
            </div>
          </section>
        ))}

        {/* ── Authorised pickups ───────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Authorised Pickup Persons</h3>
          {form.authorised_pickups.map((p, i) => (
            <div key={i} className="pickup-input-row">
              <input
                placeholder="Full name"
                value={p.name}
                onChange={e => setPickup(i, e.target.value)}
              />
              {form.authorised_pickups.length > 1 && (
                <button type="button" className="btn-remove" onClick={() => removePickup(i)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-add-row" onClick={addPickup}>
            + Add person
          </button>
        </section>

        {roomBlocked && !overrideConfirmed && (
          <div className="form-notification form-notification--error">
            <div className="form-notification-title">This placement is not possible</div>
            <p>{roomBlocked}</p>
            {nextAvailableDate && (
              <p>Next space expected: <strong>{new Date(nextAvailableDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
            )}
            <p>
              To override this restriction, type the child's full name exactly as entered
              above and press Confirm Override.
            </p>
            <div className="form-override">
              <input
                className="form-override-input"
                placeholder={`Type "${form.first_name} ${form.last_name}" to confirm`}
                value={overrideInput}
                onChange={e => setOverrideInput(e.target.value)}
              />
              <div className="form-override-actions">
                <button
                  type="button"
                  className="btn-danger"
                  disabled={overrideInput.trim().toLowerCase() !==
                    `${form.first_name} ${form.last_name}`.trim().toLowerCase()}
                  onClick={() => setOverrideConfirmed(true)}
                >
                  Confirm Override
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate(isEdit ? `/children/${id}` : '/children')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {overrideConfirmed && (
          <div className="form-notification form-notification--warning">
            <div className="form-notification-title">Override active</div>
            <p>You are saving this child into a full room. This has been noted.</p>
          </div>
        )}

        {capacityWarnings.length > 0 && (
          <div className="form-notification form-notification--warning">
            <div className="form-notification-title">Future capacity conflict</div>
            <p>Adding this child will leave no space for the following mandatory room moves:</p>
            <ul>
              {capacityWarnings.map((w, i) => (
                <li key={i}>{w.reason}</li>
              ))}
            </ul>
            {(() => {
              const earliest = capacityWarnings
                .map(w => w.move_date)
                .filter(Boolean)
                .sort()[0]
              return earliest ? (
                <p>The room will be at capacity from <strong>{new Date(earliest + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Consider whether a space will be available before proceeding.</p>
              ) : (
                <p>Consider whether a space will be available before proceeding.</p>
              )
            })()}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(isEdit ? `/children/${id}` : '/children')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || (!!roomBlocked && !overrideConfirmed)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </form>
    </div>
  )
}
