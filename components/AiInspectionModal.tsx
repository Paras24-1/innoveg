'use client';

import React from 'react';
import { Visit } from '@/lib/types';
import { X, Camera, MapPin, User, Phone, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { formatPhotoUrl, DEFAULT_FIELD_PHOTO } from '@/lib/geo';

interface AiInspectionModalProps {
  visit: Visit | null;
  onClose: () => void;
}

export const AiInspectionModal: React.FC<AiInspectionModalProps> = ({ visit, onClose }) => {
  if (!visit) return null;

  const lat = typeof visit.latitude === 'number' && !isNaN(visit.latitude) ? visit.latitude.toFixed(4) : '0.0000';
  const lng = typeof visit.longitude === 'number' && !isNaN(visit.longitude) ? visit.longitude.toFixed(4) : '0.0000';
  const photoSrc = formatPhotoUrl(visit.photoUrl);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Field Visit Photo & Evidence Inspector</h2>
              <p className="text-xs text-slate-500">Human Verification & Location Ground Proof</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Main Photo */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative aspect-video sm:aspect-square flex items-center justify-center">
              <img
                src={photoSrc}
                alt="Field visit photo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_FIELD_PHOTO;
                }}
              />
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-white">
                📍 {lat}, {lng}
              </div>
            </div>

            {/* Visit Details Card */}
            <div className="flex flex-col justify-between space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Visit Type</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                    {visit.visitType}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Name</span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{visit.contactName || visit.entityName}</span>
                  </div>
                </div>

                {visit.contactMobile && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Mobile Number</span>
                    <div className="font-semibold text-slate-700 font-mono flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{visit.contactMobile}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">City / Village & Territory</span>
                  <div className="text-slate-700 flex items-center gap-1.5 mt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{visit.city || visit.village}, {visit.district}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Reporting Officer</span>
                  <div className="text-slate-800 font-semibold mt-0.5">
                    {visit.employeeName} ({visit.employeeMobile})
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">Verification Status:</span>
                {visit.humanVerificationStatus === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded bg-emerald-100 text-emerald-800 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Two-Point GPS Verified {visit.gpsDriftMeters !== undefined ? `(${visit.gpsDriftMeters}m drift)` : ''}
                  </span>
                ) : visit.humanVerificationStatus === 'FLAGGED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded bg-rose-100 text-rose-800 text-[11px]">
                    <AlertTriangle className="w-3 h-3" /> FLAGGED: Suspicious Pin {visit.gpsDriftMeters !== undefined ? `(${visit.gpsDriftMeters}m drift)` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded bg-amber-100 text-amber-800 text-[11px]">
                    Pending Verification
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compulsory Remarks */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Compulsory Visit Remarks / Discussion Record:</span>
            </div>
            <p className="text-slate-700 italic pl-5">
              &ldquo;{visit.remarksBooking || 'No specific remarks recorded.'}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
