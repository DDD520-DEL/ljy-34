import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Keyboard, Hand, ClipboardList, Search, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { usePackageStore } from '@/store'
import { getRetentionHours, getWarningLevelLabel, maskPhone, getPickupMethodLabel, getWarningLevelBg } from '@/utils/warning'

type TabKey = 'code' | 'manual' | 'records'

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'code', label: '取件码签收', icon: <Keyboard className="w-4 h-4" /> },
  { key: 'manual', label: '手动签收', icon: <Hand className="w-4 h-4" /> },
  { key: 'records', label: '签收记录', icon: <ClipboardList className="w-4 h-4" /> },
]

export default function Pickup() {
  const { packages, pickupRecords, pickupByCode, batchPickup } = usePackageStore()
  const [activeTab, setActiveTab] = useState<TabKey>('code')
  const [code, setCode] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const storedPackages = packages.filter(p => p.status === 'stored')

  const handleCodePickup = () => {
    if (code.length === 6 && pickupByCode(code)) {
      setCode('')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === storedPackages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(storedPackages.map(p => p.id)))
    }
  }

  const handleBatchPickup = () => {
    if (selectedIds.size > 0) {
      batchPickup([...selectedIds])
      setSelectedIds(new Set())
    }
  }

  const sortedRecords = [...pickupRecords].sort(
    (a, b) => parseISO(b.pickupTime).getTime() - parseISO(a.pickupTime).getTime()
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">签收核销</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Search className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-slate-500 text-sm">输入6位取件码进行签收</p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="______"
              maxLength={6}
              className="w-64 text-center text-3xl font-mono tracking-[0.5em] py-3 border-b-2 border-slate-300 focus:border-blue-500 outline-none text-slate-800 bg-transparent"
            />
            <button
              onClick={handleCodePickup}
              disabled={code.length !== 6}
              className="px-8 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              确认签收
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-500">近期待取包裹</h3>
            {storedPackages.slice(0, 5).map(pkg => (
              <div key={pkg.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{pkg.recipientName}</p>
                  <p className="text-sm text-slate-500">{pkg.courierCompany} · {pkg.shelfNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">滞留 {getRetentionHours(pkg.storageTime)}h</p>
                  {pkg.warningLevel !== 'none' && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${getWarningLevelBg(pkg.warningLevel)}`}>
                      {getWarningLevelLabel(pkg.warningLevel)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {storedPackages.length === 0 && (
              <p className="text-center text-slate-400 py-8">暂无待取包裹</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={storedPackages.length > 0 && selectedIds.size === storedPackages.length}
                onChange={toggleSelectAll}
                className="rounded border-slate-300"
              />
              全选
            </label>
            <span className="text-sm text-slate-500">已选 {selectedIds.size} 件</span>
          </div>

          <div className="space-y-2">
            {storedPackages.map(pkg => {
              const hours = getRetentionHours(pkg.storageTime)
              const hasWarning = pkg.warningLevel !== 'none'
              return (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-lg border p-4 flex items-center gap-3 ${hasWarning ? 'border-orange-200' : 'border-slate-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(pkg.id)}
                    onChange={() => toggleSelect(pkg.id)}
                    className="rounded border-slate-300 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 truncate">{pkg.recipientName}</span>
                      {hasWarning && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getWarningLevelBg(pkg.warningLevel)}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {getWarningLevelLabel(pkg.warningLevel)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{pkg.courierCompany} · {pkg.shelfNumber} · 滞留{hours}h</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{maskPhone(pkg.recipientPhone)}</span>
                </div>
              )
            })}
            {storedPackages.length === 0 && (
              <p className="text-center text-slate-400 py-8">暂无待取包裹</p>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky bottom-4">
              <button
                onClick={handleBatchPickup}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                批量签收 ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left py-3 px-4 font-medium">收件人</th>
                <th className="text-left py-3 px-4 font-medium">快递公司</th>
                <th className="text-left py-3 px-4 font-medium">时间</th>
                <th className="text-left py-3 px-4 font-medium">类型</th>
                <th className="text-left py-3 px-4 font-medium">方式</th>
                <th className="text-left py-3 px-4 font-medium">货架号</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map(record => {
                const pkg = packages.find(p => p.id === record.packageId)
                return (
                  <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-800">{pkg?.recipientName ?? '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{pkg?.courierCompany ?? '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{format(parseISO(record.pickupTime), 'MM-dd HH:mm')}</td>
                    <td className="py-3 px-4">
                      {record.isReturn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-700">
                          <RotateCcw className="w-3 h-3" />
                          退回
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          正常签收
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{getPickupMethodLabel(record.pickupMethod)}</td>
                    <td className="py-3 px-4 text-slate-600">{pkg?.shelfNumber ?? '-'}</td>
                  </tr>
                )
              })}
              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">暂无签收记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
