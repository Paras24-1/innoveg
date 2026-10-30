'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, Send, MapPin, Camera, Sparkles, ExternalLink, ShieldCheck, X } from 'lucide-react';

interface WhatsAppConnectModalProps {
  onClose: () => void;
  onVisitSuccess?: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({ onClose, onVisitSuccess }) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedN8n, setCopiedN8n] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [originUrl, setOriginUrl] = useState('');

  // Test form state
  const [testPhone, setTestPhone] = useState('9826012345');
  const [testOfficerName, setTestOfficerName] = useState('Amit Verma');
  const [testVisitType, setTestVisitType] = useState('Dealer Visit');
  const [testEntity, setTestEntity] = useState('Shiv Shakti Krishi Kendra');
  const [testVillage, setTestVillage] = useState('Multai');
  const [testDistrict, setTestDistrict] = useState('Betul');
  const [testLat, setTestLat] = useState('21.7709');
  const [testLng, setTestLng] = useState('78.2575');
  const [testRemarks, setTestRemarks] = useState('Innoveg 108 – 20 Bags Requirement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const webhookUrl = `${originUrl || 'https://innoveg-field-reporting.vercel.app'}/api/whatsapp/webhook`;
  const n8nUrl = `${originUrl || 'https://innoveg-field-reporting.vercel.app'}/api/webhooks/n8n`;
  const verifyToken = 'innoveg_secret_token';

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResultMsg(null);

    try {
      const res = await fetch('/api/webhooks/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer n8n_secret',
        },
        body: JSON.stringify({
          employeeMobile: testPhone,
          employeeName: testOfficerName,
          visitType: testVisitType,
          entityName: testEntity,
          village: testVillage,
          district: testDistrict,
          latitude: parseFloat(testLat) || 21.7709,
          longitude: parseFloat(testLng) || 78.2575,
          remarksBooking: testRemarks,
          photoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?w=600&auto=format&fit=crop&q=80',
          aiAnalysis: {
            qualityScore: 94,
            isBlur: false,
            fieldVisible: testVisitType.includes('Farmer'),
            personVisible: true,
            brandingVisible: testVisitType.includes('Dealer'),
            visitTypeMatch: true,
            summaryHindi: `✅ ${testVisitType} सफलतापूर्वक सत्यापित। स्थान: ${testVillage}`,
            summaryEnglish: `${testVisitType} verified at ${testVillage}.`,
            tags: [testVisitType, 'WhatsApp Live Test', 'Verified GPS'],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResultMsg({
          type: 'success',
          text: `🎉 Visit successfully recorded for ${testOfficerName}! Check the Live Map and Feed stream.`,
        });
        if (onVisitSuccess) onVisitSuccess();
      } else {
        setResultMsg({ type: 'error', text: data.error || 'Failed to simulate visit' });
      }
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/50 border border-emerald-400/40 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">WhatsApp Webhook & Integration Hub</h2>
              <p className="text-xs text-emerald-200">Connect Meta WhatsApp Cloud API, n8n, or run test messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Webhook URLs for Meta and n8n */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. Webhook Endpoints for Live WhatsApp
            </h3>

            {/* Direct Meta Cloud API Webhook */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Meta WhatsApp Cloud API Callback URL (GET verification & POST messages):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-lg text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium text-slate-700 flex items-center gap-1.5"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Meta Webhook Verify Token:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="w-64 px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-lg text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyToken, setCopiedToken)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium text-slate-700 flex items-center gap-1.5"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedToken ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* n8n Webhook URL */}
            <div className="space-y-1 pt-1 border-t border-slate-200">
              <label className="text-[11px] font-semibold text-slate-600">n8n Automation Inbound Webhook URL:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={n8nUrl}
                  className="flex-1 px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-lg text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(n8nUrl, setCopiedN8n)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium text-slate-700 flex items-center gap-1.5"
                >
                  {copiedN8n ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedN8n ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Test WhatsApp Visit Submission Form */}
          <form onSubmit={handleSimulateWebhook} className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                2. Test Live WhatsApp Visit Submission
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium">Instantly pushes a visit to dashboard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Officer Phone</label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 9826012345"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Officer Name</label>
                <input
                  type="text"
                  required
                  value={testOfficerName}
                  onChange={(e) => setTestOfficerName(e.target.value)}
                  placeholder="Officer name"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visit Type</label>
                <select
                  value={testVisitType}
                  onChange={(e) => setTestVisitType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                >
                  <option value="Farmer Visit">Farmer Visit</option>
                  <option value="Dealer Visit">Dealer Visit</option>
                  <option value="Distributor Visit">Distributor Visit</option>
                  <option value="Field Visit">Field Visit</option>
                  <option value="Field Program">Field Program</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Entity / Dealer / Farmer</label>
                <input
                  type="text"
                  required
                  value={testEntity}
                  onChange={(e) => setTestEntity(e.target.value)}
                  placeholder="e.g. Shiv Shakti Krishi"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Village / Town</label>
                <input
                  type="text"
                  required
                  value={testVillage}
                  onChange={(e) => setTestVillage(e.target.value)}
                  placeholder="e.g. Multai"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">District</label>
                <input
                  type="text"
                  required
                  value={testDistrict}
                  onChange={(e) => setTestDistrict(e.target.value)}
                  placeholder="e.g. Betul"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
                <input
                  type="text"
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                  placeholder="21.7709"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
                <input
                  type="text"
                  value={testLng}
                  onChange={(e) => setTestLng(e.target.value)}
                  placeholder="78.2575"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Remarks / Booking</label>
                <input
                  type="text"
                  value={testRemarks}
                  onChange={(e) => setTestRemarks(e.target.value)}
                  placeholder="e.g. 20 Bags booked"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

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

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Posting Visit...' : 'Send Test WhatsApp Visit'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Live Auto-Polling refreshes every 4s</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
