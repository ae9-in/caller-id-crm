import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Filter, Building2, Phone, Mail, Tag, MoreVertical, Trash2, Edit } from 'lucide-react'
import { businessService } from '../../services/businessService'
import { usePaginatedApi, useDebounce } from '../../hooks/index'
import {
  Button, PageHeader, SearchInput, Select, Badge,
  LoadingState, EmptyState, Pagination, Card, ConfirmModal
} from '../../components/ui/index'
import { getStatusColor, getStatusLabel } from '../../utils/formatters'
import { BUSINESS_STATUSES, PRIORITIES } from '../../utils/constants'
import { useAuth } from '../../context/AuthContext'
import BusinessFormModal from '../../components/business/BusinessFormModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PriorityDot = ({ priority }) => {
  const colors = { low: 'bg-slate-300', medium: 'bg-amber-400', high: 'bg-orange-500', urgent: 'bg-red-500' }
  return <span className={`w-2 h-2 rounded-full inline-block ${colors[priority] || 'bg-slate-300'}`} />
}

const BusinessCard = ({ business, onEdit, onDelete, isAdmin }) => (
  <div className="card hover:shadow-card-hover transition-shadow">
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/businesses/${business.id}`} className="group flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={business.priority} />
            <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors truncate">
              {business.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500">{business.category} · {business.industry}</p>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={getStatusColor(business.status).replace('badge-', '')}>
            {getStatusLabel(business.status)}
          </Badge>
          {isAdmin && (
            <div className="relative group/menu">
              <button className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <MoreVertical size={14} />
              </button>
              <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-card-hover z-10 py-1 w-32 hidden group-hover/menu:block">
                <button onClick={() => onEdit(business)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Edit size={12} /> Edit
                </button>
                <button onClick={() => onDelete(business)} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {business.contact_person && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400 w-4"><svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></span>
            {business.contact_person}
          </div>
        )}
        {business.phone && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone size={11} className="text-slate-400" />
            {business.phone}
          </div>
        )}
        {business.email && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail size={11} className="text-slate-400" />
            <span className="truncate">{business.email}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {business.tags && business.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {business.tags.slice(0, 3).map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}>
              {tag.name}
            </span>
          ))}
          {business.tags.length > 3 && (
            <span className="text-[10px] text-slate-400">+{business.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {business.city}{business.state ? `, ${business.state}` : ''}
        </span>
        <Link to={`/businesses/${business.id}`} className="text-xs text-brand-600 hover:text-brand-700">
          View details →
        </Link>
      </div>
    </div>
  </div>
)

const BusinessListPage = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editBusiness, setEditBusiness] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebounce(search)
  const { data, pagination, loading, params, updateParams, goToPage, refetch } = usePaginatedApi(
    businessService.getAll, {}
  )

  useEffect(() => { updateParams({ search: debouncedSearch }) }, [debouncedSearch])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await businessService.delete(deleteTarget.id)
      toast.success('Business deleted')
      setDeleteTarget(null)
      refetch()
    } catch {
      toast.error('Failed to delete business')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Businesses"
        description={`${pagination.total} businesses in your CRM`}
        actions={
          isAdmin && (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Business
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, email..."
          className="flex-1 min-w-48 max-w-xs"
        />
        <Select
          options={[{ value: '', label: 'All Statuses' }, ...BUSINESS_STATUSES]}
          value={params.status || ''}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="min-w-[160px]"
        />
        <Select
          options={[{ value: '', label: 'All Priorities' }, ...PRIORITIES]}
          value={params.priority || ''}
          onChange={(e) => updateParams({ priority: e.target.value })}
          className="min-w-[140px]"
        />
        <Select
          options={[
            { value: 'created_at', label: 'Newest First' },
            { value: 'name', label: 'Name A-Z' },
            { value: 'status', label: 'Status' },
            { value: 'updated_at', label: 'Recently Updated' },
          ]}
          value={params.sort || 'created_at'}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="min-w-[160px]"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingState message="Loading businesses..." />
      ) : data?.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} />}
          title="No businesses found"
          description={search ? 'Try adjusting your search or filters' : 'Add your first business to get started'}
          action={
            isAdmin && (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={15} /> Add Business
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                onEdit={(b) => { setEditBusiness(b); setShowForm(true) }}
                onDelete={setDeleteTarget}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          <div className="card">
            <Pagination pagination={pagination} onPageChange={goToPage} />
          </div>
        </>
      )}

      <BusinessFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditBusiness(null) }}
        business={editBusiness}
        onSaved={() => { setShowForm(false); setEditBusiness(null); refetch() }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Business"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all associated calls and notes.`}
        loading={deleting}
      />
    </div>
  )
}

export default BusinessListPage
