import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { callService } from '../../services/callService'
import { useAuth } from '../../context/AuthContext'
import { Spinner, Button } from '../../components/ui/index'
import api from '../../services/api'
import {
  Folder, Calendar, User, Search, X, Clock, ArrowRight,
  Filter, Phone, CheckCircle2, AlertCircle, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const CallFoldersPage = () => {
  const { user, isAdmin, isManager } = useAuth()
  const canFilterUsers = isAdmin() || isManager()

  // State
  const [folders, setFolders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch folders data
  const fetchFolders = async () => {
    setLoading(true)
    try {
      const params = {}
      if (debouncedSearch) params.search = debouncedSearch
      if (selectedDate) params.date = selectedDate
      if (selectedUserId) params.user_id = selectedUserId

      const res = await callService.getCallFolders(params)
      setFolders(res.data.data || [])
    } catch (err) {
      toast.error('Failed to fetch call folders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch users for admin dropdown
  const fetchUsers = async () => {
    if (!canFilterUsers) return
    setLoadingUsers(true)
    try {
      const res = await api.get('/users?limit=100')
      setUsers(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch users list', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [debouncedSearch, selectedDate, selectedUserId])

  useEffect(() => {
    fetchUsers()
  }, [])

  // Clear filters helper
  const handleClearFilters = () => {
    setSearch('')
    setSelectedDate('')
    setSelectedUserId('')
    toast.success('Filters cleared')
  }

  // Format date helper
  const formatFolderDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Format seconds to HH:MM:SS or MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format bytes helper
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2.5">
            <Folder className="text-brand-500 fill-brand-100 dark:fill-brand-950/40" size={28} />
            Call Folders
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1.5 text-sm">
            View all uploaded call recordings organized day-by-day and per agent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/calls/upload">
            <Button variant="primary" size="md">
              Upload New Call
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 p-4 rounded-xl flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
          <input
            type="text"
            placeholder="Search by agent name or files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[180px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClick={(e) => {
              try {
                e.target.showPicker();
              } catch (err) {
                console.error('showPicker not supported:', err);
              }
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          />
        </div>

        {/* Agent Filter (Admin/Manager Only) */}
        {canFilterUsers && (
          <div className="relative min-w-[200px]">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer appearance-none"
            >
              <option value="">All Agents</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-t-slate-400 border-l-transparent border-r-transparent w-0 h-0" />
          </div>
        )}

        {/* Clear Filters Button */}
        {(search || selectedDate || selectedUserId) && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X size={14} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid of Folders */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--color-surface)] rounded-2xl border border-slate-200 dark:border-zinc-800">
          <Spinner size="lg" />
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-3 font-medium">Loading folders...</p>
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Folder className="text-slate-400 dark:text-zinc-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200">No Folders Found</h3>
          <p className="text-slate-500 dark:text-zinc-400 max-w-sm mt-2 text-sm leading-relaxed">
            We couldn't find any call recording folders matching the selected criteria. Try adjusting your search term or filtering options.
          </p>
          {(search || selectedDate || selectedUserId) && (
            <Button variant="secondary" size="md" className="mt-5" onClick={handleClearFilters}>
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {folders.map((folder, index) => {
            const isSelected = selectedFolder && selectedFolder.folder_date === folder.folder_date && selectedFolder.user_id === folder.user_id

            return (
              <div
                key={`${folder.folder_date}-${folder.user_id}`}
                onClick={() => setSelectedFolder(folder)}
                className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden bg-[var(--color-surface)] ${isSelected
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-zinc-700 hover:shadow-md hover:-translate-y-0.5'
                  }`}
              >
                {/* Folder Top Line */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl transition-colors ${isSelected
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20'
                      : 'bg-brand-50/55 dark:bg-zinc-800 text-brand-500 dark:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/10'
                    }`}>
                    <Folder className="shrink-0" size={24} />
                  </div>
                  <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-full font-medium">
                    {folder.total_calls} {folder.total_calls === 1 ? 'recording' : 'recordings'}
                  </span>
                </div>

                {/* Folder Details */}
                <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-base leading-tight">
                  {formatFolderDate(folder.folder_date)}
                </h3>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-slate-600 dark:text-zinc-400 font-bold text-[10px]">
                        {folder.user_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 truncate">
                      {folder.user_id === user?.id ? 'My Uploads' : folder.user_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-500 shrink-0">
                    <Clock size={13} />
                    <span className="text-xs font-medium">{formatDuration(folder.total_duration)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer Overlay for Folder Contents */}
      {selectedFolder && (
        <div className="fixed inset-0 z-40 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 transition-opacity duration-300 backdrop-blur-sm"
            onClick={() => setSelectedFolder(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-2xl bg-[var(--color-surface)] h-full shadow-2xl flex flex-col z-50 border-l border-slate-200 dark:border-zinc-800 animate-slide-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center">
                  <Folder size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-zinc-100 text-lg leading-tight">
                    {formatFolderDate(selectedFolder.folder_date)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                    Uploaded by: <strong>{selectedFolder.user_name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aggregated folder info */}
            <div className="px-6 py-4 bg-slate-100/50 dark:bg-zinc-900/30 border-b border-slate-200 dark:border-zinc-800/60 flex items-center justify-between text-sm shrink-0">
              <div className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <Phone size={14} className="text-slate-400" />
                <span>{selectedFolder.total_calls} Files</span>
              </div>
              <div className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <Clock size={14} className="text-slate-400" />
                <span>Total Length: {formatDuration(selectedFolder.total_duration)}</span>
              </div>
            </div>

            {/* Drawer Body - File List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedFolder.calls.map((call) => {
                const outcomeColors = {
                  interested: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
                  not_interested: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50',
                  follow_up_needed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50',
                  call_back_later: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
                  meeting_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
                  wrong_number: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
                  no_answer: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
                  unknown: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                }

                const statusLabels = {
                  uploaded: 'Uploaded',
                  processing: 'Processing...',
                  transcribed: 'Transcribed',
                  failed: 'Failed'
                }

                return (
                  <div
                    key={call.id}
                    className="p-4 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-brand-200 dark:hover:border-zinc-700 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-zinc-100 text-sm truncate block max-w-sm">
                          {call.title || call.file_name}
                        </span>
                        {call.is_duplicate && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded">
                            DUPLICATE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className="font-medium">{formatFileSize(call.file_size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDuration(call.duration_seconds)}
                        </span>
                        <span>•</span>
                        <span>{new Date(call.call_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      {/* Status / Outcome badge */}
                      {call.status === 'transcribed' ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${outcomeColors[call.call_outcome || 'unknown']}`}>
                          {call.call_outcome ? call.call_outcome.replace(/_/g, ' ') : 'analyzed'}
                        </span>
                      ) : call.status === 'processing' ? (
                        <span className="text-xs bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/50 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                          {/* Animated micro-soundwave loader */}
                          <span className="flex items-center gap-0.5 w-3 h-2.5 shrink-0">
                            <span className="w-0.5 h-full bg-brand-600 dark:bg-brand-400 rounded-full animate-wave-1" />
                            <span className="w-0.5 h-1/2 bg-brand-600 dark:bg-brand-400 rounded-full animate-wave-2" />
                            <span className="w-0.5 h-3/4 bg-brand-600 dark:bg-brand-400 rounded-full animate-wave-3" />
                          </span>
                          {statusLabels[call.status]}
                        </span>
                      ) : call.status === 'failed' ? (
                        <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          <AlertCircle size={12} />
                          {statusLabels[call.status]}
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          <Info size={12} />
                          {statusLabels[call.status]}
                        </span>
                      )}

                      {/* Detail Link */}
                      <Link to={`/calls/${call.id}`}>
                        <button className="p-2 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 dark:bg-zinc-800 dark:hover:bg-brand-950/30 dark:hover:text-brand-400 text-slate-700 dark:text-zinc-300 transition-colors">
                          <ArrowRight size={15} />
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CallFoldersPage
