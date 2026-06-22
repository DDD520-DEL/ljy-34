import { useState, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { usePackageStore } from '@/store'
import {
  getRetentionHours,
  getWarningLevelLabel,
  getWarningLevelBg,
  getStatusLabel,
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
}

const emptyForm: FormData = {
  recipientName: '', recipientPhone: '', courierCompany: COURIER_OPTIONS[0],
  trackingNumber: '', shelfNumber: '',
}

export default function Packages() {
  const { packages, addPackage, pickupPackage } = usePackageStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Package['status']>('all')
  const [warningFilter, setWarningFilter] = useState<'all' | WarningLevel>('all')

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
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'stored' ? -1 : 1
      const wa = WARNING_ORDER[a.warningLevel], wb = WARNING_ORDER[b.warningLevel]
      if (wa !== wb) return wa - wb
      return new Date(a.storageTime).getTime() - new Date(b.storageTime).getTime()
    })
    return list
  }, [packages, search, statusFilter, warningFilter])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addPackage({ ...form, storageTime: new Date().toISOString() })
    setForm(emptyForm)
    setShowModal(false)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
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
        <select className="input-field w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">全部状态</option>
          <option value="stored">待取件</option>
          <option value="picked_up">已签收</option>
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
                {['快递公司', '快递单号', '收件人', '联系电话', '货架号', '入库时间', '滞留时长', '预警等级', '状态', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">暂无包裹数据</td></tr>
              ) : filtered.map(pkg => (
                <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
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
                    <span className={pkg.status === 'picked_up' ? 'badge-green' : 'badge-blue'}>
                      {getStatusLabel(pkg.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {pkg.status === 'stored' && (
                      <button
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                        onClick={() => pickupPackage(pkg.id, 'manual')}
                      >签收</button>
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
