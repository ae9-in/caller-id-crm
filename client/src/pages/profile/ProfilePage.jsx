import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { PageHeader, Card, Button, Input, Badge, Spinner } from '../../components/ui/index'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

const ROLE_COLORS = { admin: 'danger', manager: 'info', agent: 'gray' }

const ProfilePage = () => {
  const { user } = useAuth()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPw, setChangingPw] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 8) return toast.error('New password must be at least 8 characters')
    setChangingPw(true)
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  return (
    <div className="max-w-2xl space-y-5 fade-in">
      <PageHeader title="My Profile" description="Manage your account settings" />

      {/* Profile card */}
      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-brand-700 font-bold text-2xl">{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.first_name} {user?.last_name}</h2>
            <p className="text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={ROLE_COLORS[user?.role] || 'gray'}>{user?.role}</Badge>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-400 text-xs mb-1">Phone</p><p className="text-slate-700">{user?.phone || '—'}</p></div>
          <div><p className="text-slate-400 text-xs mb-1">Last Login</p><p className="text-slate-700">{formatDate(user?.last_login)}</p></div>
          <div><p className="text-slate-400 text-xs mb-1">Member Since</p><p className="text-slate-700">{formatDate(user?.created_at)}</p></div>
          <div><p className="text-slate-400 text-xs mb-1">Role</p><p className="text-slate-700 capitalize">{user?.role}</p></div>
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input label="Current Password" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Enter current password" />
          <Input label="New Password" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Min 8 characters" />
          <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Repeat new password" />
          <Button type="submit" disabled={changingPw}>
            {changingPw ? <><Spinner size="sm" /> Changing...</> : 'Change Password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default ProfilePage
