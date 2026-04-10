import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Children from './pages/Children.jsx'
import ChildProfile from './pages/ChildProfile.jsx'
import ChildForm from './pages/ChildForm.jsx'
import Attendance from './pages/Attendance.jsx'
import Rooms from './pages/Rooms.jsx'
import Staff from './pages/Staff.jsx'
import StaffProfile from './pages/StaffProfile.jsx'
import StaffForm from './pages/StaffForm.jsx'
import Rota from './pages/Rota.jsx'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/children" replace />} />
            <Route path="/children" element={<Children />} />
            <Route path="/children/new" element={<ChildForm />} />
            <Route path="/children/:id" element={<ChildProfile />} />
            <Route path="/children/:id/edit" element={<ChildForm />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/new" element={<StaffForm />} />
            <Route path="/staff/:id" element={<StaffProfile />} />
            <Route path="/staff/:id/edit" element={<StaffForm />} />
            <Route path="/rota" element={<Rota />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
