import { useState, useMemo } from 'react'
import { usePackageStore } from '@/store'
import { getRetentionHours, formatRetentionPolicy, getReturnReasonLabel } from '@/utils/warning'
import {
  BarChart, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Bar, Area, Legend, Cell, PieChart, Pie,
} from 'recharts'
import { Clock, AlertTriangle, Package, BarChart3, TrendingUp, ClipboardList, RotateCcw, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ReturnReason } from '@/types'

type TabKey = 'retention' | 'warning' | 'workload' | 'returns'

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'retention', label: '滞留分析', icon: <Clock className="w-4 h-4" /> },
  { key: 'warning', label: '预警趋势', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'workload', label: '工作量统计', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'returns', label: '退回统计', icon: <RotateCcw className="w-4 h-4" /> },
]

const RETENTION_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#ef4444']
const RETURN_COLORS: Record<ReturnReason, string> = {
  overdue: '#ef4444',
  damaged: '#f59e0b',
  recipient_refused: '#8b5cf6',
  other: '#64748b',
}

export default function Statistics() {
  const [activeTab, setActiveTab] = useState<TabKey>('retention')
  const { packages, dailyStats, returnRecords, pickupRecords } = usePackageStore()

  const retentionData = useMemo(() => {
    const stored = packages.filter(p => p.status === 'stored')
    const ranges = [
      { range: '< 24h', min: 0, max: 24, count: 0 },
      { range: '24-48h', min: 24, max: 48, count: 0 },
      { range: '48-72h', min: 48, max: 72, count: 0 },
      { range: '> 72h', min: 72, max: Infinity, count: 0 },
    ]
    const hours = stored.map(p => getRetentionHours(p.storageTime))
    hours.forEach(h => {
      const bucket = ranges.find(r => h >= r.min && h < r.max)
      if (bucket) bucket.count++
    })
    const avg = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : 0
    const max = hours.length ? Math.max(...hours) : 0
    return { chartData: ranges.map(r => ({ name: r.range, count: r.count })), avg, max, total: hours.length }
  }, [packages])

  const warningChartData = useMemo(() =>
    dailyStats.map(s => ({
      date: format(parseISO(s.date), 'MM/dd'),
      yellowCount: s.yellowCount,
      orangeCount: s.orangeCount,
      redCount: s.redCount,
    })),
  [dailyStats])

  const workloadData = useMemo(() => {
    const last7 = dailyStats.slice(-7)
    const chartData = last7.map(s => ({
      date: format(parseISO(s.date), 'MM/dd'),
      storedCount: s.storedCount,
      pickedUpCount: s.pickedUpCount,
      returnedCount: s.returnedCount,
    }))
    const totalStored = last7.reduce((a, s) => a + s.storedCount, 0)
    const totalPickedUp = last7.reduce((a, s) => a + s.pickedUpCount, 0)
    const totalReturned = last7.reduce((a, s) => a + s.returnedCount, 0)
    const totalNotification = last7.reduce((a, s) => a + s.notificationCount, 0)
    const totalProcessed = totalPickedUp + totalReturned
    const pickupRate = totalStored ? Math.round((totalPickedUp / totalStored) * 100) : 0
    const returnRate = totalStored ? Math.round((totalReturned / totalStored) * 100) : 0
    return { chartData, totalStored, totalPickedUp, totalReturned, totalNotification, totalProcessed, pickupRate, returnRate }
  }, [dailyStats])

  const returnStats = useMemo(() => {
    const totalReturned = returnRecords.length
    const avgRetention = totalReturned
      ? Math.round(returnRecords.reduce((a, r) => a + r.retentionHours, 0) / totalReturned)
      : 0

    const reasonCounts: Record<string, number> = {}
    returnRecords.forEach(r => {
      reasonCounts[r.returnReason] = (reasonCounts[r.returnReason] || 0) + 1
    })
    const reasonChartData = Object.entries(reasonCounts).map(([reason, count]) => ({
      name: getReturnReasonLabel(reason),
      value: count,
      color: RETURN_COLORS[reason as ReturnReason] || '#64748b',
    }))

    const last30Days = dailyStats.slice(-30)
    const trendChartData = last30Days.map(s => ({
      date: format(parseISO(s.date), 'MM/dd'),
      returnedCount: s.returnedCount,
      pickedUpCount: s.pickedUpCount,
    }))

    const normalPickups = pickupRecords.filter(r => !r.isReturn).length
    const returnPickups = pickupRecords.filter(r => r.isReturn).length

    return { totalReturned, avgRetention, reasonChartData, trendChartData, normalPickups, returnPickups }
  }, [returnRecords, dailyStats, pickupRecords])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">统计分析</h1>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'retention' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<Clock className="w-5 h-5 text-blue-500" />} label="平均滞留时长"
              value={formatRetentionPolicy(retentionData.avg)} />
            <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="最长滞留时长"
              value={formatRetentionPolicy(retentionData.max)} />
            <StatCard icon={<Package className="w-5 h-5 text-amber-500" />} label="滞留包裹总数"
              value={`${retentionData.total} 件`} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">滞留时长分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retentionData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {retentionData.chartData.map((_, i) => (
                    <Cell key={i} fill={RETENTION_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'warning' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">预警趋势</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={warningChartData}>
              <defs>
                <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" stackId="1" dataKey="yellowCount" name="黄色提醒"
                stroke="#f59e0b" fill="url(#gradYellow)" />
              <Area type="monotone" stackId="1" dataKey="orangeCount" name="橙色警告"
                stroke="#f97316" fill="url(#gradOrange)" />
              <Area type="monotone" stackId="1" dataKey="redCount" name="红色严重"
                stroke="#ef4444" fill="url(#gradRed)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">每日入库/签收/退回</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workloadData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="storedCount" name="入库" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pickedUpCount" name="正常签收" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returnedCount" name="退回" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 content-start">
            <SummaryCard icon={<Package className="w-5 h-5 text-blue-500" />} label="本周入库总量"
              value={`${workloadData.totalStored}`} />
            <SummaryCard icon={<CheckCircle className="w-5 h-5 text-green-500" />} label="本周正常签收"
              value={`${workloadData.totalPickedUp}`} />
            <SummaryCard icon={<RotateCcw className="w-5 h-5 text-red-500" />} label="本周退回数量"
              value={`${workloadData.totalReturned}`} />
            <SummaryCard icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} label="本周通知总量"
              value={`${workloadData.totalNotification}`} />
            <SummaryCard icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} label="签收率"
              value={`${workloadData.pickupRate}%`} />
            <SummaryCard icon={<BarChart3 className="w-5 h-5 text-red-500" />} label="退回率"
              value={`${workloadData.returnRate}%`} />
          </div>
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={<RotateCcw className="w-5 h-5 text-red-500" />} label="累计退回总数"
              value={`${returnStats.totalReturned} 件`} />
            <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="平均滞留时长"
              value={formatRetentionPolicy(returnStats.avgRetention)} />
            <StatCard icon={<CheckCircle className="w-5 h-5 text-green-500" />} label="正常签收总数"
              value={`${returnStats.normalPickups} 件`} />
            <StatCard icon={<BarChart3 className="w-5 h-5 text-blue-500" />} label="签收/退回比"
              value={returnStats.returnPickups > 0 ? `${(returnStats.normalPickups / returnStats.returnPickups).toFixed(1)} : 1` : '-'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">退回原因分布</h3>
              {returnStats.reasonChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={returnStats.reasonChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {returnStats.reasonChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  暂无退回数据
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">签收与退回趋势</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={returnStats.trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pickedUpCount" name="正常签收" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="returnedCount" name="退回" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
