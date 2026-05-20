import React, { useState, useEffect } from 'react';
import { Shield, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConsentBannerProps {
  onShowPolicy: () => void;
}

export default function ConsentBanner({ onShowPolicy }: ConsentBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('lgpd_consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lgpd_consent', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-8 left-8 right-8 z-[150] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-w-4xl w-full pointer-events-auto flex flex-col md:flex-row items-center gap-6 md:gap-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20 shrink-0">
                <Shield className="text-white" size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Privacidade e Dados (LGPD)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Utilizamos cookies e tecnologias para melhorar sua experiência e proteger seus dados conforme a LGPD.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={onShowPolicy}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 transition-colors whitespace-nowrap"
              >
                Ver Política
              </button>
              <button 
                onClick={handleAccept}
                className="flex-1 md:flex-none px-8 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                ACEITAR <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
