'use client';

import React, { useState } from 'react';
import { DailySummary, DailyAttendance } from '@/lib/types';
import { X, Copy, Check, FileText, Download, ShieldCheck, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DailyReportModalProps {
  summary: DailySummary | null;
  attendances?: DailyAttendance[];
  formattedWhatsAppText: string;
  onClose: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  summary,
  attendances = [],
  formattedWhatsAppText,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'detailed_table' | 'summary'>('detailed_table');

  if (!summary) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedWhatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Mobile Number',
      'Date',
      '06:00 AM Tour Plan',
      'Punch-In Time',
      'Late Mark',
      'Morning Meter KM',
      'Total Field Visits',
      'Total GPS KM',
      'Evening Meter KM',
      'Total Odometer KM',
      'KM Difference',
      'Punch-Out Time',
      'Attendance Status',
      'KM Approval Status',
      'Manager Remarks'
    ];

    const dataRows = attendances.map((a) => [
      `"${a.employeeId}"`,
      `"${a.employeeName}"`,
      `"${a.employeeMobile}"`,
      `"${a.date}"`,
      `"${(a.tourPlan || 'None').replace(/"/g, '""')}"`,
      `"${a.punchInTime ? new Date(a.punchInTime).toLocaleTimeString('en-IN') : 'Pending'}"`,
      `"${a.isLate ? 'YES' : 'NO'}"`,
      a.startKm || 0,
      a.completedVisits,
      a.totalGpsKm,
      a.endKm || 0,
      a.totalOdometerKm,
      a.kmDifference,
      `"${a.punchOutTime ? new Date(a.punchOutTime).toLocaleTimeString('en-IN') : 'Pending'}"`,
      `"${a.attendanceStatus}"`,
      `"${a.kmApprovalStatus}"`,
      `"${(a.managerRemarks || '').replace(/"/g, '""')}"`
    ]);

    const csvRows = [headers.join(','), ...dataRows.map((e) => e.join(','))];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `innoveg_7pm_daily_report_${summary.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">7:00 PM Daily Performance & KM Reconciliation Report</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30">
                  {summary.date}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Executive Field Summary, Vehicle Auditing & Attendance Record
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Bar */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('detailed_table')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'detailed_table' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Full Reconciliation Table ({attendances.length} Officers)
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'summary' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              WhatsApp Executive Text
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Text' : 'Copy for WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {viewMode === 'detailed_table' ? (
            <div className="space-y-4">
              {/* Quick Summary Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Workforce</div>
                  <div className="text-base font-extrabold text-slate-900">{summary.totalEmployees} Officers</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Present (≥3 Visits)</div>
                  <div className="text-base font-extrabold text-emerald-600">{summary.presentCount || 0} Officers</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Late Punch-In (&gt;10 AM)</div>
                  <div className="text-base font-extrabold text-amber-600">{summary.latePunchInCount || 0} Officers</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">KM Discrepancies (&gt;15 KM)</div>
                  <div className="text-base font-extrabold text-rose-600">{summary.kmPendingReviewCount || 0} Flagged</div>
                </div>
              </div>

              {/* PDF Specific Detailed Reconciliation Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Officer</th>
                        <th className="py-2.5 px-2">Tour Plan</th>
                        <th className="py-2.5 px-2">Punch-In</th>
                        <th className="py-2.5 px-2 text-center">Visits</th>
                        <th className="py-2.5 px-2 text-center">GPS KM</th>
                        <th className="py-2.5 px-2 text-center">Odo KM</th>
                        <th className="py-2.5 px-2 text-center">KM Diff</th>
                        <th className="py-2.5 px-2">Punch-Out</th>
                        <th className="py-2.5 px-3 text-center">Attendance</th>
                        <th className="py-2.5 px-3 text-center">KM Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendances.map((att) => (
                        <tr key={att.employeeId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{att.employeeName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{att.employeeMobile}</div>
                          </td>
                          <td className="py-2.5 px-2 max-w-[140px] truncate text-slate-600" title={att.tourPlan || ''}>
                            {att.tourPlan || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {att.punchInTime ? (
                              <span className={att.isLate ? 'text-amber-700 font-bold' : 'text-slate-800'}>
                                {new Date(att.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                {att.isLate && ' ⚠️'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                            {att.completedVisits}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                            {att.totalGpsKm}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                            {att.totalOdometerKm}
                          </td>
                          <td className={`py-2.5 px-2 text-center font-bold font-mono ${att.kmDifference > 15 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {att.kmDifference}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {att.punchOutTime ? (
                              new Date(att.punchOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {att.attendanceStatus === 'FULL_DAY' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                Full Day
                              </span>
                            ) : att.attendanceStatus === 'HALF_DAY' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                Half Day
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {att.kmApprovalStatus === 'PENDING_REVIEW' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                                Review Req.
                              </span>
                            ) : att.kmApprovalStatus === 'MANUALLY_APPROVED' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                Approved
                              </span>
                            ) : att.kmApprovalStatus === 'REJECTED' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                Auto-OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Copy-paste ready for WhatsApp Management Broadcasting:</span>
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto border border-slate-800">
                {formattedWhatsAppText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>InnoVeg AI Field Operations & Intelligence System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
