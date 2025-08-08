'use client'

import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  StarIcon,
  GiftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Stats {
  sitesAnalyzed: number
  threatsBlocked: number
  fakeReviewsDetected: number
  couponsFound: number
  trustScoreAverage: number
}

interface DashboardStatsProps {
  stats?: Stats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      name: 'Sites Analyzed',
      value: stats?.sitesAnalyzed || 0,
      icon: ChartBarIcon,
      color: 'blue',
      change: '+12%',
      changeType: 'increase' as const
    },
    {
      name: 'Threats Blocked',
      value: stats?.threatsBlocked || 0,
      icon: ShieldCheckIcon,
      color: 'red',
      change: '+5%',
      changeType: 'increase' as const
    },
    {
      name: 'Fake Reviews',
      value: stats?.fakeReviewsDetected || 0,
      icon: StarIcon,
      color: 'yellow',
      change: '-8%',
      changeType: 'decrease' as const
    },
    {
      name: 'Coupons Found',
      value: stats?.couponsFound || 0,
      icon: GiftIcon,
      color: 'green',
      change: '+23%',
      changeType: 'increase' as const
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-50',
      red: 'bg-red-500 text-red-600 bg-red-50',
      yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
      green: 'bg-green-500 text-green-600 bg-green-50'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const colorClasses = getColorClasses(stat.color).split(' ')
        const iconBgColor = colorClasses[0]
        const textColor = colorClasses[1]
        const bgColor = colorClasses[2]

        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 card-hover"
          >
            <div className="flex items-center">
              <div className={`${iconBgColor} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.name}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className={`ml-2 text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Trust Score Bar for the average score */}
            {stat.name === 'Sites Analyzed' && stats?.trustScoreAverage && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Avg Trust Score</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {stats.trustScoreAverage}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${
                      stats.trustScoreAverage >= 70 ? 'progress-safe' : 
                      stats.trustScoreAverage >= 40 ? 'progress-warning' : 'progress-danger'
                    }`}
                    style={{ width: `${stats.trustScoreAverage}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
