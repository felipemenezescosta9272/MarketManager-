import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { cn } from '../utils';

interface DashboardProps {
  stats: any;
  dashboardConfig: any;
  aiInsights: string;
  onAnalyze: (type?: string) => void;
  isAnalyzing: boolean;
  cashSession: any;
  onOpenCash: (val: number) => Promise<void>;
  onCloseCash: (id: number, val: number) => Promise<void>;
  statsPeriod: number;
  onStatsPeriodChange: (period: number) => void;
}

export default function DashboardView({ 
  stats, 
  dashboardConfig, 
  aiInsights, 
  onAnalyze, 
  isAnalyzing,
  cashSession,
  onOpenCash,
  onCloseCash,
  statsPeriod,
  onStatsPeriodChange
}: DashboardProps) {
  const navigate = useNavigate();
  const [showOpenModal, setShowOpenModal] = React.useState(false);
  const [showCloseModal, setShowCloseModal] = React.useState(false);
  const [cashValue, setCashValue] = React.useState('0');

  const statCards = [
    { 
      id: 'showSalesToday', 
      label: 'Vendas Hoje', 
      value: `R$ ${(stats?.todayRevenue || 0).toFixed(2)}`, 
      icon: DollarSign, 
      color: 'bg-emerald-500', 
      trend: '+12.5%' 
    },
    { 
      id: 'showProfitToday', 
      label: 'Lucro Hoje', 
      value: `R$ ${(stats?.todayProfit || 0).toFixed(2)}`, 
      icon: TrendingUp, 
      color: 'bg-emerald-600', 
      trend: stats?.todayRevenue > 0 ? `${((stats.todayProfit / stats.todayRevenue) * 100).toFixed(1)}% margem` : '0% margem' 
    },
    { 
      id: 'showPendingBills', 
      label: 'Contas a Pagar', 
      value: `R$ ${(stats?.totalPendingBills || 0).toFixed(2)}`, 
      icon: TrendingUp, 
      color: 'bg-rose-500', 
      trend: 'pendentes' 
    },
    { 
      id: 'showLowStock', 
      label: 'Estoque Baixo', 
      value: `${stats?.lowStockCount || 0} itens`, 
      icon: Package, 
      color: 'bg-amber-500', 
      trend: 'Reposição necessária' 
    },
    { 
      id: 'showExpiryAlerts', 
      label: 'Vencimento Próximo', 
      value: `${stats?.expiryAlertsCount || 0} lotes`, 
      icon: AlertTriangle, 
      color: 'bg-orange-500', 
      trend: 'Próximos 30 dias' 
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Olá, Bem-vindo de volta!</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Aqui está o que está acontecendo no seu mercado hoje.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => onAnalyze('general')}
            disabled={isAnalyzing}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            <Sparkles size={20} className={cn(isAnalyzing && "animate-pulse")} />
            {isAnalyzing ? 'ANALISANDO...' : 'INSIGHTS GERAIS'}
          </button>
        </div>
      </div>

      {/* AI Sales Strategies */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Estratégias de Vendas (IA)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'ticket_average', label: 'Aumentar Ticket Médio', color: 'hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600' },
            { id: 'stock_optimization', label: 'Otimizar Estoque', color: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600' },
            { id: 'customer_loyalty', label: 'Fidelizar Clientes', color: 'hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600' },
            { id: 'promotions', label: 'Ideias de Promoções', color: 'hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600' }
          ].map((strat) => (
            <button
              key={strat.id}
              onClick={() => onAnalyze(strat.id)}
              disabled={isAnalyzing}
              className={cn(
                "p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left transition-all group disabled:opacity-50",
                strat.color
              )}
            >
              <p className="font-black text-sm uppercase tracking-tight group-hover:translate-x-1 transition-transform">{strat.label}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Clique para gerar estratégia</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cash Session Status */}
      <div className={cn(
        "p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm",
        cashSession ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20" : "bg-rose-50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20"
      )}>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <div className={cn(
            "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0",
            cashSession ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          )}>
            <DollarSign size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className={cn("text-lg sm:text-xl font-black uppercase tracking-tight", cashSession ? "text-emerald-900 dark:text-emerald-400" : "text-rose-900 dark:text-rose-400")}>
              Status do Caixa: {cashSession ? 'ABERTO' : 'FECHADO'}
            </h3>
            <p className={cn("font-bold text-xs sm:text-sm", cashSession ? "text-emerald-600/70" : "text-rose-600/70")}>
              {cashSession ? `Aberto desde ${new Date(cashSession.opened_at).toLocaleTimeString()}` : 'Abra o caixa para começar a vender'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => cashSession ? setShowCloseModal(true) : setShowOpenModal(true)}
          className={cn(
            "w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-black shadow-xl transition-all hover:scale-105",
            cashSession ? "bg-rose-600 text-white shadow-rose-600/20" : "bg-emerald-600 text-white shadow-emerald-600/20"
          )}
        >
          {cashSession ? 'FECHAR CAIXA' : 'ABRIR CAIXA'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        {statCards.filter(card => dashboardConfig[card.id]).map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-2 sm:mb-6">
              <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
                <card.icon size={20} className="sm:w-7 sm:h-7" />
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.trend}</span>
            </div>
            <h3 className="text-slate-500 font-bold text-[9px] sm:text-sm uppercase tracking-widest mb-1">{card.label}</h3>
            <p className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vendas vs Lucro</h3>
            <select 
              value={statsPeriod}
              onChange={(e) => onStatsPeriodChange(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-[10px] sm:text-xs font-bold outline-none w-full sm:w-auto"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[250px] sm:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-8">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Vendas</span>
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-white">R$ {Number(payload[0].value).toFixed(2)}</span>
                            </div>
                            {payload[1] && (
                              <div className="flex items-center justify-between gap-8">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Lucro</span>
                                </div>
                                <span className="text-xs font-black text-emerald-600">R$ {Number(payload[1].value).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  name="Vendas"
                  stroke="#d97706" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#d97706' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  name="Lucro"
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  height={36}
                  content={({ payload }) => (
                    <div className="flex gap-4 justify-end mb-4">
                      {payload?.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 sm:mb-8">Top Produtos</h3>
          <div className="space-y-4 sm:space-y-6">
            {(stats?.topProducts || []).map((product: any, i: number) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all text-sm">
                  0{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors truncate text-sm sm:text-base">{product.name}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">{product.total_sold} unidades vendidas</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
            <button 
              onClick={() => navigate('/reports', { state: { reportId: 'top_products' } })}
              className="w-full mt-8 sm:mt-10 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest"
            >
              Ver Relatório Completo
            </button>
        </div>
      </div>

      {aiInsights && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 text-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -ml-32 -mb-32 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Sparkles size={20} className="text-slate-900 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight">Estratégia Recomendada</h3>
              </div>
              <button 
                onClick={() => onAnalyze('general')}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                Atualizar Análise
              </button>
            </div>
            <div className="prose prose-invert max-w-none">
              <div className="text-sm sm:text-lg leading-relaxed text-slate-300 font-medium bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 markdown-container">
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
            <div className="mt-8 flex items-center gap-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                IA Ativa
              </div>
              <span>•</span>
              <span>Baseado em dados reais do seu mercado</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl max-w-md w-full">
            <h3 className="text-2xl font-black mb-6">Abrir Caixa</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fundo de Caixa Inicial</label>
                <input 
                  type="number" 
                  value={cashValue}
                  onChange={(e) => setCashValue(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500/20" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowOpenModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl">CANCELAR</button>
                <button onClick={async () => { await onOpenCash(Number(cashValue)); setShowOpenModal(false); }} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20">ABRIR CAIXA</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl max-w-md w-full">
            <h3 className="text-2xl font-black mb-6">Fechar Caixa</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor Final em Dinheiro</label>
                <input 
                  type="number" 
                  value={cashValue}
                  onChange={(e) => setCashValue(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-rose-500/20" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl">CANCELAR</button>
                <button onClick={async () => { await onCloseCash(cashSession.id, Number(cashValue)); setShowCloseModal(false); }} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20">FECHAR CAIXA</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
