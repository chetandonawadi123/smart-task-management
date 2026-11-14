import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-10">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              SmartTask
            </p>
            <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-600">Welcome back, {user?.name}.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
