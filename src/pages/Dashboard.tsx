import { useMemo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { format, parseISO, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Package, Clock, AlertTriangle, CheckCircle, ClipboardCheck, BarChart3, RotateCcw } from 'lucide-react'
import { usePackageStore } from '@/store'
import { getWarningLevelLabel } from '@/utils/warning'

export default function Dashboard() {
  const { packages, dailyStats, warningRules, updateWarningLevels, checkOverduePackages } = usePackageStore()

  const today = new Date()

  useEffect(() => {
    updateWarningLevels()
    const interval = setInterval(() => {
      checkOverduePackages()
    }, 60000)
    return () => clearInterval(interval)
  }, [updateWarningLevels, checkOverduePackages])

  const stats = useMemo(() => {
    const storedToday = packages.filter(p => isSameDay(parseISO(p.storageTime), today) && p.status === 'stored').length
    const pending = packages.filter(p => p.status === 'stored').length
    const pendingReturn = packages.filter(p => p.status === 'pending_return').length
    const warning = packages.filter(p => p.warningLevel !== 'none' && p.status === 'stored').length
    const pickedUp = packages.filter(p => p.status === 'picked_up').length
    const returned = packages.filter(p => p.status === 'returned').length
    return { storedToday, pending, pendingReturn, warning, pickedUp, returned }
  }, [packages, today])

  const warningData = useMemo(() => {
    const counts = { yellow: 0, orange: 0, red: 0 }
    packages.forEach(p => {
      if (p.warningLevel !== 'none' && (p.status === 'stored' || p.status === 'pending_return')) {
        counts[p.warningLevel]++
      }
    })
    return [
      { name: getWarningLevelLabel('yellow'), value: counts.yellow, color: '#F59E0B' },
      { name: getWarningLevelLabel('orange'), value: counts.orange, color: '#F97316' },
      { name: getWarningLevelLabel('red'), value: counts.red, color: '#EF4444' },
    ].filter(d => d.value > 0)
  }, [packages])

  const trendData = useMemo(() => {
    return dailyStats.map(s => ({
      date: s.date,
      storedCount: s.storedCount,
      pickedUpCount: s.pickedUpCount,
      returnedCount: s.returnedCount,
    }))
  }, [dailyStats])

  const totalWarning = warningData.reduce((s, d) => s + d.value, 0)

  const cards = [
    { label: '今日入库', value: stats.storedToday, icon: Package, cls: 'stat-card-blue', iconColor: 'text-brand-500' },
    { label: '待取件', value: stats.pending, icon: Clock, cls: 'stat-card-yellow', iconColor: 'text-amber-500' },
    { label: '待退回', value: stats.pendingReturn, icon: RotateCcw, cls: 'stat-card-red', iconColor: 'text-red-500' },
    { label: '预警包裹', value: stats.warning, icon: AlertTriangle, cls: 'stat-card-orange', iconColor: 'text-orange-500' },
    { label: '已签收', value: stats.pickedUp, icon: CheckCircle, cls: 'stat-card-green', iconColor: 'text-emerald-500' },
  ]

  const actions = [
    { label: '包裹管理', to: '/packages', icon: Package, color: 'bg-brand-50 text-brand-600' },
    { label: '取件签收', to: '/pickup', icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: '预警中心', to: '/warnings', icon: AlertTriangle, color: 'bg-orange-50 text-orange-600' },
    { label: '数据统计', to: '/statistics', icon: BarChart3, color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">工作台</h1>
        <p className="text-sm text-slate-400 mt-1">
          {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <c.icon className={`w-5 h-5 ${c.iconColor}`} />
            <p className="text-3xl font-bold text-slate-800 mt-2">{c.value}</p>
            <p className="text-sm text-slate-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            预警汇总
            {warningData.map(d => (
              <span key={d.name} className="flex items-center gap-1 text-xs font-normal text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
          </h2>
          <div className="h-48 relative">
            {totalWarning > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={warningData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {warningData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300">
                <AlertTriangle className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{totalWarning}</p>
                <p className="text-xs text-slate-400">预警总数</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(a => (
              <NavLink key={a.to} to={a.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-slate-600">{a.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">预警规则</h2>
          <div className="space-y-3">
            {warningRules.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${r.level === 'yellow' ? 'bg-amber-400' : r.level === 'orange' ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-slate-600">{getWarningLevelLabel(r.level)}</span>
                </div>
                <span className="text-sm text-slate-400">≥ {r.thresholdHours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">入库/签收/退回趋势</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gStored" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5c7cfa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5c7cfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPicked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReturned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => format(parseISO(v), 'MM-dd')} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="storedCount" name="入库" stroke="#5c7cfa" fill="url(#gStored)" strokeWidth={2} />
              <Area type="monotone" dataKey="pickedUpCount" name="签收" stroke="#10b981" fill="url(#gPicked)" strokeWidth={2} />
              <Area type="monotone" dataKey="returnedCount" name="退回" stroke="#ef4444" fill="url(#gReturned)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
