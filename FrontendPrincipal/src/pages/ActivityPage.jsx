import { useEffect, useState } from "react";
import { getActivityFeed } from "../api/principalApi";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await getActivityFeed({ limit: 50 });
        setActivities(response.activities || []);
      } catch (error) {
        console.error("Failed to load activity feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) {
    return <LoadingPanel label="Loading institutional activity feed..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspection feed"
        title="Recent activity"
        description="A chronological feed of class creation, notes, assignments, quizzes, tests, attendance sessions, and live session changes."
      />

      <SectionCard title="Activity timeline" description="Latest captured teacher operations.">
        {activities.length ? (
          <ActivityTimeline activities={activities} />
        ) : (
          <EmptyState
            title="No activity recorded"
            description="There are no inspection events to display right now."
          />
        )}
      </SectionCard>
    </div>
  );
}
