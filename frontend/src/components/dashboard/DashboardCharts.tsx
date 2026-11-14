import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectAnalytics, TaskAnalytics, TeamAnalytics } from '../../services/dashboardService';
import { AnalyticsCard, EmptyState } from './AnalyticsCard';

const COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const labelize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const TaskStatusChart: React.FC<{ analytics: TaskAnalytics }> = ({ analytics }) => (
  <AnalyticsCard title="Task status distribution" description="Current work across your organization">
    {analytics.by_status.length === 0 ? <EmptyState message="No task status data available yet." /> : (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={analytics.by_status} dataKey="count" nameKey="status" innerRadius={58} outerRadius={88} paddingAngle={4}>
              {analytics.by_status.map((entry, index) => <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [value, labelize(name)]} />
            <Legend formatter={(value) => labelize(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </AnalyticsCard>
);

export const PriorityChart: React.FC<{ analytics: TaskAnalytics }> = ({ analytics }) => (
  <AnalyticsCard title="Task priority distribution" description="Where the team is focusing attention">
    {analytics.by_priority.length === 0 ? <EmptyState message="No task priority data available yet." /> : (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.by_priority} margin={{ left: -20, right: 12 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="priority" tickFormatter={labelize} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => [value, 'Tasks']} labelFormatter={labelize} />
            <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </AnalyticsCard>
);

export const ProjectChart: React.FC<{ analytics: ProjectAnalytics }> = ({ analytics }) => (
  <AnalyticsCard title="Project progress" description="Completion across active projects" className="xl:col-span-2">
    {analytics.projects.length === 0 ? <EmptyState message="Create a project to see progress analytics." /> : (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.projects} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="project_name" width={100} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Complete']} />
            <Bar dataKey="completion_percentage" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </AnalyticsCard>
);

export const TeamChart: React.FC<{ analytics: TeamAnalytics }> = ({ analytics }) => (
  <AnalyticsCard title="Team performance" description="Assigned and completed tasks by member" className="xl:col-span-2">
    {analytics.members.length === 0 ? <EmptyState message="No team performance data available yet." /> : (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.members} margin={{ left: -20, right: 12 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="user_name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="assigned_task_count" name="Assigned" fill="#93c5fd" radius={[5, 5, 0, 0]} />
            <Bar dataKey="completed_task_count" name="Completed" fill="#10b981" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </AnalyticsCard>
);
