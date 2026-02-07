"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatsGrid from "@/components/StatsGrid";
import TaskBoard from "@/components/TaskBoard";
import ActivityFeed from "@/components/ActivityFeed";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[var(--muted)]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Welcome back. Here&apos;s what&apos;s happening with your projects.
            </p>
          </div>
          <StatsGrid />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2">
              <TaskBoard />
            </div>
            <div>
              <ActivityFeed />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
