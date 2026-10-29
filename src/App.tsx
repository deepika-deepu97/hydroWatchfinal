import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { ResidentDashboard } from './components/ResidentDashboard';
import { AnalystDashboard } from './components/AnalystDashboard';
import { HowItWorksModal } from './components/HowItWorksModal';
import { AuthUser, InvestigationCase } from './types';
import {
  getCurrentUser,
  clearStoredToken,
  login,
  subscribeToAnalystSse,
  getStoredToken,
} from './services/api';
import { Droplets } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean>(false);
  const [sseStatus, setSseStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [liveAlert, setLiveAlert] = useState<{ case: InvestigationCase; message: string } | null>(null);

  // Check existing session on boot
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // By default, auto-login as Resident demo for immediate interactive preview
          const { user: demoUser } = await login('resident@hydrowatch.demo', 'Resident@123');
          setUser(demoUser);
        }
      } catch (e) {
        console.warn('Auto auth error:', e);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Subscribe to real-time Server-Sent Events when logged in as Utility Analyst
  useEffect(() => {
    if (!user || user.role !== 'utilityAnalyst') {
      setSseStatus('disconnected');
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    const unsubscribe = subscribeToAnalystSse(
      token,
      (newCase, msg) => {
        setLiveAlert({ case: newCase, message: msg });
      },
      (updatedCase) => {
        // updated case handled in dashboard
      },
      (status) => {
        setSseStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
    setLiveAlert(null);
  };

  // Quick switch role for testing
  const handleSwitchRole = async (targetRole: 'resident' | 'utilityAnalyst') => {
    setAuthLoading(true);
    setLiveAlert(null);
    try {
      if (targetRole === 'resident') {
        const { user: residentUser } = await login('resident@hydrowatch.demo', 'Resident@123');
        setUser(residentUser);
      } else {
        const { user: analystUser } = await login('analyst@hydrowatch.demo', 'Analyst@123');
        setUser(analystUser);
      }
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setAuthLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Droplets className="w-12 h-12 text-cyan-400 animate-bounce mb-3" />
        <h2 className="text-xl font-bold tracking-tight">HydroWatch</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        sseStatus={sseStatus}
        onOpenHelp={() => setHowItWorksOpen(true)}
      />

      {/* Main Role-Specific View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {user.role === 'resident' ? (
          <ResidentDashboard />
        ) : (
          <AnalystDashboard
            liveAlert={liveAlert}
            onClearLiveAlert={() => setLiveAlert(null)}
            sseStatus={sseStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">HydroWatch</span>
            <span>—</span>
            <span>Service-Oriented Smart Water Leak Detection</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span>Kafka Topic: soa.s10.t02.events</span>
            <span>•</span>
            <span>JWT Security: {user.role}</span>
            <span>•</span>
            <span>Automated Notification Pipeline</span>
          </div>
        </div>
      </footer>

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </div>
  );
}
