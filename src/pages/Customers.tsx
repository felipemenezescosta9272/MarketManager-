import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  CreditCard, 
  Star,
  History,
  X,
  ChevronRight,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

interface CustomersProps {
  customers: any[];
  onAddCustomer: (data: any) => Promise<void>;
  onUpdateCustomer: (id: number, data: any) => Promise<void>;
  onDeleteCustomer: (id: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
  settings?: any;
}

export default function Customers({ 
  customers, 
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer,
  addToast,
  settings
}: CustomersProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings?.view_mode || 'grid');

  // Sync with settings
  React.useEffect(() => {
    if (settings?.view_mode) setViewMode(settings.view_mode);
  }, [settings]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search) || 
    c.document?.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, data);
        addToast("Cliente atualizado com sucesso!", "success");
      } else {
        await onAddCustomer(data);
        addToast("Cliente cadastrado com sucesso!", "success");
      }
      setShowModal(false);
      setEditingCustomer(null);
    } catch (err) {
      addToast("Erro ao salvar cliente", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Fidelização de Clientes</h2>
          <p className="text-slate-500 font-medium mt-1">Gerencie sua base de clientes e programas de pontos.</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setShowModal(true); }}
          className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
        >
          <Plus size={24} /> NOVO CLIENTE
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou CPF..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-start">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400"
            )}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'list' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400"
            )}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <motion.div
              key={customer.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center text-2xl font-black">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">{customer.name}</h4>
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                      <Star size={14} fill="currentColor" />
                      <span>{customer.points || 0} pontos acumulados</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                    className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => onDeleteCustomer(customer.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                  <Phone size={16} />
                  <span>{customer.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                  <Mail size={16} />
                  <span className="truncate">{customer.email || 'Sem e-mail'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                  <CreditCard size={16} />
                  <span>CPF/CNPJ: {customer.document || 'Não informado'}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button className="text-xs font-black text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1">
                  <History size={14} /> VER HISTÓRICO
                </button>
                <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-amber-600 transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pontos</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center font-black">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{customer.phone || 'Sem tel'}</span>
                        <span className="text-xs text-slate-400">{customer.email || 'Sem e-mail'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-500">{customer.document || '-'}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-full text-xs font-black">
                        <Star size={12} fill="currentColor" /> {customer.points || 0}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                          className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteCustomer(customer.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.map(customer => (
              <div key={customer.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center font-black">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 dark:text-white line-clamp-1">{customer.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customer.document || 'Sem documento'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                      className="p-2 text-amber-600"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteCustomer(customer.id)}
                      className="p-2 text-rose-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{customer.phone || 'Sem tel'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos</span>
                    <div className="flex items-center gap-1 justify-end text-amber-600 font-black">
                      <Star size={12} fill="currentColor" />
                      <span>{customer.points || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Completo</label>
                  <input name="name" defaultValue={editingCustomer?.name} required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Telefone</label>
                    <input name="phone" defaultValue={editingCustomer?.phone} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CPF/CNPJ</label>
                    <input name="document" defaultValue={editingCustomer?.document} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-mail</label>
                  <input name="email" type="email" defaultValue={editingCustomer?.email} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all">
                    CANCELAR
                  </button>
                  <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all">
                    SALVAR CLIENTE
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
