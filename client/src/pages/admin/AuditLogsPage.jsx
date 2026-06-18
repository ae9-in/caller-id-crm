import { useState, useEffect } from 'react'
import { adminService } from '../../services/index'
import { usePaginatedApi, useDebounce } from '../../hooks/index'
import { PageHeader, Card, LoadingState, EmptyState, Pagination, Select } from '../../components/ui/index'
import { formatDateTime } from '../../utils/formatters'
import { FileText, Calendar, Search, X } from 'lucide-react'

const AuditLogsPage = () => {
  const { data, pagination, loading, params, updateParams, goToPage } = usePaginatedApi(adminService.getAuditLogs, {})
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    updateParams({ search: debouncedSearch })
  }, [debouncedSearch])

  return (
    <div className="space-y-5 fade-in">
      <PageHeader title="Audit Logs" description="Track all system actions and changes" />

      {/* Filter Control Bar */}
      <div className="bg-[var(--color-surface)] border border-slate-200 dark:border-zinc-800 p-4 rounded-xl flex flex-wrap gap-4 items-center">
        {/* Search Performed By */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
          <input
            type="text"
            placeholder="Search Performed By..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Date Filter */}
        <div className="relative min-w-[180px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
          <input
            type="date"
            value={params.date || ''}
            onChange={(e) => updateParams({ date: e.target.value })}
            onClick={(e) => {
              try {
                e.target.showPicker()
              } catch (err) {
                console.error('showPicker not supported:', err)
              }
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          />
        </div>

        {/* Action Type Dropdown */}
        <Select
          options={[
            { value: '', label: 'All Actions' },
            { value: 'login', label: 'Login' },
            { value: 'create', label: 'Create' },
            { value: 'update', label: 'Update' },
            { value: 'delete', label: 'Delete' },
          ]}
          value={params.action || ''}
          onChange={(e) => updateParams({ action: e.target.value })}
          className="min-w-[150px]"
        />

        {/* Resource Type Dropdown */}
        <Select
          options={[
            { value: '', label: 'All Resources' },
            { value: 'business', label: 'Business' },
            { value: 'call', label: 'Call' },
            { value: 'user', label: 'User' },
            { value: 'followup', label: 'Follow Up' },
          ]}
          value={params.resource_type || ''}
          onChange={(e) => updateParams({ resource_type: e.target.value })}
          className="min-w-[150px]"
        />

        {/* Clear Filters Button */}
        {(searchInput || params.date || params.action || params.resource_type) && (
          <button
            onClick={() => {
              setSearchInput('')
              updateParams({ search: '', date: '', action: '', resource_type: '' })
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X size={14} />
            Clear Filters
          </button>
        )}
      </div>

      {loading ? <LoadingState /> : !data?.length ? (
        <EmptyState icon={<FileText size={40} />} title="No audit logs found" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP Address</th></tr>
              </thead>
              <tbody>
                {data.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{log.user_name}</p>
                        <p className="text-xs text-slate-400">{log.email}</p>
                      </div>
                    </td>
                    <td>
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{log.action}</code>
                    </td>
                    <td>
                      {log.resource_type && (
                        <span className="text-xs text-slate-600">{log.resource_type}{log.resource_id && <span className="text-slate-400"> #{log.resource_id.slice(0, 8)}</span>}</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-400 font-mono">{log.ip_address}</td>
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

export default AuditLogsPage
