import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../services/authService';
import { Eye, EyeOff, Lock, Mail, User, Building, ArrowRight, CheckSquare } from 'lucide-react';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        organization_name: data.organization_name,
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      setApiError(getApiErrorMessage(error, 'Failed to register account. Please try again.'));
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
          <span>Already have an account?</span>
          <Link
            to="/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[#111c38] border border-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create an Account</h1>
            <p className="text-sm text-gray-400">Set up your organization and workflow.</p>
          </div>

          {apiError && (
            <div className="mb-6 p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Organization Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Building className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  {...register('organization_name')}
                  placeholder="Acme Inc."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {errors.organization_name && (
                <p className="mt-1 text-xs text-red-400">{errors.organization_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-2.5 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b1329] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition-colors disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
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
