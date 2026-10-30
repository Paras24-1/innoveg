'use client';

import React from 'react';
import { Sprout, Users, RefreshCw, FileText, MessageSquare } from 'lucide-react';

interface NavbarProps {
  officerCount?: number;
  onOpenReport: () => void;
  onOpenEmployees: () => void;
  onOpenWhatsApp?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  officerCount = 65,
  onOpenReport,
  onOpenEmployees,
  onOpenWhatsApp,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Inno<span className="text-emerald-600">Veg</span>
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  AI Field Ops
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">WhatsApp Field Reporting & Intelligence Hub</p>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Sync Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Sync</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* WhatsApp Connect Modal */}
            {onOpenWhatsApp && (
              <button
                onClick={onOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all shadow-emerald-600/20 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Setup & Test</span>
              </button>
            )}

            {/* Dynamic Officers Master Directory */}
            <button
              onClick={onOpenEmployees}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>{officerCount} Officers</span>
            </button>

            {/* 7 PM Daily Report */}
            <button
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>7 PM Report</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
