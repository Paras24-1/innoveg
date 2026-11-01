'use client';

import React, { useState } from 'react';
import { DailyAttendance } from '@/lib/types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Camera,
  Car,
  Navigation,
  MessageSquare,
  Search,
} from 'lucide-react';

interface KmAuditReviewProps {
  attendances: DailyAttendance[];
  onRefresh: () => void;
}

export const KmAuditReview: React.FC<KmAuditReviewProps> = ({ attendances, onRefresh }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'AUTO_APPROVED' | 'MANUALLY_APPROVED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingImage, setInspectingImage] = useState<{ title: string; url: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter officers who have at least punched in or have KM data
  const officersWithKm = attendances.filter((a) => a.startKm || a.totalOdometerKm > 0 || a.totalGpsKm > 0);

  const pendingCount = officersWithKm.filter((a) => a.kmApprovalStatus === 'PENDING_REVIEW').length;
  const autoApprovedCount = officersWithKm.filter((a) => a.kmApprovalStatus === 'AUTO_APPROVED').length;
  const manuallyApprovedCount = officersWithKm.filter((a) => a.kmApprovalStatus === 'MANUALLY_APPROVED').length;

  const filtered = officersWithKm.filter((a) => {
    const matchesSearch =
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeMobile.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return a.kmApprovalStatus === 'PENDING_REVIEW';
    if (filter === 'AUTO_APPROVED') return a.kmApprovalStatus === 'AUTO_APPROVED';
    if (filter === 'MANUALLY_APPROVED') return a.kmApprovalStatus === 'MANUALLY_APPROVED';
    return true;
  });

  const handleDecision = async (attendanceId: string, status: 'MANUALLY_APPROVED' | 'REJECTED') => {
    setActionLoading(attendanceId);
    let managerRemarks = '';
    if (status === 'REJECTED') {
      managerRemarks = prompt('Enter remarks for KM rejection:') || 'Discrepancy beyond acceptable tolerance';
    } else {
      managerRemarks = 'Verified and approved by manager';
    }

    try {
      const res = await fetch('/api/attendance/approve-km', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, status, managerRemarks }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Failed to update approval status');
      }
    } catch (e: any) {
      alert('Error updating approval status: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Vehicle Odometer vs GPS KM Audit & Manager Review</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rule: Difference $\le$15 KM is Auto-Approved • Difference &gt;15 KM requires Manager Review
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Review ({pendingCount})</span>
            </button>

            <button
              onClick={() => setFilter('AUTO_APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'AUTO_APPROVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Auto-Approved ({autoApprovedCount})</span>
            </button>

            <button
              onClick={() => setFilter('MANUALLY_APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'MANUALLY_APPROVED'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Manager Approved ({manuallyApprovedCount})</span>
            </button>

            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Recorded ({officersWithKm.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search officer name or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((att) => {
          const isPending = att.kmApprovalStatus === 'PENDING_REVIEW';
          const isAutoApproved = att.kmApprovalStatus === 'AUTO_APPROVED';
          const isManuallyApproved = att.kmApprovalStatus === 'MANUALLY_APPROVED';
          const isRejected = att.kmApprovalStatus === 'REJECTED';

          return (
            <div
              key={att.id}
              className={`bg-white rounded-xl border p-4 shadow-sm space-y-3 transition-all ${
                isPending
                  ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{att.employeeName}</h3>
                  <div className="text-xs text-slate-500 font-mono">{att.employeeMobile}</div>
                </div>

                {/* Status Badge */}
                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Requires Review</span>
                  </span>
                )}
                {isAutoApproved && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Auto-Approved</span>
                  </span>
                )}
                {isManuallyApproved && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved by Manager</span>
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rejected</span>
                  </span>
                )}
              </div>

              {/* KM Comparison Matrix */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                    <Car className="w-3 h-3 text-slate-600" />
                    <span>Odometer</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {att.totalOdometerKm} <span className="text-[10px] font-normal text-slate-500">KM</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {att.startKm || 0} → {att.endKm || 0}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-600" />
                    <span>GPS Tracked</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {att.totalGpsKm} <span className="text-[10px] font-normal text-slate-500">KM</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {att.completedVisits} visits logged
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Difference</div>
                  <div
                    className={`text-sm font-extrabold mt-0.5 ${
                      att.kmDifference > 15 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {att.kmDifference} <span className="text-[10px] font-normal">KM</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {att.kmDifference <= 15 ? '≤ 15 KM limit' : '> 15 KM limit'}
                  </div>
                </div>
              </div>

              {/* Photos Comparison */}
              <div className="flex items-center gap-3 pt-1">
                {/* Morning Meter */}
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Morning Meter Photo</span>
                  </div>
                  {att.punchInMeterPhoto ? (
                    <div
                      onClick={() => setInspectingImage({ title: `${att.employeeName} — Morning Meter`, url: att.punchInMeterPhoto! })}
                      className="cursor-pointer relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
                    >
                      <img
                        src={att.punchInMeterPhoto}
                        alt="Morning meter"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-full rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>

                {/* Evening Meter */}
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Evening Meter Photo</span>
                  </div>
                  {att.punchOutMeterPhoto ? (
                    <div
                      onClick={() => setInspectingImage({ title: `${att.employeeName} — Evening Meter`, url: att.punchOutMeterPhoto! })}
                      className="cursor-pointer relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
                    >
                      <img
                        src={att.punchOutMeterPhoto}
                        alt="Evening meter"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-full rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400">
                      Pending Punch-Out
                    </div>
                  )}
                </div>
              </div>

              {/* Manager Remarks if present */}
              {att.managerRemarks && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-bold text-slate-700">Manager Remarks:</span> {att.managerRemarks}
                </div>
              )}

              {/* Action Buttons for Manager Review */}
              {isPending && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleDecision(att.id, 'MANUALLY_APPROVED')}
                    disabled={actionLoading === att.id}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve KM</span>
                  </button>
                  <button
                    onClick={() => handleDecision(att.id, 'REJECTED')}
                    disabled={actionLoading === att.id}
                    className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs italic">
            No KM records matching the current filter.
          </div>
        )}
      </div>

      {/* Inspect Meter Image Zoom Modal */}
      {inspectingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{inspectingImage.title}</span>
              </span>
              <button
                onClick={() => setInspectingImage(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={inspectingImage.url}
                alt="Enlarged meter"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-3 bg-white flex justify-end">
              <button
                onClick={() => setInspectingImage(null)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
