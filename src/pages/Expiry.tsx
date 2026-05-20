import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  X,
  Package,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, addDays, parseISO } from 'date-fns';
import { cn } from '../utils';
import ConfirmationModal from '../components/ConfirmationModal';

interface ExpiryProps {
  batches: any[];
  products: any[];
  onAddBatch: (data: any) => Promise<void>;
  onDeleteBatch: (id: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
}

export default function Expiry({ batches, products, onAddBatch, onDeleteBatch, addToast }: ExpiryProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<number | null>(null);

  const filteredBatches = batches.filter(b => 
    b.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (expiryDate: string) => {
    const date = parseISO(expiryDate);
    const today = new Date();
    const nextWeek = addDays(today, 7);
    const nextMonth = addDays(today, 30);

    if (isBefore(date, today)) return { label: 'Vencido', color: 'bg-rose-100 text-rose-600', icon: AlertTriangle };
    if (isBefore(date, nextWeek)) return { label: 'Vence em 7 dias', color: 'bg-orange-100 text-orange-600', icon: Clock };
    if (isBefore(date, nextMonth)) return { label: 'Vence em 30 dias', color: 'bg-amber-100 text-amber-600', icon: Calendar };
    return { label: 'Regular', color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await onAddBatch(data);
      addToast("Lote cadastrado com sucesso!", "success");
      setShowModal(false);
    } catch (err) {
      addToast("Erro ao salvar lote", "error");
    }
  };

  const handleDelete = async () => {
    if (!batchToDelete) return;
    
    try {
      await onDeleteBatch(batchToDelete);
      addToast("Lote excluído com sucesso!", "success");
    } catch (err) {
      addToast("Erro ao excluir lote", "error");
    } finally {
      setShowConfirmDelete(false);
      setBatchToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Controle de Validade</h2>
          <p className="text-slate-500 font-medium mt-1">Monitore o vencimento dos seus produtos por lote.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
        >
          <Plus size={24} /> NOVO LOTE
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por produto..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.map(batch => {
                const status = getStatus(batch.expiry_date);
                return (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                          <Package size={20} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{batch.product_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-slate-900 dark:text-white">{batch.quantity} un</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                        <Calendar size={14} />
                        {format(parseISO(batch.expiry_date), 'dd/MM/yyyy')}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit",
                        status.color
                      )}>
                        <status.icon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => { setBatchToDelete(batch.id); setShowConfirmDelete(true); }}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] max-w-lg w-full shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Novo Lote / Entrada</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Produto</label>
                  <select name="product_id" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20">
                    <option value="">Selecione um produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quantidade</label>
                    <input name="quantity" type="number" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vencimento</label>
                    <input name="expiry_date" type="date" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all">
                    CANCELAR
                  </button>
                  <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all">
                    SALVAR LOTE
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showConfirmDelete}
        onClose={() => { setShowConfirmDelete(false); setBatchToDelete(null); }}
        onConfirm={handleDelete}
        title="Excluir Lote"
        message="Tem certeza que deseja excluir este lote? Isso irá subtrair a quantidade do estoque do produto."
        confirmText="EXCLUIR"
        type="danger"
      />
    </div>
  );
}
