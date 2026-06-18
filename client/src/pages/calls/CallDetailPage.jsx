import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, Download, RefreshCw, Clock, User, Building2,
  Mic, Brain, Copy, CheckCheck, FileText, MessageSquare, Trash2
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

  const [activeTab, setActiveTab] = useState('transcript')
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: call, loading: callLoading } = useApi(() => callService.getById(id), [id])
  const { data: transcript, loading: tLoading } = useApi(() => callService.getTranscript(id), [id])
  const { data: summary, loading: sLoading } = useApi(() => callService.getSummary(id), [id])
  const { data: notes, loading: nLoading, refetch: refetchNotes } = useApi(() => callService.getNotes(id), [id])

  const handleCopyTranscript = () => {
    if (transcript?.full_text) {
      navigator.clipboard.writeText(transcript.full_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Transcript copied')
    }
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
    await callService.reprocess(id)
    toast.success('Reprocessing queued')
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
        <Link to="/calls" className="text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back to Calls
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
          {isManager() && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleReprocess}>
                <RefreshCw size={14} /> Reprocess
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteCall} disabled={deleting}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          )}
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
            </div>
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
              {['transcript', 'summary', 'notes'].map((tab) => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabButton>
              ))}
            </div>

            <div className="p-5">
              {/* Transcript */}
              {activeTab === 'transcript' && (
                <div>
                  {tLoading ? <LoadingState /> : !transcript ? (
                    <EmptyState icon={<Mic size={36} />} title="Transcript not ready" description="Processing may still be in progress" />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs text-slate-400">{transcript.word_count} words · {transcript.language?.toUpperCase()}</div>
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
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{transcript.full_text}</p>
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
