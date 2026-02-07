const activities = [
  {
    user: "Alex Johnson",
    action: "completed",
    target: "User onboarding flow",
    time: "2 hours ago",
  },
  {
    user: "Sarah Kim",
    action: "commented on",
    target: "Fix authentication bug",
    time: "3 hours ago",
  },
  {
    user: "Mike Ross",
    action: "created",
    target: "Write API documentation",
    time: "5 hours ago",
  },
  {
    user: "Alex Johnson",
    action: "moved",
    target: "Performance optimization",
    time: "6 hours ago",
  },
  {
    user: "Sarah Kim",
    action: "assigned",
    target: "Add dark mode support",
    time: "8 hours ago",
  },
  {
    user: "Mike Ross",
    action: "completed",
    target: "Set up staging environment",
    time: "1 day ago",
  },
];

const actionColors: Record<string, string> = {
  completed: "text-green-600 dark:text-green-400",
  commented: "text-blue-600 dark:text-blue-400",
  created: "text-purple-600 dark:text-purple-400",
  moved: "text-yellow-600 dark:text-yellow-400",
  assigned: "text-orange-600 dark:text-orange-400",
};

function getActionColor(action: string): string {
  const key = action.split(" ")[0];
  return actionColors[key] || "text-neutral-500";
}

export default function ActivityFeed() {
  return (
    <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">
                {activity.user
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.user}</span>{" "}
                <span className={getActionColor(activity.action)}>
                  {activity.action}
                </span>{" "}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
