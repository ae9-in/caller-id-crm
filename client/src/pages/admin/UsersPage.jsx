import { useState } from 'react'
import { Plus, Users, Edit, Trash2, Shield, Building2 } from 'lucide-react'
import { userService } from '../../services/index'
import { businessService } from '../../services/businessService'
import { usePaginatedApi, useDebounce } from '../../hooks/index'
import {
  Button, PageHeader, SearchInput, Badge, LoadingState,
  EmptyState, Pagination, Card, Modal, Input, Select, Spinner, ConfirmModal
} from '../../components/ui/index'
import { formatDate } from '../../utils/formatters'
import { ROLES } from '../../utils/constants'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ROLE_COLORS = { admin: 'danger', manager: 'info', agent: 'gray' }

const UsersPage = () => {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'admin'
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'agent' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [assignUser, setAssignUser] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [selectedBusinessIds, setSelectedBusinessIds] = useState([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [savingAssignments, setSavingAssignments] = useState(false)

  const openAssignBusinesses = async (user) => {
    setAssignUser(user)
    setLoadingBusinesses(true)
    try {
      const response = await businessService.getAllForAssignment()
      setBusinesses(response.data.data || [])
      const assigned = (response.data.data || [])
        .filter((b) => b.assigned_user_id === user.id)
        .map((b) => b.id)
      setSelectedBusinessIds(assigned)
    } catch (err) {
      toast.error('Failed to load businesses')
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const handleSaveAssignments = async () => {
    setSavingAssignments(true)
    try {
      await businessService.assignMultiple(assignUser.id, selectedBusinessIds)
      toast.success('Businesses assigned successfully')
      setAssignUser(null)
    } catch (err) {
      toast.error('Failed to save assignments')
    } finally {
      setSavingAssignments(false)
    }
  }

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
                    {(isSuperAdmin || user.role === 'agent') && (
                      <div className="flex items-center gap-1">
                        {isSuperAdmin && (
                          <button 
                            onClick={() => openAssignBusinesses(user)} 
                            title="Assign Businesses"
                            className="p-1.5 rounded hover:bg-brand-50 text-slate-400 hover:text-brand-600"
                          >
                            <Building2 size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Edit size={14} /></button>
                        {user.id !== currentUser?.id && (
                          <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                        )}
                      </div>
                    )}
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
          {isSuperAdmin ? (
            <Select label="Role" options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          ) : (
            <div className="flex flex-col">
              <label className="form-label text-slate-500 text-xs">Role</label>
              <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-sm capitalize">
                {form.role}
              </div>
            </div>
          )}
          {editUser && (
            <Select label="Status" options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]}
              value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} />
          )}
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Deactivate User" message={`Deactivate ${deleteTarget?.first_name} ${deleteTarget?.last_name}? They will lose access.`}
        confirmLabel="Deactivate" loading={deleting} />

      <Modal 
        open={!!assignUser} 
        onClose={() => setAssignUser(null)} 
        title={`Assign Businesses to ${assignUser?.first_name} ${assignUser?.last_name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignUser(null)} disabled={savingAssignments}>Cancel</Button>
            <Button onClick={handleSaveAssignments} disabled={savingAssignments || loadingBusinesses}>
              {savingAssignments ? <Spinner size="sm" /> : 'Save'}
            </Button>
          </>
        }
      >
        {loadingBusinesses ? (
          <div className="flex justify-center py-6"><Spinner size="md" /></div>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No businesses found. Create businesses first.</p>
        ) : (
          <div className="space-y-2 max-h-90 overflow-y-auto pr-1">
            <p className="text-xs text-slate-500 mb-3">Select the businesses you want to assign to this user:</p>
            {businesses.map((b) => (
              <label key={b.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 border border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBusinessIds.includes(b.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBusinessIds([...selectedBusinessIds, b.id])
                    } else {
                      setSelectedBusinessIds(selectedBusinessIds.filter((id) => id !== b.id))
                    }
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  {b.assigned_user_id && b.assigned_user_id !== assignUser?.id && (
                    <span className="text-[10px] text-amber-600 font-medium">Currently assigned to another user</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default UsersPage
