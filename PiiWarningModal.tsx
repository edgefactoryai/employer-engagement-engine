import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface PiiWarningModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export const PiiWarningModal: React.FC<PiiWarningModalProps> = ({ isOpen, onAccept, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Sensitive Data Warning</h3>
                <p className="text-sm text-slate-500 mt-1">Potential PII detected in your input.</p>
              </div>
            </div>
            <button onClick={onCancel} aria-label="Close warning" className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-800 space-y-3">
            <p>
              Our system has detected patterns that may indicate the presence of Personally Identifiable Information (PII), such as student IDs, Social Security Numbers, or information related to minors.
            </p>
            <p className="font-bold">
              Please review your input. You are strictly prohibited from entering sensitive student data or PII of minors into the E^3 Engine.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Review Input
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              I Confirm No PII
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
