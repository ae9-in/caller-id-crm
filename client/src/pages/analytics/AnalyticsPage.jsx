import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { analyticsService } from '../../services/index'
import { LoadingState, PageHeader, Card, Select } from '../../components/ui/index'
import { formatNumber, formatDuration, formatPercent, getStatusLabel } from '../../utils/formatters'
import { useApi } from '../../hooks/index'

const UserRow = ({ user, rank }) => (
  <tr>
    <td>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 w-5">#{rank}</span>
        <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">
          {user.name?.charAt(0)}
        </div>
        <span className="text-sm font-medium text-slate-800">{user.name}</span>
      </div>
    </td>
    <td className="text-center">{formatNumber(user.total_calls)}</td>
    <td className="text-center">{formatNumber(user.pitched_calls)}</td>
    <td className="text-center">{formatNumber(user.meetings)}</td>
    <td className="text-center">{formatPercent(user.conversion_rate)}</td>
    <td className="text-center font-mono text-xs">{formatDuration(user.avg_duration)}</td>
  </tr>
)

const AnalyticsPage = () => {
  const [days, setDays] = useState(30)
  const { data: perUser, loading: puLoading } = useApi(analyticsService.getCallsPerUser, [])
  const { data: outcomes, loading: ocLoading } = useApi(analyticsService.getOutcomes, [])
  const { data: monthly, loading: mLoading } = useApi(analyticsService.getMonthlyGrowth, [])

  return (
    <div className="space-y-6 fade-in">
      <PageHeader title="Analytics" description="Team performance and call outcome analytics" />

      {/* Calls Per User */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-800">Calls Per User</h3>
        </div>
        {puLoading ? <LoadingState /> : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={perUser || []} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total_calls" fill="#bfdbfe" name="Total" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pitched_calls" fill="#2563eb" name="Pitched" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* User table */}
            <div className="mt-5 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th className="text-center">Total Calls</th>
                    <th className="text-center">Pitched</th>
                    <th className="text-center">Meetings</th>
                    <th className="text-center">Conversion</th>
                    <th className="text-center">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(perUser || []).map((user, i) => (
                    <UserRow key={user.id} user={user} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Monthly Growth */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-5">Monthly Growth Trend</h3>
        {mLoading ? <LoadingState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="total_calls" stroke="#2563eb" strokeWidth={2} dot={false} name="Total Calls" />
              <Line type="monotone" dataKey="pitched_calls" stroke="#10b981" strokeWidth={2} dot={false} name="Pitched" />
              <Line type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={2} dot={false} name="Meetings" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Outcome breakdown table */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Call Outcome Breakdown</h3>
        {ocLoading ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Outcome</th><th className="text-right">Count</th><th className="text-right">% of Total</th></tr></thead>
              <tbody>
                {(outcomes || []).filter(o => o.call_outcome).map((o) => {
                  const total = (outcomes || []).reduce((s, r) => s + parseInt(r.count), 0)
                  return (
                    <tr key={o.call_outcome}>
                      <td>{getStatusLabel(o.call_outcome)}</td>
                      <td className="text-right font-medium">{o.count}</td>
                      <td className="text-right text-slate-500">{total > 0 ? formatPercent((o.count / total) * 100) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AnalyticsPage
