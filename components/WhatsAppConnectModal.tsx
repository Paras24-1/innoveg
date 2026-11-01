'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  ShieldCheck,
  X,
  Clock,
  Car,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface WhatsAppConnectModalProps {
  onClose: () => void;
  onVisitSuccess?: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({ onClose, onVisitSuccess }) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedN8n, setCopiedN8n] = useState(false);
  const [originUrl, setOriginUrl] = useState('');

  // Active testing tab
  const [activeTestTab, setActiveTestTab] = useState<'tour_plan' | 'punch_in' | 'visit' | 'punch_out' | 'n8n_docs'>('punch_in');

  // Common Officer State
  const [testPhone, setTestPhone] = useState('9011939722');
  const [testOfficerName, setTestOfficerName] = useState('Pavan Rodge');

  // Action Specific States
  // 1. Tour Plan
  const [testTourPlan, setTestTourPlan] = useState('Planned 4 Farmer visits in Chandur and 2 Dealer visits at Kisan Krishi Kendra.');

  // 2. Punch-In
  const [testStartKm, setTestStartKm] = useState('25000');
  const [testPunchInPhoto, setTestPunchInPhoto] = useState('https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80');

  // 3. Visit
  const [testVisitType, setTestVisitType] = useState('Dealer Visit');
  const [testEntity, setTestEntity] = useState('Shiv Shakti Krishi Kendra');
  const [testVillage, setTestVillage] = useState('Amravati');
  const [testDistrict, setTestDistrict] = useState('Amravati');
  const [testLat, setTestLat] = useState('20.9320');
  const [testLng, setTestLng] = useState('77.7523');
  const [testRemarks, setTestRemarks] = useState('Innoveg 108 – 20 Bags Requirement');

  // 4. Punch-Out
  const [testEndKm, setTestEndKm] = useState('25085');
  const [testPunchOutPhoto, setTestPunchOutPhoto] = useState('https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const n8nUrl = `${originUrl || 'https://innoveg.vercel.app'}/api/webhooks/n8n`;
  const webhookUrl = `${originUrl || 'https://innoveg.vercel.app'}/api/whatsapp/webhook`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResultMsg(null);

    try {
      let payload: any = {
        employeeMobile: testPhone,
        employeeName: testOfficerName,
      };

      if (activeTestTab === 'tour_plan') {
        payload = {
          ...payload,
          action: 'tour_plan',
          tourPlan: testTourPlan,
        };
      } else if (activeTestTab === 'punch_in') {
        payload = {
          ...payload,
          action: 'punch_in',
          startKm: parseFloat(testStartKm) || 25000,
          meterPhotoUrl: testPunchInPhoto,
          latitude: parseFloat(testLat) || 20.9320,
          longitude: parseFloat(testLng) || 77.7523,
          locationName: `${testVillage}, ${testDistrict}`,
        };
      } else if (activeTestTab === 'punch_out') {
        payload = {
          ...payload,
          action: 'punch_out',
          endKm: parseFloat(testEndKm) || 25085,
          meterPhotoUrl: testPunchOutPhoto,
          latitude: parseFloat(testLat) || 20.9320,
          longitude: parseFloat(testLng) || 77.7523,
          locationName: `${testVillage}, ${testDistrict}`,
        };
      } else {
        // Visit
        payload = {
          ...payload,
          action: 'visit',
          visitType: testVisitType,
          entityName: testEntity,
          village: testVillage,
          district: testDistrict,
          latitude: parseFloat(testLat) || 20.9320,
          longitude: parseFloat(testLng) || 77.7523,
          remarksBooking: testRemarks,
          photoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80',
          aiAnalysis: {
            qualityScore: 92,
            isBlur: false,
            fieldVisible: testVisitType.includes('Farmer'),
            personVisible: true,
            brandingVisible: testVisitType.includes('Dealer'),
            visitTypeMatch: true,
            summaryHindi: `✅ ${testVisitType} सत्यापित। स्थान: ${testVillage}`,
            summaryEnglish: `${testVisitType} verified at ${testVillage}.`,
            tags: [testVisitType, 'WhatsApp Live Test', 'Verified GPS'],
          },
        };
      }

      const res = await fetch('/api/webhooks/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer n8n_secret',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setResultMsg({
          type: 'success',
          text: `🎉 Successfully recorded ${activeTestTab.replace('_', ' ').toUpperCase()} for ${testOfficerName}! Check the corresponding tab.`,
        });
        if (onVisitSuccess) onVisitSuccess();
      } else {
        setResultMsg({ type: 'error', text: data.error || 'Failed to simulate action' });
      }
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">WhatsApp Automation & n8n Test Suite</h2>
              <p className="text-xs text-slate-400">
                Simulate the 4 daily lifecycle stages (Tour Plan, Punch-In, Field Visits, Punch-Out)
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

        {/* Tab Selector */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTestTab('tour_plan')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTestTab === 'tour_plan' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. Tour Plan (6 AM)
          </button>
          <button
            onClick={() => setActiveTestTab('punch_in')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTestTab === 'punch_in' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. Punch-In (Before 10 AM)
          </button>
          <button
            onClick={() => setActiveTestTab('visit')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTestTab === 'visit' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            3. Field Visit (Min 5)
          </button>
          <button
            onClick={() => setActiveTestTab('punch_out')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTestTab === 'punch_out' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            4. Punch-Out & KM Audit
          </button>
          <button
            onClick={() => setActiveTestTab('n8n_docs')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTestTab === 'n8n_docs' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            n8n Webhook Specs
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTestTab !== 'n8n_docs' ? (
            <form onSubmit={handleTestSubmit} className="space-y-4 text-xs">
              {/* Officer Selector Row */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Field Officer Name</label>
                  <input
                    type="text"
                    value={testOfficerName}
                    onChange={(e) => setTestOfficerName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile (10 Digits)</label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              {/* Action 1: Tour Plan */}
              {activeTestTab === 'tour_plan' && (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Today's 06:00 AM Tour Plan Text</label>
                  <textarea
                    rows={3}
                    value={testTourPlan}
                    onChange={(e) => setTestTourPlan(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <p className="text-[11px] text-slate-500">
                    Officers submit their planned villages, farmers, and dealers.
                  </p>
                </div>
              )}

              {/* Action 2: Morning Punch-In */}
              {activeTestTab === 'punch_in' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Starting Odometer KM</label>
                      <input
                        type="number"
                        value={testStartKm}
                        onChange={(e) => setTestStartKm(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Punch-In GPS Location</label>
                      <input
                        type="text"
                        value={`${testLat}, ${testLng}`}
                        onChange={(e) => {
                          const [lat, lng] = e.target.value.split(',');
                          if (lat) setTestLat(lat.trim());
                          if (lng) setTestLng(lng.trim());
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Vehicle Meter Photo URL</label>
                    <input
                      type="url"
                      value={testPunchInPhoto}
                      onChange={(e) => setTestPunchInPhoto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800">
                    Rule: Punch-In before 10:00 AM is marked <strong>On-Time</strong>; after 10:00 AM is flagged <strong>Late Mark</strong>.
                  </div>
                </div>
              )}

              {/* Action 3: Field Visit */}
              {activeTestTab === 'visit' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Visit Type</label>
                      <select
                        value={testVisitType}
                        onChange={(e) => setTestVisitType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="Farmer Visit">Farmer Visit</option>
                        <option value="Dealer Visit">Dealer Visit</option>
                        <option value="Distributor Visit">Distributor Visit</option>
                        <option value="Field Visit">Field Visit</option>
                        <option value="Field Program">Field Program</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Entity / Farmer Name</label>
                      <input
                        type="text"
                        value={testEntity}
                        onChange={(e) => setTestEntity(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Village / Territory</label>
                      <input
                        type="text"
                        value={testVillage}
                        onChange={(e) => setTestVillage(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Booking Remarks</label>
                      <input
                        type="text"
                        value={testRemarks}
                        onChange={(e) => setTestRemarks(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action 4: Punch-Out & KM Audit */}
              {activeTestTab === 'punch_out' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Evening Closing Meter KM</label>
                      <input
                        type="number"
                        value={testEndKm}
                        onChange={(e) => setTestEndKm(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Closing Meter Photo URL</label>
                      <input
                        type="url"
                        value={testPunchOutPhoto}
                        onChange={(e) => setTestPunchOutPhoto(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                    Rule: Difference $\le$ 15 KM between Odometer and GPS Route is <strong>Auto-Approved</strong>. Greater than 15 KM is queued for <strong>Manager Review</strong>.
                  </div>
                </div>
              )}

              {/* Result message */}
              {resultMsg && (
                <div
                  className={`p-3 rounded-lg border font-medium ${
                    resultMsg.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}
                >
                  {resultMsg.text}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Posting...' : `Simulate ${activeTestTab.replace('_', ' ').toUpperCase()}`}</span>
                </button>
              </div>
            </form>
          ) : (
            /* n8n Webhook Documentation */
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Your Unified n8n Webhook URL:</span>
                  <button
                    onClick={() => copyToClipboard(n8nUrl, setCopiedN8n)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    {copiedN8n ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedN8n ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <code className="block p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded select-all break-all">
                  {n8nUrl}
                </code>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900">Payload Samples for n8n HTTP Request Node:</h4>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">1. Tour Plan Payload:</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded overflow-x-auto">
{`{
  "action": "tour_plan",
  "employeeMobile": "9011939722",
  "tourPlan": "Varud village 3 farmers, 2 dealers"
}`}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">2. Morning Punch-In Payload:</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded overflow-x-auto">
{`{
  "action": "punch_in",
  "employeeMobile": "9011939722",
  "startKm": 25000,
  "meterPhotoUrl": "https://example.com/odometer.jpg",
  "latitude": 20.9320,
  "longitude": 77.7523,
  "locationName": "Amravati"
}`}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">3. Field Visit Payload:</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded overflow-x-auto">
{`{
  "action": "visit",
  "employeeMobile": "9011939722",
  "visitType": "Farmer Visit",
  "entityName": "Rameshwar Patel",
  "village": "Dunawa",
  "district": "Amravati",
  "latitude": 20.9320,
  "longitude": 77.7523,
  "photoUrl": "https://example.com/visit.jpg",
  "remarksBooking": "10 Bags booked"
}`}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">4. Evening Punch-Out Payload:</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded overflow-x-auto">
{`{
  "action": "punch_out",
  "employeeMobile": "9011939722",
  "endKm": 25085,
  "meterPhotoUrl": "https://example.com/meter_evening.jpg",
  "latitude": 20.9320,
  "longitude": 77.7523
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Target: $\ge$5 Visits for Full Day Attendance • $\le$15 KM Difference for Auto-Approval</span>
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
