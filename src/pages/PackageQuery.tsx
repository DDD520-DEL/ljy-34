import { useState } from 'react'
import { Search, Package, MapPin, Clock, AlertTriangle, CheckCircle, PackageSearch, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { usePackageStore } from '@/store'
import {
  getRetentionHours,
  formatRetentionPolicy,
  getWarningLevelLabel,
  getStatusLabel,
  maskPhone,
} from '@/utils/warning'
import type { Package as PackageType } from '@/types'

const WARNING_STYLE: Record<string, string> = {
  none: 'bg-slate-50 border-slate-200 text-slate-600',
  yellow: 'bg-amber-50 border-amber-200 text-amber-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
}

const STATUS_STYLE: Record<string, string> = {
  stored: 'bg-blue-50 border-blue-200 text-blue-700',
  picked_up: 'bg-emerald-50 border-emerald-200 text-emerald-700',
}

export default function PackageQuery() {
  const { queryPackage, updateWarningLevels } = usePackageStore()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<PackageType[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return
    setIsSearching(true)
    updateWarningLevels()
    setTimeout(() => {
      const pkgs = queryPackage(keyword)
      setResults(pkgs)
      setSearched(true)
      setIsSearching(false)
    }, 300)
  }

  const formatTime = (iso: string) => {
    return format(parseISO(iso), 'yyyy-MM-dd HH:mm')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50">
      <header className="bg-white border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">包裹自助查询</h1>
            <p className="text-xs text-slate-500">输入手机号或取件码查询您的包裹</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                查询信息
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    className="input-field pl-11 py-3 text-base"
                    placeholder="请输入收件人手机号或6位取件码"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!keyword.trim() || isSearching}
                  className="btn-primary px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '查询中...' : '查询'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  输入完整的11位手机号可查询您名下所有包裹
                </span>
              </p>
            </div>
          </form>
        </div>

        {searched && (
          <div className="space-y-4 animate-fade-in">
            {results.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <PackageSearch className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-medium text-slate-700 mb-1">未找到包裹</h3>
                <p className="text-sm text-slate-500">
                  请检查您输入的手机号或取件码是否正确
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    共找到 <span className="font-semibold text-brand-600">{results.length}</span> 个包裹
                  </p>
                </div>
                {results.map(pkg => (
                  <PackageCard key={pkg.id} pkg={pkg} formatTime={formatTime} />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-slate-400">
          如有疑问，请联系代收点工作人员
        </p>
      </footer>
    </div>
  )
}

function PackageCard({ pkg, formatTime }: { pkg: PackageType; formatTime: (iso: string) => string }) {
  const isStored = pkg.status === 'stored'
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          {pkg.courierCompany}
          <span className="font-mono text-xs text-slate-500">
            ...{pkg.trackingNumber.slice(-6)}
          </span>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLE[pkg.status]}`}>
          {pkg.status === 'stored' ? (
            <><Clock className="w-3 h-3 mr-1" />{getStatusLabel(pkg.status)}</>
          ) : (
            <><CheckCircle className="w-3 h-3 mr-1" />{getStatusLabel(pkg.status)}</>
          )}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-0.5">收件人</p>
            <p className="font-medium text-slate-800">{pkg.recipientName}</p>
            <p className="text-sm text-slate-500 mt-0.5">{maskPhone(pkg.recipientPhone)}</p>
          </div>
          {isStored && (
            <div className="text-right">
              <p className="text-sm text-slate-500 mb-0.5">取件码</p>
              <p className="font-mono text-2xl font-bold text-brand-600 tracking-wider">
                {pkg.pickupCode}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              货架位置
            </div>
            <p className="font-semibold text-slate-800 text-lg">{pkg.shelfNumber}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              已滞留时长
            </div>
            <p className="font-semibold text-slate-800 text-lg">
              {formatRetentionPolicy(getRetentionHours(pkg.storageTime))}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">入库时间</span>
            <span className="text-sm text-slate-700">{formatTime(pkg.storageTime)}</span>
          </div>
          {pkg.warningLevel !== 'none' && isStored && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${WARNING_STYLE[pkg.warningLevel]}`}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {getWarningLevelLabel(pkg.warningLevel)}
            </span>
          )}
        </div>

        {pkg.warningLevel !== 'none' && isStored && (
          <div className={`rounded-lg p-3 text-sm border ${WARNING_STYLE[pkg.warningLevel]}`}>
            <p className="font-medium mb-0.5">
              {pkg.warningLevel === 'red' ? '紧急提醒' : pkg.warningLevel === 'orange' ? '温馨提示' : '温馨提醒'}
            </p>
            <p className="opacity-90">
              您的包裹已滞留超过 {pkg.warningLevel === 'red' ? '72' : pkg.warningLevel === 'orange' ? '48' : '24'} 小时，
              请尽快前往 {pkg.shelfNumber} 号货架取件，取件码 {pkg.pickupCode}。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
