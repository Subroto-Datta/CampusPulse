import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Faculties from './pages/Faculties';
import RfidMapping from './pages/RfidMapping';
import GateLogs from './pages/GateLogs';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Sessions from './pages/Sessions';
import Courses from './pages/Courses';

import TakeAttendance from './pages/TakeAttendance';
import QrEntry from './pages/QrEntry';
import ScanQr from './pages/ScanQr';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — Dashboard shell */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Admin routes */}
            <Route path="/students" element={<ProtectedRoute roles={['admin', 'faculty']}><Students /></ProtectedRoute>} />
            <Route path="/faculties" element={<ProtectedRoute roles={['admin']}><Faculties /></ProtectedRoute>} />
            <Route path="/rfid" element={<ProtectedRoute roles={['admin']}><RfidMapping /></ProtectedRoute>} />
            <Route path="/gate-logs" element={<ProtectedRoute roles={['admin', 'guard']}><GateLogs /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute roles={['admin']}><Courses /></ProtectedRoute>} />

            <Route path="/attendance" element={<ProtectedRoute roles={['admin', 'faculty']}><Attendance /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['admin', 'faculty']}><Reports /></ProtectedRoute>} />

            {/* Faculty & Admin Session routes */}
            <Route path="/sessions" element={<ProtectedRoute roles={['admin', 'faculty']}><Sessions /></ProtectedRoute>} />
            <Route path="/sessions/:sessionId/attendance" element={<ProtectedRoute roles={['admin', 'faculty']}><TakeAttendance /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/qr-entry" element={<ProtectedRoute roles={['student']}><QrEntry /></ProtectedRoute>} />

            {/* Guard routes */}
            <Route path="/scan-qr" element={<ProtectedRoute roles={['guard', 'admin']}><ScanQr /></ProtectedRoute>} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
