import React from 'react';
import { ArrowDownRight, ArrowUpRight, CircleCheck, FolderKanban, ListTodo, Timer } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  detail: string;
  tone: 'blue' | 'violet' | 'green' | 'amber';
}

const icons = {
  blue: FolderKanban,
  violet: ListTodo,
  green: CircleCheck,
  amber: Timer,
};

const styles = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, detail, tone }) => {
  const Icon = icons[tone];
  const isPositive = tone === 'green';

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${styles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
          {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          Live
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
};
