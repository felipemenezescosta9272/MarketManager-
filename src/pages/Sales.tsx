import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CreditCard, 
  ChevronRight, 
  Download,
  Eye,
  X,
  Receipt,
  Trash2,
  LayoutGrid,
  List,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../utils';
import { apiFetch } from '../api';

interface SalesProps {
  sales: any[];
  onDeleteSale: (id: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
  settings?: any;
}

export default function Sales({ sales, onDeleteSale, addToast, settings }: SalesProps) {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Todos');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings?.view_mode || 'list');

  // Sync with settings
  React.useEffect(() => {
    if (settings?.view_mode) setViewMode(settings.view_mode);
  }, [settings]);

  const handleDeleteSale = async (id: number) => {
    try {
      await onDeleteSale(id);
      addToast("Venda excluída com sucesso!", "success");
      setShowDeleteConfirm(null);
      if (selectedSale?.id === id) setSelectedSale(null);
    } catch (err) {
      addToast("Erro ao excluir venda", "error");
    }
  };

  const handleSelectSale = async (sale: any) => {
    setSelectedSale(sale);
    try {
      const fullSale = await apiFetch(`/api/sales/${sale.id}`);
      setSelectedSale(fullSale);
    } catch (err) {
      console.error("Error fetching full sale details:", err);
      addToast("Erro ao carregar itens da venda", "error");
    }
  };

  const formatPaymentMethod = (method: any) => {
    if (!method) return '-';
    
    const mapMethod = (m: string) => {
      if (m === 'Crédito') return 'Cartão de Crédito';
      if (m === 'Débito') return 'Cartão de Débito';
      return m;
    };

    // Handle array directly
    if (Array.isArray(method)) {
      const methods = method.map((p: any) => mapMethod(p.method || p)).filter(Boolean);
      return [...new Set(methods)].join(' / ');
    }
    
    // Handle string (could be JSON or plain text)
    if (typeof method === 'string') {
      if (method.startsWith('[') || method.startsWith('{')) {
        try {
          const parsed = JSON.parse(method);
          if (Array.isArray(parsed)) {
            const methods = parsed.map((p: any) => mapMethod(p.method || p)).filter(Boolean);
            return [...new Set(methods)].join(' / ');
          }
          if (typeof parsed === 'object' && parsed !== null) {
            return mapMethod(parsed.method || JSON.stringify(parsed));
          }
        } catch (e) {
          return mapMethod(method);
        }
      }
      return mapMethod(method);
    }
    
    return mapMethod(String(method));
  };

  const generateReport = () => {
    try {
      const doc = new jsPDF();
      const date = new Date();
      const dateStr = format(date, 'dd/MM/yyyy HH:mm');
      
      // Header
      doc.setFontSize(20);
      doc.text('Relatório de Vendas', 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${dateStr}`, 14, 30);

      const tableData = filteredSales.map(s => {
        const saleDate = new Date(s.created_at);
        const itemCount = s.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
        return [
          `#${s.id}`,
          format(saleDate, 'dd/MM/yyyy'),
          format(saleDate, 'HH:mm'),
          s.customer_name || 'Consumidor Final',
          `${itemCount} itens`,
          formatPaymentMethod(s.payment_method),
          s.notes || '-',
          `R$ ${Number(s.total_amount).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['ID', 'Data', 'Horário', 'Cliente', 'Itens', 'Pagamento', 'Obs', 'Total']],
        body: tableData,
        headStyles: { fillColor: [180, 83, 9] }, // amber-700
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`VALOR TOTAL DAS VENDAS: R$ ${totalRevenue.toFixed(2)}`, 14, finalY + 15);

      doc.save(`relatorio_vendas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      addToast("Relatório PDF gerado com sucesso!", "success");
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      addToast("Erro ao gerar relatório", "error");
    }
  };

  const filteredSales = sales.filter(s => {
    const searchTrimmed = search.trim();
    const searchLower = searchTrimmed.toLowerCase();
    
    const matchesSearch = 
      (s.id?.toString().includes(searchTrimmed) || false) || 
      (s.customer_name?.toLowerCase().includes(searchLower) || false) ||
      (s.notes?.toLowerCase().includes(searchLower) || false) ||
      (formatPaymentMethod(s.payment_method).toLowerCase().includes(searchLower) || false);
    
    const matchesPayment = paymentFilter === 'Todos' || (() => {
      const method = s.payment_method;
      if (!method) return false;
      
    const checkMatch = (m: string) => {
        const formatted = formatPaymentMethod(m);
        if (paymentFilter === 'Cartão de Crédito') {
          return formatted === 'Cartão de Crédito' || m === 'Crédito';
        }
        if (paymentFilter === 'Cartão de Débito') {
          return formatted === 'Cartão de Débito' || m === 'Débito';
        }
        return formatted === paymentFilter || m === paymentFilter;
      };

      if (Array.isArray(method)) {
        return method.some(p => checkMatch(p.method || p));
      }
      
      if (typeof method === 'string') {
        if (method.startsWith('[') || method.startsWith('{')) {
          try {
            const parsed = JSON.parse(method);
            if (Array.isArray(parsed)) {
              return parsed.some(p => checkMatch(p.method || p));
            }
            return checkMatch(parsed.method || parsed);
          } catch (e) {
            return checkMatch(method);
          }
        }
        return checkMatch(method);
      }
      
      return checkMatch(method);
    })();

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Histórico de Vendas</h2>
          <p className="text-slate-500 font-medium mt-1">Visualize e gerencie todas as transações realizadas.</p>
        </div>
        <button 
          onClick={generateReport}
          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white px-8 py-4 rounded-2xl font-black border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-50 transition-all"
        >
          <Download size={20} /> RELATÓRIO DE VENDAS
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por ID da venda ou cliente..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white appearance-none"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="Todos">Todos Pagamentos</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="PIX">PIX</option>
          </select>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
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
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Data</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obs</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white">#{sale.id}</span>
                        <span className="text-xs font-bold text-slate-400">{format(new Date(sale.created_at), 'dd/MM/yy HH:mm')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                        <User size={16} className="text-amber-600" />
                        {sale.customer_name || 'Consumidor Final'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        {sale.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0} produtos
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-amber-600">R$ {Number(sale.total_amount).toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                        <CreditCard size={14} />
                        {formatPaymentMethod(sale.payment_method)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {sale.notes ? (
                        <div className="flex items-center gap-1 text-amber-600 font-medium text-xs" title={sale.notes}>
                          <MessageSquare size={14} />
                          <span className="truncate max-w-[100px]">{sale.notes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            const event = new CustomEvent('print-receipt', { detail: sale });
                            window.dispatchEvent(event);
                            addToast("Abrindo cupom para visualização...", "success");
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                          title="Ver Cupom"
                        >
                          <Receipt size={14} />
                          <span>Ver Cupom</span>
                        </button>
                        <button 
                          onClick={() => handleSelectSale(sale)}
                          className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={20} />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(sale.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Excluir Venda"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-100 dark:border-slate-800">
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={3} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</td>
                  <td className="px-8 py-6 font-black text-amber-600 text-lg">R$ {filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0).toFixed(2)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.map(sale => (
              <div key={sale.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 dark:text-white">#{sale.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(sale.created_at), 'dd/MM/yy HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sale.notes && (
                      <div className="p-1.5 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg" title="Possui observação">
                        <MessageSquare size={14} />
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('print-receipt', { detail: sale });
                        window.dispatchEvent(event);
                        addToast("Abrindo cupom...", "success");
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest"
                    >
                      <Receipt size={12} />
                      <span>Ver Cupom</span>
                    </button>
                    <button 
                      onClick={() => handleSelectSale(sale)}
                      className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <Eye size={20} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(sale.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
                    <User size={14} className="text-amber-600" />
                    {sale.customer_name || 'Consumidor Final'}
                  </div>
                  <span className="font-black text-amber-600">R$ {Number(sale.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>{sale.items?.length || 0} produtos</span>
                  <div className="flex items-center gap-1">
                    <CreditCard size={10} />
                    {formatPaymentMethod(sale.payment_method)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSales.map(sale => (
            <motion.div
              key={sale.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-2xl">
                  <ShoppingBag size={24} />
                </div>
                <div className="flex items-center gap-2">
                  {sale.notes && (
                    <div className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-xl" title="Possui observação">
                      <MessageSquare size={16} />
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('print-receipt', { detail: sale });
                      window.dispatchEvent(event);
                      addToast("Abrindo cupom...", "success");
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Receipt size={14} />
                    <span>Ver Cupom</span>
                  </button>
                  <button 
                    onClick={() => handleSelectSale(sale)}
                    className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(sale.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-slate-900 dark:text-white">#{sale.id}</span>
                  <span className="text-xs font-bold text-slate-400">{format(new Date(sale.created_at), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                  <User size={16} className="text-amber-600" />
                  {sale.customer_name || 'Consumidor Final'}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Itens</span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {sale.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0} produtos
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Pagamento</span>
                  <span className="text-slate-900 dark:text-white font-black">{formatPaymentMethod(sale.payment_method)}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="text-2xl font-black text-amber-600">
                  R$ {Number(sale.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Detalhes da Venda #{selectedSale.id}</h3>
                  <p className="text-slate-500 font-bold">{format(new Date(selectedSale.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
                    <p className="font-black text-slate-900 dark:text-white">{selectedSale.customer_name || 'Consumidor Final'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pagamento</p>
                    <p className="font-black text-slate-900 dark:text-white">{formatPaymentMethod(selectedSale.payment_method)}</p>
                  </div>
                </div>

                {selectedSale.notes && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Observação da Venda</p>
                    <p className="font-medium text-amber-900 dark:text-amber-100 italic">{selectedSale.notes}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Itens da Venda</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {selectedSale.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                            <p className="text-xs font-bold text-slate-400">{item.quantity}x R$ {Number(item.unit_price).toFixed(2)}</p>
                          </div>
                          <p className="font-black text-slate-900 dark:text-white">R$ {(item.quantity * item.unit_price).toFixed(2)}</p>
                        </div>
                        {item.notes && (
                          <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-2 rounded-lg italic border-l-2 border-amber-400">
                            Obs: {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:divide-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da Venda</p>
                    <p className="text-4xl font-black text-amber-600">R$ {Number(selectedSale.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('edit-sale', { detail: selectedSale });
                        window.dispatchEvent(event);
                        setSelectedSale(null);
                      }}
                      className="flex-1 bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-amber-700 transition-all"
                    >
                      <Receipt size={20} /> EDITAR VENDA
                    </button>
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('print-receipt', { detail: selectedSale });
                        window.dispatchEvent(event);
                        addToast("Enviando para impressão...", "success");
                      }}
                      className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-all"
                    >
                      <Receipt size={20} /> REIMPRIMIR CUPOM
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(selectedSale.id)}
                      className="p-4 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded-2xl hover:bg-rose-200 transition-all"
                      title="Excluir Venda"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Excluir Venda?</h3>
              <p className="text-slate-500 font-medium mb-8">Esta ação não pode ser desfeita e o estoque não será retornado automaticamente.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => handleDeleteSale(showDeleteConfirm)}
                  className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  EXCLUIR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
