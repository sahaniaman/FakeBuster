'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  StarIcon,
  GiftIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Activity {
  id: string
  type: 'analysis' | 'threat' | 'coupon' | 'review'
  description: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
}

interface RecentActivityProps {
  activities?: Activity[]
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'threat':
        return ExclamationTriangleIcon
      case 'review':
        return StarIcon
      case 'coupon':
        return GiftIcon
      default:
        return ShieldCheckIcon
    }
  }

  const getIconColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-green-600 bg-green-100'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            activities.map((activity, index) => {
              const Icon = getIcon(activity.type)
              const iconColor = getIconColor(activity.severity)
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.severity === 'high' ? 'status-danger' :
                    activity.severity === 'medium' ? 'status-warning' : 'status-safe'
                  }`}>
                    {activity.severity.toUpperCase()}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
        
        {activities.length > 0 && (
          <div className="mt-6 text-center">
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all activity →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
