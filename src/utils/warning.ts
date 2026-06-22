import { differenceInMinutes, differenceInHours, parseISO } from 'date-fns'
import type { WarningLevel, Package, WarningRule } from '@/types'

export function calculateWarningLevel(storageTime: string, rules: WarningRule[]): WarningLevel {
  const hours = differenceInHours(new Date(), parseISO(storageTime))
  const enabledRules = rules.filter(r => r.enabled).sort((a, b) => b.thresholdHours - a.thresholdHours)

  for (const rule of enabledRules) {
    if (hours >= rule.thresholdHours) {
      return rule.level
    }
  }
  return 'none'
}

export function getRetentionHours(storageTime: string): number {
  return differenceInHours(new Date(), parseISO(storageTime))
}

export function getRetentionMinutes(storageTime: string): number {
  return differenceInMinutes(new Date(), parseISO(storageTime))
}

export function formatRetentionPolicy(hours: number): string {
  if (hours < 24) return `${hours}小时`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`
}

export function getWarningLevelColor(level: WarningLevel): string {
  switch (level) {
    case 'yellow': return 'text-amber-500'
    case 'orange': return 'text-orange-500'
    case 'red': return 'text-red-500'
    default: return 'text-slate-400'
  }
}

export function getWarningLevelBg(level: WarningLevel): string {
  switch (level) {
    case 'yellow': return 'bg-amber-500/10 border-amber-500/30 text-amber-600'
    case 'orange': return 'bg-orange-500/10 border-orange-500/30 text-orange-600'
    case 'red': return 'bg-red-500/10 border-red-500/30 text-red-600'
    default: return 'bg-slate-500/10 border-slate-500/30 text-slate-500'
  }
}

export function getWarningLevelLabel(level: WarningLevel): string {
  switch (level) {
    case 'yellow': return '黄色提醒'
    case 'orange': return '橙色警告'
    case 'red': return '红色严重'
    default: return '正常'
  }
}

export function getStatusLabel(status: Package['status']): string {
  switch (status) {
    case 'stored': return '待取件'
    case 'picked_up': return '已签收'
    case 'pending_return': return '待退回'
    case 'returned': return '已退回'
  }
}

export function getReturnReasonLabel(reason: string): string {
  switch (reason) {
    case 'overdue': return '超期未取'
    case 'damaged': return '包裹破损'
    case 'recipient_refused': return '收件人拒收'
    case 'other': return '其他原因'
    default: return reason
  }
}

export function getStatusColor(status: Package['status']): string {
  switch (status) {
    case 'stored': return 'text-blue-600'
    case 'picked_up': return 'text-emerald-600'
    case 'pending_return': return 'text-red-600'
    case 'returned': return 'text-slate-500'
  }
}

export function getStatusBg(status: Package['status']): string {
  switch (status) {
    case 'stored': return 'bg-blue-500/10 border-blue-500/30 text-blue-600'
    case 'picked_up': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
    case 'pending_return': return 'bg-red-500/10 border-red-500/30 text-red-600'
    case 'returned': return 'bg-slate-500/10 border-slate-500/30 text-slate-500'
  }
}

export function getNotificationChannelLabel(channel: string): string {
  switch (channel) {
    case 'in_app': return '站内通知'
    case 'sms': return '短信'
    case 'both': return '短信+站内'
    default: return channel
  }
}

export function getPickupMethodLabel(method: string): string {
  switch (method) {
    case 'code': return '取件码'
    case 'manual': return '手动签收'
    case 'batch': return '批量签收'
    default: return method
  }
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}
