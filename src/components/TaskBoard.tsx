"use client";

import { useState } from "react";

interface Task {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
}

const initialTasks: Task[] = [
  { id: 1, title: "Design new landing page", priority: "high", assignee: "AJ", dueDate: "Feb 10", status: "todo" },
  { id: 2, title: "Fix authentication bug", priority: "high", assignee: "SK", dueDate: "Feb 8", status: "in-progress" },
  { id: 3, title: "Write API documentation", priority: "medium", assignee: "MR", dueDate: "Feb 12", status: "todo" },
  { id: 4, title: "Set up CI/CD pipeline", priority: "medium", assignee: "AJ", dueDate: "Feb 14", status: "in-progress" },
  { id: 5, title: "Database migration script", priority: "low", assignee: "SK", dueDate: "Feb 15", status: "todo" },
  { id: 6, title: "User onboarding flow", priority: "high", assignee: "MR", dueDate: "Feb 9", status: "done" },
  { id: 7, title: "Performance optimization", priority: "medium", assignee: "AJ", dueDate: "Feb 11", status: "done" },
  { id: 8, title: "Add dark mode support", priority: "low", assignee: "SK", dueDate: "Feb 16", status: "in-progress" },
];

const columns = [
  { key: "todo" as const, label: "To Do", color: "bg-neutral-400" },
  { key: "in-progress" as const, label: "In Progress", color: "bg-blue-500" },
  { key: "done" as const, label: "Done", color: "bg-green-500" },
];

const priorityStyles = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState(initialTasks);

  const moveTask = (taskId: number, newStatus: Task["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  return (
    <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-lg font-semibold mb-4">Task Board</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className="text-sm font-medium">{col.label}</span>
                <span className="text-xs text-neutral-400 ml-auto">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)] transition-colors group"
                  >
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityStyles[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {task.dueDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium">
                          {task.assignee}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {columns
                          .filter((c) => c.key !== task.status)
                          .map((c) => (
                            <button
                              key={c.key}
                              onClick={() => moveTask(task.id, c.key)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-neutral-500 hover:text-[var(--foreground)] transition-colors"
                            >
                              {c.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
