'use client'

interface SecurityScanProps {
  isScanning?: boolean
  lastScan?: string
  threatsFound?: number
  onScan?: () => void
}

export function SecurityScan({
  isScanning = false,
  lastScan,
  threatsFound = 0,
  onScan
}: SecurityScanProps) {
  const getScanStatus = () => {
    if (isScanning) return { text: 'Scanning...', color: 'text-blue-600' }
    if (threatsFound > 0) return { text: 'Threats Detected', color: 'text-red-600' }
    return { text: 'Secure', color: 'text-green-600' }
  }

  const status = getScanStatus()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Security Scan
        </h3>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isScanning ? 'bg-blue-500 animate-pulse' :
              threatsFound > 0 ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
            <div>
              <p className={`font-medium ${status.color}`}>
                {status.text}
              </p>
              {lastScan && (
                <p className="text-sm text-gray-500">
                  Last scan: {new Date(lastScan).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scan Results */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {threatsFound}
            </div>
            <div className="text-sm text-gray-500">Threats Found</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {isScanning ? '...' : '15'}
            </div>
            <div className="text-sm text-gray-500">Sites Checked</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {isScanning ? '...' : '98%'}
            </div>
            <div className="text-sm text-gray-500">Protection Rate</div>
          </div>
        </div>

        {/* Scanning Animation */}
        {isScanning && (
          <div className="flex justify-center py-8">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}

        {/* Recent Findings */}
        {threatsFound > 0 && !isScanning && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Recent Threats
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    Phishing site detected
                  </span>
                </div>
                <span className="text-xs text-red-600 dark:text-red-400">
                  High Risk
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    Suspicious redirect
                  </span>
                </div>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Medium Risk
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
