const actionLabelMap = {
  classroom_created: "Classroom created",
  note_uploaded: "Note uploaded",
  assignment_published: "Assignment published",
  announcement_created: "Announcement posted",
  quiz_published: "Quiz published",
  test_paper_published: "Test paper published",
  live_class_started: "Live class started",
  live_class_ended: "Live class ended",
  attendance_started: "Attendance started",
  attendance_ended: "Attendance ended",
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function ActivityTimeline({ activities = [] }) {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity._id}
          className="rounded-2xl border border-purple-100 bg-purple-50/50 px-4 py-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {actionLabelMap[activity.action] || activity.action}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {activity.teacherName} in {activity.className}
              </p>
              {activity.meta?.noteTitle ? (
                <p className="mt-1 text-xs text-gray-500">Note: {activity.meta.noteTitle}</p>
              ) : null}
              {activity.meta?.assignmentTitle ? (
                <p className="mt-1 text-xs text-gray-500">
                  Assignment: {activity.meta.assignmentTitle}
                </p>
              ) : null}
              {activity.meta?.quizTitle ? (
                <p className="mt-1 text-xs text-gray-500">Quiz: {activity.meta.quizTitle}</p>
              ) : null}
              {activity.meta?.testTitle ? (
                <p className="mt-1 text-xs text-gray-500">Test: {activity.meta.testTitle}</p>
              ) : null}
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-purple-500">
              {formatDateTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
