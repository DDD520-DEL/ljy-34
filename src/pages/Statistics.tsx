import { useState, useMemo } from 'react'
import { usePackageStore } from '@/store'
import { getRetentionHours, formatRetentionPolicy, getWarningLevelLabel } from '@/utils/warning'
import {
  BarChart, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Bar, Area, Legend, Cell,
} from 'recharts'
import { Clock, AlertTriangle, Package, BarChart3, TrendingUp, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'

type TabKey = 'retention' | 'warning' | 'workload'

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'retention', label: '滞留分析', icon: <Clock className="w-4 h-4" /> },
  { key: 'warning', label: '预警趋势', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'workload', label: '工作量统计', icon: <ClipboardList className="w-4 h-4" /> },
]

const RETENTION_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#ef4444']

export default function Statistics() {
  const [activeTab, setActiveTab] = useState<TabKey>('retention')
  const { packages, dailyStats } = usePackageStore()

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
      date: format(new Date(s.date), 'MM/dd'),
      yellowCount: s.yellowCount,
      orangeCount: s.orangeCount,
      redCount: s.redCount,
    })),
  [dailyStats])

  const workloadData = useMemo(() => {
    const last7 = dailyStats.slice(-7)
    const chartData = last7.map(s => ({
      date: format(new Date(s.date), 'MM/dd'),
      storedCount: s.storedCount,
      pickedUpCount: s.pickedUpCount,
    }))
    const totalStored = last7.reduce((a, s) => a + s.storedCount, 0)
    const totalPickedUp = last7.reduce((a, s) => a + s.pickedUpCount, 0)
    const totalNotification = last7.reduce((a, s) => a + s.notificationCount, 0)
    const pickupRate = totalStored ? Math.round((totalPickedUp / totalStored) * 100) : 0
    return { chartData, totalStored, totalPickedUp, totalNotification, pickupRate }
  }, [dailyStats])

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
            <h3 className="text-sm font-semibold text-slate-700 mb-4">每日入库/签收</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workloadData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="storedCount" name="入库" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pickedUpCount" name="签收" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 content-start">
            <SummaryCard icon={<Package className="w-5 h-5 text-blue-500" />} label="本周入库总量"
              value={`${workloadData.totalStored}`} />
            <SummaryCard icon={<BarChart3 className="w-5 h-5 text-green-500" />} label="本周签收总量"
              value={`${workloadData.totalPickedUp}`} />
            <SummaryCard icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} label="本周通知总量"
              value={`${workloadData.totalNotification}`} />
            <SummaryCard icon={<TrendingUp className="w-5 h-5 text-purple-500" />} label="签收率"
              value={`${workloadData.pickupRate}%`} />
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
