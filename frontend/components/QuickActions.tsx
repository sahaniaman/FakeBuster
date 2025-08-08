'use client'

import { motion } from 'framer-motion'
import { 
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  StarIcon,
  GiftIcon,
  DocumentTextIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'

export function QuickActions() {
  const actions = [
    {
      name: 'Analyze Current Site',
      description: 'Check the current website for threats',
      icon: MagnifyingGlassIcon,
      color: 'blue',
      action: () => {
        // Trigger site analysis
        chrome?.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'analyze_current_site' })
          }
        })
      }
    },
    {
      name: 'Scan for Fake Reviews',
      description: 'Analyze reviews on the current page',
      icon: StarIcon,
      color: 'yellow',
      action: () => {
        chrome?.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'scan_reviews' })
          }
        })
      }
    },
    {
      name: 'Find Coupons',
      description: 'Search for valid coupon codes',
      icon: GiftIcon,
      color: 'green',
      action: () => {
        chrome?.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'find_coupons' })
          }
        })
      }
    },
    {
      name: 'Security Report',
      description: 'Generate detailed security report',
      icon: ShieldCheckIcon,
      color: 'red',
      action: () => {
        window.open('/reports', '_blank')
      }
    },
    {
      name: 'View Logs',
      description: 'See recent activity and logs',
      icon: DocumentTextIcon,
      color: 'gray',
      action: () => {
        window.open('/logs', '_blank')
      }
    },
    {
      name: 'Report Issue',
      description: 'Report a problem or false positive',
      icon: BugAntIcon,
      color: 'purple',
      action: () => {
        window.open('/report-issue', '_blank')
      }
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100',
      yellow: 'bg-yellow-500 hover:bg-yellow-600 text-yellow-600 bg-yellow-50 hover:bg-yellow-100',
      green: 'bg-green-500 hover:bg-green-600 text-green-600 bg-green-50 hover:bg-green-100',
      red: 'bg-red-500 hover:bg-red-600 text-red-600 bg-red-50 hover:bg-red-100',
      gray: 'bg-gray-500 hover:bg-gray-600 text-gray-600 bg-gray-50 hover:bg-gray-100',
      purple: 'bg-purple-500 hover:bg-purple-600 text-purple-600 bg-purple-50 hover:bg-purple-100'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const colorClasses = getColorClasses(action.color).split(' ')
            const iconBg = colorClasses[0]
            const iconBgHover = colorClasses[1]
            const textColor = colorClasses[2]
            const cardBg = colorClasses[3]
            const cardBgHover = colorClasses[4]

            return (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.action}
                className={`${cardBg} ${cardBgHover} p-4 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 text-left group`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${iconBg} ${iconBgHover} p-2 rounded-lg transition-colors duration-200`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${textColor} group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200`}>
                      {action.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
