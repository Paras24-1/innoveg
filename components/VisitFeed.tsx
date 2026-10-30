'use client';

import React, { useState } from 'react';
import { Visit } from '@/lib/types';
import { Sparkles, MapPin, Clock, Search } from 'lucide-react';
import { formatPhotoUrl, DEFAULT_FIELD_PHOTO } from '@/lib/geo';

interface VisitFeedProps {
  visits: Visit[];
  onSelectVisit: (visit: Visit) => void;
  onInspectPhoto: (visit: Visit) => void;
}

export const VisitFeed: React.FC<VisitFeedProps> = ({
  visits = [],
  onSelectVisit,
  onInspectPhoto,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const safeVisits = Array.isArray(visits) ? visits : [];

  const filteredVisits = safeVisits.filter((v) => {
    if (!v) return false;
    const matchesType = filterType === 'ALL' || v.visitType === filterType;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      searchLower === '' ||
      (v.entityName || '').toLowerCase().includes(searchLower) ||
      (v.employeeName || '').toLowerCase().includes(searchLower) ||
      (v.village || '').toLowerCase().includes(searchLower) ||
      (v.district || '').toLowerCase().includes(searchLower);
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-full max-h-[700px]">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>Live Field Reports Stream</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
              {filteredVisits.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500">Real-time incoming reports verified via WhatsApp & AI</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search officer, village, dealer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-52"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Visit Types</option>
            <option value="Farmer Visit">Farmer Visit</option>
            <option value="Dealer Visit">Dealer Visit</option>
            <option value="Distributor Visit">Distributor Visit</option>
            <option value="Field Visit">Field Visit</option>
            <option value="Field Program">Field Program</option>
          </select>
        </div>
      </div>

      {/* Feed List */}
      <div className="overflow-y-auto p-3 space-y-3 flex-1">
        {filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No visits match your current filter.
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const ai = visit.aiAnalysis || { qualityScore: 80, isBlur: false };
            const isBlur = Boolean(ai.isBlur);
            const score = Number(ai.qualityScore || 80);
            const photoSrc = formatPhotoUrl(visit.photoUrl);

            const timeStr = (() => {
              try {
                const d = new Date(visit.timestamp);
                return isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {
                return 'Just now';
              }
            })();

            return (
              <div
                key={visit.id}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
                onClick={() => onSelectVisit(visit)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left Column: Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {visit.visitType || 'Visit'}
                      </span>
                      {visit.isRepeatLocation ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          🔁 Repeat Location
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          ✨ Unique Pin
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1" suppressHydrationWarning>
                        <Clock className="w-3 h-3" />
                        {timeStr}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-700">
                      {visit.entityName || 'Field Visit'}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {visit.village || 'Field'}, {visit.district || ''}
                      </span>
                      <span className="font-medium text-slate-700">
                        👤 {visit.employeeName || 'Officer'}
                      </span>
                    </div>

                    {/* Remarks or Booking */}
                    {visit.remarksBooking && (
                      <p className="text-xs text-slate-600 mt-1.5 bg-white p-2 rounded-lg border border-slate-100 italic">
                        &ldquo;{visit.remarksBooking}&rdquo;
                      </p>
                    )}

                    {/* AI Analysis Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectPhoto(visit);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        AI Score: {score}/100
                      </button>

                      {isBlur ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                          ⚠️ Blur Alert
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          ✓ High Clarity
                        </span>
                      )}

                      {Number(visit.distanceFromPrevKm || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                          +{visit.distanceFromPrevKm} KM travel
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Thumbnail Photo */}
                  <div
                    className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group/img cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectPhoto(visit);
                    }}
                  >
                    <img
                      src={photoSrc}
                      alt="Visit photo"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FIELD_PHOTO;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium">
                      AI Inspect
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
