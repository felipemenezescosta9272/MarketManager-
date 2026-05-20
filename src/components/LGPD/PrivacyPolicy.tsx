import React from 'react';
import { Shield, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-amber-600" size={24} />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Política de Privacidade (LGPD)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-6 text-slate-600 dark:text-slate-400 font-medium">
          <section>
            <h4 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest mb-2">1. Coleta de Dados</h4>
            <p>Coletamos apenas os dados estritamente necessários para a operação do sistema de gestão, como nome, e-mail e dados de transações comerciais.</p>
          </section>
          
          <section>
            <h4 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest mb-2">2. Finalidade</h4>
            <p>Seus dados são utilizados exclusivamente para a prestação dos serviços contratados, emissão de documentos fiscais e gestão administrativa da sua loja.</p>
          </section>
          
          <section>
            <h4 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest mb-2">3. Segurança</h4>
            <p>Implementamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda ou alteração.</p>
          </section>
          
          <section>
            <h4 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest mb-2">4. Seus Direitos</h4>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Confirmar a existência de tratamento de dados;</li>
              <li>Acessar seus dados;</li>
              <li>Corrigir dados incompletos ou inexatos;</li>
              <li>Solicitar a anonimização ou exclusão de dados desnecessários;</li>
              <li>Portabilidade dos dados.</li>
            </ul>
          </section>
          
          <section>
            <h4 className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest mb-2">5. Contato</h4>
            <p>Para exercer seus direitos, entre em contato com nosso Encarregado de Dados (DPO) através das configurações do sistema.</p>
          </section>
        </div>
        
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl transition-all"
          >
            ENTENDI E ACEITO
          </button>
        </div>
      </motion.div>
    </div>
  );
}
