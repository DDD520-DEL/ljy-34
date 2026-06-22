import { format, subDays, subHours, subMinutes, parseISO } from 'date-fns'
import type { Package, WarningRecord, Notification, PickupRecord, DailyStats, ReturnRecord, ReturnReason } from '@/types'

const now = new Date()
const courierCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '京东物流', '极兔速递', '邮政EMS']
const names = ['张伟', '王芳', '李强', '赵敏', '刘洋', '陈静', '杨帆', '黄磊', '周婷', '吴涛', '徐丽', '孙鹏']
const shelves = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03', 'C-01', 'C-02', 'C-03']
const returnReasons: ReturnReason[] = ['overdue', 'damaged', 'recipient_refused', 'other']

function generatePickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

function generatePhone(): string {
  const prefixes = ['138', '139', '158', '159', '186', '187', '135', '136']
  return prefixes[Math.floor(Math.random() * prefixes.length)] + String(Math.floor(10000000 + Math.random() * 90000000))
}

export function generateMockPackages(): Package[] {
  const packages: Package[] = []

  function randomQueryData(): { queryCount: number; lastQueriedAt: string | null } {
    const count = Math.floor(Math.random() * 10)
    if (count === 0) return { queryCount: 0, lastQueriedAt: null }
    const hoursAgo = Math.floor(Math.random() * 48)
    return {
      queryCount: count,
      lastQueriedAt: subHours(now, hoursAgo).toISOString(),
    }
  }

  for (let i = 0; i < 8; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 20) + 1)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'SF' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'stored',
      warningLevel: 'none',
      pickupCode: generatePickupCode(),
      markedForReturnAt: null,
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 5; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 24) + 24)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'YT' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'stored',
      warningLevel: 'yellow',
      pickupCode: generatePickupCode(),
      markedForReturnAt: null,
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 3; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 24) + 48)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'ZT' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'stored',
      warningLevel: 'orange',
      pickupCode: generatePickupCode(),
      markedForReturnAt: null,
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 2; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 48) + 72)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'JD' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'stored',
      warningLevel: 'red',
      pickupCode: generatePickupCode(),
      markedForReturnAt: null,
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 3; i++) {
    const storageTime = subDays(now, Math.floor(Math.random() * 2) + 8)
    const markedAt = subHours(now, Math.floor(Math.random() * 6) + 1)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'YTO' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'pending_return',
      warningLevel: 'red',
      pickupCode: generatePickupCode(),
      markedForReturnAt: markedAt.toISOString(),
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 10; i++) {
    const storageTime = subDays(now, Math.floor(Math.random() * 5) + 1)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'EMS' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'picked_up',
      warningLevel: 'none',
      pickupCode: generatePickupCode(),
      markedForReturnAt: null,
      returnedAt: null,
      returnReason: null,
      ...queryData,
    })
  }

  for (let i = 0; i < 4; i++) {
    const storageTime = subDays(now, Math.floor(Math.random() * 5) + 10)
    const returnedAt = subDays(now, Math.floor(Math.random() * 3) + 1)
    const queryData = randomQueryData()
    packages.push({
      id: generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'STO' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      status: 'returned',
      warningLevel: 'none',
      pickupCode: generatePickupCode(),
      markedForReturnAt: subDays(returnedAt, 1).toISOString(),
      returnedAt: returnedAt.toISOString(),
      returnReason: returnReasons[Math.floor(Math.random() * returnReasons.length)],
      ...queryData,
    })
  }

  return packages
}

export function generateMockWarningRecords(packages: Package[]): WarningRecord[] {
  const records: WarningRecord[] = []
  const warningPkgs = packages.filter(p => p.warningLevel !== 'none' && (p.status === 'stored' || p.status === 'pending_return'))

  warningPkgs.forEach(pkg => {
    const levels: Array<'yellow' | 'orange' | 'red'> = ['yellow']
    if (pkg.warningLevel === 'orange' || pkg.warningLevel === 'red') levels.push('orange')
    if (pkg.warningLevel === 'red') levels.push('red')

    levels.forEach(level => {
      records.push({
        id: generateId(),
        packageId: pkg.id,
        level,
        triggeredAt: level === 'red' && pkg.markedForReturnAt
          ? pkg.markedForReturnAt
          : subHours(parseISO(pkg.storageTime), level === 'yellow' ? -24 : level === 'orange' ? -48 : -72).toISOString(),
        notified: true,
      })
    })
  })

  return records
}

