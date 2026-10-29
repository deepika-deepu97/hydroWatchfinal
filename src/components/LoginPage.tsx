import React, { useState } from 'react';
import { Droplets, Eye, EyeOff, Lock, Mail, ShieldAlert, UserCheck, ArrowRight } from 'lucide-react';
import { api, setStoredToken } from '../utils/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  sessionExpiredNotice?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  sessionExpiredNotice = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(email.trim(), password);
      setStoredToken(response.token, rememberMe);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoType: 'resident' | 'analyst') => {
    setErrorMessage(null);
    if (demoType === 'resident') {
      setEmail('resident@hydrowatch.demo');
      setPassword('Resident@123');
    } else {
      setEmail('analyst@hydrowatch.demo');
      setPassword('Analyst@123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-slate-50 to-blue-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
            <Droplets className="w-9 h-9 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            HydroWatch
          </h1>
          <p className="text-sm font-semibold text-blue-600 mt-1">
            Smart Water Leak Detection
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor Water. Detect Leaks. Save Every Drop.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 sm:px-10">
          {sessionExpiredNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Your session has expired or requires re-authentication. Please sign in.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Work or Resident Email
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@hydrowatch.demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Options */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-slate-400">JWT 8-hour Token</span>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md shadow-blue-500/25 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Authenticating with Identity Service...
                  </span>
                ) : (
                  <>
                    <span>Sign In to HydroWatch</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Panel for Hackathon */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                Hackathon Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Resident Button */}
              <button
                type="button"
                onClick={() => handleFillDemo('resident')}
                className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/80 hover:border-blue-300 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    Resident Demo
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Home A only
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  resident@hydrowatch.demo
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Password: <code className="bg-slate-200/70 px-1 rounded">Resident@123</code>
                </div>
              </button>

              {/* Utility Analyst Button */}
              <button
                type="button"
                onClick={() => handleFillDemo('analyst')}
                className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-cyan-50/80 hover:border-cyan-300 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-800">
                    Utility Analyst
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                    All Properties
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  analyst@hydrowatch.demo
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Password: <code className="bg-slate-200/70 px-1 rounded">Analyst@123</code>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
