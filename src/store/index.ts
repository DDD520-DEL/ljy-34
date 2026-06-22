import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { differenceInHours, parseISO } from 'date-fns'
import type { Package, WarningRecord, Notification, PickupRecord, WarningRule, DailyStats, WarningLevel, ReturnRecord, ReturnReason } from '@/types'
import { calculateWarningLevel } from '@/utils/warning'
import { generateMockPackages, generateMockWarningRecords, generateMockNotifications, generateMockPickupRecords, generateMockDailyStats, generateMockReturnRecords } from '@/utils/mockData'

const MAX_RETENTION_DAYS = 7

interface PackageStore {
  packages: Package[]
  warningRecords: WarningRecord[]
  notifications: Notification[]
  pickupRecords: PickupRecord[]
  returnRecords: ReturnRecord[]
  warningRules: WarningRule[]
  dailyStats: DailyStats[]
  maxRetentionDays: number
  toasts: Array<{ id: string; message: string; type: 'success' | 'warning' | 'error' }>

  addPackage: (pkg: Omit<Package, 'id' | 'warningLevel' | 'pickupCode' | 'status' | 'queryCount' | 'lastQueriedAt' | 'markedForReturnAt' | 'returnedAt' | 'returnReason'>) => Package
  updateWarningLevels: () => void
  checkOverduePackages: () => void
  confirmReturn: (packageId: string, reason?: ReturnReason) => void
  batchConfirmReturn: (packageIds: string[]) => void
  pickupPackage: (packageId: string, method: 'code' | 'manual' | 'batch') => void
  pickupByCode: (code: string) => boolean
  batchPickup: (packageIds: string[]) => void
  sendNotification: (packageId: string, channel: 'in_app' | 'sms' | 'both') => void
  updateWarningRule: (id: string, updates: Partial<WarningRule>) => void
  setMaxRetentionDays: (days: number) => void
  addToast: (message: string, type?: 'success' | 'warning' | 'error') => void
  removeToast: (id: string) => void
  initMockData: () => void
  queryPackage: (keyword: string) => Package[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

function generatePickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function updateDailyStatsReturned(dateStr: string, currentStats: DailyStats[]): DailyStats[] {
  return currentStats.map(s => {
    if (s.date === dateStr) {
      return { ...s, returnedCount: s.returnedCount + 1 }
    }
    return s
  })
}

const defaultWarningRules: WarningRule[] = [
  { id: 'rule-yellow', level: 'yellow', thresholdHours: 24, notifyChannel: 'in_app', enabled: true },
  { id: 'rule-orange', level: 'orange', thresholdHours: 48, notifyChannel: 'sms', enabled: true },
  { id: 'rule-red', level: 'red', thresholdHours: 72, notifyChannel: 'both', enabled: true },
]

export const usePackageStore = create<PackageStore>()(
  persist(
    (set, get) => ({
      packages: [],
      warningRecords: [],
      notifications: [],
      pickupRecords: [],
      returnRecords: [],
      warningRules: defaultWarningRules,
      dailyStats: [],
      maxRetentionDays: MAX_RETENTION_DAYS,
      toasts: [],

      addPackage: (pkgData) => {
        const newPkg: Package = {
          ...pkgData,
          id: generateId(),
          status: 'stored',
          warningLevel: 'none',
          pickupCode: generatePickupCode(),
          queryCount: 0,
          lastQueriedAt: null,
          markedForReturnAt: null,
          returnedAt: null,
          returnReason: null,
        }
        set((state) => ({ packages: [...state.packages, newPkg] }))
        get().addToast(`包裹入库成功！取件码: ${newPkg.pickupCode}`, 'success')
        return newPkg
      },

      queryPackage: (keyword) => {
        const trimmedKeyword = keyword.trim()
        if (!trimmedKeyword) return []

        const results = get().packages.filter(pkg =>
          pkg.status === 'stored' && (
            pkg.recipientPhone === trimmedKeyword ||
            pkg.pickupCode === trimmedKeyword
          )
        )

        if (results.length > 0) {
          const now = new Date().toISOString()
          set((state) => ({
            packages: state.packages.map(pkg => {
              if (results.some(r => r.id === pkg.id)) {
                return {
                  ...pkg,
                  queryCount: pkg.queryCount + 1,
                  lastQueriedAt: now,
                }
              }
              return pkg
            }),
          }))
        }

        return results
      },

      updateWarningLevels: () => {
        const { packages, warningRules, warningRecords, notifications, maxRetentionDays } = get()
        const maxHours = maxRetentionDays * 24
        const now = new Date()
        const nowIso = now.toISOString()

        const updatedPackages = packages.map(pkg => {
          if (pkg.status === 'picked_up' || pkg.status === 'returned' || pkg.status === 'pending_return') return pkg
          const hours = differenceInHours(now, parseISO(pkg.storageTime))
          if (hours >= maxHours) {
            return { ...pkg, status: 'pending_return' as const, warningLevel: 'red' as const, markedForReturnAt: nowIso }
          }
          const newLevel = calculateWarningLevel(pkg.storageTime, warningRules)
          return { ...pkg, warningLevel: newLevel }
        })

        const newWarningRecords = [...warningRecords]
        const newNotifications = [...notifications]

        updatedPackages.forEach(pkg => {
          if (pkg.status === 'picked_up' || pkg.status === 'returned') return
          if (pkg.warningLevel === 'none') return

          if (pkg.status === 'pending_return') {
            const existingReturnRecord = warningRecords.find(
              r => r.packageId === pkg.id && r.level === 'red' && r.triggeredAt === pkg.markedForReturnAt
            )
            if (!existingReturnRecord) {
              const record: WarningRecord = {
                id: generateId(),
                packageId: pkg.id,
                level: 'red',
                triggeredAt: pkg.markedForReturnAt || nowIso,
                notified: false,
              }
              newWarningRecords.push(record)

              const phone = pkg.recipientPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
              const notification: Notification = {
                id: generateId(),
                packageId: pkg.id,
                recipientPhone: pkg.recipientPhone,
                recipientName: pkg.recipientName,
                channel: 'both',
                sentAt: nowIso,
                status: 'sent',
                content: `【包裹超期退回通知】${pkg.recipientName}，您的${pkg.courierCompany}包裹已滞留超过${maxRetentionDays}天，系统将安排退回处理，如有疑问请联系管理员。`,
              }
              newNotifications.push(notification)
              record.notified = true
              get().addToast(`包裹 ${pkg.trackingNumber.slice(-6)} 已超期，自动标记为待退回，短信已发送至${phone}`, 'warning')
            }
            return
          }

          const existingRecord = warningRecords.find(
            r => r.packageId === pkg.id && r.level === pkg.warningLevel
          )
          if (!existingRecord) {
            const record: WarningRecord = {
              id: generateId(),
              packageId: pkg.id,
              level: pkg.warningLevel,
              triggeredAt: nowIso,
              notified: false,
            }
            newWarningRecords.push(record)

            const rule = warningRules.find(r => r.level === pkg.warningLevel)
            if (rule) {
              const channel = rule.notifyChannel
              const phone = pkg.recipientPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
              const levelLabels: Record<WarningLevel, string> = { none: '', yellow: '提醒', orange: '警告', red: '紧急通知' }
              const notification: Notification = {
                id: generateId(),
                packageId: pkg.id,
                recipientPhone: pkg.recipientPhone,
                recipientName: pkg.recipientName,
                channel,
                sentAt: nowIso,
                status: 'sent',
                content: `【包裹${levelLabels[pkg.warningLevel]}】${pkg.recipientName}，您的${pkg.courierCompany}包裹已滞留，请尽快取件，取件码${pkg.pickupCode}`,
              }
              newNotifications.push(notification)
              record.notified = true

              if (channel === 'sms' || channel === 'both') {
                get().addToast(`短信已发送至${phone}`, 'success')
              }
            }
          }
        })

        set({
          packages: updatedPackages,
          warningRecords: newWarningRecords,
          notifications: newNotifications,
        })
      },

      checkOverduePackages: () => {
        get().updateWarningLevels()
      },

      confirmReturn: (packageId, reason = 'overdue') => {
        const pkg = get().packages.find(p => p.id === packageId)
        if (!pkg) return
        if (pkg.status !== 'pending_return' && pkg.status !== 'stored') {
          get().addToast('该包裹状态不支持退回操作', 'error')
          return
        }

        const now = new Date()
        const nowIso = now.toISOString()
        const retentionHours = differenceInHours(now, parseISO(pkg.storageTime))

        const returnRecord: ReturnRecord = {
          id: generateId(),
          packageId: pkg.id,
          recipientName: pkg.recipientName,
          recipientPhone: pkg.recipientPhone,
          courierCompany: pkg.courierCompany,
          trackingNumber: pkg.trackingNumber,
          shelfNumber: pkg.shelfNumber,
          storageTime: pkg.storageTime,
          markedForReturnAt: pkg.markedForReturnAt || nowIso,
          returnedAt: nowIso,
          returnReason: reason,
          operatorId: 'admin',
          retentionHours,
        }

        const pickupRecord: PickupRecord = {
          id: generateId(),
          packageId: pkg.id,
          pickupTime: nowIso,
          pickupMethod: 'manual',
          operatorId: 'admin',
          isReturn: true,
        }

        const dateStr = now.toISOString().split('T')[0]

        set((state) => ({
          packages: state.packages.map(p =>
            p.id === packageId ? {
              ...p,
              status: 'returned' as const,
              warningLevel: 'none' as const,
              returnedAt: nowIso,
              returnReason: reason,
            } : p
          ),
          returnRecords: [...state.returnRecords, returnRecord],
          pickupRecords: [...state.pickupRecords, pickupRecord],
          dailyStats: updateDailyStatsReturned(dateStr, state.dailyStats),
        }))

        get().addToast(`包裹 ${pkg.trackingNumber.slice(-6)} 已确认退回，已从活跃列表移除`, 'success')
      },

      batchConfirmReturn: (packageIds) => {
        const { packages } = get()
        const now = new Date()
        const nowIso = now.toISOString()
        const dateStr = now.toISOString().split('T')[0]

        const validPkgs = packages.filter(p =>
          packageIds.includes(p.id) && (p.status === 'pending_return' || p.status === 'stored')
        )

        const newReturnRecords: ReturnRecord[] = validPkgs.map(pkg => ({
          id: generateId(),
          packageId: pkg.id,
          recipientName: pkg.recipientName,
          recipientPhone: pkg.recipientPhone,
          courierCompany: pkg.courierCompany,
          trackingNumber: pkg.trackingNumber,
          shelfNumber: pkg.shelfNumber,
          storageTime: pkg.storageTime,
          markedForReturnAt: pkg.markedForReturnAt || nowIso,
          returnedAt: nowIso,
          returnReason: 'overdue' as ReturnReason,
          operatorId: 'admin',
          retentionHours: differenceInHours(now, parseISO(pkg.storageTime)),
        }))

        const newPickupRecords: PickupRecord[] = validPkgs.map(pkg => ({
          id: generateId(),
          packageId: pkg.id,
          pickupTime: nowIso,
          pickupMethod: 'batch',
          operatorId: 'admin',
          isReturn: true,
        }))

        const updatedPackageIds = new Set(validPkgs.map(p => p.id))

        set((state) => {
          let updatedStats = state.dailyStats
          for (let i = 0; i < validPkgs.length; i++) {
            updatedStats = updateDailyStatsReturned(dateStr, updatedStats)
          }
          return {
            packages: state.packages.map(p =>
              updatedPackageIds.has(p.id) ? {
                ...p,
                status: 'returned' as const,
                warningLevel: 'none' as const,
                returnedAt: nowIso,
                returnReason: 'overdue' as ReturnReason,
              } : p
            ),
            returnRecords: [...state.returnRecords, ...newReturnRecords],
            pickupRecords: [...state.pickupRecords, ...newPickupRecords],
            dailyStats: updatedStats,
          }
        })

        get().addToast(`成功确认退回 ${validPkgs.length} 个包裹`, 'success')
      },

      pickupPackage: (packageId, method) => {
        const now = new Date().toISOString()
        set((state) => ({
          packages: state.packages.map(p =>
            p.id === packageId ? { ...p, status: 'picked_up' as const, warningLevel: 'none' as const } : p
          ),
          pickupRecords: [...state.pickupRecords, {
            id: generateId(),
            packageId,
            pickupTime: now,
            pickupMethod: method,
            operatorId: 'admin',
            isReturn: false,
          }],
        }))
        get().addToast('签收成功！', 'success')
      },

      pickupByCode: (code) => {
        const pkg = get().packages.find(p => p.pickupCode === code && p.status === 'stored')
        if (pkg) {
          get().pickupPackage(pkg.id, 'code')
          return true
        }
        get().addToast('取件码无效或包裹已签收', 'error')
        return false
      },

      batchPickup: (packageIds) => {
        const now = new Date().toISOString()
        const newRecords = packageIds.map(id => ({
          id: generateId(),
          packageId: id,
          pickupTime: now,
          pickupMethod: 'batch' as const,
          operatorId: 'admin',
          isReturn: false,
        }))
        set((state) => ({
          packages: state.packages.map(p =>
            packageIds.includes(p.id) ? { ...p, status: 'picked_up' as const, warningLevel: 'none' as const } : p
          ),
          pickupRecords: [...state.pickupRecords, ...newRecords],
        }))
        get().addToast(`成功签收${packageIds.length}个包裹！`, 'success')
      },

      sendNotification: (packageId, channel) => {
        const pkg = get().packages.find(p => p.id === packageId)
        if (!pkg) return
        const phone = pkg.recipientPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        const notification: Notification = {
          id: generateId(),
          packageId,
          recipientPhone: pkg.recipientPhone,
          recipientName: pkg.recipientName,
          channel,
          sentAt: new Date().toISOString(),
          status: 'sent',
          content: `【包裹通知】${pkg.recipientName}，您有一个${pkg.courierCompany}包裹待取件，取件码${pkg.pickupCode}`,
        }
        set((state) => ({ notifications: [...state.notifications, notification] }))
        if (channel === 'sms' || channel === 'both') {
          get().addToast(`短信已发送至${phone}`, 'success')
        } else {
          get().addToast('站内通知已发送', 'success')
        }
      },

      updateWarningRule: (id, updates) => {
        set((state) => ({
          warningRules: state.warningRules.map(r => r.id === id ? { ...r, ...updates } : r),
        }))
      },

      setMaxRetentionDays: (days) => {
        set({ maxRetentionDays: days })
        get().addToast(`最大保留天数已设置为 ${days} 天`, 'success')
      },

      addToast: (message, type = 'success') => {
        const id = generateId()
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
        setTimeout(() => {
          get().removeToast(id)
        }, 3000)
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
      },

      initMockData: () => {
        const packages = generateMockPackages()
        const warningRecords = generateMockWarningRecords(packages)
        const notifications = generateMockNotifications(packages)
        const pickupRecords = generateMockPickupRecords(packages)
        const dailyStats = generateMockDailyStats()
        const returnRecords = generateMockReturnRecords()
        set({
          packages,
          warningRecords,
          notifications,
          pickupRecords,
          returnRecords,
          dailyStats,
        })
      },
    }),
    {
      name: 'package-warning-store',
    }
  )
)
