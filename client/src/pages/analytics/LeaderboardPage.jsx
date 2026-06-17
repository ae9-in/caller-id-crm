import { useState } from 'react'
import { Trophy, TrendingUp, Medal, Phone, Calendar } from 'lucide-react'
import { analyticsService } from '../../services/index'
import { useApi } from '../../hooks/index'
import { PageHeader, Card, LoadingState, EmptyState, Select } from '../../components/ui/index'
import { formatNumber, formatPercent, formatDuration } from '../../utils/formatters'
import clsx from 'clsx'

const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="text-2xl">🥇</span>
  if (rank === 2) return <span className="text-2xl">🥈</span>
  if (rank === 3) return <span className="text-2xl">🥉</span>
  return <span className="text-lg font-bold text-slate-400">#{rank}</span>
}

const LeaderboardPage = () => {
  const [period, setPeriod] = useState('weekly')
  const { data, loading, refetch } = useApi(() => analyticsService.getLeaderboard(period), [period])

  const topThree = (data || []).slice(0, 3)
  const rest = (data || []).slice(3)

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Leaderboard"
        description="Top performing agents ranked by activity"
        actions={
          <Select
            options={[
              { value: 'weekly', label: 'This Week' },
              { value: 'monthly', label: 'This Month' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="min-w-[140px]"
          />
        }
      />

      {loading ? <LoadingState /> : !data?.length ? (
        <EmptyState icon={<Trophy size={48} />} title="No data yet" description="Upload calls to appear on the leaderboard" />
      ) : (
        <>
          {/* Top 3 podium */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topThree.map((user, i) => (
                <div key={user.id}
                  className={clsx(
                    'card p-5 text-center',
                    i === 0 && 'ring-2 ring-amber-400 bg-gradient-to-b from-amber-50'
                  )}
                >
                  <RankBadge rank={i + 1} />
                  <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mt-3 mb-2">
                    <span className="text-brand-700 font-bold text-lg">{user.name?.charAt(0)}</span>
                  </div>
                  <p className="font-bold text-slate-900">{user.name}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-base">{formatNumber(user.total_calls)}</p>
                      <p className="text-slate-400">Calls</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{formatNumber(user.meetings)}</p>
                      <p className="text-slate-400">Meetings</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{formatPercent(user.conversion_rate)}</p>
                      <p className="text-slate-400">Conv.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Agent</th>
                    <th className="text-center"><Phone size={12} className="inline mr-1" />Total Calls</th>
                    <th className="text-center">Pitched</th>
                    <th className="text-center"><Calendar size={12} className="inline mr-1" />Meetings</th>
                    <th className="text-center"><TrendingUp size={12} className="inline mr-1" />Conversion</th>
                    <th className="text-center">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((user, i) => (
                    <tr key={user.id} className={i < 3 ? 'bg-amber-50/30' : ''}>
                      <td><RankBadge rank={i + 1} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">
                            {user.name?.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="text-center font-semibold">{formatNumber(user.total_calls)}</td>
                      <td className="text-center">{formatNumber(user.pitched_calls)}</td>
                      <td className="text-center">{formatNumber(user.meetings)}</td>
                      <td className="text-center">
                        <span className={clsx('font-medium', parseFloat(user.conversion_rate) >= 50 ? 'text-emerald-600' : 'text-slate-700')}>
                          {formatPercent(user.conversion_rate)}
                        </span>
                      </td>
                      <td className="text-center font-mono text-xs">{formatDuration(user.avg_duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default LeaderboardPage
