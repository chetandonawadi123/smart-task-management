import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { NotificationProvider } from '../contexts/NotificationContext';
import { NotificationToast } from '../components/notifications/NotificationToast';

const Login = lazy(() => import('../pages/Login').then(({ Login }) => ({ default: Login })));
const Register = lazy(() => import('../pages/Register').then(({ Register }) => ({ default: Register })));
const Dashboard = lazy(() => import('../pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const Projects = lazy(() => import('../pages/Projects').then(({ Projects }) => ({ default: Projects })));
const ProjectDetails = lazy(() => import('../pages/ProjectDetails').then(({ ProjectDetails }) => ({ default: ProjectDetails })));
const Tasks = lazy(() => import('../pages/Tasks').then(({ Tasks }) => ({ default: Tasks })));
const Kanban = lazy(() => import('../pages/Kanban').then(({ Kanban }) => ({ default: Kanban })));
const TaskDetails = lazy(() => import('../pages/TaskDetails').then(({ TaskDetails }) => ({ default: TaskDetails })));
const Notifications = lazy(() => import('../pages/Notifications').then(({ Notifications }) => ({ default: Notifications })));
const Profile = lazy(() => import('../pages/Profile').then(({ Profile }) => ({ default: Profile })));
const Settings = lazy(() => import('../pages/Settings').then(({ Settings }) => ({ default: Settings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const AppRoutes: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NotificationProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#eef3f9] text-sm font-medium text-slate-500">Loading SmartTask...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
                <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
            <NotificationToast />
          </NotificationProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
