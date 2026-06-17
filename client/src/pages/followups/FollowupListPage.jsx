import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { followupService } from '../../services/index'
import { usePaginatedApi } from '../../hooks/index'
import {
  Button, PageHeader, Select, Badge, LoadingState, EmptyState, Pagination, Card, Modal, Input, Textarea, Spinner
} from '../../components/ui/index'
import { formatDate, formatRelative, getStatusColor, getStatusLabel } from '../../utils/formatters'
import { businessService } from '../../services/businessService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const StatusIcon = ({ status }) => ({
  pending: <Clock size={14} className="text-amber-500" />,
  completed: <CheckCircle2 size={14} className="text-emerald-500" />,
  overdue: <AlertCircle size={14} className="text-red-500" />,
}[status] || <Clock size={14} />)

const FollowupCard = ({ followup, onComplete }) => (
  <div className={clsx('card p-4 border-l-4', {
    'border-l-amber-400': followup.status === 'pending',
    'border-l-red-500': followup.status === 'overdue',
    'border-l-emerald-500': followup.status === 'completed',
  })}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusIcon status={followup.status} />
          <h3 className="font-medium text-slate-800 truncate">{followup.title}</h3>
        </div>
        {followup.business_name && (
          <Link to={`/businesses/${followup.business_id}`} className="text-xs text-brand-600 hover:underline">
            {followup.business_name}
          </Link>
        )}
        {followup.notes && <p className="text-xs text-slate-500 mt-1">{followup.notes}</p>}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={getStatusColor(followup.status).replace('badge-', '')}>{getStatusLabel(followup.status)}</Badge>
          <span className="text-xs text-slate-400">
            Due: <span className={clsx(followup.status === 'overdue' && 'text-red-600 font-medium')}>{formatDate(followup.due_date)}</span>
          </span>
          <span className="text-xs text-slate-400">→ {followup.assigned_user_name}</span>
        </div>
      </div>
      {followup.status !== 'completed' && (
        <Button size="sm" variant="secondary" onClick={() => onComplete(followup.id)}>
          <CheckCircle2 size={12} /> Done
        </Button>
      )}
    </div>
  </div>
)

const FollowupListPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [form, setForm] = useState({ business_id: '', title: '', notes: '', due_date: '' })
  const [saving, setSaving] = useState(false)

  const { data: stats } = usePaginatedApi(followupService.getStats, {})

  const { data, pagination, loading, params, updateParams, goToPage, refetch } = usePaginatedApi(
    followupService.getAll, {}
  )

  useEffect(() => {
    businessService.getAll({ limit: 100 }).then((r) => setBusinesses(r.data.data || [])).catch(() => {})
  }, [])

  const handleComplete = async (id) => {
    await followupService.update(id, { status: 'completed' })
    toast.success('Follow-up marked complete')
    refetch()
  }

  const handleCreate = async () => {
    if (!form.business_id || !form.title || !form.due_date) {
      return toast.error('Business, title and due date are required')
    }
    setSaving(true)
    try {
      await followupService.create(form)
      toast.success('Follow-up created')
      setShowForm(false)
      setForm({ business_id: '', title: '', notes: '', due_date: '' })
      refetch()
    } catch { toast.error('Failed to create follow-up') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Follow Ups"
        description="Track and manage your follow-up tasks"
        actions={<Button onClick={() => setShowForm(true)}><Plus size={15} /> New Follow Up</Button>}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', key: 'pending', color: 'amber', icon: Clock },
          { label: 'Overdue', key: 'overdue', color: 'red', icon: AlertCircle },
          { label: 'Completed', key: 'completed', color: 'emerald', icon: CheckCircle2 },
        ].map(({ label, key, color, icon: Icon }) => (
          <button key={key} onClick={() => updateParams({ status: key })}
            className={clsx('card p-3 text-center hover:shadow-card-hover transition-shadow cursor-pointer',
              params.status === key && 'ring-2 ring-brand-500')}>
            <Icon size={18} className={`text-${color}-500 mx-auto mb-1`} />
            <p className="text-lg font-bold text-slate-800">{data?.filter ? '' : '—'}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </button>
        ))}
        <button onClick={() => updateParams({ status: '' })}
          className={clsx('card p-3 text-center hover:shadow-card-hover transition-shadow cursor-pointer',
            !params.status && 'ring-2 ring-brand-500')}>
          <Calendar size={18} className="text-brand-500 mx-auto mb-1" />
          <p className="text-xs text-slate-500">All Follow Ups</p>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={params.status || ''}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="min-w-[150px]"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : data?.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No follow-ups found"
          action={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Create Follow Up</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((f) => <FollowupCard key={f.id} followup={f} onComplete={handleComplete} />)}
          <Card><Pagination pagination={pagination} onPageChange={goToPage} /></Card>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Follow Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Spinner size="sm" /> : 'Create Follow Up'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Business *" placeholder="— Select business —"
            options={businesses.map((b) => ({ value: b.id, label: b.name }))}
            value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} />
          <Input label="Title *" placeholder="e.g. Send proposal to contact" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Due Date *" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Textarea label="Notes" placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}

export default FollowupListPage
