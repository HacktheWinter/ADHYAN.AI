import React from 'react'

export default function NotesAndAssignments() {
  const notes = [
    {
      id: 1,
      type: 'note',
      title: 'Calculus Derivatives - Chapter 3',
      date: '2 days ago',
      description: 'Derivatives represent the rate of change of a function. The power rule is fundamental for understanding rates of change in mathematics and physics.',
      icon: '📄',
      color: 'bg-blue-100'
    },
    {
      id: 2,
      type: 'assignment',
      title: 'Linear Algebra Assignment',
      date: '5 days ago',
      description: 'Complete problems 1-20 from Chapter 5. Focus on matrix operations and eigenvalues.',
      icon: '📋',
      color: 'bg-green-100'
    },
    {
      id: 3,
      type: 'note',
      title: 'Integration Techniques',
      date: '1 week ago',
      description: 'Various methods for solving integrals including substitution, integration by parts, and partial fractions.',
      icon: '📄',
      color: 'bg-blue-100'
    }
  ]

  return (
    <div className="space-y-4">
      {notes.map((item) => (
        <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start space-x-4">
            <div className={`${item.color} w-14 h-14 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
              {item.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{item.date}</p>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}