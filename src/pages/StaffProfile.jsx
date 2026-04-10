import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { accessNiWarning, formatDate, DAYS } from './staffUtils.js'
import './staff.css'

function Field({ label, value }) {
  return (
    <div className="profile-field">
      <dt className="profile-field-label">{label}</dt>
      <dd className="profile-field-value">{value || <span className="none">Not recorded</span>}</dd>
    </div>
  )
}

export default function StaffProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    window.electronAPI.staff
      .getById(Number(id))
      .then(data => { setMember(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [id])

  const handleDeactivate = async () => {
    if (!confirm(`Mark ${member.first_name} ${member.last_name} as inactive?`)) return
    await window.electronAPI.staff.deactivate(Number(id))
    navigate('/staff')
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error)   return <div className="page"><p className="state-msg state-msg--error">Error: {error}</p></div>
  if (!member) return <div className="page"><p className="state-msg">Staff member not found.</p></div>

  const warning = accessNiWarning(member.access_ni_status, member.access_ni_expiry_date)

  return (
    <div className="page">
      <div className="profile-topbar">
        <button className="btn-back" onClick={() => navigate('/staff')}>← Back</button>
        <div className="profile-topbar-actions">
          <button className="btn-secondary" onClick={() => navigate(`/staff/${id}/edit`)}>Edit</button>
          <button className="btn-danger" onClick={handleDeactivate}>Mark Inactive</button>
        </div>
      </div>

      <div className="staff-profile-header">
        <div>
          <h2 className="page-title">{member.first_name} {member.last_name}</h2>
          <p className="profile-subtitle">{member.job_title || 'No job title recorded'}</p>
        </div>
        {warning && (
          <div className={`ani-alert ani-alert--${warning}`}>
            {warning === 'expired'
              ? 'Access NI certificate has expired'
              : 'Access NI certificate expiring within 30 days'}
          </div>
        )}
      </div>

      <div className="profile-grid">
        <section className="profile-section">
          <h3 className="profile-section-title">Personal Details</h3>
          <dl>
            <Field label="Date of birth" value={formatDate(member.dob)} />
            <Field label="Phone"         value={member.phone} />
            <Field label="Email"         value={member.email} />
            <Field label="Job title"     value={member.job_title} />
            <Field label="Qualifications" value={member.qualifications} />
          </dl>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Access NI</h3>
          <dl>
            <Field label="Certificate number" value={member.access_ni_number} />
            <Field label="Issue date"  value={formatDate(member.access_ni_issue_date)} />
            <Field label="Expiry date" value={formatDate(member.access_ni_expiry_date)} />
            <div className="profile-field">
              <dt className="profile-field-label">Status</dt>
              <dd className="profile-field-value">
                <span className={`ni-status ni-status--${member.access_ni_status}`}>
                  {member.access_ni_status}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="profile-section profile-section--wide">
          <h3 className="profile-section-title">Contracted Availability</h3>
          <div className="availability-display">
            {[1,2,3,4,5,6,0].map(day => (
              <span
                key={day}
                className={`day-chip ${member.availability.includes(day) ? 'day-chip--active' : 'day-chip--inactive'}`}
              >
                {DAYS[day].slice(0, 3)}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
