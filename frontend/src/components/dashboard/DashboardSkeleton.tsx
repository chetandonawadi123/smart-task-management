import React from 'react';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Loading dashboard">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
  </div>
);
