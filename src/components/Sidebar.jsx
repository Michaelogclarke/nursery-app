import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { to: '/children', label: 'Children' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/rooms', label: 'Rooms' },
  { to: '/staff', label: 'Staff' },
  { to: '/rota', label: 'Rota' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">&#x2665;</span>
        <h1 className="sidebar-title">Nursery Manager</h1>
      </div>
      <ul className="sidebar-nav">
        {navItems.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                ['sidebar-link', isActive ? 'sidebar-link--active' : ''].join(' ').trim()
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
