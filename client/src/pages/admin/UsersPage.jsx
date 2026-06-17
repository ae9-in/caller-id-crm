import { useState } from 'react'
import { Plus, Users, Edit, Trash2, Shield } from 'lucide-react'
import { userService } from '../../services/index'
import { usePaginatedApi, useDebounce } from '../../hooks/index'
import {
  Button, PageHeader, SearchInput, Badge, LoadingState,
  EmptyState, Pagination, Card, Modal, Input, Select, Spinner, ConfirmModal
} from '../../components/ui/index'
import { formatDate } from '../../utils/formatters'
import { ROLES } from '../../utils/constants'
import toast from 'react-hot-toast'

const ROLE_COLORS = { admin: 'danger', manager: 'info', agent: 'gray' }

const UsersPage = () => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'agent' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data, pagination, loading, updateParams, goToPage, refetch } = usePaginatedApi(
    userService.getAll, {}
  )

  const openCreate = () => { setEditUser(null); setForm({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'agent' }); setShowForm(true) }
  const openEdit = (user) => { setEditUser(user); setForm({ first_name: user.first_name, last_name: user.last_name, phone: user.phone || '', role: user.role, is_active: user.is_active }); setShowForm(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        await userService.update(editUser.id, form)
        toast.success('User updated')
      } else {
        await userService.create(form)
        toast.success('User created')
      }
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await userService.delete(deleteTarget.id)
      toast.success('User deactivated')
      setDeleteTarget(null)
      refetch()
    } catch { toast.error('Failed') } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="User Management"
        description="Manage team members and their access levels"
        actions={<Button onClick={openCreate}><Plus size={15} /> Add User</Button>}
      />

      <div className="flex gap-3">
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); updateParams({ search: e.target.value }) }} placeholder="Search users..." className="max-w-xs" />
      </div>

      {loading ? <LoadingState /> : (
        <Card>
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {data?.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <span className="font-medium text-slate-800">{user.first_name} {user.last_name}</span>
                    </div>
                  </td>
                  <td className="text-slate-600 text-xs">{user.email}</td>
                  <td><Badge variant={ROLE_COLORS[user.role] || 'gray'}>{user.role}</Badge></td>
                  <td><Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="text-xs text-slate-500">{formatDate(user.last_login) || '—'}</td>
                  <td className="text-xs text-slate-500">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Edit size={14} /></button>
                      <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={pagination} onPageChange={goToPage} />
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editUser ? 'Edit User' : 'Add User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          {!editUser && <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          {!editUser && <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />}
          <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Role" options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          {editUser && (
            <Select label="Status" options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]}
              value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} />
          )}
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Deactivate User" message={`Deactivate ${deleteTarget?.first_name} ${deleteTarget?.last_name}? They will lose access.`}
        confirmLabel="Deactivate" loading={deleting} />
    </div>
  )
}

export default UsersPage
