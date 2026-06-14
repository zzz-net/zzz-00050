import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { getDefaultRoute } from './components/ProtectedRoute';
import Login from './pages/Login';

import ResidentDashboard from './pages/resident/Dashboard';
import ResidentSubmit from './pages/resident/SubmitTicket';
import ResidentTickets from './pages/resident/MyTickets';
import ResidentDrafts from './pages/resident/Drafts';

import DispatcherDashboard from './pages/dispatcher/Dashboard';
import DispatcherTickets from './pages/dispatcher/Tickets';

import RepairDashboard from './pages/repair/Dashboard';
import RepairTickets from './pages/repair/Tickets';

import AdminDashboard from './pages/admin/Dashboard';
import AdminTickets from './pages/admin/Tickets';
import AdminLogs from './pages/admin/Logs';
import AdminExport from './pages/admin/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/resident/dashboard"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/submit"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <ResidentSubmit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/tickets"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <ResidentTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/drafts"
          element={
            <ProtectedRoute allowedRoles={['resident']}>
              <ResidentDrafts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dispatcher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['dispatcher']}>
              <DispatcherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatcher/tickets"
          element={
            <ProtectedRoute allowedRoles={['dispatcher']}>
              <DispatcherTickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/repair/dashboard"
          element={
            <ProtectedRoute allowedRoles={['repair']}>
              <RepairDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repair/tickets"
          element={
            <ProtectedRoute allowedRoles={['repair']}>
              <RepairTickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/export"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminExport />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
