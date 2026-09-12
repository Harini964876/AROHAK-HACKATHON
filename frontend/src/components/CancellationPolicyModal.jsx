import React from 'react';
import { X, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function CancellationPolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Hotel Cancellation Policy</h3>
            <p className="text-xs text-slate-500">Official reservation policy terms</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-900">Direct Cancellation (&gt; 24 Hours)</div>
              <div className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                Reservations cancelled more than 24 hours prior to check-in are processed immediately with full refund. Status automatically changes to <strong>CANCELLED</strong>.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900">Late Cancellation (&le; 24 Hours)</div>
              <div className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                Requests submitted within 24 hours of check-in are placed in <strong>PENDING_CANCELLATION</strong> status and require Front Desk Staff review and approval.
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
            • <strong>Irreversibility:</strong> Once a booking is marked <strong>CANCELLED</strong>, it cannot be cancelled again.<br />
            • <strong>Staff Review:</strong> If staff rejects a pending cancellation, the booking reverts to <strong>CONFIRMED</strong>.
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition shadow-sm"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
