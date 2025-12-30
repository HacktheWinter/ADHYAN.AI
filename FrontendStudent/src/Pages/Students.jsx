import React from 'react'

export default function Students() {
  const students = [
    { id: 1, name: 'Alex Thompson', status: 'Active', initials: 'AT' },
    { id: 2, name: 'Maria Garcia', status: 'Active', initials: 'MG' },
    { id: 3, name: 'John Smith', status: 'Active', initials: 'JS' },
    { id: 4, name: 'Emily Davis', status: 'Active', initials: 'ED' },
    { id: 5, name: 'Michael Brown', status: 'Active', initials: 'MB' },
    { id: 6, name: 'Sarah Wilson', status: 'Active', initials: 'SW' }
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Enrolled Students</h3>
        <span className="text-gray-600 font-medium">{students.length} students</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <div key={student.id} className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold">
              {student.initials}
            </div>
            <div>
              <p className="font-medium text-gray-900">{student.name}</p>
              <p className="text-sm text-gray-500">{student.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}