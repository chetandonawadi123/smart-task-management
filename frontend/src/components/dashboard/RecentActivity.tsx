import React from 'react';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import type { RecentActivity as RecentActivityResponse } from '../../services/dashboardService';
import { AnalyticsCard, EmptyState } from './AnalyticsCard';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));

export const RecentActivity: React.FC<{ activity: RecentActivityResponse }> = ({ activity }) => (
  <AnalyticsCard title="Recent activity" description="The latest updates from your organization">
    {activity.items.length === 0 ? <EmptyState message="No recent activity to show." /> : (
      <div className="divide-y divide-slate-100">
        {activity.items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className={`mt-0.5 rounded-lg p-2 ${item.type === 'comment' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {item.type === 'comment' ? <MessageSquare className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.author_name ?? 'Team member'} · {formatDate(item.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </AnalyticsCard>
);
