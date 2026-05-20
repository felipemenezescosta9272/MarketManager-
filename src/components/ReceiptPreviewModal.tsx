import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { getReceiptHtml, executePrint } from '../utils/receipt';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  settings: any;
}

export default function ReceiptPreviewModal({ isOpen, onClose, sale, settings }: ReceiptPreviewModalProps) {
  if (!sale) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.9, y: 20 }} 
            className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Visualizar Cupom</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/50">
              <div 
                className="bg-white p-8 shadow-sm mx-auto w-[80mm] min-h-[100mm] text-black"
                dangerouslySetInnerHTML={{ __html: getReceiptHtml(sale, settings) }}
              />
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 text-slate-500 font-black hover:text-slate-700 transition-colors uppercase text-xs tracking-widest"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  executePrint(sale, settings);
                  onClose();
                }}
                className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all"
              >
                <Printer size={20} /> IMPRIMIR AGORA
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
