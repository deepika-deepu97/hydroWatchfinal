import React from 'react';
import { Droplet, Moon, Calculator, ShieldCheck, X, AlertTriangle } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                How HydroWatch Detects Leaks
              </h3>
              <p className="text-xs text-slate-500">
                A beginner's guide to Minimum Night Flow (MNF) analysis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: The Principle of Night Flow */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Moon className="w-4 h-4 text-blue-600" />
            1. Why We Monitor 1:00 AM – 5:00 AM
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            During daylight hours, water flow fluctuates wildly as people shower, wash dishes, and do laundry. But between <strong>1:00 AM and 5:00 AM</strong>, most occupants are asleep, and human consumption drops to near-zero. This quiet period gives us the purest measurement of unbroken, continuous background flow.
          </p>
        </div>

        {/* Section 2: The Math Formula */}
        <div className="space-y-2 bg-blue-50/70 p-4 rounded-xl border border-blue-100">
          <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            2. The Detection Formula
          </h4>
          <p className="text-xs text-slate-600">
            For properties with established positive baselines, we calculate percentage deviation:
          </p>
          <div className="p-3 bg-white rounded-lg border border-blue-200 font-mono text-xs sm:text-sm text-blue-900 text-center font-bold">
            Deviation % = ((Current Flow - Normal Baseline) / Normal Baseline) × 100
          </div>
          <p className="text-xs text-slate-600">
            If the deviation is greater than <strong>+50%</strong> (or your custom threshold), HydroWatch flags the property as a <em>Possible Leak</em> and opens an investigation case.
          </p>
        </div>

        {/* Section 3: Safe Baseline Handling */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            3. Safe Handling of Zero Baselines
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Division by zero is mathematically undefined. If a property is brand new or uncalibrated (Baseline = 0 L/h), HydroWatch protects against system crashes and clearly marks the reading as <strong>"Insufficient baseline data"</strong> instead of throwing an error or creating false alarms.
          </p>
        </div>

        {/* Section 4: What A Flagged Case Means */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Important Understanding:</span>
            <p className="leading-relaxed opacity-95">
              HydroWatch detects <strong>suspicious continuous usage</strong>. It does not physically inspect pipes. A high night reading can be caused by a running toilet flapper, an irrigation valve stuck open, a water softener regenerating overnight, or late-night guests. Always inspect fixtures before hiring a plumber!
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Got it, take me back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
