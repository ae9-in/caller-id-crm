import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Phone, Building2, TrendingUp, Calendar, Trophy, Clock,
  Target, ArrowUpRight, ArrowRight, CheckCircle2, AlertCircle,
  X, Users, User, ChevronDown, ChevronUp, Search
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
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

const COLOR_MAPS = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400' },
  slate: { bg: 'bg-slate-100 dark:bg-zinc-800', text: 'text-slate-600 dark:text-zinc-400' },
}

const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => {
  const colorClasses = COLOR_MAPS[color] || COLOR_MAPS.blue
  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${colorClasses.bg}`}>
          <Icon size={20} className={`transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${colorClasses.text}`} />
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
}

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

const UserBreakdownAccordion = ({ business }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-950/20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-slate-100 dark:border-zinc-800 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-500 dark:text-zinc-400" />
          <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">
            Assigned Users & Callers ({business.users?.length || 0})
          </span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Primary Owner */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Primary Assigned Owner</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                <User size={13} className="text-brand-500" />
                {business.assigned_user_name}
              </p>
            </div>
            <Badge variant={business.assigned_user_name !== 'Unassigned' ? 'emerald' : 'gray'}>
              {business.assigned_user_name !== 'Unassigned' ? 'Owner Assigned' : 'Unassigned'}
            </Badge>
          </div>

          {/* Callers list */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Individual Caller Stats
            </h4>
            {business.users && business.users.length > 0 ? (
              <div className="space-y-2">
                {business.users.map((u) => (
                  <div key={u.user_id} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{u.user_name}</p>
                      <div className="flex gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        <span>Total calls: <strong className="text-slate-700 dark:text-zinc-300">{u.total_calls}</strong></span>
                        <span>Pitched: <strong className="text-slate-700 dark:text-zinc-300">{u.pitched_calls}</strong></span>
                      </div>
                    </div>
                    {u.today_calls > 0 ? (
                      <Badge variant="blue">+{u.today_calls} Today</Badge>
                    ) : (
                      <span className="text-xs text-slate-405 dark:text-zinc-550">0 today</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-zinc-500 italic text-center py-4 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                No users have made calls to this business yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const BusinessStatsSection = ({ stats, onSelectBusiness, searchTerm, setSearchTerm }) => {
  const filtered = stats.filter(b => 
    b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.assigned_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Business Wise Outreach</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-505 mt-0.5">Click on a business to see detailed user breakdown & sum of totals</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-105 dark:border-zinc-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">Business Name</th>
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">Assigned User</th>
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 text-center">Total Calls</th>
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 text-center">Pitched Calls</th>
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 text-center">Meetings</th>
              <th className="p-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 text-center">Calls Today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filtered.length > 0 ? (
              filtered.map((b) => (
                <tr 
                  key={b.business_id} 
                  className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onSelectBusiness(b)}
                      className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline text-left cursor-pointer"
                    >
                      {b.business_name}
                    </button>
                  </td>
                  <td className="p-3 text-sm text-slate-600 dark:text-zinc-300">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-slate-400" />
                      {b.assigned_user_name}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {b.total_calls}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                      {b.pitched_calls}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">
                      {b.meetings_scheduled}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {b.today_calls > 0 ? (
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 animate-pulse">
                        {b.today_calls} today
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-zinc-600">0</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-sm text-slate-405 dark:text-zinc-550">
                  No businesses match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const DashboardPage = () => {
  const { user, isManager } = useAuth()
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState({ callsPerDay: [], outcomes: [], monthly: [] })
  const [businessStats, setBusinessStats] = useState([])
  const [selectedBusinessId, setSelectedBusinessId] = useState(null)
  const [bizSearchTerm, setBizSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async (isSilent = false) => {
      if (!isSilent) setLoading(true)
      try {
        const promises = [
          analyticsService.getDashboard(),
          analyticsService.getCallsPerDay(30),
          analyticsService.getOutcomes(),
          analyticsService.getMonthlyGrowth(),
        ]
        
        const isMgr = isManager()
        if (isMgr) {
          promises.push(analyticsService.getBusinessWiseStats())
        }

        const results = await Promise.all(promises)
        const [dashRes, dayRes, outcomeRes, monthRes, bizRes] = results

        // Format calls per day dates
        const formattedDays = (dayRes.data.data || []).map(d => ({
          ...d,
          formattedDate: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        }));

        // Format outcome pie chart data
        const formattedOutcomes = (outcomeRes.data.data || [])
          .filter((o) => o.call_outcome)
          .map((o) => ({
            name: o.call_outcome,
            value: parseInt(o.count || '0'),
          }));

        // Format monthly growth months
        const formattedMonthly = (monthRes.data.data || []).map(m => {
          const [year, month] = (m.month || '').split('-');
          const date = new Date(year, parseInt(month) - 1, 1);
          return {
            ...m,
            formattedMonth: date.toLocaleDateString('en-US', { month: 'short' }),
            total_calls: parseInt(m.total_calls || '0'),
            meetings: parseInt(m.meetings || '0')
          };
        });

        setStats(dashRes.data.data)
        setChartData({
          callsPerDay: formattedDays,
          outcomes: formattedOutcomes,
          monthly: formattedMonthly,
        })

        if (isMgr && bizRes) {
          setBusinessStats(bizRes.data.data || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!isSilent) setLoading(false)
      }
    }
    
    load(false)
    
    // Silent polling every 10 seconds to update analytics and average durations in real time
    const interval = setInterval(() => {
      load(true)
    }, 10000)
    
    return () => clearInterval(interval)
  }, [user, isManager])

  if (loading) return <LoadingState message="Loading dashboard..." />

  const calls = stats?.calls || {}
  const businesses = stats?.businesses || {}
  const followups = stats?.followups || {}
  const selectedBusiness = businessStats.find(b => b.business_id === selectedBusinessId)

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
              <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                }}
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
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {chartData.outcomes.map((entry) => (
                    <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name] || '#e2e8f0'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => {
                    const total = chartData.outcomes.reduce((sum, item) => sum + item.value, 0);
                    const percent = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
                    return [`${v} (${percent}%)`, getStatusLabel(name)];
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                  }}
                />
                <Legend formatter={(v) => getStatusLabel(v)} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">No outcome data yet</div>
          )}
        </div>
      </div>

      {/* Business Wise Stats Section for Admin/Manager */}
      {isManager() && (
        <BusinessStatsSection 
          stats={businessStats} 
          onSelectBusiness={(b) => setSelectedBusinessId(b.business_id)} 
          searchTerm={bizSearchTerm}
          setSearchTerm={setBizSearchTerm}
        />
      )}

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
              <XAxis dataKey="formattedMonth" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                }}
              />
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

      {/* Slideover Drawer */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
              onClick={() => setSelectedBusinessId(null)}
            />
            
            {/* Drawer panel */}
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex animate-drawer-slide-in">
              <div className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-100 dark:border-zinc-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">{selectedBusiness.business_name}</h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Outreach Performance Breakdown</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedBusinessId(null)}
                    className="text-slate-400 hover:text-slate-650 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Today's Calls Sum / Overview */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-50/50 dark:bg-blue-950/20 border border-brand-100/50 dark:border-blue-900/30 p-4 rounded-2xl">
                      <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Today's Call Sum</p>
                      <p className="text-3xl font-extrabold text-brand-900 dark:text-brand-300 mt-1">{selectedBusiness.today_calls}</p>
                      <p className="text-[10px] text-brand-500/85 dark:text-brand-450 mt-1">Sum of calls made today</p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-4 rounded-2xl">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Calls (All-time)</p>
                      <p className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-300 mt-1">{selectedBusiness.total_calls}</p>
                      <p className="text-[10px] text-emerald-550 dark:text-emerald-450 mt-1">{selectedBusiness.pitched_calls} pitched calls total</p>
                    </div>
                  </div>

                  {/* Accordion / Dropdown */}
                  <UserBreakdownAccordion business={selectedBusiness} />
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setSelectedBusinessId(null)}
                    className="btn btn-secondary w-full py-2.5 text-sm"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage;
