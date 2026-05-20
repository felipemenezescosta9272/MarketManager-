import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Search, 
  Calendar, 
  Package, 
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryProps {
  logs: any[];
  products: any[];
}

export default function Inventory({ logs, products }: InventoryProps) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');

  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === Number(productId));
      if (product) {
        setSearch(product.name);
      }
    }
  }, [searchParams, products]);

  const filteredLogs = logs.filter(log => {
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = 
      (log.product_name?.toLowerCase().includes(searchLower) || false) || 
      (log.notes?.toLowerCase().includes(searchLower) || false);
    
    const matchesType = typeFilter === 'Todos' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportLogs = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Histórico de Movimentação de Estoque', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filteredLogs.map(log => [
      format(new Date(log.created_at || new Date()), 'dd/MM/yy HH:mm'),
      log.product_name || 'Produto',
      log.type || 'Ajuste',
      Number(log.quantity || 0),
      Number(log.resulting_stock || 0),
      log.notes || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Data/Hora', 'Produto', 'Tipo', 'Qtd', 'Estoque Final', 'Observação']],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 40;
    const totalIn = filteredLogs.filter(l => l.type === 'Entrada').reduce((sum, l) => sum + Number(l.quantity || 0), 0);
    const totalOut = filteredLogs.filter(l => l.type === 'Saída').reduce((sum, l) => sum + Number(l.quantity || 0), 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ENTRADAS: ${totalIn}`, 14, finalY + 10);
    doc.text(`TOTAL SAÍDAS: ${totalOut}`, 14, finalY + 16);

    doc.save(`inventory-logs-${new Date().getTime()}.pdf`);
  };

  const getProductStock = (id: number) => products.find(p => p.id === id)?.stock_quantity || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Histórico de Movimentação</h2>
          <p className="text-slate-500 font-medium mt-1">Rastreie todas as entradas e saídas do seu estoque.</p>
        </div>
        <button 
          onClick={exportLogs}
          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white px-8 py-4 rounded-2xl font-black border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-50 transition-all"
        >
          <Download size={20} /> EXPORTAR LOGS
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por produto ou observação..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white appearance-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="Todos">Todos Tipos</option>
            <option value="Entrada">Entradas</option>
            <option value="Saída">Saídas</option>
            <option value="Ajuste">Ajustes</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Final</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                      <Calendar size={14} />
                      {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                        <Package size={20} />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{log.product_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit",
                      log.type === 'Entrada' ? "bg-emerald-100 text-emerald-600" : 
                      log.type === 'Saída' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {log.type === 'Entrada' ? <ArrowUpRight size={12} /> : 
                       log.type === 'Saída' ? <ArrowDownLeft size={12} /> : <AlertTriangle size={12} />}
                      {log.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "font-black",
                      log.type === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {log.type === 'Entrada' ? '+' : '-'}{log.quantity}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-bold text-slate-900 dark:text-white">{log.resulting_stock}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-slate-500 dark:text-slate-400 font-medium italic">{log.notes || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-100 dark:border-slate-800">
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <td colSpan={3} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Totais de Movimentação</td>
                <td className="px-8 py-6 font-black">
                  <div className="flex flex-col gap-1">
                    <span className="text-emerald-600">+{filteredLogs.filter(l => l.type === 'Entrada').reduce((sum, l) => sum + Number(l.quantity || 0), 0)}</span>
                    <span className="text-rose-600">-{filteredLogs.filter(l => l.type === 'Saída').reduce((sum, l) => sum + Number(l.quantity || 0), 0)}</span>
                  </div>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map(log => (
            <div key={log.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Calendar size={12} />
                  {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1",
                  log.type === 'Entrada' ? "bg-emerald-100 text-emerald-600" : 
                  log.type === 'Saída' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                )}>
                  {log.type}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 dark:text-white truncate">{log.product_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 italic truncate">{log.notes || 'Sem observação'}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-black text-sm",
                    log.type === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {log.type === 'Entrada' ? '+' : '-'}{log.quantity}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Final: {log.resulting_stock}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