export function generateMockNotifications(packages: Package[]): Notification[] {
  const notifications: Notification[] = []
  const warningPkgs = packages.filter(p => p.warningLevel !== 'none' && (p.status === 'stored' || p.status === 'pending_return'))

  warningPkgs.forEach(pkg => {
    if (pkg.status === 'pending_return') {
      notifications.push({
        id: generateId(),
        packageId: pkg.id,
        recipientPhone: pkg.recipientPhone,
        recipientName: pkg.recipientName,
        channel: 'both',
        sentAt: pkg.markedForReturnAt || subMinutes(now, Math.floor(Math.random() * 60)).toISOString(),
        status: 'delivered',
        content: `【包裹超期退回通知】${pkg.recipientName}，您的${pkg.courierCompany}包裹已滞留超过7天，系统将安排退回处理，如有疑问请联系管理员。`,
      })
    }
    if (pkg.warningLevel === 'yellow' && pkg.status === 'stored') {
      notifications.push({
        id: generateId(),
        packageId: pkg.id,
        recipientPhone: pkg.recipientPhone,
        recipientName: pkg.recipientName,
        channel: 'in_app',
        sentAt: subMinutes(now, Math.floor(Math.random() * 120)).toISOString(),
        status: 'delivered',
        content: `【包裹提醒】${pkg.recipientName}，您有一个${pkg.courierCompany}包裹已存放超过24小时，请尽快取件，取件码${pkg.pickupCode}`,
      })
    }
    if (pkg.warningLevel === 'orange' && pkg.status === 'stored') {
      notifications.push({
        id: generateId(),
        packageId: pkg.id,
        recipientPhone: pkg.recipientPhone,
        recipientName: pkg.recipientName,
        channel: 'sms',
        sentAt: subMinutes(now, Math.floor(Math.random() * 180)).toISOString(),
        status: 'delivered',
        content: `【包裹警告】${pkg.recipientName}，您有一个${pkg.courierCompany}包裹已存放超过48小时，请尽快取件，取件码${pkg.pickupCode}`,
      })
    }
    if (pkg.warningLevel === 'red' && pkg.status === 'stored') {
      notifications.push({
        id: generateId(),
        packageId: pkg.id,
        recipientPhone: pkg.recipientPhone,
        recipientName: pkg.recipientName,
        channel: 'both',
        sentAt: subMinutes(now, Math.floor(Math.random() * 60)).toISOString(),
        status: 'delivered',
        content: `【紧急通知】${pkg.recipientName}，您有一个${pkg.courierCompany}包裹已存放超过72小时，请立即取件，取件码${pkg.pickupCode}`,
      })
    }
  })

  return notifications
}

export function generateMockPickupRecords(packages: Package[]): PickupRecord[] {
  const pickedUp = packages.filter(p => p.status === 'picked_up')
  const returned = packages.filter(p => p.status === 'returned')
  const records: PickupRecord[] = []

  pickedUp.forEach(pkg => {
    records.push({
      id: generateId(),
      packageId: pkg.id,
      pickupTime: subHours(parseISO(pkg.storageTime), -(Math.floor(Math.random() * 12) + 1)).toISOString(),
      pickupMethod: (['code', 'manual', 'batch'] as const)[Math.floor(Math.random() * 3)],
      operatorId: 'admin',
      isReturn: false,
    })
  })

  returned.forEach(pkg => {
    records.push({
      id: generateId(),
      packageId: pkg.id,
      pickupTime: pkg.returnedAt || now.toISOString(),
      pickupMethod: 'manual',
      operatorId: 'admin',
      isReturn: true,
    })
  })

  return records
}

export function generateMockReturnRecords(): ReturnRecord[] {
  const records: ReturnRecord[] = []
  for (let i = 0; i < 4; i++) {
    const storageTime = subDays(now, Math.floor(Math.random() * 5) + 10)
    const returnedAt = subDays(now, Math.floor(Math.random() * 3) + 1)
    const markedAt = subDays(returnedAt, 1)
    records.push({
      id: generateId(),
      packageId: 'P' + generateId(),
      recipientName: names[Math.floor(Math.random() * names.length)],
      recipientPhone: generatePhone(),
      courierCompany: courierCompanies[Math.floor(Math.random() * courierCompanies.length)],
      trackingNumber: 'STO' + String(Math.floor(1000000000 + Math.random() * 9000000000)),
      shelfNumber: shelves[Math.floor(Math.random() * shelves.length)],
      storageTime: storageTime.toISOString(),
      markedForReturnAt: markedAt.toISOString(),
      returnedAt: returnedAt.toISOString(),
      returnReason: returnReasons[Math.floor(Math.random() * returnReasons.length)],
      operatorId: 'admin',
      retentionHours: Math.floor(Math.random() * 48) + 168,
    })
  }
  return records
}

export function generateMockDailyStats(): DailyStats[] {
  const stats: DailyStats[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i)
    stats.push({
      date: format(date, 'yyyy-MM-dd'),
      storedCount: Math.floor(Math.random() * 15) + 5,
      pickedUpCount: Math.floor(Math.random() * 12) + 3,
      returnedCount: Math.floor(Math.random() * 3),
      notificationCount: Math.floor(Math.random() * 8) + 2,
      yellowCount: Math.floor(Math.random() * 5) + 1,
      orangeCount: Math.floor(Math.random() * 3),
      redCount: Math.floor(Math.random() * 2),
    })
  }
  return stats
}
