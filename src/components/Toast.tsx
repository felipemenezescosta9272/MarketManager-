import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils';

interface ToastProps {
  toasts: { id: number, message: string, type: 'success' | 'error' | 'warning' }[];
  onRemove: (id: number) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] backdrop-blur-md",
              toast.type === 'success' && "bg-emerald-500/90 border-emerald-400 text-white",
              toast.type === 'error' && "bg-rose-500/90 border-rose-400 text-white",
              toast.type === 'warning' && "bg-amber-500/90 border-amber-400 text-white"
            )}
          >
            {toast.type === 'success' && <CheckCircle2 size={24} />}
            {toast.type === 'error' && <AlertCircle size={24} />}
            {toast.type === 'warning' && <AlertTriangle size={24} />}
            <span className="font-bold flex-1">{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
