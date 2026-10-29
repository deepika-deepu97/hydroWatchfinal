import React, { useState } from 'react';
import { Droplets, Shield, User, Lock, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { login } from '../services/api';
import { AuthUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('resident@hydrowatch.demo');
  const [password, setPassword] = useState('Resident@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { user } = await login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role: 'resident' | 'analyst') => {
    setError(null);
    if (role === 'resident') {
      setEmail('resident@hydrowatch.demo');
      setPassword('Resident@123');
    } else {
      setEmail('analyst@hydrowatch.demo');
      setPassword('Analyst@123');
    }
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
            Select a demo role below or enter credentials manually.
          </p>
        </div>

        {/* 1-Click Quick Demo Selectors */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            1-Click Quick Demo Switch
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDemoCredentials('resident')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                email === 'resident@hydrowatch.demo'
                  ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-200 text-blue-950 font-bold'
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
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('analyst')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                email === 'analyst@hydrowatch.demo'
                  ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-200 text-indigo-950 font-bold'
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
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Verification Credentials Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Real JWT Backend Security Enforced:</span>
          </div>
          <p>
            Passwords are encrypted using <strong>bcrypt</strong> hashes. Endpoints strictly enforce role-based access tokens.
          </p>
        </div>
      </div>
    </div>
  );
};
