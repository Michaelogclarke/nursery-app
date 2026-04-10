import { useState, useEffect } from 'react'
import './forms.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const emptyForm = () => ({
  childName: '',
  dob: '',
  parentNames: '',
  homeAddress: '',
  email: '',
  postcode: '',
  workPhone: '',
  mobilePhone: '',
  homePhone: '',
  startDate: '',
  attendance: Object.fromEntries(DAYS.map(d => [d, { am: false, pm: false }])),
  emergencyContacts: Array(4).fill(null).map(() => ({ name: '', phone: '' })),
  authorisedPickups: Array(4).fill(null).map(() => ({ name: '', relationship: '' })),
  socialServices: '',
  medicalConditions: '',
  immunisations: '',
  allergies: '',
  doctorName: '',
  doctorAddress: '',
  doctorPhone: '',
  previousSetting: '',
  otherInfo: '',
  signedBy: '',
  signedDate: '',
})

function formatDate(dob) {
  if (!dob) return ''
  return new Date(dob).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Field({ label, value, onChange, width, multiline, rows = 3 }) {
  return (
    <div className="af-field" style={width ? { width } : undefined}>
      {label && <span className="af-label">{label}</span>}
      {multiline ? (
        <textarea
          className="af-input af-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
        />
      ) : (
        <input
          className="af-input"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

export default function Forms() {
  const [children, setChildren] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    window.electronAPI.children.getAll().then(setChildren).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm())
      return
    }
    window.electronAPI.children.getById(Number(selectedId)).then(child => {
      if (!child) return
      const contacts = [...(child.emergency_contacts || [])].sort((a, b) => a.priority - b.priority)
      const pickups = child.authorised_pickups || []
      setForm(prev => ({
        ...emptyForm(),
        childName: `${child.first_name} ${child.last_name}`,
        dob: formatDate(child.dob),
        medicalConditions: child.medical_notes || '',
        allergies: child.allergies || '',
        emergencyContacts: Array(4).fill(null).map((_, i) => ({
          name: contacts[i]?.name || '',
          phone: contacts[i]?.phone || '',
        })),
        authorisedPickups: Array(4).fill(null).map((_, i) => ({
          name: pickups[i]?.name || '',
          relationship: '',
        })),
      }))
    }).catch(() => {})
  }, [selectedId])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const setContact = (i, key, value) =>
    setForm(prev => {
      const contacts = prev.emergencyContacts.map((c, idx) => idx === i ? { ...c, [key]: value } : c)
      return { ...prev, emergencyContacts: contacts }
    })

  const setPickup = (i, key, value) =>
    setForm(prev => {
      const pickups = prev.authorisedPickups.map((p, idx) => idx === i ? { ...p, [key]: value } : p)
      return { ...prev, authorisedPickups: pickups }
    })

  const toggleAttendance = (day, session) =>
    setForm(prev => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [day]: { ...prev.attendance[day], [session]: !prev.attendance[day][session] },
      },
    }))

  return (
    <div className="page">
      <div className="page-header no-print">
        <h2 className="page-title">Forms</h2>
      </div>

      <div className="form-controls no-print">
        <label className="fc-label">
          Pre-fill for child:
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Blank form —</option>
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>
            ))}
          </select>
        </label>
        <button className="btn-secondary" onClick={() => setForm(emptyForm())}>
          Clear Form
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="application-form">

        <div className="af-header">
          <div className="af-org-name">Little Stars Daycare and Afterschools</div>
          <div className="af-address">201 City Business Park, Dunmurry, BT17 9HY</div>
          <div className="af-contact">Tel: 02890 621419 &nbsp;|&nbsp; Email: littlestarsdaycare@live.co.uk</div>
          <h2 className="af-title">APPLICATION FORM</h2>
        </div>

        <div className="af-section">
          <Field label="Name of Child:" value={form.childName} onChange={v => set('childName', v)} />
          <Field label="Child's Date of Birth (Day/Month/Year):" value={form.dob} onChange={v => set('dob', v)} />
          <Field label="Parent(s) or Guardian Names:" value={form.parentNames} onChange={v => set('parentNames', v)} />
        </div>

        <div className="af-section">
          <div className="af-row">
            <Field label="Home Address:" value={form.homeAddress} onChange={v => set('homeAddress', v)} width="58%" />
            <Field label="Email:" value={form.email} onChange={v => set('email', v)} width="38%" />
          </div>
          <Field label="Postcode:" value={form.postcode} onChange={v => set('postcode', v)} width="28%" />
        </div>

        <div className="af-section">
          <div className="af-row">
            <Field label="Work:" value={form.workPhone} onChange={v => set('workPhone', v)} width="30%" />
            <Field label="Mobile:" value={form.mobilePhone} onChange={v => set('mobilePhone', v)} width="30%" />
            <Field label="Home:" value={form.homePhone} onChange={v => set('homePhone', v)} width="30%" />
          </div>
          <p className="af-note">If you change your address after this application has been sent off please NOTIFY US</p>
        </div>

        <div className="af-section">
          <Field label="Date you would like your child to start:" value={form.startDate} onChange={v => set('startDate', v)} width="50%" />
        </div>

        <div className="af-section">
          <h3 className="af-section-title">Attendance Pattern</h3>
          <table className="af-table">
            <thead>
              <tr><th>Day</th><th>AM</th><th>PM</th></tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td>{day}</td>
                  <td>
                    <input
                      type="checkbox"
                      className="af-checkbox"
                      checked={form.attendance[day].am}
                      onChange={() => toggleAttendance(day, 'am')}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="af-checkbox"
                      checked={form.attendance[day].pm}
                      onChange={() => toggleAttendance(day, 'pm')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="af-section">
          <h3 className="af-section-title">In the case of an emergency please contact:</h3>
          {[0, 1, 2, 3].map(i => (
            <div className="af-row" key={i}>
              <Field label="Name:" value={form.emergencyContacts[i].name} onChange={v => setContact(i, 'name', v)} width="48%" />
              <Field label="Telephone:" value={form.emergencyContacts[i].phone} onChange={v => setContact(i, 'phone', v)} width="48%" />
            </div>
          ))}
        </div>

        <div className="af-section">
          <h3 className="af-section-title">Names of other adults authorised to pick up child:</h3>
          <div className="af-pickup-grid">
            {[0, 1, 2, 3].map(i => (
              <div key={i}>
                <Field label="Name:" value={form.authorisedPickups[i].name} onChange={v => setPickup(i, 'name', v)} />
                <Field label="Relationship to child:" value={form.authorisedPickups[i].relationship} onChange={v => setPickup(i, 'relationship', v)} />
              </div>
            ))}
          </div>
          <p className="af-note">
            N.B. Staff are not permitted to hand over a child to an unauthorised person or a child under 18yrs.
            IDENTIFICATION WILL BE REQUESTED.
          </p>
        </div>

        <div className="af-section">
          <Field label="Is there any involvement with social services?" value={form.socialServices} onChange={v => set('socialServices', v)} />
        </div>

        <div className="af-section">
          <Field label="Any known medical conditions:" value={form.medicalConditions} onChange={v => set('medicalConditions', v)} />
          <div className="af-row af-row--middle">
            <Field label="Are your child's immunisations up to date:" value={form.immunisations} onChange={v => set('immunisations', v)} width="62%" />
            <span className="af-options">Yes / No</span>
          </div>
          <Field label="Any known allergies:" value={form.allergies} onChange={v => set('allergies', v)} />
        </div>

        <div className="af-section">
          <Field label="Doctor's Name:" value={form.doctorName} onChange={v => set('doctorName', v)} />
          <Field label="Doctor's Address:" value={form.doctorAddress} onChange={v => set('doctorAddress', v)} />
          <Field label="Doctor's phone number:" value={form.doctorPhone} onChange={v => set('doctorPhone', v)} />
        </div>

        <div className="af-section">
          <p className="af-label">Has your child attended a setting before? If yes, what was your reason for leaving?</p>
          <textarea
            className="af-input af-textarea"
            value={form.previousSetting}
            onChange={e => set('previousSetting', e.target.value)}
            rows={3}
          />
        </div>

        <div className="af-section">
          <p className="af-label">Any other relevant information e.g. comforts, sleep patterns, dummy, bottle etc</p>
          <textarea
            className="af-input af-textarea"
            value={form.otherInfo}
            onChange={e => set('otherInfo', e.target.value)}
            rows={5}
          />
        </div>

        <div className="af-section af-sign-row">
          <Field label="Signed:" value={form.signedBy} onChange={v => set('signedBy', v)} width="48%" />
          <Field label="Date:" value={form.signedDate} onChange={v => set('signedDate', v)} width="30%" />
        </div>

        <div className="af-return-address">
          <p>Please return to:</p>
          <p>Manager Siobhan Finnegan</p>
          <p>Little Stars Day Care, Unit A, 201 City Business Centre, Dunmurry Industrial Estate, Dunmurry, BT17 9HY</p>
        </div>

      </div>
    </div>
  )
}
