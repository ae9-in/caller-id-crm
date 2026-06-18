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
  const [expandedUsers, setExpandedUsers] = useState([])
  const [expandedDates, setExpandedDates] = useState([])

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
      const folderData = res.data.data || []
      setFolders(folderData)

      // Auto-expand first folder on initial load if present
      if (folderData.length > 0) {
        const firstFolder = folderData[0]
        setExpandedUsers((prev) => prev.length > 0 ? prev : [firstFolder.user_id])
        
        const firstDateKey = `${firstFolder.user_id}-${firstFolder.folder_date}`
        setExpandedDates((prev) => prev.length > 0 ? prev : [firstDateKey])

        // Auto-select the first folder
        setSelectedFolder((prev) => {
          if (prev) {
            const exists = folderData.find(
              (f) => f.folder_date === prev.folder_date && f.user_id === prev.user_id
            )
            return exists || firstFolder
          }
          return firstFolder
        })
      } else {
        setSelectedFolder(null)
      }
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

  // Short Date formatting (e.g. "Jun 18")
  const formatFolderDateShort = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

  // Group folders by user
  const groupedUsers = []
  folders.forEach((folder) => {
    let userGroup = groupedUsers.find((g) => g.user_id === folder.user_id)
    if (!userGroup) {
      userGroup = {
        user_id: folder.user_id,
        user_name: folder.user_name,
        dates: [],
        total_calls: 0
      }
      groupedUsers.push(userGroup)
    }
    userGroup.dates.push(folder)
    userGroup.total_calls += folder.total_calls
  })

  // Toggle user folder expanded state
  const toggleUser = (userId) => {
    setExpandedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Toggle date folder expanded state
  const toggleDate = (dateKey) => {
    setExpandedDates((prev) =>
      prev.includes(dateKey) ? prev.filter((k) => k !== dateKey) : [...prev, dateKey]
    )
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

      {/* Grid containing Sidebar and Explorer details */}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Left Panel: Folders Sidebar - Grouped by Agent then by Date */}
          <div className="col-span-1 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5 max-h-[70vh] overflow-y-auto scrollbar-thin">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-2">
              Folders Tree
            </h3>
            {groupedUsers.map((group) => {
              const isUserExpanded = expandedUsers.includes(group.user_id)

              return (
                <div key={group.user_id} className="space-y-1">
                  {/* Top-Level User Folder Button */}
                  <button
                    onClick={() => toggleUser(group.user_id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Folder
                        size={18}
                        className="text-brand-500 fill-brand-100 dark:fill-brand-950/20"
                      />
                      <span className="truncate">{group.user_name || 'Unknown Agent'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[9px] font-bold bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
                        {group.total_calls}
                      </span>
                      <span className={`text-[8px] text-slate-400 transition-transform duration-200 ${isUserExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                    </div>
                  </button>

                  {/* Level 2: Dates under this Agent */}
                  {isUserExpanded && (
                    <div className="pl-3.5 pr-0.5 py-0.5 space-y-1 border-l border-slate-200 dark:border-zinc-800 ml-4 animate-fade-in">
                      {group.dates.map((folder) => {
                        const dateKey = `${group.user_id}-${folder.folder_date}`
                        const isDateSelected = selectedFolder && selectedFolder.folder_date === folder.folder_date && selectedFolder.user_id === folder.user_id
                        const isDateExpanded = expandedDates.includes(dateKey)

                        return (
                          <div key={dateKey} className="space-y-1">
                            {/* Date Button */}
                            <button
                              onClick={() => {
                                setSelectedFolder(folder)
                                toggleDate(dateKey)
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-all text-left ${
                                isDateSelected
                                  ? 'bg-brand-500 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-800/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Calendar
                                  size={14}
                                  className={isDateSelected ? 'text-white' : 'text-slate-400 dark:text-zinc-500'}
                                />
                                <span className="truncate">
                                  {formatFolderDateShort(folder.folder_date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isDateSelected
                                    ? 'bg-white/25 text-white'
                                    : 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400'
                                }`}>
                                  {folder.total_calls}
                                </span>
                                <span className={`text-[7px] transition-transform duration-200 ${isDateExpanded ? 'rotate-90' : ''}`}>
                                  ▶
                                </span>
                              </div>
                            </button>

                            {/* Level 3: Files under this Date */}
                            {isDateExpanded && (
                              <div className="pl-3.5 pr-0.5 py-0.5 space-y-1 border-l border-slate-200 dark:border-zinc-800 ml-3 animate-fade-in">
                                {folder.calls.map((call) => (
                                  <Link
                                    key={call.id}
                                    to={`/calls/${call.id}`}
                                    className="flex items-center gap-2 p-1.5 rounded-lg text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-800/30 transition-all min-w-0"
                                  >
                                    <span className="shrink-0 text-slate-400 text-[10px]">📞</span>
                                    <span className="truncate flex-1">{call.title || call.file_name}</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Panel: Call Explorer Details */}
          <div className="col-span-3 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden min-h-[50vh] flex flex-col">
            {selectedFolder ? (
              <div className="flex flex-col h-full flex-1">
                {/* Explorer Breadcrumb and Info */}
                <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 mb-1.5">
                      <span>Call Folders</span>
                      <span>/</span>
                      <span>{selectedFolder.user_name}</span>
                      <span>/</span>
                      <span className="text-slate-600 dark:text-zinc-400 font-medium">{formatFolderDate(selectedFolder.folder_date)}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                      {selectedFolder.user_name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Folder Date: <strong>{formatFolderDate(selectedFolder.folder_date)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-5 text-sm bg-[var(--color-surface)] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedFolder.total_calls} Files</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                      <Clock size={14} className="text-slate-400" />
                      <span>{formatDuration(selectedFolder.total_duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Subfolder File Collection */}
                <div className="p-6 space-y-3.5 overflow-y-auto max-h-[55vh] flex-1">
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
                        className="p-4 bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-brand-200 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
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
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center py-24">
                <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Folder className="text-slate-400 dark:text-zinc-500" size={30} />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">No Folder Selected</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1.5 max-w-xs leading-normal">
                  Select a folder in the sidebar tree to browse its recording files.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CallFoldersPage
