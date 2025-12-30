import React from 'react'

export default function Doubt() {
  const doubts = [
    {
      id: 1,
      student: 'Alex Thompson',
      question: 'How do I solve partial derivatives with multiple variables?',
      date: '2 hours ago',
      status: 'pending'
    },
    {
      id: 2,
      student: 'Maria Garcia',
      question: 'Can you explain the chain rule with a real-world example?',
      date: '1 day ago',
      status: 'answered'
    },
    {
      id: 3,
      student: 'John Smith',
      question: 'What is the difference between definite and indefinite integrals?',
      date: '3 days ago',
      status: 'answered'
    }
  ]

  return (
    <div className="space-y-4">
      {doubts.map((doubt) => (
        <div key={doubt.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{doubt.student}</h4>
              <p className="text-sm text-gray-500">{doubt.date}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              doubt.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {doubt.status}
            </span>
          </div>
          <p className="text-gray-700 mb-4">{doubt.question}</p>
          <button className="text-purple-700 font-medium hover:text-purple-800 transition-colors">
            {doubt.status === 'pending' ? 'Answer' : 'View Answer'} →
          </button>
        </div>
      ))}
    </div>
  )
}