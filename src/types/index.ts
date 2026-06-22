export type WarningLevel = 'none' | 'yellow' | 'orange' | 'red'
export type PackageStatus = 'stored' | 'picked_up' | 'pending_return' | 'returned'
export type NotificationChannel = 'in_app' | 'sms' | 'both'
export type NotificationStatus = 'sent' | 'delivered' | 'failed'
export type PickupMethod = 'code' | 'manual' | 'batch'
export type ReturnReason = 'overdue' | 'damaged' | 'recipient_refused' | 'other'

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
  queryCount: number
  lastQueriedAt: string | null
  markedForReturnAt?: string | null
  returnedAt?: string | null
  returnReason?: ReturnReason | null
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
  isReturn: boolean
}

export interface ReturnRecord {
  id: string
  packageId: string
  recipientName: string
  recipientPhone: string
  courierCompany: string
  trackingNumber: string
  shelfNumber: string
  storageTime: string
  markedForReturnAt: string
  returnedAt: string
  returnReason: ReturnReason
  operatorId: string
  retentionHours: number
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
  returnedCount: number
  notificationCount: number
  yellowCount: number
  orangeCount: number
  redCount: number
}
