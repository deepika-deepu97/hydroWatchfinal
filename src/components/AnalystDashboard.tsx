import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Activity,
  ArrowRight,
  RotateCcw,
  Radio,
  FileText,
  Home,
  Check,
  ChevronRight,
  Database,
  RefreshCw,
  Bell,
  X,
} from 'lucide-react';
import { InvestigationCase, AnalystMetrics, Property } from '../types';
import {
  getAnalystMetrics,
  getLeakCases,
  getAnalystProperties,
  updateCaseStatus,
  getKafkaEvents,
} from '../services/api';

interface AnalystDashboardProps {
  liveAlert: { case: InvestigationCase; message: string } | null;
  onClearLiveAlert: () => void;
  sseStatus: 'connected' | 'connecting' | 'disconnected';
}

export const AnalystDashboard: React.FC<AnalystDashboardProps> = ({
  liveAlert,
  onClearLiveAlert,
  sseStatus,
}) => {
  const [metrics, setMetrics] = useState<AnalystMetrics | null>(null);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Under Investigation' | 'Resolved'>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [kafkaEvents, setKafkaEvents] = useState<any[]>([]);
  const [showKafkaLogs, setShowKafkaLogs] = useState<boolean>(false);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);

  // Load all analyst data
  const loadData = async () => {
    try {
      setLoading(true);
      const [m, c, p] = await Promise.all([
        getAnalystMetrics(),
        getLeakCases(),
        getAnalystProperties(),
      ]);
      setMetrics(m);
      setCases(c);
      setProperties(p);
    } catch (err) {
      console.error('Failed to load analyst data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Periodic fallback polling every 5 seconds to ensure synchronization
    const interval = setInterval(async () => {
      try {
        const [m, c] = await Promise.all([getAnalystMetrics(), getLeakCases()]);
        setMetrics(m);
        setCases(c);
      } catch (e) {
        // quiet polling error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update cases when a live SSE alert arrives
  useEffect(() => {
    if (liveAlert) {
      setCases((prev) => {
        // Prevent duplicate if already in array
        if (prev.some((c) => c.id === liveAlert.case.id || c.eventId === liveAlert.case.eventId)) {
          return prev;
        }
        return [liveAlert.case, ...prev];
      });
      getAnalystMetrics().then(setMetrics).catch(() => {});
    }
  }, [liveAlert]);

  const handleStatusChange = async (
    caseId: string,
    newStatus: 'Open' | 'Under Investigation' | 'Resolved'
  ) => {
    try {
      setUpdatingCaseId(caseId);
      const updated = await updateCaseStatus(caseId, newStatus, editingNotes || undefined);

      setCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase(updated);
      }
      const updatedMetrics = await getAnalystMetrics();
      setMetrics(updatedMetrics);
    } catch (err: any) {
      alert(`Error updating case: ${err.message}`);
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleOpenCaseDetail = (caseItem: InvestigationCase) => {
    setSelectedCase(caseItem);
    setEditingNotes(caseItem.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedCase) return;
    try {
      setUpdatingCaseId(selectedCase.id);
      const updated = await updateCaseStatus(selectedCase.id, selectedCase.status, editingNotes);
      setCases((prev) => prev.map((c) => (c.id === selectedCase.id ? updated : c)));
      setSelectedCase(updated);
    } catch (err: any) {
      alert(`Error saving notes: ${err.message}`);
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleFetchKafkaLogs = async () => {
    try {
      const data = await getKafkaEvents();
      setKafkaEvents(data.messages || []);
      setShowKafkaLogs(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' ? true : c.status === statusFilter;
    const matchesSeverity = severityFilter === 'All' ? true : c.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Alert Banner for Newly Detected Leaks */}
      {liveAlert && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    Kafka Real-Time Anomaly Event
                  </span>
                  <span className="text-xs text-slate-500">Just Now</span>
                </div>
                <h3 className="text-base font-extrabold text-rose-950 mt-1">
                  {liveAlert.case.propertyName}: Suspected Leak Detected (+{liveAlert.case.deviationPercentage !== null ? liveAlert.case.deviationPercentage.toFixed(1) : '0.0'}% Deviation)
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Meter flow reached <strong>{liveAlert.case.currentFlow.toFixed(1)} L/h</strong> against normal baseline of {liveAlert.case.baselineFlow.toFixed(1)} L/h. Automated Investigation Case <strong>{liveAlert.case.caseNumber}</strong> opened via topic <code className="bg-rose-100 px-1 py-0.5 rounded text-[11px] font-mono">soa.s10.t02.events</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenCaseDetail(liveAlert.case)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                Inspect Case
              </button>
              <button
                type="button"
                onClick={onClearLiveAlert}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Monitored</span>
            <Home className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {metrics?.totalProperties ?? 3}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active smart water meters</div>
        </div>

        {/* Normal Properties */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <span>Normal Flow</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {metrics?.normalProperties ?? 2}
          </div>
          <div className="text-xs text-slate-500 mt-1">Within baseline thresholds</div>
        </div>

        {/* Suspected Leaks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold uppercase tracking-wider">
            <span>Suspected Leaks</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2 flex items-center gap-2">
            <span>{metrics?.suspectedLeaks ?? 1}</span>
            {(metrics?.suspectedLeaks ?? 0) > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Action Req.
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">Properties with open alerts</div>
        </div>

        {/* Open Cases */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <span>Open Cases</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-indigo-600 mt-2">
            {metrics?.openCases ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics?.underInvestigationCases ?? 0} under active investigation
          </div>
        </div>
      </div>

      {/* Monitored Properties Health Overview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-600" />
              Monitored District Properties
            </h3>
            <p className="text-xs text-slate-500">
              Real-time property baselines and telemetry status across residential sectors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchKafkaLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Kafka Event Log</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {properties.map((prop) => {
            const propCases = cases.filter(
              (c) => c.propertyId === prop.id && (c.status === 'Open' || c.status === 'Under Investigation')
            );
            const hasActiveLeak = propCases.length > 0;

            return (
              <div
                key={prop.id}
                className={`p-4 rounded-xl border transition ${
                  hasActiveLeak
                    ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{prop.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasActiveLeak
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {hasActiveLeak ? '⚠️ Suspected Leak' : '✓ Normal'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{prop.address}</div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Baseline: </span>
                    <strong className="text-slate-800">{prop.baselineFlow} L/h</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Alert Limit: </span>
                    <strong className="text-blue-700">+{prop.thresholdPercent}%</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Investigation Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Active Leak Investigation Cases
              </h3>
              <p className="text-xs text-slate-500">
                Created automatically when Baseline service publishes to Kafka topic <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">soa.s10.t02.events</code>.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredCases.length} of {cases.length} records
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Case ID, property name, address, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
              {(['All', 'Open', 'Under Investigation', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === st
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="relative shrink-0">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500"
              >
                <option value="All">All Severities</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Severe">Severe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Case Number</th>
                <th className="py-3 px-4">Property &amp; Address</th>
                <th className="py-3 px-4">Current Flow</th>
                <th className="py-3 px-4">Baseline Flow</th>
                <th className="py-3 px-4">Deviation</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-700">No active cases match your filters.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitored flows are within configured normal baseline limits.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition ${
                      item.status === 'Open' ? 'bg-white' : 'bg-slate-50/40 text-slate-500'
                    }`}
                  >
                    {/* Case Number */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="font-mono text-xs">{item.caseNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Property */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{item.propertyName}</div>
                      <div className="text-[11px] text-slate-500 font-normal line-clamp-1">
                        {item.address}
                      </div>
                    </td>

                    {/* Current Flow */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.currentFlow.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">L/h</span>
                    </td>

                    {/* Baseline */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.baselineFlow.toFixed(1)} <span className="text-[10px] text-slate-400">L/h</span>
                    </td>

                    {/* Deviation */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-rose-600">
                        +{item.deviationPercentage !== null ? item.deviationPercentage.toFixed(1) : '0.0'}%
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          item.severity === 'Severe'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : item.severity === 'High'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          item.status === 'Open'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.status === 'Under Investigation'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'Open'
                              ? 'bg-rose-500 animate-pulse'
                              : item.status === 'Under Investigation'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        ></span>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'Open' && (
                          <button
                            type="button"
                            disabled={updatingCaseId === item.id}
                            onClick={() => handleStatusChange(item.id, 'Under Investigation')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                          >
                            Investigate
                          </button>
                        )}

                        {item.status === 'Under Investigation' && (
                          <button
                            type="button"
                            disabled={updatingCaseId === item.id}
                            onClick={() => handleStatusChange(item.id, 'Resolved')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenCaseDetail(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                          title="View telemetry details and notes"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-blue-600 font-mono">
                  {selectedCase.caseNumber}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedCase.propertyName} Investigation
                </h3>
                <p className="text-xs text-slate-500">{selectedCase.address}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Baseline</div>
                <div className="text-base font-extrabold text-slate-800">
                  {selectedCase.baselineFlow.toFixed(1)} L/h
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Observed Flow</div>
                <div className="text-base font-extrabold text-rose-600">
                  {selectedCase.currentFlow.toFixed(1)} L/h
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Deviation</div>
                <div className="text-base font-extrabold text-rose-600">
                  +{selectedCase.deviationPercentage !== null ? selectedCase.deviationPercentage.toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>

            {/* Kafka Audit Information */}
            <div className="text-xs bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-blue-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Kafka Event Provenance</span>
              </div>
              <div className="font-mono text-[11px] text-blue-800">
                Topic: soa.s10.t02.events | Event ID: {selectedCase.eventId}
              </div>
              <div className="text-slate-500 text-[11px]">
                Detected At: {new Date(selectedCase.detectedAt).toLocaleString()}
              </div>
            </div>

            {/* Status Lifecycle Stepper */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Investigation Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedCase.id, 'Open')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    selectedCase.status === 'Open'
                      ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedCase.id, 'Under Investigation')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    selectedCase.status === 'Under Investigation'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Under Investigation
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedCase.id, 'Resolved')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    selectedCase.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            {/* Notes editor */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Analyst / Field Technician Notes
              </label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Log physical inspection findings (e.g., faulty toilet valve replaced, meter recalibrated)..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={updatingCaseId === selectedCase.id}
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                {updatingCaseId === selectedCase.id ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kafka Logs Modal */}
      {showKafkaLogs && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Kafka Broker Audit Stream — Topic: <code className="font-mono text-blue-700">soa.s10.t02.events</code>
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect raw distributed event messages emitted by the Baseline service.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKafkaLogs(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-4 text-xs font-mono">
              {kafkaEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No messages recorded in Kafka audit stream yet.
                </div>
              ) : (
                kafkaEvents.map((msg, idx) => (
                  <div key={idx} className="bg-slate-900 text-cyan-300 p-3.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>Offset: {msg.offset} | Partition: {msg.partition}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="text-white font-bold">
                      [{msg.eventType}] Event ID: {msg.eventId}
                    </div>
                    <pre className="text-[11px] text-cyan-200 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(msg.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowKafkaLogs(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
