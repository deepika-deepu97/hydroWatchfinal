import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Check,
  RotateCcw,
  FileText,
  Download,
  AlertOctagon,
  Droplet,
} from 'lucide-react';
import { InvestigationCase, LeakSeverity } from '../types';

interface CasesTableProps {
  cases: InvestigationCase[];
  onToggleStatus: (caseId: string) => void;
  onAddNote: (caseId: string, note: string) => void;
  onResetCases: () => void;
}

export const CasesTable: React.FC<CasesTableProps> = ({
  cases,
  onToggleStatus,
  onAddNote,
  onResetCases,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [houseFilter, setHouseFilter] = useState<string>('All');
  const [selectedCaseForNote, setSelectedCaseForNote] = useState<InvestigationCase | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Extract unique house names for filter
  const houseOptions = Array.from(new Set(cases.map((c) => c.houseName || c.propertyName)));

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const houseNameStr = c.houseName || c.propertyName || '';
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      houseNameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' ? true : c.status === statusFilter;

    const matchesHouse =
      houseFilter === 'All' ? true : houseNameStr === houseFilter;

    return matchesSearch && matchesStatus && matchesHouse;
  });

  const openCount = cases.filter((c) => c.status === 'Open').length;
  const resolvedCount = cases.filter((c) => c.status === 'Resolved').length;

  const getSeverityBadge = (severity: LeakSeverity) => {
    switch (severity) {
      case 'Severe':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const handleOpenNoteModal = (item: InvestigationCase) => {
    setSelectedCaseForNote(item);
    setNoteInput(item.notes || '');
  };

  const handleSaveNote = () => {
    if (selectedCaseForNote) {
      onAddNote(selectedCaseForNote.id, noteInput);
      setSelectedCaseForNote(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Case ID', 'House', 'Current Flow (L/h)', 'Baseline (L/h)', 'Deviation (%)', 'Severity', 'Status', 'Timestamp', 'Notes'];
    const rows = cases.map((c) => [
      c.id,
      c.houseName || c.propertyName,
      c.currentFlow,
      c.baselineFlow,
      c.deviationPercentage !== null ? `${c.deviationPercentage.toFixed(1)}%` : 'N/A',
      c.severity,
      c.status,
      `"${c.timestamp || c.detectedAt}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HydroWatch_Investigation_Cases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top statistics summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Recorded Alerts
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {cases.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Active / Open Cases
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1 flex items-center gap-2">
              <span>{openCount}</span>
              {openCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Needs Investigation
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Resolved Leaks
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {resolvedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Water Leak Investigation Log
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Track flagged night flow anomalies, inspect meter values, and manage resolutions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Export cases to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={onResetCases}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition"
                title="Reset to sample cases"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Case ID, House, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {(['All', 'Open', 'Resolved'] as const).map((st) => (
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

              {/* House filter dropdown */}
              <div className="relative">
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500"
                >
                  <option value="All">All Properties</option>
                  {houseOptions.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">House</th>
                <th className="py-3 px-4">Current Flow</th>
                <th className="py-3 px-4">Normal Baseline</th>
                <th className="py-3 px-4">Deviation</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Droplet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No investigation cases match your filters.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Run a leak simulation on the Dashboard to flag a new case.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.status === 'Open' ? 'bg-white' : 'bg-slate-50/40 text-slate-500'
                    }`}
                  >
                    {/* Case ID & Timestamp */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{item.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.timestamp || new Date(item.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* House */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>{item.houseName || item.propertyName}</div>
                      {item.notes && (
                        <div
                          onClick={() => handleOpenNoteModal(item)}
                          className="text-[11px] text-blue-600 hover:underline cursor-pointer flex items-center gap-1 mt-0.5 line-clamp-1"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </td>

                    {/* Current Flow */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.currentFlow.toFixed(1)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">L/h</span>
                    </td>

                    {/* Normal Baseline */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.baselineFlow.toFixed(1)}{' '}
                      <span className="text-[10px] text-slate-400">L/h</span>
                    </td>

                    {/* Deviation */}
                    <td className="py-3.5 px-4">
                      {item.deviationPercentage !== null ? (
                        <span
                          className={`font-bold ${
                            item.deviationPercentage > 50
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {item.deviationPercentage >= 0 ? '+' : ''}
                          {item.deviationPercentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'Open'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'Open' ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        ></span>
                        {item.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            item.status === 'Open'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {item.status === 'Open' ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark as Resolved</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenNoteModal(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View / Edit Investigation Notes"
                        >
                          <FileText className="w-4 h-4" />
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

      {/* Note Edit Modal */}
      {selectedCaseForNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Investigation Notes — {selectedCaseForNote.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCaseForNote.houseName || selectedCaseForNote.propertyName} • Flow: {selectedCaseForNote.currentFlow} L/h
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForNote(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Technician / Resident Observations:
              </label>
              <textarea
                rows={4}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g., Inspected master bathroom; toilet flapper valve was worn out and continuously running. Replaced valve on Oct 28."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCaseForNote(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
