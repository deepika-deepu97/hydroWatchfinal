import React from 'react';
import { Home, Sliders, Users, MapPin, Lock, ShieldCheck } from 'lucide-react';
import { House, User } from '../types';

interface HouseSelectorProps {
  currentUser: User;
  houses: House[];
  selectedHouseId: string;
  onSelectHouse: (houseId: string) => void;
  thresholdPercent: number;
  onChangeThreshold: (threshold: number) => void;
}

export const HouseSelector: React.FC<HouseSelectorProps> = ({
  currentUser,
  houses,
  selectedHouseId,
  onSelectHouse,
  thresholdPercent,
  onChangeThreshold,
}) => {
  const isAnalyst = currentUser.role === 'UTILITY_ANALYST';
  const currentHouse = houses.find((h) => h.id === selectedHouseId) || houses[0] || {
    id: 'home-a',
    name: 'Home A',
    address: '14 Elm Creek Lane',
    baselineFlow: 10,
    description: 'Residential property',
    occupants: 2,
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Dropdown Selector / Single Property View */}
        <div className="md:col-span-5 space-y-1.5">
          <label
            htmlFor="house-select"
            className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            <span className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" />
              {isAnalyst ? 'Select Monitored Property' : 'Your Authorized Property'}
            </span>
            {!isAnalyst && (
              <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Resident Scoped
              </span>
            )}
          </label>

          {isAnalyst ? (
            <div className="relative">
              <select
                id="house-select"
                value={selectedHouseId}
                onChange={(e) => onSelectHouse(e.target.value)}
                className="w-full appearance-none rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 shadow-2xs hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
              >
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name} — Baseline {house.baselineFlow} L/hour ({house.address})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50/50 border border-blue-200 px-4 py-2.5 text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>{currentHouse.name}</span>
              <span className="text-xs font-normal text-blue-700">
                Baseline: {currentHouse.baselineFlow} L/h
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {currentHouse.address}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {currentHouse.occupants} Occupants
            </span>
          </div>
        </div>

        {/* Selected House Profile Info */}
        <div className="md:col-span-4 bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-900 flex items-center gap-1">
              <span>{currentHouse.name} Profile</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xs text-blue-700 mt-0.5 line-clamp-1">
              {currentHouse.description}
            </div>
          </div>
          <div className="text-right shrink-0 pl-3">
            <div className="text-xs font-medium text-blue-600">Historical Baseline</div>
            <div className="text-lg font-bold text-blue-950">
              {currentHouse.baselineFlow}{' '}
              <span className="text-xs font-normal">L/hour</span>
            </div>
          </div>
        </div>

        {/* Alert Threshold: Enabled for Analyst, Read-only with badge for Resident */}
        <div className="md:col-span-3 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="threshold-slider"
              className="flex items-center gap-1 font-bold text-slate-700"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Alert Threshold
            </label>
            <span className="font-extrabold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded text-xs">
              +{thresholdPercent}%
            </span>
          </div>

          {isAnalyst ? (
            <>
              <input
                id="threshold-slider"
                type="range"
                min="20"
                max="150"
                step="5"
                value={thresholdPercent}
                onChange={(e) => onChangeThreshold(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>+20% (Strict)</span>
                <span>+50% (Default)</span>
                <span>+150% (Relaxed)</span>
              </div>
            </>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-1">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Standard +50% threshold configured by Utility Analyst.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
