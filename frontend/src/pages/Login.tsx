import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../services/authService';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckSquare } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await login({ username: data.email, password: data.password });
      navigate('/dashboard');
    } catch (error: unknown) {
      setApiError(getApiErrorMessage(error, 'Failed to sign in. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1329] flex flex-col justify-between text-gray-100">
      {/* Top Navbar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <CheckSquare className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SmartTask</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>New to SmartTask?</span>
          <Link
            to="/register"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Create an account
          </Link>
        </div>
      </nav>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[#111c38] border border-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
            <p className="text-sm text-gray-400">Curate your workflow with precision.</p>
          </div>

          {apiError && (
            <div className="mb-6 p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Your Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-gray-800 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between">
        <p>&copy; 2026 Smart Task Management. Built for high-performance teams.</p>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <span className="hover:text-gray-400 cursor-pointer">Privacy</span>
          <span className="hover:text-gray-400 cursor-pointer">Terms</span>
          <span className="hover:text-gray-400 cursor-pointer">Security</span>
        </div>
      </footer>
    </div>
  );
};
