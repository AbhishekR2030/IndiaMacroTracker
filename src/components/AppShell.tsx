"use client";

import { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, topBar, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      {sidebar}

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        {topBar}

        {/* Dashboard body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  );
}