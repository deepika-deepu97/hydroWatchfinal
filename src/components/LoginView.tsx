import React, { useState } from 'react';
import { Droplets, Shield, User, Lock, ArrowRight, AlertCircle, Server, Check } from 'lucide-react';
import { login, API_BASE_URL } from '../services/api';
import { AuthUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('resident@hydrowatch.demo');
  const [password, setPassword] = useState('Resident@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);

    try {
      const { user } = await login(loginEmail, loginPass);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleQuickDemoLogin = (role: 'resident' | 'analyst') => {
    const demoEmail = role === 'resident' ? 'resident@hydrowatch.demo' : 'analyst@hydrowatch.demo';
    const demoPass = role === 'resident' ? 'Resident@123' : 'Analyst@123';
    setEmail(demoEmail);
    setPassword(demoPass);
    performLogin(demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="text-center mb-8 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white shadow-xl shadow-cyan-500/20 mb-4 animate-pulse">
          <Droplets className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>HydroWatch</span>
        </h1>
        <p className="text-cyan-200 text-sm font-medium mt-1">
          Monitor Water. Detect Leaks. Save Every Drop.
        </p>
        <p className="text-slate-400 text-xs mt-2">
          Service-Oriented Smart Water Leak Detection Architecture
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/90 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900">
            Sign In with Demo Credentials
          </h2>
          <p className="text-xs text-slate-500">
            Click a demo role below for 1-click authentication, or enter credentials manually.
          </p>
        </div>

        {/* 1-Click Quick Demo Selectors with Instant Login */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            1-Click Demo Accounts
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemoLogin('resident')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer active:scale-98 ${
                email === 'resident@hydrowatch.demo'
                  ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-200 text-blue-950 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Resident</span>
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-normal">
                Home A (10 L/h)
              </span>
              <span className="mt-2 text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> 1-Click Sign In
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemoLogin('analyst')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer active:scale-98 ${
                email === 'analyst@hydrowatch.demo'
                  ? 'border-indigo-500 bg-indigo-50/90 ring-2 ring-indigo-200 text-indigo-950 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Utility Analyst</span>
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-normal">
                Full Operations Access
              </span>
              <span className="mt-2 text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> 1-Click Sign In
              </span>
            </button>
          </div>
        </div>

        {/* Informative Error Message Box */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <span className="font-bold">Authentication Notice:</span>
              <p className="leading-relaxed text-slate-700">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating with Backend...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Backend & Deployment Diagnostics Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              Backend Target:
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
              {API_BASE_URL ? 'Custom VITE_API_BASE_URL' : 'Same-Origin / Proxy'}
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-500 truncate">
            {API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api')}
          </div>
          <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-200">
            Enforces real bcrypt password verification &amp; role-based JWT tokens.
          </div>
        </div>
      </div>
    </div>
  );
};
