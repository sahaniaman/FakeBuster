'use client'

import { useState } from 'react'

interface Review {
  id: string
  product: string
  rating: number
  text: string
  fakeScore: number
  date: string
}

interface ReviewAnalyzerProps {
  reviews?: Review[]
}

export function ReviewAnalyzer({ reviews = [] }: ReviewAnalyzerProps) {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  const getFakeScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-100'
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getFakeScoreLabel = (score: number) => {
    if (score >= 0.8) return 'High Risk'
    if (score >= 0.5) return 'Medium Risk'
    return 'Authentic'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Review Analysis
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered fake review detection
        </p>
      </div>
      
      <div className="p-6">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📝</div>
            <p className="text-sm text-gray-500">No reviews analyzed yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {review.product}
                      </h4>
                      <div className="flex text-yellow-400">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i}>
                            {i < review.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {review.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(review.date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="ml-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getFakeScoreColor(
                        review.fakeScore
                      )}`}
                    >
                      {getFakeScoreLabel(review.fakeScore)}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(review.fakeScore * 100)}% fake
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Review Details
                </h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedReview.product}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rating
                  </label>
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i}>
                        {i < selectedReview.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Review Text
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedReview.text}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Authenticity Analysis
                  </label>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getFakeScoreColor(
                        selectedReview.fakeScore
                      )}`}
                    >
                      {getFakeScoreLabel(selectedReview.fakeScore)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(selectedReview.fakeScore * 100)}% probability of being fake
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
