export type WarningLevel = 'none' | 'yellow' | 'orange' | 'red'
export type PackageStatus = 'stored' | 'picked_up'
export type NotificationChannel = 'in_app' | 'sms' | 'both'
export type NotificationStatus = 'sent' | 'delivered' | 'failed'
export type PickupMethod = 'code' | 'manual' | 'batch'

export interface Package {
  id: string
  recipientName: string
  recipientPhone: string
  courierCompany: string
  trackingNumber: string
  shelfNumber: string
  storageTime: string
  status: PackageStatus
  warningLevel: WarningLevel
  pickupCode: string
}

export interface WarningRecord {
  id: string
  packageId: string
  level: WarningLevel
  triggeredAt: string
  notified: boolean
}

export interface Notification {
  id: string
  packageId: string
  recipientPhone: string
  recipientName: string
  channel: NotificationChannel
  sentAt: string
  status: NotificationStatus
  content: string
}

export interface PickupRecord {
  id: string
  packageId: string
  pickupTime: string
  pickupMethod: PickupMethod
  operatorId: string
}

export interface WarningRule {
  id: string
  level: WarningLevel
  thresholdHours: number
  notifyChannel: NotificationChannel
  enabled: boolean
}

export interface DailyStats {
  date: string
  storedCount: number
  pickedUpCount: number
  notificationCount: number
  yellowCount: number
  orangeCount: number
  redCount: number
}
