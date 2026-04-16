import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './children.css'

function formatDate(dob) {
  return new Date(dob).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatAge(dob) {
  const birth = new Date(dob)
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (totalMonths < 12) return `${totalMonths} months old`
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return months > 0 ? `${years}y ${months}mo` : `${years} year${years !== 1 ? 's' : ''} old`
}

function Field({ label, value }) {
  return (
    <div className="profile-field">
      <dt className="profile-field-label">{label}</dt>
      <dd className="profile-field-value">{value || <span className="none">None recorded</span>}</dd>
    </div>
  )
}

export default function ChildProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.electronAPI.children
      .getById(Number(id))
      .then(data => { setChild(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  const handleDeactivate = async () => {
    if (!confirm(`Mark ${child.first_name} ${child.last_name} as inactive? They will no longer appear in the register.`)) return
    await window.electronAPI.children.deactivate(Number(id))
    navigate('/children')
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error)   return <div className="page"><p className="state-msg state-msg--error">Error: {error}</p></div>
  if (!child)  return <div className="page"><p className="state-msg">Child not found.</p></div>

  const contact1 = child.emergency_contacts.find(c => c.priority === 1)
  const contact2 = child.emergency_contacts.find(c => c.priority === 2)

  return (
    <div className="page">
      <div className="profile-topbar">
        <button className="btn-back" onClick={() => navigate('/children')}>← Back</button>
        <div className="profile-topbar-actions">
          <button className="btn-secondary" onClick={() => navigate(`/children/${id}/edit`)}>
            Edit
          </button>
          <button className="btn-danger" onClick={handleDeactivate}>
            Mark Inactive
          </button>
        </div>
      </div>

      <h2 className="page-title">{child.first_name} {child.last_name}</h2>
      <p className="profile-subtitle">
        {formatAge(child.dob)} &mdash; {child.room_name || 'No room assigned'}
      </p>

      <div className="profile-grid">
        <section className="profile-section">
          <h3 className="profile-section-title">Personal Details</h3>
          <dl>
            <Field label="Date of birth" value={formatDate(child.dob)} />
            <Field label="Start date" value={child.start_date ? formatDate(child.start_date) : null} />
            <Field label="Room" value={child.room_name} />
          </dl>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Medical Information</h3>
          <dl>
            <Field label="Allergies" value={child.allergies} />
            <Field label="Medical notes" value={child.medical_notes} />
          </dl>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Emergency Contacts</h3>
          {contact1 ? (
            <div className="contact-card">
              <div className="contact-priority">Primary</div>
              <div className="contact-name">{contact1.name}</div>
              <div className="contact-rel">{contact1.relationship}</div>
              <div className="contact-phone">{contact1.phone}</div>
            </div>
          ) : <p className="none">None recorded</p>}
          {contact2 && (
            <div className="contact-card">
              <div className="contact-priority">Secondary</div>
              <div className="contact-name">{contact2.name}</div>
              <div className="contact-rel">{contact2.relationship}</div>
              <div className="contact-phone">{contact2.phone}</div>
            </div>
          )}
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Authorised Pickup Persons</h3>
          {child.authorised_pickups.length > 0 ? (
            <ul className="pickup-list">
              {child.authorised_pickups.map(p => <li key={p.id}>{p.name}</li>)}
            </ul>
          ) : <p className="none">None recorded</p>}
        </section>
      </div>
    </div>
  )
}
