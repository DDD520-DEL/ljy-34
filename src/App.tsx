import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Packages from '@/pages/Packages'
import Warnings from '@/pages/Warnings'
import Pickup from '@/pages/Pickup'
import Statistics from '@/pages/Statistics'
import PackageQuery from '@/pages/PackageQuery'
import { usePackageStore } from '@/store'

function isLegacyDateFormat(dailyStats: { date: string }[]): boolean {
  if (dailyStats.length === 0) return false
  return dailyStats[0].date.length === 5
}

export default function App() {
  const { packages, dailyStats, updateWarningLevels, initMockData } = usePackageStore()

  useEffect(() => {
    if (packages.length === 0 || isLegacyDateFormat(dailyStats)) {
      initMockData()
    }
  }, [])

  useEffect(() => {
    updateWarningLevels()
    const interval = setInterval(updateWarningLevels, 60000)
    return () => clearInterval(interval)
  }, [packages.length])

  return (
    <Router>
      <Routes>
        <Route path="/query" element={<PackageQuery />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/warnings" element={<Warnings />} />
          <Route path="/pickup" element={<Pickup />} />
          <Route path="/statistics" element={<Statistics />} />
        </Route>
      </Routes>
    </Router>
  )
}
