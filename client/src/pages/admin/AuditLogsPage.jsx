import { useState } from 'react'
import { adminService } from '../../services/index'
import { usePaginatedApi } from '../../hooks/index'
import { PageHeader, Card, LoadingState, EmptyState, Pagination, Select, SearchInput } from '../../components/ui/index'
import { formatDateTime } from '../../utils/formatters'
import { FileText } from 'lucide-react'

const AuditLogsPage = () => {
  const { data, pagination, loading, params, updateParams, goToPage } = usePaginatedApi(adminService.getAuditLogs, {})

  return (
    <div className="space-y-5 fade-in">
      <PageHeader title="Audit Logs" description="Track all system actions and changes" />

      <div className="flex gap-3 flex-wrap">
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
