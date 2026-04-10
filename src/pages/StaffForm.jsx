import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DAYS } from './staffUtils.js'
import './staff.css'

const emptyForm = {
  first_name:            '',
  last_name:             '',
  dob:                   '',
  phone:                 '',
  email:                 '',
  job_title:             '',
  qualifications:        '',
  access_ni_number:      '',
  access_ni_issue_date:  '',
  access_ni_expiry_date: '',
  access_ni_status:      'pending',
  availability:          [],
}

export default function StaffForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm]     = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!isEdit) return
    window.electronAPI.staff
      .getById(Number(id))
      .then(member => {
        setForm({
          first_name:            member.first_name,
          last_name:             member.last_name,
          dob:                   member.dob ? member.dob.toString().slice(0, 10) : '',
          phone:                 member.phone                 || '',
          email:                 member.email                 || '',
          job_title:             member.job_title             || '',
          qualifications:        member.qualifications        || '',
          access_ni_number:      member.access_ni_number      || '',
          access_ni_issue_date:  member.access_ni_issue_date  ? member.access_ni_issue_date.toString().slice(0, 10) : '',
          access_ni_expiry_date: member.access_ni_expiry_date ? member.access_ni_expiry_date.toString().slice(0, 10) : '',
          access_ni_status:      member.access_ni_status,
          availability:          member.availability,
        })
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const toggleDay = (day) =>
    setForm(f => ({
      ...f,
      availability: f.availability.includes(day)
        ? f.availability.filter(d => d !== day)
        : [...f.availability, day],
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await window.electronAPI.staff.update(Number(id), form)
        navigate(`/staff/${id}`)
      } else {
        const newId = await window.electronAPI.staff.add(form)
        navigate(`/staff/${newId}`)
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
        <h2 className="page-title">{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="child-form" noValidate>

        {/* ── Personal details ─────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Personal Details</h3>
          <div className="form-row">
            <div className="form-field">
              <label>First name <span className="req">*</span></label>
              <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Last name <span className="req">*</span></label>
              <input required value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Date of birth</label>
              <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Job title</label>
              <input value={form.job_title} onChange={e => set('job_title', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Phone number</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Email address</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label>Qualifications</label>
            <textarea rows={3} value={form.qualifications} onChange={e => set('qualifications', e.target.value)} placeholder="Relevant qualifications and training…" />
          </div>
        </section>

        {/* ── Access NI ────────────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Access NI</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Certificate number</label>
              <input value={form.access_ni_number} onChange={e => set('access_ni_number', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Status <span className="req">*</span></label>
              <select value={form.access_ni_status} onChange={e => set('access_ni_status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="clear">Clear</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Issue date</label>
              <input type="date" value={form.access_ni_issue_date} onChange={e => set('access_ni_issue_date', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Expiry date</label>
              <input type="date" value={form.access_ni_expiry_date} onChange={e => set('access_ni_expiry_date', e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Availability ─────────────────────────────────────────────────── */}
        <section className="form-section">
          <h3 className="form-section-title">Contracted Availability</h3>
          <p className="form-hint">Select the days this staff member is contracted to work.</p>
          <div className="availability-checkboxes">
            {[1,2,3,4,5,6,0].map(day => (
              <label key={day} className={`day-checkbox ${form.availability.includes(day) ? 'day-checkbox--checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.availability.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                {DAYS[day].slice(0, 3)}
              </label>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(isEdit ? `/staff/${id}` : '/staff')}
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
