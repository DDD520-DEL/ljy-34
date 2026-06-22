import { useState } from 'react'
import { AlertTriangle, Bell, Smartphone, Clock, Send, MessageSquare, Save, RotateCcw, History, CheckSquare, Settings, RefreshCw } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { usePackageStore } from '@/store'
import {
  getRetentionHours,
  getWarningLevelLabel,
  getWarningLevelBg,
  maskPhone,
  formatRetentionPolicy,
  getNotificationChannelLabel,
  getReturnReasonLabel,
  getStatusBg,
  getStatusLabel,
} from '@/utils/warning'
import type { WarningLevel, WarningRule, NotificationChannel } from '@/types'

type MainTab = 'list' | 'returns' | 'returnHistory' | 'rules' | 'notifications'
type LevelFilter = 'all' | WarningLevel

const mainTabs: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: 'list', label: '预警列表', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'returns', label: '退回任务', icon: <RotateCcw className="w-4 h-4" /> },
  { key: 'returnHistory', label: '退回记录', icon: <History className="w-4 h-4" /> },
  { key: 'rules', label: '预警规则', icon: <Settings className="w-4 h-4" /> },
  { key: 'notifications', label: '通知记录', icon: <Bell className="w-4 h-4" /> },
]

const levelFilters: { key: LevelFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'yellow', label: '黄色提醒' },
  { key: 'orange', label: '橙色警告' },
  { key: 'red', label: '红色严重' },
]

