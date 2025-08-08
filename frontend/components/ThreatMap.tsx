'use client'

interface ThreatData {
  domain: string
  riskScore: number
}

interface ThreatMapProps {
  threats?: ThreatData[]
}

export function ThreatMap({ threats = [] }: ThreatMapProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Threat Intelligence
      </h3>
      
      {threats.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">🛡️</div>
          <p className="text-sm text-gray-500">No threats detected recently</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threats.map((threat, index) => (
            <div
              key={threat.domain}
              className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
            >
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {threat.domain}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    High Risk Domain
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-bold text-red-600 dark:text-red-400">
                  {threat.riskScore}/100
                </div>
                <div className="text-xs text-gray-500">Risk Score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
