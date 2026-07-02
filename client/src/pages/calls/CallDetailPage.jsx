import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, Download, RefreshCw, Clock, User, Building2,
  Mic, Brain, Copy, CheckCheck, FileText, MessageSquare, Trash2, Link2
} from 'lucide-react'
import { callService } from '../../services/callService'
import { useApi } from '../../hooks/index'
import {
  Button, Badge, Card, LoadingState, EmptyState, Textarea, PageHeader
} from '../../components/ui/index'
import {
  formatDate, formatDateTime, formatDuration, getStatusColor,
  getStatusLabel, getOutcomeColor, formatFileSize
} from '../../utils/formatters'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
      active ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
    {children}
  </button>
)

const SpeakerBubble = ({ segment }) => (
  <div className={clsx('flex gap-2 mb-3', segment.speaker === 'Agent' ? 'flex-row' : 'flex-row-reverse')}>
    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
      segment.speaker === 'Agent' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600')}>
      {segment.speaker === 'Agent' ? 'A' : 'C'}
    </div>
    <div className={clsx('max-w-[80%] rounded-2xl px-3 py-2',
      segment.speaker === 'Agent' ? 'bg-brand-50 rounded-tl-none' : 'bg-slate-100 rounded-tr-none')}>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{segment.speaker}</p>
      <p className="text-sm text-slate-800">{segment.text}</p>
      {segment.start != null && (
        <p className="text-[10px] text-slate-400 mt-1">{formatDuration(Math.round(segment.start))}</p>
      )}
    </div>
  </div>
)

