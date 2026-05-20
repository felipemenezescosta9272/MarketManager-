import React, { useState } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  X,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../utils';

interface AdminTenantsProps {
  tenants: any[];
  onAddTenant: (data: any) => Promise<void>;
  onUpdateTenant: (id: number, data: any) => Promise<void>;
  onDeleteTenant: (id: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
}

export default function AdminTenants({ tenants, onAddTenant, onUpdateTenant, onDeleteTenant, addToast }: AdminTenantsProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      if (editingTenant) {
        await onUpdateTenant(editingTenant.id, data);
        addToast("Loja atualizada com sucesso!", "success");
      } else {
        await onAddTenant(data);
        addToast("Loja cadastrada com sucesso!", "success");
      }
      setShowModal(false);
      setEditingTenant(null);
    } catch (err) {
      addToast("Erro ao salvar loja", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestão de Lojas (SaaS)</h2>
          <p className="text-slate-500 font-medium mt-1">Gerencie as instâncias de mercado cadastradas no sistema.</p>
        </div>
        <button 
          onClick={() => { setEditingTenant(null); setShowModal(true); }}
          className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-purple-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
        >
          <Plus size={24} /> NOVA LOJA
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou slug..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTenants.map(tenant => (
          <motion.div
            key={tenant.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center">
                  <Store size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{tenant.name}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">slug: {tenant.slug}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingTenant(tenant); setShowModal(true); }}
                  className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteTenant(tenant.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                  tenant.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                )}>
                  {tenant.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {tenant.status === 'active' ? 'Ativa' : 'Suspensa'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Licença</span>
                <span className="text-sm font-black text-purple-600 uppercase tracking-tighter">
                  {tenant.license_type === 'monthly' && 'Mensal'}
                  {tenant.license_type === 'quarterly' && 'Trimestral'}
                  {tenant.license_type === 'semiannual' && 'Semestral'}
                  {tenant.license_type === 'annual' && 'Anual'}
                  {!tenant.license_type && 'Não definida'}
                </span>
              </div>
              {tenant.license_end_date && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expira em</span>
                  <span className={cn(
                    "text-sm font-bold",
                    new Date(tenant.license_end_date) < new Date() ? "text-rose-600" : "text-slate-700 dark:text-slate-200"
                  )}>
                    {format(new Date(tenant.license_end_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                <Shield size={14} /> GERENCIAR SEGURANÇA
              </button>
            </div>
          </motion.div>
        ))}
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
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {editingTenant ? 'Editar Loja' : 'Nova Loja'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome da Loja</label>
                  <input name="name" defaultValue={editingTenant?.name} required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Slug (Identificador Único)</label>
                  <input name="slug" defaultValue={editingTenant?.slug} required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" placeholder="ex: mercado-central" />
                </div>
                
                {!editingTenant && (
                  <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Dados do Administrador Inicial</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Admin</label>
                      <input name="admin_name" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-mail</label>
                        <input name="admin_email" type="email" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Senha</label>
                        <input name="admin_password" type="password" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Status</label>
                    <select name="status" defaultValue={editingTenant?.status || 'active'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20">
                      <option value="active">Ativa</option>
                      <option value="suspended">Suspensa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Licença</label>
                    <select name="license_type" defaultValue={editingTenant?.license_type || 'monthly'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20">
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>

                {editingTenant && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Data de Expiração</label>
                    <input 
                      type="date" 
                      name="license_end_date" 
                      defaultValue={editingTenant.license_end_date ? format(new Date(editingTenant.license_end_date), 'yyyy-MM-dd') : ''} 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" 
                    />
                  </div>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all">
                    CANCELAR
                  </button>
                  <button type="submit" className="flex-1 py-4 bg-purple-600 text-white font-black rounded-2xl shadow-xl shadow-purple-600/20 hover:bg-purple-700 transition-all">
                    SALVAR LOJA
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
