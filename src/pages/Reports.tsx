import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  ChevronRight,
  Calendar,
  Filter,
  Eye,
  X,
  BarChart,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportsProps {
  sales: any[];
  products: any[];
  customers: any[];
  bills: any[];
  onAnalyze?: (type?: string) => Promise<void>;
  isAnalyzing?: boolean;
  aiInsights?: string;
}

export default function Reports({ sales, products, customers, bills, onAnalyze, isAnalyzing, aiInsights }: ReportsProps) {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const location = useLocation();

  const filterDataByDate = (data: any[]) => {
    const now = new Date();
    const rangeDate = new Date();
    
    if (dateRange === 'week') rangeDate.setDate(now.getDate() - 7);
    else if (dateRange === 'month') rangeDate.setMonth(now.getMonth() - 1);
    else if (dateRange === 'year') rangeDate.setFullYear(now.getFullYear() - 1);
    
    return data.filter(item => {
      const itemDate = new Date(item.created_at || item.due_date || now);
      return itemDate >= rangeDate;
    });
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

  const reportTypes = [
    {
      id: 'sales',
      title: 'Relatório de Vendas',
      description: 'Análise detalhada de faturamento, ticket médio e produtos mais vendidos.',
      icon: DollarSign,
      color: 'bg-emerald-100 text-emerald-600',
      stats: 'R$ ' + filterDataByDate(sales).reduce((sum, s) => sum + Number(s.total_amount), 0).toFixed(2),
      profit: 'Lucro: R$ ' + filterDataByDate(sales).reduce((sum, s) => sum + Number(s.profit || 0), 0).toFixed(2),
      data: filterDataByDate(sales)
    },
    {
      id: 'top_products',
      title: 'Produtos Mais Vendidos',
      description: 'Ranking dos produtos com maior volume de vendas no período selecionado.',
      icon: TrendingUp,
      color: 'bg-amber-100 text-amber-600',
      stats: 'Análise de Giro',
      data: (() => {
        const filteredSales = filterDataByDate(sales);
        const productMap: { [key: string]: any } = {};
        
        filteredSales.forEach(sale => {
          sale.items?.forEach((item: any) => {
            const id = item.product_id || item.id;
            if (!productMap[id]) {
              productMap[id] = {
                id,
                name: item.product_name || item.name || 'Produto Desconhecido',
                quantity: 0,
                total_revenue: 0,
                total_profit: 0
              };
            }
            productMap[id].quantity += Number(item.quantity || 0);
            productMap[id].total_revenue += (Number(item.quantity || 0) * Number(item.unit_price || item.price || 0));
            productMap[id].total_profit += (Number(item.quantity || 0) * (Number(item.unit_price || item.price || 0) - Number(item.cost_price || 0)));
          });
        });
        
        return Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
      })()
    },
    {
      id: 'inventory',
      title: 'Relatório de Estoque',
      description: 'Posição atual de estoque, produtos com giro baixo e necessidade de reposição.',
      icon: Package,
      color: 'bg-amber-100 text-amber-600',
      stats: products.length + ' itens ativos',
      data: products
    },
    {
      id: 'customers',
      title: 'Relatório de Clientes',
      description: 'Ranking de melhores clientes, frequência de compra e análise de fidelidade.',
      icon: Users,
      color: 'bg-indigo-100 text-indigo-600',
      stats: customers.length + ' cadastrados',
      data: customers
    },
    {
      id: 'financial',
      title: 'Relatório Financeiro',
      description: 'Fluxo de caixa, contas pagas vs pendentes e análise de despesas.',
      icon: FileText,
      color: 'bg-rose-100 text-rose-600',
      stats: filterDataByDate(bills).length + ' lançamentos',
      data: filterDataByDate(bills)
    },
    {
      id: 'custom',
      title: 'Relatório Customizado',
      description: 'Crie seu próprio relatório selecionando as colunas e filtros desejados.',
      icon: Filter,
      color: 'bg-slate-100 text-slate-600',
      stats: 'Construtor Ativo',
      data: []
    }
  ];

  useEffect(() => {
    if (location.state?.reportId) {
      const report = reportTypes.find(r => r.id === location.state.reportId);
      if (report) setSelectedReport(report);
    }
  }, [location.state, sales, products, customers, bills]);

  const [customConfig, setCustomConfig] = useState<any>({
    entity: 'sales',
    fields: ['created_at', 'customer_name', 'total_amount']
  });

  const availableFields: any = {
    sales: [
      { id: 'created_at', label: 'Data' },
      { id: 'customer_name', label: 'Cliente' },
      { id: 'payment_method', label: 'Pagamento' },
      { id: 'total_amount', label: 'Total' },
      { id: 'profit', label: 'Lucro' },
      { id: 'discount', label: 'Desconto' },
      { id: 'notes', label: 'Observação' }
    ],
    products: [
      { id: 'name', label: 'Nome' },
      { id: 'sku', label: 'SKU' },
      { id: 'stock_quantity', label: 'Estoque' },
      { id: 'price', label: 'Preço' },
      { id: 'cost_price', label: 'Custo' },
      { id: 'category', label: 'Categoria' }
    ],
    customers: [
      { id: 'name', label: 'Nome' },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'Telefone' },
      { id: 'address', label: 'Endereço' },
      { id: 'created_at', label: 'Cadastro' }
    ]
  };

  const getCustomData = () => {
    let baseData = [];
    if (customConfig.entity === 'sales') baseData = filterDataByDate(sales);
    else if (customConfig.entity === 'products') baseData = products;
    else if (customConfig.entity === 'customers') baseData = customers;
    return baseData;
  };

  const generatePDF = (report: any) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text(report.title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${date}`, 14, 30);

    if (report.id === 'sales') {
      const tableData = report.data.map((s: any) => {
        const date = new Date(s.created_at);
        const itemCount = s.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          s.customer_name || 'Consumidor',
          `${itemCount} itens`,
          formatPaymentMethod(s.payment_method),
          s.notes || '-',
          `R$ ${Number(s.total_amount || 0).toFixed(2)}`,
          `R$ ${Number(s.profit || 0).toFixed(2)}`
        ];
      });
      autoTable(doc, {
        startY: 40,
        head: [['Data', 'Horário', 'Cliente', 'Itens', 'Pagamento', 'Obs', 'Total', 'Lucro']],
        body: tableData,
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      const totalRevenue = report.data.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
      const totalProfit = report.data.reduce((sum: number, s: any) => sum + Number(s.profit || 0), 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL VENDAS: R$ ${totalRevenue.toFixed(2)}`, 14, finalY + 10);
      doc.text(`LUCRO TOTAL: R$ ${totalProfit.toFixed(2)}`, 14, finalY + 16);
    } else if (report.id === 'top_products') {
      const tableData = report.data.map((p: any, i: number) => [
        i + 1,
        p.name,
        p.quantity,
        `R$ ${p.total_revenue.toFixed(2)}`,
        `R$ ${p.total_profit.toFixed(2)}`
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Posição', 'Produto', 'Qtd Vendida', 'Receita Total', 'Lucro Total']],
        body: tableData,
        headStyles: { fillColor: [245, 158, 11] }
      });
    } else if (report.id === 'inventory') {
      const tableData = report.data.map((p: any) => [
        p.name,
        p.sku || '-',
        Number(p.stock_quantity || 0),
        `R$ ${Number(p.price || 0).toFixed(2)}`
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Produto', 'SKU', 'Estoque', 'Preço']],
        body: tableData,
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      const totalStock = report.data.reduce((sum: number, p: any) => sum + Number(p.stock_quantity || 0), 0);
      const totalValue = report.data.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity || 0) * Number(p.price || 0)), 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL ITENS EM ESTOQUE: ${totalStock}`, 14, finalY + 10);
      doc.text(`VALOR TOTAL EM ESTOQUE: R$ ${totalValue.toFixed(2)}`, 14, finalY + 16);
    } else if (report.id === 'customers') {
      const tableData = report.data.map((c: any) => [
        c.name,
        c.email || '-',
        c.phone || '-',
        new Date(c.created_at || new Date()).toLocaleDateString()
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Nome', 'Email', 'Telefone', 'Cadastro']],
        body: tableData,
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL DE CLIENTES: ${report.data.length}`, 14, finalY + 10);
    } else if (report.id === 'financial') {
      const tableData = report.data.map((b: any) => [
        b.description,
        b.supplier_name || '-',
        new Date(b.due_date || new Date()).toLocaleDateString(),
        `R$ ${Number(b.amount || 0).toFixed(2)}`,
        b.status === 'Pago' ? 'Pago' : 'Pendente'
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Descrição', 'Fornecedor', 'Vencimento', 'Valor', 'Status']],
        body: tableData,
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      const totalAmount = report.data.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      const totalPaid = report.data.filter((b: any) => b.status === 'Pago').reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      const totalPending = report.data.filter((b: any) => b.status !== 'Pago').reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`VALOR TOTAL: R$ ${totalAmount.toFixed(2)}`, 14, finalY + 10);
      doc.text(`TOTAL PAGO: R$ ${totalPaid.toFixed(2)}`, 14, finalY + 16);
      doc.text(`TOTAL PENDENTE: R$ ${totalPending.toFixed(2)}`, 14, finalY + 22);
    } else if (report.id === 'custom') {
      const data = getCustomData();
      const fields = availableFields[customConfig.entity].filter((f: any) => customConfig.fields.includes(f.id));
      const tableData = data.map((item: any) => {
        return fields.map((f: any) => {
          const val = item[f.id];
          if (f.id === 'created_at' || f.id === 'due_date') return new Date(val || new Date()).toLocaleDateString();
          if (f.id === 'total_amount' || f.id === 'price' || f.id === 'cost_price' || f.id === 'profit' || f.id === 'amount') return `R$ ${Number(val || 0).toFixed(2)}`;
          if (f.id === 'payment_method') return formatPaymentMethod(val);
          return val || '-';
        });
      });
      autoTable(doc, {
        startY: 40,
        head: [fields.map((f: any) => f.label)],
        body: tableData,
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      
      let offset = 10;
      fields.forEach((f: any) => {
        if (['total_amount', 'price', 'cost_price', 'profit', 'amount', 'stock_quantity'].includes(f.id)) {
          const total = data.reduce((sum: number, item: any) => sum + Number(item[f.id] || 0), 0);
          const label = f.id === 'stock_quantity' ? `TOTAL ${f.label.toUpperCase()}: ${total}` : `TOTAL ${f.label.toUpperCase()}: R$ ${total.toFixed(2)}`;
          doc.text(label, 14, finalY + offset);
          offset += 6;
        }
      });
      
      if (offset === 10) {
        doc.text(`TOTAL DE REGISTROS: ${data.length}`, 14, finalY + 10);
      }
    }

    doc.save(`${report.id}-report-${date.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Centro de Relatórios</h2>
          <p className="text-slate-500 font-medium mt-1">Gere insights e documentos para tomada de decisão.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                  dateRange === range 
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportTypes.map((report, idx) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex items-start justify-between mb-8">
              <div className={cn("p-4 rounded-[1.5rem]", report.color)}>
                <report.icon size={32} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo Atual</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{report.stats}</p>
                {report.profit && (
                  <p className="text-xs font-bold text-emerald-600 mt-1">{report.profit}</p>
                )}
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{report.title}</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{report.description}</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => generatePDF(report)}
                className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all"
              >
                <Download size={18} /> GERAR PDF
              </button>
              <button 
                onClick={() => setSelectedReport(report)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <BarChart size={18} /> VER DETALHES
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedReport(null)} 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[80vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", selectedReport.color)}>
                    <selectedReport.icon size={24} />
                  </div>
                  <h2 className="text-2xl font-black">{selectedReport.title}</h2>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {selectedReport.id === 'custom' && (
                <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Entidade</label>
                      <select 
                        value={customConfig.entity}
                        onChange={(e) => setCustomConfig({ ...customConfig, entity: e.target.value, fields: availableFields[e.target.value].slice(0, 3).map((f: any) => f.id) })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold"
                      >
                        <option value="sales">Vendas</option>
                        <option value="products">Produtos</option>
                        <option value="customers">Clientes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Colunas</label>
                      <div className="flex flex-wrap gap-2">
                        {availableFields[customConfig.entity].map((f: any) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              const newFields = customConfig.fields.includes(f.id)
                                ? customConfig.fields.filter((id: string) => id !== f.id)
                                : [...customConfig.fields, f.id];
                              setCustomConfig({ ...customConfig, fields: newFields });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                              customConfig.fields.includes(f.id)
                                ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto p-8">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                      {selectedReport.id === 'sales' && (
                        <>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Data</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Horário</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Cliente</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Pagamento</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Total</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Lucro</th>
                        </>
                      )}
                      {selectedReport.id === 'top_products' && (
                        <>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Posição</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Produto</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Qtd Vendida</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Receita</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Lucro</th>
                        </>
                      )}
                      {selectedReport.id === 'inventory' && (
                        <>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Produto</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">SKU</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Estoque</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Preço</th>
                        </>
                      )}
                      {selectedReport.id === 'customers' && (
                        <>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Nome</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Email</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Telefone</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Cadastro</th>
                        </>
                      )}
                      {selectedReport.id === 'financial' && (
                        <>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Descrição</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Vencimento</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Valor</th>
                          <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Status</th>
                        </>
                      )}
                      {selectedReport.id === 'custom' && (
                        <>
                          {availableFields[customConfig.entity].filter((f: any) => customConfig.fields.includes(f.id)).map((f: any) => (
                            <th key={f.id} className="pb-4 font-black uppercase text-[10px] tracking-widest text-slate-400">{f.label}</th>
                          ))}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {(selectedReport.id === 'custom' ? getCustomData() : selectedReport.data).map((item: any, idx: number) => (
                      <tr key={idx} className="group">
                        {selectedReport.id === 'sales' && (
                          <>
                            <td className="py-4 font-bold text-slate-600 dark:text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                            <td className="py-4 font-bold text-slate-600 dark:text-slate-400">{new Date(item.created_at).toLocaleTimeString()}</td>
                            <td className="py-4 font-black text-slate-900 dark:text-white">{item.customer_name || 'Consumidor'}</td>
                            <td className="py-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{formatPaymentMethod(item.payment_method)}</td>
                            <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {Number(item.total_amount).toFixed(2)}</td>
                            <td className="py-4 text-right font-black text-emerald-600">R$ {Number(item.profit || 0).toFixed(2)}</td>
                          </>
                        )}
                        {selectedReport.id === 'top_products' && (
                          <>
                            <td className="py-4 font-black text-slate-400">#{idx + 1}</td>
                            <td className="py-4 font-black text-slate-900 dark:text-white">{item.name}</td>
                            <td className="py-4 font-bold text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {item.total_revenue.toFixed(2)}</td>
                            <td className="py-4 text-right font-black text-emerald-600">R$ {item.total_profit.toFixed(2)}</td>
                          </>
                        )}
                        {selectedReport.id === 'inventory' && (
                          <>
                            <td className="py-4 font-black text-slate-900 dark:text-white">{item.name}</td>
                            <td className="py-4 font-bold text-slate-500">{item.sku || '-'}</td>
                            <td className="py-4 font-bold text-slate-600">{item.stock_quantity}</td>
                            <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {Number(item.price).toFixed(2)}</td>
                          </>
                        )}
                        {selectedReport.id === 'customers' && (
                          <>
                            <td className="py-4 font-black text-slate-900 dark:text-white">{item.name}</td>
                            <td className="py-4 font-bold text-slate-500">{item.email || '-'}</td>
                            <td className="py-4 font-bold text-slate-600">{item.phone || '-'}</td>
                            <td className="py-4 text-right font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                          </>
                        )}
                        {selectedReport.id === 'financial' && (
                          <>
                            <td className="py-4 font-black text-slate-900 dark:text-white">{item.description}</td>
                            <td className="py-4 font-bold text-slate-500">{new Date(item.due_date).toLocaleDateString()}</td>
                            <td className="py-4 font-black text-rose-600">R$ {Number(item.amount).toFixed(2)}</td>
                            <td className="py-4 text-right">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                item.status === 'Pago' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                              )}>
                                {item.status === 'Pago' ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                          </>
                        )}
                        {selectedReport.id === 'custom' && (
                          <>
                            {availableFields[customConfig.entity].filter((f: any) => customConfig.fields.includes(f.id)).map((f: any) => {
                              const val = item[f.id];
                              let displayVal = val || '-';
                              if (f.id === 'created_at' || f.id === 'due_date') displayVal = new Date(val).toLocaleDateString();
                              if (f.id === 'total_amount' || f.id === 'price' || f.id === 'cost_price' || f.id === 'profit' || f.id === 'amount') displayVal = `R$ ${Number(val || 0).toFixed(2)}`;
                              if (f.id === 'payment_method') displayVal = formatPaymentMethod(val);
                              
                              return (
                                <td key={f.id} className="py-4 font-bold text-slate-600 dark:text-slate-400">
                                  {displayVal}
                                </td>
                              );
                            })}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-700">
                    {selectedReport.id === 'sales' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={4} className="py-4 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Totais</td>
                        <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {selectedReport.data.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0).toFixed(2)}</td>
                        <td className="py-4 text-right font-black text-emerald-600">R$ {selectedReport.data.reduce((sum: number, s: any) => sum + Number(s.profit || 0), 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedReport.id === 'top_products' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={3} className="py-4 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Totais</td>
                        <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {selectedReport.data.reduce((sum: number, p: any) => sum + p.total_revenue, 0).toFixed(2)}</td>
                        <td className="py-4 text-right font-black text-emerald-600">R$ {selectedReport.data.reduce((sum: number, p: any) => sum + p.total_profit, 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedReport.id === 'inventory' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={2} className="py-4 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Totais</td>
                        <td className="py-4 font-black text-slate-900 dark:text-white">{selectedReport.data.reduce((sum: number, p: any) => sum + Number(p.stock_quantity || 0), 0)}</td>
                        <td className="py-4 text-right font-black text-slate-900 dark:text-white">R$ {selectedReport.data.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity || 0) * Number(p.price || 0)), 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedReport.id === 'customers' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={3} className="py-4 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Total de Clientes</td>
                        <td className="py-4 text-right font-black text-slate-900 dark:text-white">{selectedReport.data.length}</td>
                      </tr>
                    )}
                    {selectedReport.id === 'financial' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={2} className="py-4 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Total</td>
                        <td className="py-4 font-black text-rose-600">R$ {selectedReport.data.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0).toFixed(2)}</td>
                        <td className="py-4 text-right"></td>
                      </tr>
                    )}
                    {selectedReport.id === 'custom' && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        {availableFields[customConfig.entity].filter((f: any) => customConfig.fields.includes(f.id)).map((f: any, i: number) => {
                          const isNumeric = ['total_amount', 'price', 'cost_price', 'profit', 'amount', 'stock_quantity'].includes(f.id);
                          if (isNumeric) {
                            const total = getCustomData().reduce((sum: number, item: any) => sum + Number(item[f.id] || 0), 0);
                            return (
                              <td key={f.id} className="py-4 font-black text-slate-900 dark:text-white">
                                {f.id === 'stock_quantity' ? total : `R$ ${total.toFixed(2)}`}
                              </td>
                            );
                          }
                          return <td key={f.id} className="py-4 font-black text-slate-400 uppercase text-[8px] tracking-widest">{i === 0 ? 'Totais' : ''}</td>;
                        })}
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Sparkles size={24} className="text-slate-900" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Consultoria IA</h3>
              </div>
              <p className="text-slate-400 text-lg font-medium">
                Selecione uma estratégia abaixo para receber insights personalizados baseados nos dados do seu mercado.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'ticket_average', label: 'Ticket Médio', icon: DollarSign },
                { id: 'stock_optimization', label: 'Estoque', icon: Package },
                { id: 'customer_loyalty', label: 'Fidelização', icon: Users },
                { id: 'promotions', label: 'Promoções', icon: TrendingUp }
              ].map((strat) => (
                <button
                  key={strat.id}
                  onClick={() => onAnalyze?.(strat.id)}
                  disabled={isAnalyzing}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-3 border border-white/10 disabled:opacity-50"
                >
                  <strat.icon size={16} />
                  {strat.label}
                </button>
              ))}
            </div>
          </div>

          {aiInsights ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} className="text-amber-200" />
                <h4 className="text-xl font-black">Estratégia Recomendada</h4>
              </div>
              <div className="prose prose-invert max-w-none">
                <div className="text-amber-50 font-medium leading-relaxed block markdown-container">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto w-full my-4 no-scrollbar">
                          <table {...props} />
                        </div>
                      )
                    }}
                  >
                    {aiInsights}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Aguardando seleção de estratégia...</p>
            </div>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/20 rounded-full -ml-24 -mb-24 blur-2xl" />
      </div>
    </div>
  );
}