const CallDetailPage = () => {
  const { id } = useParams()
  const { isManager } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState('transcript')
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [userFolders, setUserFolders] = useState([])
  const [foldersLoading, setFoldersLoading] = useState(false)

  const { data: call, loading: callLoading, refetch: refetchCall } = useApi(() => callService.getById(id), [id])
  const { data: transcript, loading: tLoading, refetch: refetchTranscript } = useApi(() => callService.getTranscript(id), [id])
  const { data: summary, loading: sLoading, refetch: refetchSummary } = useApi(() => callService.getSummary(id), [id])
  const { data: notes, loading: nLoading, refetch: refetchNotes } = useApi(() => callService.getNotes(id), [id])

  // Auto-refresh when call is uploading or processing
  useEffect(() => {
    if (!call || (call.status !== 'uploaded' && call.status !== 'processing')) {
      return
    }

    const interval = setInterval(() => {
      refetchCall()
      refetchTranscript()
      refetchSummary()
      refetchNotes()
    }, 3000)

    return () => clearInterval(interval)
  }, [call?.status, refetchCall, refetchTranscript, refetchSummary, refetchNotes])

  useEffect(() => {
    if (!call?.user_id) return
    const fetchUserFolders = async () => {
      setFoldersLoading(true)
      try {
        const res = await callService.getCallFolders({ user_id: call.user_id })
        setUserFolders(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch user folders:', err)
      } finally {
        setFoldersLoading(false)
      }
    }
    fetchUserFolders()
  }, [call?.user_id])

  const getCallFolderDate = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.split('T')[0]
  }

  const formatFolderDateShort = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const currentFolder = userFolders.find(
    (f) => f.calls.some((c) => c.id === call.id)
  )
  const currentFolderDate = currentFolder ? currentFolder.folder_date : ''

  const currentCallIndex = currentFolder
    ? currentFolder.calls.findIndex((c) => c.id === call.id)
    : -1

  const nextCall = currentFolder && currentCallIndex !== -1 && currentCallIndex < currentFolder.calls.length - 1
    ? currentFolder.calls[currentCallIndex + 1]
    : null

  const prevCall = currentFolder && currentCallIndex > 0
    ? currentFolder.calls[currentCallIndex - 1]
    : null

  const handleNavigateToCall = (callId) => {
    navigate(`/calls/${callId}`, { state: location.state })
    localStorage.setItem('crm_selected_call_id', callId)
  }

  const handleDateFilterChange = (dateVal) => {
    const selectedFolder = userFolders.find((f) => f.folder_date === dateVal)
    const topCall = selectedFolder?.calls[0]
    if (topCall) {
      handleNavigateToCall(topCall.id)
    }
  }

  const handleCopyTranscript = () => {
    if (transcript?.full_text) {
      navigator.clipboard.writeText(transcript.full_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Transcript copied')
    }
  }

  const handleCopyAudioLink = async () => {
    let url = call.file_url;
    if (url && !url.startsWith('http')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      url = `${apiBase}${url}`;
    }
    
    if (!url) {
      toast.error('No audio URL available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Audio link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  }

  const getAudioSrc = () => {
    if (!call?.file_url) return '';
    if (call.file_url.startsWith('http')) return call.file_url;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002';
    return `${apiBase}${call.file_url}`;
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await callService.addNote(id, { content: noteContent })
      setNoteContent('')
      refetchNotes()
      toast.success('Note added')
    } catch { toast.error('Failed') } finally { setAddingNote(false) }
  }

  const handleReprocess = async () => {
    setReprocessing(true)
    try {
      await callService.reprocess(id)
      toast.success('Reprocessing queued')
      refetchCall()
    } catch (err) {
      toast.error('Failed to queue reprocessing')
    } finally {
      setReprocessing(false)
    }
  }

  const handleDeleteCall = async () => {
    if (!window.confirm('Are you sure you want to delete this call recording? This action cannot be undone.')) {
      return
    }
    setDeleting(true)
    try {
      await callService.delete(id)
      toast.success('Call recording deleted successfully')
      navigate('/calls')
    } catch (err) {
      toast.error('Failed to delete call recording')
    } finally {
      setDeleting(false)
    }
  }

  if (callLoading) return <LoadingState />
  if (!call) return <div className="text-center py-16 text-slate-500">Call not found</div>

  const agentPct = call.agent_talk_time + call.customer_talk_time > 0
    ? Math.round((call.agent_talk_time / (call.agent_talk_time + call.customer_talk_time)) * 100)
    : 0

  return (
    <div className="space-y-5 fade-in">
      <div>
        <Link to={location.state?.from || '/calls'} className="text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> {location.state?.from?.includes('/calls/folders') ? 'Back to Call Folders' : location.state?.from?.includes('/businesses') ? 'Back to Business Details' : 'Back to Calls'}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{call.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={getStatusColor(call.status).replace('badge-', '')}>{getStatusLabel(call.status)}</Badge>
              {call.is_pitched
                ? <Badge variant="success">Pitched</Badge>
                : <Badge variant="gray">Not Pitched</Badge>}
              {call.call_outcome && (
                <Badge variant={getOutcomeColor(call.call_outcome).replace('badge-', '')}>{getStatusLabel(call.call_outcome)}</Badge>
              )}
              {call.is_duplicate && <Badge variant="warning">Possible Duplicate</Badge>}
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Date filter dropdown */}
            {userFolders.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase shrink-0">Date:</span>
                <select
                  value={currentFolderDate}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer border-0 p-0"
                >
                  {userFolders.map((f) => (
                    <option key={f.folder_date} value={f.folder_date} className="dark:bg-zinc-900 text-slate-800 dark:text-zinc-100">
                      {formatFolderDateShort(f.folder_date)} ({f.total_calls})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prev Audio Button */}
            {prevCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateToCall(prevCall.id)}
                className="flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 hover:border-brand-300 hover:text-brand-600"
              >
                ← Prev Audio
              </Button>
            )}

            {/* Next Audio Button */}
            {nextCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateToCall(nextCall.id)}
                className="flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 hover:border-brand-300 hover:text-brand-600"
              >
                Next Audio →
              </Button>
            )}

            {/* Vertical Divider */}
            {(userFolders.length > 0 || prevCall || nextCall) && (
              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1" />
            )}

            <Button variant="ghost" size="sm" onClick={handleCopyAudioLink}>
              <Link2 size={14} /> Copy Link
            </Button>
            {isManager() && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReprocess} disabled={reprocessing}>
                  <RefreshCw size={14} className={clsx(reprocessing && 'animate-spin')} /> Reprocess
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteCall} disabled={deleting}>
                  <Trash2 size={14} /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: info panel */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Call Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Date</span><span>{formatDateTime(call.call_date)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="font-mono">{formatDuration(call.duration_seconds)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Agent</span><span>{call.user_name}</span></div>
              {call.business_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Business</span>
                  <Link to={`/businesses/${call.business_id}`} className="text-brand-600 hover:underline">{call.business_name}</Link>
                </div>
              )}
              <div className="flex justify-between"><span className="text-slate-400">File Size</span><span>{formatFileSize(call.file_size)}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-slate-400 font-medium">Audio Link</span>
                <button
                  onClick={handleCopyAudioLink}
                  className="text-xs text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-semibold"
                >
                  <Link2 size={12} className="shrink-0" />
                  Copy Link
                </button>
              </div>
            </div>
          </Card>

          {/* Audio Player Card */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Recording Playback</h3>
            {call.file_url ? (
              <audio
                src={getAudioSrc()}
                controls
                className="w-full mt-1.5 focus:outline-none"
                preload="metadata"
              />
            ) : (
              <p className="text-xs text-slate-400 italic">Audio recording not available</p>
            )}
          </Card>

          {/* Talk time */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Talk Time</h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Agent</span>
                <span>{agentPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-brand-500 h-2.5 rounded-full" style={{ width: `${agentPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="bg-brand-50 rounded-lg p-2">
                <p className="font-bold text-brand-700">{formatDuration(call.agent_talk_time)}</p>
                <p className="text-xs text-slate-400">Agent</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="font-bold text-slate-700">{formatDuration(call.customer_talk_time)}</p>
                <p className="text-xs text-slate-400">Customer</p>
              </div>
            </div>
          </Card>

          {/* AI Scores */}
          {summary && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-3">AI Scores</h3>
              {[
                { label: 'Pitch Score', value: summary.pitch_score, color: 'brand' },
                { label: 'Confidence', value: summary.confidence_score, color: 'emerald' },
                { label: 'Engagement', value: summary.engagement_score, color: 'purple' },
                { label: 'Overall', value: summary.overall_score, color: 'amber' },
              ].map(({ label, value, color }) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{label}</span>
                    <span className={`font-semibold text-${color}-600`}>{value ?? '—'}{value != null ? '/100' : ''}</span>
                  </div>
                  {value != null && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`bg-${color}-500 h-1.5 rounded-full`} style={{ width: `${value}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Right: tabbed content */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
              {['summary', 'notes', ...(isManager() ? ['transcript'] : [])].map((tab) => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabButton>
              ))}
            </div>

            <div className="p-5">
              {/* Transcript */}
              {activeTab === 'transcript' && (
                <div>
                  {tLoading ? (
                    <LoadingState />
                  ) : !isManager() ? (
                    <EmptyState
                      icon={<Mic size={36} />}
                      title="Access Denied"
                      description="You don't have permission to view the transcript."
                    />
                  ) : !transcript ? (
                    <EmptyState
                      icon={<Mic size={36} />}
                      title="Transcript not ready"
                      description="Processing may still be in progress"
                    />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs text-slate-400">
                          {transcript.word_count} words · {transcript.language?.toUpperCase()}
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCopyTranscript}>
                          {copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      {/* Speaker segments */}
                      {transcript.speaker_segments && transcript.speaker_segments.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto scrollbar-thin pr-2">
                          {transcript.speaker_segments.map((seg, i) => (
                            <SpeakerBubble key={i} segment={seg} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-thin">
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {transcript.full_text}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {activeTab === 'summary' && (
                <div>
                  {sLoading ? <LoadingState /> : !summary ? (
                    <EmptyState icon={<Brain size={36} />} title="Summary not ready" description="AI analysis is in progress" />
                  ) : (
                    <div className="space-y-4">
                      {summary.sentiment && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">Sentiment:</span>
                          <Badge variant={getStatusColor(summary.sentiment).replace('badge-', '')}>
                            {getStatusLabel(summary.sentiment)}
                          </Badge>
                        </div>
                      )}
                      {summary.summary && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Summary</h4>
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{summary.summary}</p>
                        </div>
                      )}
                      {summary.key_points?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Key Points</h4>
                          <ul className="space-y-1.5">
                            {summary.key_points.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="text-brand-500 mt-0.5">•</span>{p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summary.action_items?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Action Items</h4>
                          <ul className="space-y-1.5">
                            {summary.action_items.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="text-amber-500 mt-0.5">→</span>{a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summary.follow_up_suggestions?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Follow-up Suggestions</h4>
                          <ul className="space-y-1.5">
                            {summary.follow_up_suggestions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="text-emerald-500 mt-0.5">✓</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <Textarea placeholder="Add a note about this call..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteContent.trim()}>Add Note</Button>
                    </div>
                  </div>
                  {nLoading ? <LoadingState /> : !notes?.length ? (
                    <EmptyState icon={<MessageSquare size={36} />} title="No notes yet" />
                  ) : notes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {note.is_ai_generated && <Badge variant="purple">AI</Badge>}
                        <span className="text-xs text-slate-400">{note.user_name || 'System'}</span>
                        {note.timestamp_seconds != null && (
                          <><span className="text-slate-300">·</span><span className="text-xs text-slate-400">at {formatDuration(note.timestamp_seconds)}</span></>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CallDetailPage
