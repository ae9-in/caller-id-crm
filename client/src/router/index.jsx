import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'

// Auth pages
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'

// App pages
import DashboardPage from '../pages/dashboard/DashboardPage'
import BusinessListPage from '../pages/businesses/BusinessListPage'
import BusinessDetailPage from '../pages/businesses/BusinessDetailPage'
import CallListPage from '../pages/calls/CallListPage'
import CallDetailPage from '../pages/calls/CallDetailPage'
import UploadCallPage from '../pages/calls/UploadCallPage'
import FollowupListPage from '../pages/followups/FollowupListPage'
import AnalyticsPage from '../pages/analytics/AnalyticsPage'
import LeaderboardPage from '../pages/analytics/LeaderboardPage'
import SearchPage from '../pages/search/SearchPage'
import ProfilePage from '../pages/profile/ProfilePage'

// Admin pages
import UsersPage from '../pages/admin/UsersPage'
import AISettingsPage from '../pages/admin/AISettingsPage'
import AuditLogsPage from '../pages/admin/AuditLogsPage'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/businesses" element={<BusinessListPage />} />
          <Route path="/businesses/:id" element={<BusinessDetailPage />} />
          <Route path="/calls" element={<CallListPage />} />
          <Route path="/calls/upload" element={<UploadCallPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
          <Route path="/followups" element={<FollowupListPage />} />
          <Route path="/analytics" element={<ProtectedRoute roles={['admin','manager']}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Admin */}
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="/admin/ai-settings" element={<ProtectedRoute roles={['admin']}><AISettingsPage /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
