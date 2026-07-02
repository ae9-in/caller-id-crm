import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Phone, Upload, Filter, Clock, CheckCircle2, Link2 } from 'lucide-react'
import { callService } from '../../services/callService'
import toast from 'react-hot-toast'
import { usePaginatedApi, useDebounce } from '../../hooks/index'
import {
  Button, PageHeader, SearchInput, Select, Badge,
  LoadingState, EmptyState, Pagination, Card
} from '../../components/ui/index'
import {
  formatDate, formatDuration, getStatusColor, getStatusLabel,
  getOutcomeColor, formatFileSize
} from '../../utils/formatters'
import { CALL_OUTCOMES } from '../../utils/constants'
import { useState as useS } from 'react'

const StatusIcon = ({ status }) => {
  if (status === 'transcribed') return <CheckCircle2 size={14} className="text-emerald-500" />
  if (status === 'processing') return <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  if (status === 'failed') return <span className="text-red-500 text-xs">✗</span>
  return <Clock size={14} className="text-slate-400" />
}

const CallListPage = () => {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  const { data, pagination, loading, params, updateParams, goToPage } = usePaginatedApi(
    callService.getAll, {}
  )

  useEffect(() => {
    updateParams({ search: debouncedSearch })
  }, [debouncedSearch])

  const [s, ss] = useS('')

  const cols = ['call_date', 'duration_seconds', 'status']

  const handleCopyLink = async (call) => {
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

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Call Recordings"
        description={`${pagination.total} recordings`}
        actions={
          <Link to="/calls/upload">
            <Button><Upload size={15} /> Upload Recording</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, business..."
          className="flex-1 min-w-48 max-w-xs"
        />
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'uploaded', label: 'Uploaded' },
            { value: 'processing', label: 'Processing' },
            { value: 'transcribed', label: 'Transcribed' },
            { value: 'failed', label: 'Failed' },
          ]}
          value={params.status || ''}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="min-w-[150px]"
        />
        <Select
          options={[{ value: '', label: 'All Outcomes' }, ...CALL_OUTCOMES]}
          value={params.call_outcome || ''}
          onChange={(e) => updateParams({ call_outcome: e.target.value })}
          className="min-w-[170px]"
        />
        <Select
          options={[
            { value: '', label: 'All Calls' },
            { value: 'true', label: 'Pitched Only' },
            { value: 'false', label: 'Not Pitched' },
          ]}
          value={params.is_pitched !== undefined ? String(params.is_pitched) : ''}
          onChange={(e) => updateParams({ is_pitched: e.target.value || undefined })}
          className="min-w-[140px]"
        />
      </div>

      {loading ? (
        <LoadingState message="Loading recordings..." />
      ) : data?.length === 0 ? (
        <EmptyState
          icon={<Phone size={48} />}
          title="No recordings found"
          description="Upload your first call recording to get started"
          action={<Link to="/calls/upload"><Button><Upload size={15} /> Upload Recording</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recording</th>
                  <th>Business</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>AI Status</th>
                  <th>Pitched</th>
                  <th>Outcome</th>
                  <th>Agent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={call.status} />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/calls/${call.id}`} state={{ from: location.pathname + location.search }} className="font-medium text-slate-800 hover:text-brand-600 block max-w-[200px] truncate">
                              {call.title}
                            </Link>
                            {call.is_duplicate && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                                Repeated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{formatFileSize(call.file_size)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {call.business_id ? (
                        <Link to={`/businesses/${call.business_id}`} className="text-brand-600 hover:underline text-xs">
                          {call.business_name}
                        </Link>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="text-xs text-slate-600">{formatDate(call.call_date)}</td>
                    <td className="font-mono text-xs text-slate-600">{formatDuration(call.duration_seconds)}</td>
                    <td>
                      <Badge variant={getStatusColor(call.status).replace('badge-', '')}>
                        {getStatusLabel(call.status)}
                      </Badge>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${call.is_pitched ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {call.is_pitched ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td>
                      {call.call_outcome ? (
                        <Badge variant={getOutcomeColor(call.call_outcome).replace('badge-', '')}>
                          {getStatusLabel(call.call_outcome)}
                        </Badge>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="text-xs text-slate-600">{call.user_name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link to={`/calls/${call.id}`} state={{ from: location.pathname + location.search }} className="text-xs text-brand-600 hover:underline">
                          View
                        </Link>
                        <span className="text-slate-300 text-xs">|</span>
                        <button
                          onClick={() => handleCopyLink(call)}
                          className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                          title="Copy Audio Link"
                        >
                          <Link2 size={12} className="shrink-0" />
                          Copy Link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={goToPage} />
        </Card>
      )}
    </div>
  )
}

export default CallListPage
