import React from 'react';

interface AnalyticsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  description,
  children,
  className = '',
}) => (
  <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
    {children}
  </section>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
    {message}
  </div>
);
