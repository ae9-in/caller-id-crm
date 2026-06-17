import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Phone, Building2, TrendingUp, Calendar, Trophy, Clock,
  Target, ArrowUpRight, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react'
import { analyticsService } from '../../services/index'
import { formatNumber, formatDuration, formatPercent, formatRelative, getStatusLabel } from '../../utils/formatters'
import { LoadingState, PageHeader, Card, Badge } from '../../components/ui/index'

const OUTCOME_COLORS = {
  interested: '#10b981',
  meeting_scheduled: '#6366f1',
  follow_up_needed: '#f59e0b',
  not_interested: '#ef4444',
  call_back_later: '#f97316',
  wrong_number: '#94a3b8',
  no_answer: '#cbd5e1',
  unknown: '#e2e8f0',
}

const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => (
  <div className="metric-card">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-50`}>
        <Icon size={20} className={`text-${color}-600`} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <ArrowUpRight size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

const ActivityItem = ({ activity }) => {
  const typeConfig = {
    call_uploaded: { color: 'bg-brand-500', label: 'Call Uploaded' },
    business_created: { color: 'bg-emerald-500', label: 'Business Added' },
    follow_up_created: { color: 'bg-amber-500', label: 'Follow-up Created' },
    meeting_scheduled: { color: 'bg-purple-500', label: 'Meeting Scheduled' },
    status_changed: { color: 'bg-slate-400', label: 'Status Changed' },
    note_added: { color: 'bg-teal-500', label: 'Note Added' },
    follow_up_completed: { color: 'bg-green-500', label: 'Follow-up Completed' },
  }
  const config = typeConfig[activity.type] || { color: 'bg-slate-400', label: activity.type }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className={`w-2 h-2 rounded-full ${config.color} mt-2 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{activity.title}</span>
          {activity.business_name && (
            <span className="text-xs text-slate-400">— {activity.business_name}</span>
          )}
        </div>
        {activity.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{activity.user_name}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">{formatRelative(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

const DashboardPage = () => {
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState({ callsPerDay: [], outcomes: [], monthly: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, dayRes, outcomeRes, monthRes] = await Promise.all([
          analyticsService.getDashboard(),
          analyticsService.getCallsPerDay(30),
          analyticsService.getOutcomes(),
          analyticsService.getMonthlyGrowth(),
        ])
        setStats(dashRes.data.data)
        setChartData({
          callsPerDay: dayRes.data.data || [],
          outcomes: (outcomeRes.data.data || []).filter((o) => o.call_outcome),
          monthly: monthRes.data.data || [],
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingState message="Loading dashboard..." />

  const calls = stats?.calls || {}
  const businesses = stats?.businesses || {}
  const followups = stats?.followups || {}

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Dashboard"
        description="Overview of your outreach performance"
        actions={
          <Link to="/calls/upload" className="btn-primary btn">
            <Phone size={15} /> Upload Recording
          </Link>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <MetricCard icon={Phone} label="Total Calls" value={formatNumber(calls.total_calls)} color="blue" />
        <MetricCard icon={Building2} label="Businesses" value={formatNumber(businesses.total_businesses)} color="violet" />
        <MetricCard icon={Target} label="Pitched Calls" value={formatNumber(calls.pitched_calls)} color="emerald" sub={`of ${formatNumber(calls.total_calls)} total`} />
        <MetricCard icon={AlertCircle} label="Follow Ups Pending" value={formatNumber(followups.pending)} color="amber" />
        <MetricCard icon={Calendar} label="Meetings Scheduled" value={formatNumber(calls.meetings_scheduled)} color="purple" />
        <MetricCard icon={TrendingUp} label="Conversion Rate" value={formatPercent(calls.conversion_rate)} color="emerald" />
        <MetricCard icon={Clock} label="Avg Duration" value={formatDuration(calls.avg_duration)} color="slate" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calls per day */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800">Calls Per Day</h3>
            <span className="text-xs text-slate-400">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.callsPerDay} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v, name) => [v, name === 'total' ? 'Total' : 'Pitched']}
              />
              <Bar dataKey="total" fill="#bfdbfe" radius={[4, 4, 0, 0]} name="total" />
              <Bar dataKey="pitched" fill="#2563eb" radius={[4, 4, 0, 0]} name="pitched" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcomes pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-5">Call Outcomes</h3>
          {chartData.outcomes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData.outcomes}
                  dataKey="count"
                  nameKey="call_outcome"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                >
                  {chartData.outcomes.map((entry) => (
                    <Cell key={entry.call_outcome} fill={OUTCOME_COLORS[entry.call_outcome] || '#e2e8f0'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, getStatusLabel(name)]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend formatter={(v) => getStatusLabel(v)} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">No outcome data yet</div>
          )}
        </div>
      </div>

      {/* Monthly Growth + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly growth */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800">Monthly Growth</h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total_calls" fill="#2563eb" radius={[4, 4, 0, 0]} name="Calls" />
              <Bar dataKey="meetings" fill="#10b981" radius={[4, 4, 0, 0]} name="Meetings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Activity</h3>
            <Link to="/businesses" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-0">
            {(stats?.recentActivity || []).slice(0, 8).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-slate-400 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Overdue follow-ups alert */}
      {followups.overdue > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">
              {followups.overdue} overdue follow-up{followups.overdue > 1 ? 's' : ''}
            </p>
            <p className="text-amber-600 text-xs">These require your immediate attention</p>
          </div>
          <Link to="/followups?status=overdue" className="btn-sm btn bg-amber-600 text-white hover:bg-amber-700">
            View
          </Link>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
