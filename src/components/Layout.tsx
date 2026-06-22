import { parseISO } from 'date-fns'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  Menu,
  X,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { usePackageStore } from '@/store'
import { getWarningLevelLabel } from '@/utils/warning'
import Toast from '@/components/Toast'

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/packages', label: '包裹管理', icon: Package },
  { path: '/warnings', label: '预警中心', icon: AlertTriangle },
  { path: '/pickup', label: '签收核销', icon: ClipboardCheck },
  { path: '/statistics', label: '统计分析', icon: BarChart3 },
]

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { packages, notifications } = usePackageStore()

  const storedPackages = packages.filter(p => p.status === 'stored')
  const yellowCount = storedPackages.filter(p => p.warningLevel === 'yellow').length
  const orangeCount = storedPackages.filter(p => p.warningLevel === 'orange').length
  const redCount = storedPackages.filter(p => p.warningLevel === 'red').length
  const totalWarnings = yellowCount + orangeCount + redCount

  const recentNotifications = [...notifications].sort(
    (a, b) => parseISO(b.sentAt).getTime() - parseISO(a.sentAt).getTime()
  ).slice(0, 8)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      <aside
        className={`flex-shrink-0 bg-surface-900 text-white transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Package className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight">包裹滞留预警</h1>
                <p className="text-[10px] text-slate-400 leading-tight">小区代收点管理系统</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.path === '/warnings' && totalWarnings > 0 && (
                <span className="ml-auto flex items-center gap-1">
                  {redCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <span className="text-[11px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                    {totalWarnings}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-3 m-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-xs font-medium">
                管
              </div>
              <div>
                <p className="text-xs font-medium text-white">管理员</p>
                <p className="text-[10px] text-slate-500">代收点工作人员</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200/60 flex items-center px-6 flex-shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-[18px] h-[18px] text-slate-500" />
                {totalWarnings > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                    {totalWarnings > 9 ? '9+' : totalWarnings}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 animate-fade-in">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">通知中心</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">暂无通知</div>
                    ) : (
                      recentNotifications.map(n => (
                        <div key={n.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              n.channel === 'both' ? 'text-red-500' : n.channel === 'sms' ? 'text-orange-500' : 'text-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 leading-relaxed">{n.content.substring(0, 50)}...</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {parseISO(n.sentAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <NavLink
                      to="/warnings"
                      className="flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-700 py-1.5"
                      onClick={() => setShowNotifications(false)}
                    >
                      查看全部通知 <ChevronRight className="w-3 h-3" />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  )
}
