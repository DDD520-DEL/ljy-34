import { useState } from 'react'
import { AlertTriangle, Bell, Smartphone, Clock, Send, MessageSquare, Save } from 'lucide-react'
import { parseISO } from 'date-fns'
import { usePackageStore } from '@/store'
import {
  getRetentionHours,
  getWarningLevelLabel,
  getWarningLevelBg,
  maskPhone,
  formatRetentionPolicy,
  getNotificationChannelLabel,
} from '@/utils/warning'
import type { WarningLevel, WarningRule, NotificationChannel } from '@/types'

type MainTab = 'list' | 'rules' | 'notifications'
type LevelFilter = 'all' | WarningLevel

const mainTabs: { key: MainTab; label: string }[] = [
  { key: 'list', label: '预警列表' },
  { key: 'rules', label: '预警规则' },
  { key: 'notifications', label: '通知记录' },
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
  const { packages, notifications, warningRules, sendNotification, updateWarningRule } = usePackageStore()

  const warningPackages = packages.filter(p => p.status === 'stored' && p.warningLevel !== 'none')
  const filtered = levelFilter === 'all' ? warningPackages : warningPackages.filter(p => p.warningLevel === levelFilter)

  const sortedNotifications = [...notifications].sort(
    (a, b) => parseISO(b.sentAt).getTime() - parseISO(a.sentAt).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">预警中心</h1>
          <p className="text-sm text-slate-500">管理包裹滞留预警与通知</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {mainTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              mainTab === tab.key
                ? 'bg-white text-slate-800 font-medium shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'list' && (
        <div className="space-y-4">
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

      {mainTab === 'rules' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {warningRules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onSave={updateWarningRule} />
          ))}
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
