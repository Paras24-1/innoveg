'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Employee, Visit, DailySummary } from '@/lib/types';
import { formatPhotoUrl, DEFAULT_FIELD_PHOTO } from '@/lib/geo';
import { Navbar } from '@/components/Navbar';
import { StatsOverview } from '@/components/StatsOverview';
import { VisitFeed } from '@/components/VisitFeed';
import { EmployeeLeaderboard } from '@/components/EmployeeLeaderboard';
import { DailyReportModal } from '@/components/DailyReportModal';
import { AiInspectionModal } from '@/components/AiInspectionModal';
import { EmployeeDirectoryModal } from '@/components/EmployeeDirectoryModal';
import { WhatsAppConnectModal } from '@/components/WhatsAppConnectModal';

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
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [formattedWhatsAppText, setFormattedWhatsAppText] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active filters and views
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'command' | 'leaderboard' | 'map' | 'gallery'>('command');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [inspectingVisit, setInspectingVisit] = useState<Visit | null>(null);

  // Fetch data with silent mode for live background polling
  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [empRes, visitRes, repRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/visits'),
        fetch('/api/reports/daily'),
      ]);

      const empData = await empRes.json();
      const visitData = await visitRes.json();
      const repData = await repRes.json();

      if (empData.success) setEmployees(empData.employees);
      if (visitData.success) setVisits(visitData.visits);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Top Navigation */}
      <Navbar
        officerCount={employees.length}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenEmployees={() => setIsEmployeeModalOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full flex-1">
        {/* Banner with Live System Status */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                InnoVeg Central Digital Field Command
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200">
              Zero-app WhatsApp reporting for 60+ Field Officers across MP & Maharashtra agro-belts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-emerald-950" />
              <span>WhatsApp Setup & Test</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl border border-emerald-600 shadow-sm transition-all"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>7 PM Auto Report</span>
            </button>
          </div>
        </div>

        {/* 4 Core KPI Summary Cards */}
        <StatsOverview summary={summary} />

        {/* Selected Officer Filter Alert */}
        {selectedOfficer && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <span className="font-bold">Filtering officer route:</span>
              <span className="font-semibold text-emerald-800">{selectedOfficer.name}</span>
              <span className="text-emerald-700">({selectedOfficer.district} - {selectedOfficer.territory})</span>
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('command')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'command'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Live Map & Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{employees.length || 65} Officers Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Photo Inspection Gallery</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Active Date: {summary?.date || new Date().toISOString().split('T')[0]}
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
            </div>

            {/* Right: Live Stream Feed (5 Cols) */}
            <div className="lg:col-span-5 h-[540px]">
              <VisitFeed
                visits={visits}
                onSelectVisit={(v) => setSelectedEmployeeId(v.employeeId)}
                onInspectPhoto={(v) => setInspectingVisit(v)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Full Officers Leaderboard */}
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

        {/* Tab 3: AI Photo Inspection Gallery */}
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
                          <span className="text-slate-400 text-[10px]">
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
