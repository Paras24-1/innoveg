'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Employee, Visit, DailySummary, DailyAttendance } from '@/lib/types';
import { formatPhotoUrl, DEFAULT_FIELD_PHOTO } from '@/lib/geo';
import { Navbar } from '@/components/Navbar';
import { StatsOverview } from '@/components/StatsOverview';
import { VisitFeed } from '@/components/VisitFeed';
import { EmployeeLeaderboard } from '@/components/EmployeeLeaderboard';
import { DailyReportModal } from '@/components/DailyReportModal';
import { AiInspectionModal } from '@/components/AiInspectionModal';
import { EmployeeDirectoryModal } from '@/components/EmployeeDirectoryModal';
import { WhatsAppConnectModal } from '@/components/WhatsAppConnectModal';
import { AttendanceTable } from '@/components/AttendanceTable';
import { KmAuditReview } from '@/components/KmAuditReview';

import {
  MapPin,
  ListFilter,
  Trophy,
  Sparkles,
  RefreshCw,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

// Dynamic import for Leaflet map to disable SSR
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
      Loading interactive GPS field map...
    </div>
  ),
});

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [attendances, setAttendances] = useState<DailyAttendance[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [formattedWhatsAppText, setFormattedWhatsAppText] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active filters and views
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'command' | 'attendance' | 'km_audit' | 'leaderboard' | 'gallery'>('command');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [inspectingVisit, setInspectingVisit] = useState<Visit | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch data with silent mode for live background polling
  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [empRes, visitRes, repRes, attRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/visits'),
        fetch('/api/reports/daily'),
        fetch('/api/attendance'),
      ]);

      const empData = await empRes.json();
      const visitData = await visitRes.json();
      const repData = await repRes.json();
      const attData = await attRes.json();

      if (empData.success) setEmployees(empData.employees);
      if (visitData.success) setVisits(visitData.visits);
      if (attData.success) setAttendances(attData.attendance || []);
      if (repData.success) {
        setSummary(repData.summary);
        setFormattedWhatsAppText(repData.formattedWhatsAppText);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();

    // Live auto-polling every 4 seconds to sync WhatsApp field visits in real-time
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAddEmployee = async (newEmp: Partial<Employee>) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedOfficer = employees.find((e) => e.id === selectedEmployeeId);

  const pendingKmCount = attendances.filter((a) => a.kmApprovalStatus === 'PENDING_REVIEW').length;
  const presentCount = attendances.filter((a) => a.attendanceStatus === 'FULL_DAY' || a.attendanceStatus === 'HALF_DAY').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Top Navigation */}
      <Navbar
        officerCount={employees.length || 44}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenEmployees={() => setIsEmployeeModalOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full flex-1">
        {/* Banner with Live System Status */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/20 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>AI Odometer & Attendance System Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Centralized Field Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
              06:00 AM Tour Planning • Morning Punch-In with Vehicle Meter OCR • Min. 5 Visits Rule • Evening Odometer Audit
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative z-10 shrink-0">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-all active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>7 PM Executive Report</span>
            </button>
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all border border-emerald-400/30 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Bot Simulator</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <StatsOverview summary={summary} />

        {/* Selected Filter Bar */}
        {selectedOfficer && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <span className="font-bold">Filtered View:</span>
              <span>
                Showing visits exclusively for <strong>{selectedOfficer.name}</strong> ({selectedOfficer.district})
              </span>
            </div>
            <button
              onClick={() => setSelectedEmployeeId('')}
              className="font-bold text-emerald-800 underline hover:text-emerald-950"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Tab 1: Live Map & Feed */}
            <button
              onClick={() => setActiveTab('command')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'command'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Live Map & Feed</span>
            </button>

            {/* Tab 2: Attendance & Tour Plan */}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'attendance'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Attendance & Tour Plan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold">
                {presentCount}/{employees.length || 44}
              </span>
            </button>

            {/* Tab 3: KM Audit & Review */}
            <button
              onClick={() => setActiveTab('km_audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'km_audit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KM Audit & Approval</span>
              {pendingKmCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 border border-rose-300 font-extrabold animate-pulse">
                  {pendingKmCount}
                </span>
              )}
            </button>

            {/* Tab 4: Officers Leaderboard */}
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{employees.length || 44} Officers Leaderboard</span>
            </button>

            {/* Tab 5: Gallery */}
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Photo Gallery</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline" suppressHydrationWarning>
            Active Date: {summary?.date || (isMounted ? new Date().toISOString().split('T')[0] : '')}
          </span>
        </div>

        {/* Tab 1: Live Map + Real-time Feed */}
        {activeTab === 'command' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive GPS Map (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Live GPS Field Map</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pins represent verified GPS coordinates submitted via WhatsApp
                  </p>
                </div>
                {selectedOfficer && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                    Route Trace: {selectedOfficer.name}
                  </span>
                )}
              </div>

              <div className="h-[480px]">
                <MapComponent
                  visits={visits}
                  selectedEmployeeId={selectedEmployeeId}
                  onSelectVisit={(v) => setInspectingVisit(v)}
                />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Verified Visit
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Repeat Spot
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">Realtime OpenStreetMap GPS</span>
              </div>
            </div>

            {/* Right: Live Feed (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Live Incoming Visits</span>
                  </h2>
                  <p className="text-xs text-slate-500">Auto-refreshes every 4 seconds as officers submit reports</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {visits.length} Today
                </span>
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-1">
                <VisitFeed
                  visits={visits}
                  onSelectVisit={(v) => setSelectedEmployeeId(v.employeeId)}
                  onInspectPhoto={(v) => setInspectingVisit(v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance & Tour Plan */}
        {activeTab === 'attendance' && (
          <AttendanceTable
            attendances={attendances}
            employees={employees}
            selectedDate={summary?.date || (isMounted ? new Date().toISOString().split('T')[0] : '')}
            onRefresh={fetchData}
          />
        )}

        {/* Tab 3: KM Audit & Approval */}
        {activeTab === 'km_audit' && (
          <KmAuditReview
            attendances={attendances}
            onRefresh={fetchData}
          />
        )}

        {/* Tab 4: Officers Leaderboard */}
        {activeTab === 'leaderboard' && (
          <EmployeeLeaderboard
            employees={employees}
            visits={visits}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              setActiveTab('command');
            }}
          />
        )}

        {/* Tab 5: AI Photo Inspection Gallery */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Photo & Quality Inspection Gallery</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click any visit photo to view the Computer Vision clarity breakdown and fraud prevention check
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(visits || []).map((v) => {
                const aiScore = v.aiAnalysis?.qualityScore || 80;
                const isBlur = Boolean(v.aiAnalysis?.isBlur);
                const timeStr = (() => {
                  try {
                    const d = new Date(v.timestamp);
                    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } catch {
                    return '';
                  }
                })();

                return (
                  <div
                    key={v.id}
                    onClick={() => setInspectingVisit(v)}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="h-44 bg-slate-900 relative overflow-hidden">
                      <img
                        src={formatPhotoUrl(v.photoUrl)}
                        alt={v.entityName || 'Visit photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FIELD_PHOTO;
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        {aiScore}/100
                      </div>

                      {isBlur && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Blur Alert
                        </div>
                      )}
                    </div>

                    <div className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          {v.visitType || 'Visit'}
                        </span>
                        {timeStr && (
                          <span className="text-slate-400 text-[10px]" suppressHydrationWarning>
                            {timeStr}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 truncate">{v.entityName || 'Field Visit'}</p>
                      <p className="text-slate-500 text-[11px] truncate">
                        👤 {v.employeeName || 'Officer'} · {v.village || 'Field'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isWhatsAppModalOpen && (
        <WhatsAppConnectModal
          onClose={() => setIsWhatsAppModalOpen(false)}
          onVisitSuccess={fetchData}
        />
      )}

      {isReportModalOpen && (
        <DailyReportModal
          summary={summary}
          attendances={attendances}
          formattedWhatsAppText={formattedWhatsAppText}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {isEmployeeModalOpen && (
        <EmployeeDirectoryModal
          employees={employees}
          onClose={() => setIsEmployeeModalOpen(false)}
          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
        />
      )}

      {inspectingVisit && (
        <AiInspectionModal
          visit={inspectingVisit}
          onClose={() => setInspectingVisit(null)}
        />
      )}
    </div>
  );
}
