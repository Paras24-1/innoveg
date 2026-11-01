'use client';

import React from 'react';
import { Users, MapPin, Target, Route, AlertTriangle, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { DailySummary } from '@/lib/types';

interface StatsOverviewProps {
  summary: DailySummary | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ summary }) => {
  if (!summary) return null;

  const presentCount = summary.presentCount || summary.activeEmployees || 0;
  const lateCount = summary.latePunchInCount || 0;
  const pendingKmCount = summary.kmPendingReviewCount || 0;
  const autoApprovedKm = summary.kmAutoApprovedCount || 0;

  const cards = [
    {
      label: "Today's Field Attendance",
      value: `${presentCount} / ${summary.totalEmployees}`,
      subtitle: `${summary.halfDayCount || 0} Half Day · ${summary.absentCount || 0} Absent`,
      badge: lateCount > 0 ? `${lateCount} Late Mark` : 'All On-Time',
      badgeColor: lateCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Users,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
    },
    {
      label: "Vehicle KM Audit",
      value: pendingKmCount > 0 ? `${pendingKmCount} Need Review` : "All Approved",
      subtitle: `${autoApprovedKm} Auto-Approved (≤15 KM diff)`,
      badge: pendingKmCount > 0 ? "Action Required" : "100% Reconciled",
      badgeColor: pendingKmCount > 0 ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: ShieldCheck,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-200",
    },
    {
      label: "Total Visits (Min. 5 Target)",
      value: summary.totalVisits,
      subtitle: `${summary.uniqueLocations} Unique · ${summary.repeatLocations} Repeat`,
      badge: `${summary.overallTargetAchievementPercent}% of 5/Day Target`,
      badgeColor: summary.overallTargetAchievementPercent >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-blue-100 text-blue-800 border-blue-200",
      icon: MapPin,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      label: "Total Field Travel",
      value: `${summary.totalEstimatedKm} KM`,
      subtitle: "GPS waypoint distance sum",
      badge: "Dual Tracking Active",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Route,
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <div className={`p-2 rounded-lg ${card.bg} ${card.borderColor} border`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.subtitle}</p>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
