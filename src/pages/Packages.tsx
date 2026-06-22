import { useState, useMemo } from 'react'
import { Plus, Search, X, RotateCcw, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { usePackageStore } from '@/store'
import {
  getRetentionHours,
  getWarningLevelLabel,
  getStatusLabel,
  getReturnReasonLabel,
  maskPhone,
  formatRetentionPolicy,
} from '@/utils/warning'
import type { Package, WarningLevel } from '@/types'

const COURIER_OPTIONS = [
  '顺丰速运', '中通快递', '圆通速递', '韵达快递',
  '申通快递', '京东物流', '极兔速递', '邮政EMS',
]

const WARNING_ORDER: Record<WarningLevel, number> = {
  red: 0, orange: 1, yellow: 2, none: 3,
}

const WARNING_BADGE: Record<WarningLevel, string> = {
  red: 'badge-red', orange: 'badge-orange', yellow: 'badge-yellow', none: 'badge-gray',
}

interface FormData {
  recipientName: string
  recipientPhone: string
  courierCompany: string
  trackingNumber: string
  shelfNumber: string
  pickupPointId: string
}

export default function Packages() {
  const { packages, pickupPoints, addPackage, pickupPackage, confirmReturn } = usePackageStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormData>({
    recipientName: '',
    recipientPhone: '',
    courierCompany: COURIER_OPTIONS[0],
    trackingNumber: '',
    shelfNumber: '',
    pickupPointId: pickupPoints[0]?.id || '',
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Package['status']>('all')
  const [warningFilter, setWarningFilter] = useState<'all' | WarningLevel>('all')
  const [pickupPointFilter, setPickupPointFilter] = useState<'all' | string>('all')

  const filtered = useMemo(() => {
    let list = [...packages]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.recipientName.toLowerCase().includes(q) || p.recipientPhone.includes(q)
      )
    }
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    if (warningFilter !== 'all') list = list.filter(p => p.warningLevel === warningFilter)
    if (pickupPointFilter !== 'all') list = list.filter(p => p.pickupPointId === pickupPointFilter)
    list.sort((a, b) => {
      const statusOrder: Record<Package['status'], number> = {
        pending_return: 0,
        stored: 1,
        picked_up: 2,
        returned: 3,
      }
      if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status]
      const wa = WARNING_ORDER[a.warningLevel], wb = WARNING_ORDER[b.warningLevel]
      if (wa !== wb) return wa - wb
      return parseISO(a.storageTime).getTime() - parseISO(b.storageTime).getTime()
    })
    return list
  }, [packages, search, statusFilter, warningFilter, pickupPointFilter])

  const getPickupPointName = (id: string) => {
    return pickupPoints.find(p => p.id === id)?.name || '-'
  }

  const getPickupPointColor = (id: string) => {
    return pickupPoints.find(p => p.id === id)?.color || '#64748b'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addPackage({ ...form, storageTime: new Date().toISOString() })
    setForm({
      recipientName: '',
      recipientPhone: '',
      courierCompany: COURIER_OPTIONS[0],
      trackingNumber: '',
      shelfNumber: '',
      pickupPointId: pickupPoints[0]?.id || '',
    })
    setShowModal(false)
  }

  const formatTime = (iso: string) => {
    return format(parseISO(iso), 'MM-dd HH:mm')
  }

  const getStatusBadgeClass = (status: Package['status']) => {
    switch (status) {
      case 'stored': return 'badge-blue'
      case 'picked_up': return 'badge-green'
      case 'pending_return': return 'badge-red'
      case 'returned': return 'badge-gray'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">包裹管理</h2>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> 入库登记
        </button>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9" placeholder="搜索收件人姓名或电话"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-36" value={pickupPointFilter} onChange={e => setPickupPointFilter(e.target.value)}>
          <option value="all">全部代收点</option>
          {pickupPoints.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="input-field w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">全部状态</option>
          <option value="stored">待取件</option>
          <option value="pending_return">待退回</option>
          <option value="picked_up">已签收</option>
          <option value="returned">已退回</option>
        </select>
        <select className="input-field w-32" value={warningFilter} onChange={e => setWarningFilter(e.target.value as typeof warningFilter)}>
          <option value="all">全部预警</option>
          <option value="yellow">黄色提醒</option>
          <option value="orange">橙色警告</option>
          <option value="red">红色严重</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60">
                {['代收点', '快递公司', '快递单号', '收件人', '联系电话', '货架号', '入库时间', '滞留时长', '预警等级', '状态', '退回原因', '查询次数', '最后查询', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-12 text-center text-slate-400">暂无包裹数据</td></tr>
              ) : filtered.map(pkg => (
                <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPickupPointColor(pkg.pickupPointId) }} />
                      {getPickupPointName(pkg.pickupPointId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{pkg.courierCompany}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">...{pkg.trackingNumber.slice(-6)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pkg.recipientName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{maskPhone(pkg.recipientPhone)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pkg.shelfNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTime(pkg.storageTime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatRetentionPolicy(getRetentionHours(pkg.storageTime))}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={WARNING_BADGE[pkg.warningLevel]}>{getWarningLevelLabel(pkg.warningLevel)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={getStatusBadgeClass(pkg.status)}>
                      {getStatusLabel(pkg.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    {pkg.returnReason ? getReturnReasonLabel(pkg.returnReason) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                      pkg.queryCount > 5 ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {pkg.queryCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    {pkg.lastQueriedAt ? formatTime(pkg.lastQueriedAt) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {pkg.status === 'stored' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                          onClick={() => pickupPackage(pkg.id, 'manual')}
                        >签收</button>
                      </div>
                    )}
                    {pkg.status === 'pending_return' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                          onClick={() => pickupPackage(pkg.id, 'manual')}
                        >签收</button>
                        <button
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                          onClick={() => confirmReturn(pkg.id, 'overdue')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          确认退回
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60">
              <h3 className="text-base font-semibold text-slate-800">入库登记</h3>
              <button className="p-1 rounded-md hover:bg-slate-100" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-500" />
                  所属代收点
                </label>
                <select className="input-field" required value={form.pickupPointId}
                  onChange={e => setForm(f => ({ ...f, pickupPointId: e.target.value }))}>
                  {pickupPoints.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收件人姓名</label>
                <input className="input-field" required value={form.recipientName}
                  onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
                <input className="input-field" required value={form.recipientPhone}
                  onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">快递公司</label>
                <select className="input-field" value={form.courierCompany}
                  onChange={e => setForm(f => ({ ...f, courierCompany: e.target.value }))}>
                  {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">快递单号</label>
                <input className="input-field" required value={form.trackingNumber}
                  onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">货架号</label>
                <input className="input-field" required value={form.shelfNumber}
                  onChange={e => setForm(f => ({ ...f, shelfNumber: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn-primary">确认入库</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
