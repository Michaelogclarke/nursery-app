import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './children.css'

const emptyContact = (priority) => ({ name: '', relationship: '', phone: '', priority })

const emptyForm = {
  first_name: '',
  last_name: '',
  dob: '',
  room_id: '',
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
  const [capacityWarnings, setCapacityWarnings] = useState([])

  useEffect(() => {
    if (isEdit) {
      window.electronAPI.children
        .getById(Number(id))
        .then(child => {
          setForm({
            first_name: child.first_name,
            last_name:  child.last_name,
            dob:        child.dob ? child.dob.toString().slice(0, 10) : '',
            room_id:    child.room_id ?? '',
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

    if (field === 'dob' && value) {
      const room = await window.electronAPI.children.getAutoRoom(value)
      setAutoRoom(room)
      if (room) {
        setForm(f => ({ ...f, dob: value, room_id: room.id }))
        const result = await window.electronAPI.children.checkRoomCapacity(
          room.id,
          isEdit ? Number(id) : null
        )
        setCapacityWarnings(result.ok ? [] : result.conflicts)
      }
    }
  }

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
    setSaving(true)
    setError(null)
    try {
      const data = {
        ...form,
        room_id: form.room_id || null,
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
              <label>Room (auto-assigned)</label>
              <div className="auto-room-display">
                {autoRoom
                  ? autoRoom.name
                  : form.room_id
                    ? <em>Assigned on file</em>
                    : <em>Enter date of birth to assign</em>
                }
              </div>
            </div>
          </div>
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

        {capacityWarnings.length > 0 && (
          <div className="form-capacity-warning">
            <strong>Capacity conflict detected</strong>
            <p>Placing this child here will block the following mandatory room moves:</p>
            <ul>
              {capacityWarnings.map((w, i) => (
                <li key={i}>{w.reason}</li>
              ))}
            </ul>
            <p>Consider freeing up space before proceeding.</p>
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
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </form>
    </div>
  )
}
