import { format, subDays, subHours, subMinutes } from 'date-fns'
import type { Package, WarningRecord, Notification, PickupRecord, DailyStats } from '@/types'

const now = new Date()
const courierCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '京东物流', '极兔速递', '邮政EMS']
const names = ['张伟', '王芳', '李强', '赵敏', '刘洋', '陈静', '杨帆', '黄磊', '周婷', '吴涛', '徐丽', '孙鹏']
const shelves = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03', 'C-01', 'C-02', 'C-03']

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

  for (let i = 0; i < 8; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 20) + 1)
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
    })
  }

  for (let i = 0; i < 5; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 24) + 24)
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
    })
  }

  for (let i = 0; i < 3; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 24) + 48)
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
    })
  }

  for (let i = 0; i < 2; i++) {
    const storageTime = subHours(now, Math.floor(Math.random() * 48) + 72)
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
    })
  }

  for (let i = 0; i < 10; i++) {
    const storageTime = subDays(now, Math.floor(Math.random() * 5) + 1)
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
    })
  }

  return packages
}

export function generateMockWarningRecords(packages: Package[]): WarningRecord[] {
  const records: WarningRecord[] = []
  const warningPkgs = packages.filter(p => p.warningLevel !== 'none' && p.status === 'stored')

  warningPkgs.forEach(pkg => {
    const levels: Array<'yellow' | 'orange' | 'red'> = ['yellow']
    if (pkg.warningLevel === 'orange' || pkg.warningLevel === 'red') levels.push('orange')
    if (pkg.warningLevel === 'red') levels.push('red')

    levels.forEach(level => {
      records.push({
        id: generateId(),
        packageId: pkg.id,
        level,
        triggeredAt: subHours(new Date(pkg.storageTime), level === 'yellow' ? -24 : level === 'orange' ? -48 : -72).toISOString(),
        notified: true,
      })
    })
  })

  return records
}

export function generateMockNotifications(packages: Package[]): Notification[] {
  const notifications: Notification[] = []
  const warningPkgs = packages.filter(p => p.warningLevel !== 'none' && p.status === 'stored')

  warningPkgs.forEach(pkg => {
    const phone = pkg.recipientPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    if (pkg.warningLevel === 'yellow') {
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
    if (pkg.warningLevel === 'orange') {
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
    if (pkg.warningLevel === 'red') {
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
  return pickedUp.map(pkg => ({
    id: generateId(),
    packageId: pkg.id,
    pickupTime: subHours(new Date(pkg.storageTime), -(Math.floor(Math.random() * 12) + 1)).toISOString(),
    pickupMethod: (['code', 'manual', 'batch'] as const)[Math.floor(Math.random() * 3)],
    operatorId: 'admin',
  }))
}

export function generateMockDailyStats(): DailyStats[] {
  const stats: DailyStats[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i)
    stats.push({
      date: format(date, 'MM-dd'),
      storedCount: Math.floor(Math.random() * 15) + 5,
      pickedUpCount: Math.floor(Math.random() * 12) + 3,
      notificationCount: Math.floor(Math.random() * 8) + 2,
      yellowCount: Math.floor(Math.random() * 5) + 1,
      orangeCount: Math.floor(Math.random() * 3),
      redCount: Math.floor(Math.random() * 2),
    })
  }
  return stats
}