export default function Warnings() {
  const [mainTab, setMainTab] = useState<MainTab>('list')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([])
  const { packages, notifications, warningRules, returnRecords, sendNotification, updateWarningRule, confirmReturn, batchConfirmReturn, checkOverduePackages, maxRetentionDays, setMaxRetentionDays } = usePackageStore()

  const warningPackages = packages.filter(p => p.status === 'stored' && p.warningLevel !== 'none')
  const filtered = levelFilter === 'all' ? warningPackages : warningPackages.filter(p => p.warningLevel === levelFilter)

  const pendingReturnPackages = packages.filter(p => p.status === 'pending_return')

  const sortedNotifications = [...notifications].sort(
    (a, b) => parseISO(b.sentAt).getTime() - parseISO(a.sentAt).getTime()
  )

  const sortedReturnRecords = [...returnRecords].sort(
    (a, b) => parseISO(b.returnedAt).getTime() - parseISO(a.returnedAt).getTime()
  )

  const toggleSelectReturn = (id: string) => {
    setSelectedReturnIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAllReturns = () => {
    if (selectedReturnIds.length === pendingReturnPackages.length) {
      setSelectedReturnIds([])
    } else {
      setSelectedReturnIds(pendingReturnPackages.map(p => p.id))
    }
  }

  const handleBatchReturn = () => {
    if (selectedReturnIds.length > 0) {
      batchConfirmReturn(selectedReturnIds)
      setSelectedReturnIds([])
    }
  }

  const [retentionDays, setRetentionDays] = useState(maxRetentionDays)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">预警中心</h1>
          <p className="text-sm text-slate-500">管理包裹滞留预警与退回处理</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {mainTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
              mainTab === tab.key
                ? 'bg-white text-slate-800 font-medium shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'returns' && pendingReturnPackages.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-red-500 text-white">
                {pendingReturnPackages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {levelFilters.map(lf => (
                <button
                  key={lf.key}
                  onClick={() => setLevelFilter(lf.key)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    levelFilter === lf.key
                      ? 'bg-brand-500/10 border-brand-500/30 text-brand-600 font-medium'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {lf.label}
                  {lf.key !== 'all' && (
                    <span className="ml-1">
                      ({warningPackages.filter(p => p.warningLevel === lf.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => checkOverduePackages()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新预警状态
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无预警包裹</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(pkg => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{pkg.recipientName}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          getWarningLevelBg(pkg.warningLevel)
                        } ${pkg.warningLevel === 'red' ? 'animate-pulse-slow' : ''}`}>
                          {getWarningLevelLabel(pkg.warningLevel)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{pkg.courierCompany}</span>
                        <span>货架 {pkg.shelfNumber}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          滞留 {formatRetentionPolicy(getRetentionHours(pkg.storageTime))}
                        </span>
                        <span>{maskPhone(pkg.recipientPhone)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendNotification(pkg.id, 'in_app')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-500/10 text-brand-600 rounded-lg hover:bg-brand-500/20 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        发送站内通知
                      </button>
                      <button
                        onClick={() => sendNotification(pkg.id, 'sms')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500/20 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        发送短信
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">超期退回处理说明</p>
                <p className="text-xs text-amber-700 mt-1">
                  包裹滞留超过 <span className="font-semibold">{maxRetentionDays}天</span> 将自动标记为待退回。
                  确认退回后，包裹将从活跃列表移除并保留在历史退回记录中。
                </p>
              </div>
            </div>
          </div>

          {pendingReturnPackages.length > 0 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200/60 p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReturnIds.length === pendingReturnPackages.length && pendingReturnPackages.length > 0}
                  onChange={selectAllReturns}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600">
                  全选（已选 {selectedReturnIds.length}/{pendingReturnPackages.length}）
                </span>
              </label>
              <button
                onClick={handleBatchReturn}
                disabled={selectedReturnIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckSquare className="w-4 h-4" />
                批量确认退回
              </button>
            </div>
          )}

          {pendingReturnPackages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无待退回包裹</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReturnPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${
                    selectedReturnIds.includes(pkg.id) ? 'border-red-300 bg-red-50/30' : 'border-slate-200/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedReturnIds.includes(pkg.id)}
                        onChange={() => toggleSelectReturn(pkg.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{pkg.recipientName}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBg(pkg.status)}`}>
                            {getStatusLabel(pkg.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{pkg.courierCompany}</span>
                          <span className="font-mono text-xs">...{pkg.trackingNumber.slice(-6)}</span>
                          <span>货架 {pkg.shelfNumber}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            滞留 {formatRetentionPolicy(getRetentionHours(pkg.storageTime))}
                          </span>
                          <span>{maskPhone(pkg.recipientPhone)}</span>
                        </div>
                        {pkg.markedForReturnAt && (
                          <p className="text-xs text-slate-400">
                            标记退回时间：{format(parseISO(pkg.markedForReturnAt), 'yyyy-MM-dd HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendNotification(pkg.id, 'both')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500/20 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        提醒收件人
                      </button>
                      <button
                        onClick={() => confirmReturn(pkg.id, 'overdue')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        确认退回
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === 'returnHistory' && (
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          {sortedReturnRecords.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无退回记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60">
                    {['收件人', '联系电话', '快递公司', '快递单号', '货架号', '入库时间', '滞留时长', '退回原因', '退回时间'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedReturnRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{record.recipientName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{maskPhone(record.recipientPhone)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{record.courierCompany}</td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">...{record.trackingNumber.slice(-6)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{record.shelfNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {format(parseISO(record.storageTime), 'MM-dd HH:mm')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatRetentionPolicy(record.retentionHours)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {getReturnReasonLabel(record.returnReason)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {format(parseISO(record.returnedAt), 'MM-dd HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mainTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">超期退回设置</h3>
                <p className="text-xs text-slate-500 mt-1">设置包裹最大保留天数，超过后自动标记为待退回</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-slate-500 mb-1">最大保留天数</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={retentionDays}
                  onChange={e => setRetentionDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <button
                onClick={() => setMaxRetentionDays(retentionDays)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存设置
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {warningRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} onSave={updateWarningRule} />
            ))}
          </div>
        </div>
      )}

      {mainTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-6">
          {sortedNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无通知记录</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-6">
                {sortedNotifications.map(n => (
                  <div key={n.id} className="relative flex gap-4">
                    <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center mt-0.5">
                      {n.channel === 'sms' ? (
                        <Smartphone className="w-3 h-3 text-orange-500" />
                      ) : n.channel === 'both' ? (
                        <div className="flex">
                          <Bell className="w-2.5 h-2.5 text-amber-500" />
                          <Smartphone className="w-2.5 h-2.5 text-orange-500" />
                        </div>
                      ) : (
                        <Bell className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-800">{n.recipientName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          n.status === 'sent' ? 'bg-green-50 text-green-600' :
                          n.status === 'delivered' ? 'bg-blue-50 text-blue-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {n.status === 'sent' ? '已发送' : n.status === 'delivered' ? '已送达' : '发送失败'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {getNotificationChannelLabel(n.channel)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed truncate">{n.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{parseISO(n.sentAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RuleCard({ rule, onSave }: { rule: WarningRule; onSave: (id: string, updates: Partial<WarningRule>) => void }) {
  const [threshold, setThreshold] = useState(rule.thresholdHours)
  const [channel, setChannel] = useState<NotificationChannel>(rule.notifyChannel)
  const [enabled, setEnabled] = useState(rule.enabled)

  const handleSave = () => {
    onSave(rule.id, { thresholdHours: threshold, notifyChannel: channel, enabled })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWarningLevelBg(rule.level)}`}>
          {getWarningLevelLabel(rule.level)}
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-xs text-slate-500">启用</span>
        </label>
      </div>
      <div className="text-sm text-slate-500">
        当前策略：滞留超过 <span className="font-medium text-slate-700">{formatRetentionPolicy(rule.thresholdHours)}</span> 触发
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">阈值（小时）</label>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">通知渠道</label>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value as NotificationChannel)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
          >
            <option value="in_app">站内通知</option>
            <option value="sms">短信</option>
            <option value="both">短信+站内</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
      >
        <Save className="w-4 h-4" />
        保存
      </button>
    </div>
  )
}
