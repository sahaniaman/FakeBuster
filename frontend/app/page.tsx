'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  StarIcon,
  GiftIcon,
  GlobeAltIcon,
  UsersIcon,
  TrendingUpIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentActivity } from '@/components/RecentActivity'
import { ThreatMap } from '@/components/ThreatMap'
import { QuickActions } from '@/components/QuickActions'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'

interface DashboardData {
  stats: {
    sitesAnalyzed: number
    threatsBlocked: number
    fakeReviewsDetected: number
    couponsFound: number
    trustScoreAverage: number
  }
  recentActivity: Array<{
    id: string
    type: 'analysis' | 'threat' | 'coupon' | 'review'
    description: string
    timestamp: string
    severity: 'low' | 'medium' | 'high'
  }>
  analytics: {
    dailyScans: Array<{ date: string; count: number }>
    threatsByType: Array<{ type: string; count: number }>
    topDomains: Array<{ domain: string; riskScore: number }>
  }
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user, selectedTimeRange])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Mock data - replace with actual API calls
      const mockData: DashboardData = {
        stats: {
          sitesAnalyzed: 1247,
          threatsBlocked: 23,
          fakeReviewsDetected: 156,
          couponsFound: 89,
          trustScoreAverage: 82
        },
        recentActivity: [
          {
            id: '1',
            type: 'threat',
            description: 'Blocked malicious site: fake-shop-scam.com',
            timestamp: '2024-01-15T10:30:00Z',
            severity: 'high'
          },
          {
            id: '2',
            type: 'review',
            description: 'Detected 5 fake reviews on Amazon product page',
            timestamp: '2024-01-15T09:15:00Z',
            severity: 'medium'
          },
          {
            id: '3',
            type: 'coupon',
            description: 'Found 3 valid coupons for Target.com',
            timestamp: '2024-01-15T08:45:00Z',
            severity: 'low'
          },
          {
            id: '4',
            type: 'analysis',
            description: 'Analyzed shopping.example.com - Trust Score: 45/100',
            timestamp: '2024-01-15T08:20:00Z',
            severity: 'medium'
          }
        ],
        analytics: {
          dailyScans: [
            { date: '2024-01-09', count: 145 },
            { date: '2024-01-10', count: 167 },
            { date: '2024-01-11', count: 132 },
            { date: '2024-01-12', count: 189 },
            { date: '2024-01-13', count: 156 },
            { date: '2024-01-14', count: 203 },
            { date: '2024-01-15', count: 178 }
          ],
          threatsByType: [
            { type: 'Phishing', count: 8 },
            { type: 'Malware', count: 5 },
            { type: 'Scam', count: 12 },
            { type: 'Fake Reviews', count: 23 }
          ],
          topDomains: [
            { domain: 'suspicious-deals.com', riskScore: 85 },
            { domain: 'fake-reviews-store.net', riskScore: 78 },
            { domain: 'phishing-site.org', riskScore: 92 }
          ]
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setDashboardData(mockData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-primary-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your FakeBuster dashboard.</p>
          <button className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold gradient-text">FakeBuster Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select 
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="form-input text-sm"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
              </button>
              
              {/* Settings */}
              <button className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg">
                <CogIcon className="h-6 w-6" />
              </button>
              
              {/* User Menu */}
              <div className="flex items-center">
                <img 
                  className="h-8 w-8 rounded-full" 
                  src={user.photoURL || '/default-avatar.png'} 
                  alt={user.displayName || 'User'} 
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.displayName || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <DashboardContentSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Welcome back, {user.displayName?.split(' ')[0] || 'User'}! 👋
                  </h2>
                  <p className="text-primary-100">
                    Your browsing protection is active. We've analyzed {dashboardData?.stats.sitesAnalyzed || 0} sites today.
                  </p>
                </div>
                <div className="hidden md:block">
                  <ShieldCheckIcon className="h-16 w-16 text-primary-200" />
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <DashboardStats stats={dashboardData?.stats} />

            {/* Quick Actions */}
            <QuickActions />

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Analytics Charts - Takes 2 columns */}
              <div className="lg:col-span-2">
                <AnalyticsCharts data={dashboardData?.analytics} />
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <RecentActivity activities={dashboardData?.recentActivity} />
              </div>
            </div>

            {/* Threat Map */}
            <ThreatMap threats={dashboardData?.analytics.topDomains} />

            {/* Extension Status */}
            <ExtensionStatus />
          </motion.div>
        )}
      </main>
    </div>
  )
}

// Skeleton Loading Components
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  )
}

function ExtensionStatus() {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)

  useEffect(() => {
    // Check if extension is installed
    // This would be more sophisticated in a real app
    setIsExtensionInstalled(Math.random() > 0.5)
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${isExtensionInstalled ? 'bg-green-400 pulse-glow' : 'bg-red-400'}`}></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Browser Extension
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isExtensionInstalled ? 'Active and protecting your browsing' : 'Not installed or inactive'}
            </p>
          </div>
        </div>
        
        {!isExtensionInstalled && (
          <button className="btn-primary">
            Install Extension
          </button>
        )}
      </div>
      
      {isExtensionInstalled && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-xs text-gray-500">Real-time Protection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">🔍</div>
            <div className="text-xs text-gray-500">Review Analysis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">🎫</div>
            <div className="text-xs text-gray-500">Coupon Finder</div>
          </div>
        </div>
      )}
    </div>
  )
}
