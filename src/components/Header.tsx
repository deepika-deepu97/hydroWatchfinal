import React from 'react';
import { Droplets, Shield, User, LogOut, Radio, HelpCircle, ArrowLeftRight } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  user: AuthUser;
  onLogout: () => void;
  onSwitchRole: (targetRole: 'resident' | 'utilityAnalyst') => void;
  sseStatus: 'connected' | 'connecting' | 'disconnected';
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onSwitchRole,
  sseStatus,
  onOpenHelp,
}) => {
  const isAnalyst = user.role === 'utilityAnalyst';

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/20">
              <Droplets className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  HydroWatch
                </h1>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isAnalyst
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {isAnalyst ? 'Utility Analyst Portal' : 'Resident Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Monitor Water. Detect Leaks. Save Every Drop.
              </p>
            </div>
          </div>

          {/* User Controls & Role Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live SSE Status Indicator (Only on Analyst Dashboard) */}
            {isAnalyst && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  sseStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sseStatus === 'connecting'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title="Real-time Server-Sent Events stream from Kafka backend"
              >
                <Radio className={`w-3.5 h-3.5 ${sseStatus === 'connected' ? 'animate-pulse text-emerald-600' : ''}`} />
                <span>
                  {sseStatus === 'connected'
                    ? 'SSE Live Alert Stream'
                    : sseStatus === 'connecting'
                    ? 'Connecting to SSE...'
                    : 'Stream Offline'}
                </span>
              </div>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              {isAnalyst ? (
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
              ) : (
                <User className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <div className="text-left">
                <div className="font-bold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isAnalyst ? 'Utility Operations' : `Authorized Property: Home A`}
                </div>
              </div>
            </div>

            {/* Quick 1-Click Role Switcher */}
            <button
              type="button"
              onClick={() => onSwitchRole(isAnalyst ? 'resident' : 'utilityAnalyst')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer"
              title="Seamlessly switch role between Resident and Utility Analyst for verification"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isAnalyst ? 'Switch to Resident' : 'Switch to Analyst'}</span>
            </button>

            {/* Help & Logout */}
            <button
              type="button"
              onClick={onOpenHelp}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="How leak detection works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
