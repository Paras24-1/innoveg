'use client';

import React, { useState } from 'react';
import { DailyAttendance, Employee } from '@/lib/types';
import {
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';

interface AttendanceTableProps {
  attendances: DailyAttendance[];
  employees: Employee[];
  selectedDate: string;
  onRefresh: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendances,
  employees,
  selectedDate,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULL_DAY' | 'HALF_DAY' | 'ABSENT' | 'LATE'>('ALL');
  const [selectedTourPlan, setSelectedTourPlan] = useState<{ name: string; plan: string } | null>(null);

  // Filter list
  const filtered = attendances.filter((att) => {
    const matchesSearch =
      att.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.employeeMobile.includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'LATE') return att.isLate;
    return att.attendanceStatus === statusFilter;
  });

  const fullDayCount = attendances.filter((a) => a.attendanceStatus === 'FULL_DAY').length;
  const halfDayCount = attendances.filter((a) => a.attendanceStatus === 'HALF_DAY').length;
  const absentCount = attendances.filter((a) => a.attendanceStatus === 'ABSENT').length;
  const lateCount = attendances.filter((a) => a.isLate).length;

  return (
    <div className="space-y-4">
      {/* Top Filter & Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>Field Officers Attendance & 06:00 AM Tour Plans</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: $\ge$5 Visits for Full Day • 3–4 Visits for Half Day • Punch-In before 10:00 AM
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({attendances.length})
            </button>
            <button
              onClick={() => setStatusFilter('FULL_DAY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'FULL_DAY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Day ({fullDayCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('HALF_DAY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'HALF_DAY'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Half Day ({halfDayCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('ABSENT')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'ABSENT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Absent ({absentCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('LATE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'LATE'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Late Mark ({lateCount})</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search officer name or mobile..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Officer Name & Mobile</th>
                <th className="py-3 px-3">06:00 AM Tour Plan</th>
                <th className="py-3 px-3">Morning Punch-In</th>
                <th className="py-3 px-3">Evening Punch-Out</th>
                <th className="py-3 px-3 text-center">Visits Done</th>
                <th className="py-3 px-3 text-center">Travel & Payout (₹3/KM)</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((att) => {
                const punchInFormatted = att.punchInTime
                  ? new Date(att.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : null;

                const punchOutFormatted = att.punchOutTime
                  ? new Date(att.punchOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : null;

                return (
                  <tr key={att.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Officer */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{att.employeeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{att.employeeMobile}</div>
                    </td>

                    {/* Tour Plan */}
                    <td className="py-3 px-3 max-w-xs">
                      {att.tourPlan ? (
                        <div
                          onClick={() => setSelectedTourPlan({ name: att.employeeName, plan: att.tourPlan! })}
                          className="cursor-pointer group flex items-start gap-1.5 text-slate-700 hover:text-emerald-700"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="truncate block" title={att.tourPlan}>
                            {att.tourPlan}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not submitted</span>
                      )}
                    </td>

                    {/* Morning Punch-In */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {punchInFormatted ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{punchInFormatted}</span>
                            {att.isLate ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded border border-rose-200">
                                Late (&gt;10 AM) - Absent
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                                On-Time
                              </span>
                            )}
                          </div>
                          {att.startKm ? (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              Meter: {att.startKm} KM
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>

                    {/* Evening Punch-Out */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {punchOutFormatted ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{punchOutFormatted}</span>
                          </div>
                          {att.endKm ? (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              Meter: {att.endKm} KM
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Active in field</span>
                      )}
                    </td>

                    {/* Visits Done */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-800">
                        <span>{att.completedVisits}</span>
                        <span className="text-slate-400 font-normal">/ 5 target</span>
                      </div>
                    </td>

                    {/* Travel & Reimbursement @ ₹3/KM */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="font-bold text-slate-900">{att.totalOdometerKm || 0} KM</div>
                      <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-200">
                        ₹{(((att.totalOdometerKm || 0) * 3)).toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Attendance Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {att.attendanceStatus === 'FULL_DAY' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Full Day</span>
                        </span>
                      ) : att.attendanceStatus === 'HALF_DAY' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200 shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Half Day (3–4 Visits)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200 shadow-sm">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent / Review</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No officers match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tour Plan Details Modal */}
      {selectedTourPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Tour Plan — {selectedTourPlan.name}</span>
              </h3>
              <button
                onClick={() => setSelectedTourPlan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              {selectedTourPlan.plan}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTourPlan(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
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
