import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Package, WarningRecord, Notification, PickupRecord, WarningRule, DailyStats, WarningLevel } from '@/types'
import { calculateWarningLevel } from '@/utils/warning'
import { generateMockPackages, generateMockWarningRecords, generateMockNotifications, generateMockPickupRecords, generateMockDailyStats } from '@/utils/mockData'

interface PackageStore {
  packages: Package[]
  warningRecords: WarningRecord[]
  notifications: Notification[]
  pickupRecords: PickupRecord[]
  warningRules: WarningRule[]
  dailyStats: DailyStats[]
  toasts: Array<{ id: string; message: string; type: 'success' | 'warning' | 'error' }>

  addPackage: (pkg: Omit<Package, 'id' | 'warningLevel' | 'pickupCode' | 'status' | 'queryCount' | 'lastQueriedAt'>) => Package
  updateWarningLevels: () => void
  pickupPackage: (packageId: string, method: 'code' | 'manual' | 'batch') => void
  pickupByCode: (code: string) => boolean
  batchPickup: (packageIds: string[]) => void
  sendNotification: (packageId: string, channel: 'in_app' | 'sms' | 'both') => void
  updateWarningRule: (id: string, updates: Partial<WarningRule>) => void
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
      warningRules: defaultWarningRules,
      dailyStats: [],
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
        }
        set((state) => ({ packages: [...state.packages, newPkg] }))
        get().addToast(`包裹入库成功！取件码: ${newPkg.pickupCode}`, 'success')
        return newPkg
      },

      queryPackage: (keyword) => {
        const trimmedKeyword = keyword.trim()
        if (!trimmedKeyword) return []

        const results = get().packages.filter(pkg =>
          pkg.recipientPhone === trimmedKeyword ||
          pkg.pickupCode === trimmedKeyword
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
        const { packages, warningRules, warningRecords, notifications } = get()
        const updatedPackages = packages.map(pkg => {
          if (pkg.status === 'picked_up') return pkg
          const newLevel = calculateWarningLevel(pkg.storageTime, warningRules)
          return { ...pkg, warningLevel: newLevel }
        })

        const newWarningRecords = [...warningRecords]
        const newNotifications = [...notifications]

        updatedPackages.forEach(pkg => {
          if (pkg.status === 'picked_up' || pkg.warningLevel === 'none') return
          const existingRecord = warningRecords.find(
            r => r.packageId === pkg.id && r.level === pkg.warningLevel
          )
          if (!existingRecord) {
            const record: WarningRecord = {
              id: generateId(),
              packageId: pkg.id,
              level: pkg.warningLevel,
              triggeredAt: new Date().toISOString(),
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
                sentAt: new Date().toISOString(),
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
        set({
          packages,
          warningRecords,
          notifications,
          pickupRecords,
          dailyStats,
        })
      },
    }),
    {
      name: 'package-warning-store',
    }
  )
)
