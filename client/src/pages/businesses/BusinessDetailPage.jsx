import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Edit, Plus,
  Calendar, Clock, FileText, Trash2, Tag
} from 'lucide-react'
import { businessService } from '../../services/businessService'
import { callService } from '../../services/callService'
import { followupService } from '../../services/index'
import { useApi } from '../../hooks/index'
import {
  Button, Badge, Card, LoadingState, EmptyState, Modal, Textarea
} from '../../components/ui/index'
import {
  formatDate, formatDateTime, formatRelative, formatDuration,
  getStatusColor, getStatusLabel, getOutcomeColor
} from '../../utils/formatters'
import { useAuth } from '../../context/AuthContext'
import BusinessFormModal from '../../components/business/BusinessFormModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={clsx(
      'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
      active
        ? 'border-brand-600 text-brand-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    )}
  >
    {children}
  </button>
)

const TimelineItem = ({ activity }) => {
  const icons = {
    call_uploaded: '📞',
    business_created: '🏢',
    follow_up_created: '📅',
    follow_up_completed: '✅',
    meeting_scheduled: '🤝',
    note_added: '📝',
    status_changed: '🔄',
    tag_added: '🏷️',
  }
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm shrink-0">
          {icons[activity.type] || '•'}
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="flex-1 pb-2">
        <p className="text-sm font-medium text-slate-800">{activity.title}</p>
        {activity.description && <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{activity.user_name}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">{formatRelative(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

const BusinessDetailPage = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const { data: business, loading, refetch } = useApi(() => businessService.getById(id), [id])
  const { data: timeline } = useApi(() => businessService.getTimeline(id), [id])
  const { data: calls } = useApi(() => businessService.getCalls(id), [id])
  const { data: notes, refetch: refetchNotes } = useApi(() => businessService.getNotes(id), [id])

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await businessService.addNote(id, noteContent)
      setNoteContent('')
      refetchNotes()
      toast.success('Note added')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  if (loading) return <LoadingState />
  if (!business) return <div className="text-center py-16 text-slate-500">Business not found</div>

  return (
    <div className="space-y-5 fade-in">
      {/* Back + header */}
      <div>
        <Link to="/businesses" className="text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back to Businesses
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
              <Badge variant={getStatusColor(business.status).replace('badge-', '')}>
                {getStatusLabel(business.status)}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1">{business.category} · {business.industry}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                <Edit size={14} /> Edit
              </Button>
            )}
            <Link to="/calls/upload" state={{ business_id: id, business_name: business.name }}>
              <Button size="sm"><Phone size={14} /> Upload Call</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: info */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Contact Info</h3>
            {business.contact_person && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-slate-400 w-4 text-center">👤</span>
                {business.contact_person}
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone size={14} className="text-slate-400" />
                <a href={`tel:${business.phone}`} className="hover:text-brand-600">{business.phone}</a>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail size={14} className="text-slate-400" />
                <a href={`mailto:${business.email}`} className="hover:text-brand-600 truncate">{business.email}</a>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Globe size={14} className="text-slate-400" />
                <a href={business.website} target="_blank" rel="noreferrer" className="hover:text-brand-600 truncate">{business.website}</a>
              </div>
            )}
            {(business.city || business.state) && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={14} className="text-slate-400" />
                {[business.address, business.city, business.state].filter(Boolean).join(', ')}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-400 text-xs">Priority</p><p className="font-medium capitalize">{business.priority}</p></div>
              <div><p className="text-slate-400 text-xs">Status</p><p className="font-medium">{getStatusLabel(business.status)}</p></div>
              <div>
                <p className="text-slate-400 text-xs">Assigned To</p>
                <p className="font-medium">
                  {business.assignees && business.assignees.length > 0
                    ? business.assignees.map((ua) => `${ua.first_name} ${ua.last_name || ''}`).join(', ')
                    : (business.assigned_user_name || business.created_by_name || 'Admin')}
                </p>
              </div>
              <div><p className="text-slate-400 text-xs">Added By</p><p className="font-medium">{business.created_by_name || '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Created</p><p className="font-medium">{formatDate(business.created_at)}</p></div>
              <div><p className="text-slate-400 text-xs">Updated</p><p className="font-medium">{formatDate(business.updated_at)}</p></div>
            </div>
            {business.tags && business.tags.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {business.tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Sales Pitch Script Card */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              <FileText size={16} className="text-slate-400" />
              Sales Pitch Script
            </h3>
            
            {business.pitch_pdf_filename ? (
              <div className="space-y-2">
                <div className="p-2 bg-slate-50 border border-slate-100 rounded flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-[180px]" title={business.pitch_pdf_filename}>
                    📄 {business.pitch_pdf_filename}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">active</span>
                </div>
                {business.pitch_pdf_keywords && business.pitch_pdf_keywords.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {business.pitch_pdf_keywords.map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100 text-[10px] font-medium font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-amber-50/50 border border-amber-100 p-2 rounded">
                No business-specific script uploaded. Falling back to the global pitch script.
              </p>
            )}

            {(isAdmin || user?.role === 'manager') && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {business.pitch_pdf_filename ? 'Replace Pitch PDF' : 'Upload Pitch PDF'}
                </label>
                <input
                  type="file"
                  id="pitch-pdf-upload-input"
                  accept="application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append('file', file)
                    const uploadToast = toast.loading('Uploading and analyzing pitch script...')
                    try {
                      await businessService.uploadBusinessPitchPdf(business.id, formData)
                      toast.success('Pitch script uploaded & analyzed successfully', { id: uploadToast })
                      refetch()
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to upload pitch script', { id: uploadToast })
                    }
                  }}
                  className="block w-full text-xs text-slate-500
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-semibold
                    file:bg-brand-50 file:text-brand-700
                    hover:file:bg-brand-100 cursor-pointer"
                />
              </div>
            )}
          </Card>
        </div>

        {/* Right column: tabs */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
              {['overview', 'calls', 'notes', 'timeline'].map((tab) => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'calls' && calls ? ` (${calls.length})` : ''}
                  {tab === 'notes' && notes ? ` (${notes.length})` : ''}
                </TabButton>
              ))}
            </div>

            <div className="p-5">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {business.notes ? (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Business Notes</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{business.notes}</p>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-slate-800">{calls?.length || 0}</p>
                      <p className="text-xs text-slate-500">Total Calls</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-slate-800">{notes?.length || 0}</p>
                      <p className="text-xs text-slate-500">Notes</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-slate-800">{timeline?.length || 0}</p>
                      <p className="text-xs text-slate-500">Activities</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Calls */}
              {activeTab === 'calls' && (
                <div className="space-y-3">
                  {!calls?.length ? (
                    <EmptyState icon={<Phone size={36} />} title="No calls yet" description="Upload a call recording for this business" />
                  ) : calls.map((call) => (
                    <Link key={call.id} to={`/calls/${call.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand-200 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{call.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(call.call_date)} · {formatDuration(call.duration_seconds)}</p>
                      </div>
                      <Badge variant={getOutcomeColor(call.call_outcome).replace('badge-', '')}>
                        {getStatusLabel(call.call_outcome)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <Textarea placeholder="Add a note..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteContent.trim()}>
                        Add Note
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {!notes?.length ? (
                      <EmptyState icon={<FileText size={36} />} title="No notes yet" />
                    ) : notes.map((note) => (
                      <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {note.is_ai_generated && <Badge variant="purple">AI</Badge>}
                          <span className="text-xs text-slate-400">{note.user_name}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{formatRelative(note.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {activeTab === 'timeline' && (
                <div>
                  {!timeline?.length ? (
                    <EmptyState icon={<Clock size={36} />} title="No activity yet" />
                  ) : (
                    <div>
                      {timeline.map((activity) => (
                        <TimelineItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <BusinessFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        business={business}
        onSaved={() => { setShowEdit(false); refetch() }}
      />
    </div>
  )
}

export default BusinessDetailPage
