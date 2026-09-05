import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface DispatchToastProps {
  toastMessage: string | null;
  onClose: () => void;
}

export const DispatchToast: React.FC<DispatchToastProps> = ({ toastMessage, onClose }) => {
  if (!toastMessage) return null;

  return (
    <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-emerald-500/50 text-slate-100 p-4 rounded-lg shadow-2xl flex items-center space-x-3 text-xs font-sans animate-slide-in">
      <div className="p-1 rounded bg-emerald-950/80 border border-emerald-800">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <h4 className="font-bold text-slate-100">Modbus TCP Dispatch Synced</h4>
        <p className="text-slate-300 font-mono text-[11px] mt-0.5">{toastMessage}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded text-slate-400 hover:text-white transition-colors ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
