import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Menu,
  ChevronLeft,
  Search, 
  Bell, 
  User as UserIcon, 
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  LogOut,
  AlertTriangle,
  DollarSign,
  Calendar,
  X,
  Package,
  Clock,
  ExternalLink,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { User, Product, Bill, Batch } from '../types';
import { parseISO, differenceInDays, format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  user: User | null;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  onLogout: () => void;
  products: Product[];
  bills: Bill[];
  batches: Batch[];
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Header({ 
  user, 
  theme, 
  setTheme, 
  onLogout,
  products = [],
  bills = [],
  batches = [],
  onToggleSidebar,
  isSidebarCollapsed
}: HeaderProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close notifications and search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return { products: [], bills: [], batches: [] };
    
    const term = searchTerm.toLowerCase();
    
    return {
      products: products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.barcode.includes(term) || 
        p.category.toLowerCase().includes(term)
      ).slice(0, 5),
      bills: bills.filter(b => 
        b.description.toLowerCase().includes(term) || 
        b.category.toLowerCase().includes(term) ||
        b.supplier_name?.toLowerCase().includes(term)
      ).slice(0, 5),
      batches: batches.filter(batch => 
        batch.product_name.toLowerCase().includes(term)
      ).slice(0, 5)
    };
  }, [searchTerm, products, bills, batches]);

  const hasSearchResults = searchResults.products.length > 0 || 
                         searchResults.bills.length > 0 || 
                         searchResults.batches.length > 0;

  const notifications = useMemo(() => {
    const list: any[] = [];
    const now = new Date();

    // 1. Low Stock
    products.forEach(p => {
      if (p.stock_quantity <= p.min_stock_level) {
        list.push({
          id: `stock-${p.id}`,
          type: 'stock',
          title: 'Estoque Baixo',
          message: `O produto "${p.name}" está com apenas ${p.stock_quantity} unidades.`,
          date: new Date(),
          icon: Package,
          color: 'text-rose-500',
          bgColor: 'bg-rose-50 dark:bg-rose-500/10',
          link: '/products'
        });
      }
    });

    // 2. Bills Due
    bills.forEach(b => {
      if (b.status === 'Pendente') {
        const dueDate = parseISO(b.due_date);
        const daysDiff = differenceInDays(dueDate, now);
        
        if (daysDiff <= 3) {
          list.push({
            id: `bill-${b.id}`,
            type: 'bill',
            title: daysDiff < 0 ? 'Boleto Vencido' : daysDiff === 0 ? 'Boleto Vence Hoje' : 'Boleto Próximo ao Vencimento',
            message: `A conta "${b.description}" de R$ ${Number(b.amount).toFixed(2)} vence ${daysDiff === 0 ? 'hoje' : daysDiff < 0 ? 'há ' + Math.abs(daysDiff) + ' dias' : 'em ' + daysDiff + ' dias'}.`,
            date: dueDate,
            icon: DollarSign,
            color: daysDiff < 0 ? 'text-rose-600' : 'text-amber-600',
            bgColor: daysDiff < 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
            link: '/financial'
          });
        }
      }
    });

    // 3. Expiry
    batches.forEach(batch => {
      const expiryDate = parseISO(batch.expiry_date);
      const daysDiff = differenceInDays(expiryDate, now);

      if (daysDiff <= 7) {
        list.push({
          id: `expiry-${batch.id}`,
          type: 'expiry',
          title: daysDiff < 0 ? 'Produto Vencido' : 'Produto Próximo ao Vencimento',
          message: `O lote de "${batch.product_name}" vence ${daysDiff === 0 ? 'hoje' : daysDiff < 0 ? 'há ' + Math.abs(daysDiff) + ' dias' : 'em ' + daysDiff + ' dias'}.`,
          date: expiryDate,
          icon: Calendar,
          color: daysDiff < 0 ? 'text-rose-600' : 'text-orange-500',
          bgColor: daysDiff < 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-orange-50 dark:bg-orange-500/10',
          link: '/expiry'
        });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [products, bills, batches]);

  return (
    <header className={cn(
      "w-full h-16 sm:h-20 lg:h-24 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-8 lg:px-12 sticky top-0 transition-all",
      (showNotifications || showUserMenu) 
        ? "z-[110] bg-white dark:bg-slate-900" 
        : "z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md"
    )}>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 lg:p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl lg:rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group"
            title={isSidebarCollapsed ? "Mostrar Menu" : "Recolher Menu"}
          >
            <div className="lg:hidden">
              <Menu size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="hidden lg:block">
              {isSidebarCollapsed ? (
                <Menu size={20} className="group-hover:scale-110 transition-transform" />
              ) : (
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              )}
            </div>
          </button>
        )}
        <div className="flex-1 max-w-xl relative group hidden sm:block" ref={searchRef}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Buscar produtos, contas ou lotes..." 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => setShowSearchResults(true)}
          className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white focus:ring-2 ring-amber-500/20 transition-all"
        />

        <AnimatePresence>
          {showSearchResults && searchTerm.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50"
            >
              {!hasSearchResults ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum resultado encontrado</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {searchResults.products.length > 0 && (
                    <div className="mb-4">
                      <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</p>
                      {searchResults.products.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate('/products');
                            setShowSearchResults(false);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 transition-colors">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.category} • R$ {p.price.toFixed(2)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.bills.length > 0 && (
                    <div className="mb-4">
                      <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</p>
                      {searchResults.bills.map(b => (
                        <button
                          key={b.id}
                          onClick={() => {
                            navigate('/financial');
                            setShowSearchResults(false);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{b.description}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{b.status} • R$ {b.amount.toFixed(2)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.batches.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lotes / Validade</p>
                      {searchResults.batches.map(batch => (
                        <button
                          key={batch.id}
                          onClick={() => {
                            navigate('/expiry');
                            setShowSearchResults(false);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 transition-colors">{batch.product_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vence em {format(parseISO(batch.expiry_date), 'dd/MM/yyyy')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    <div className="flex items-center gap-2 sm:gap-6 ml-auto sm:ml-0 flex-shrink-0">
        <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 scale-90 sm:scale-100">
          <button 
            onClick={() => setTheme('light')}
            className={cn("p-2 rounded-lg transition-all", theme === 'light' ? "bg-white dark:bg-slate-700 shadow-sm text-amber-600" : "text-slate-400")}
          >
            <Sun size={18} />
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={cn("p-2 rounded-lg transition-all", theme === 'dark' ? "bg-white dark:bg-slate-700 shadow-sm text-amber-600" : "text-slate-400")}
          >
            <Moon size={18} />
          </button>
          <button 
            onClick={() => setTheme('system')}
            className={cn("p-2 rounded-lg transition-all", theme === 'system' ? "bg-white dark:bg-slate-700 shadow-sm text-amber-600" : "text-slate-400")}
          >
            <Monitor size={18} />
          </button>
        </div>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "relative p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-all",
              showNotifications ? "text-amber-600 ring-2 ring-amber-500/20" : "text-slate-400 hover:text-amber-600",
              notifications.length > 0 && !showNotifications && "animate-pulse border-2 border-amber-500/50"
            )}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-3 right-3 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                {notifications.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                {/* Mobile Backdrop */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowNotifications(false)}
                  className="sm:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90]"
                />
                
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-4 w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[100] flex flex-col max-h-[85vh]"
                >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Notificações</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black rounded-lg">
                      {notifications.length} ALERTAS
                    </span>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="sm:hidden p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 pb-20 sm:pb-0">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={32} />
                      </div>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Tudo em dia!</p>
                      <p className="text-slate-400 text-[10px] mt-1">Nenhum alerta pendente no momento.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          navigate(notif.link);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", notif.bgColor)}>
                            <notif.icon className={notif.color} size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={cn("text-xs font-black uppercase tracking-widest", notif.color)}>{notif.title}</p>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock size={10} />
                                {format(notif.date, "dd/MM", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-base sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight mb-2">{notif.message}</p>
                            <div className="flex items-center gap-1 text-[11px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              Ver Detalhes <ExternalLink size={12} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-widest transition-colors"
                    >
                      Fechar Notificações
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 pl-6 border-l border-slate-100 dark:border-slate-800 relative" ref={userMenuRef}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.name}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{user?.role}</p>
          </div>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700",
              showUserMenu ? "text-amber-600 ring-2 ring-amber-500/20" : "text-slate-400 hover:text-amber-600"
            )}
          >
            <UserIcon size={24} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                {/* Mobile Backdrop */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowUserMenu(false)}
                  className="sm:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
                />

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-4 w-auto sm:w-72 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[100]"
                >
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-3xl flex items-center justify-center text-amber-600 mb-4">
                      <UserCircle size={40} />
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{user?.name}</p>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">{user?.role}</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <button 
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                        <UserIcon size={20} />
                      </div>
                      <span className="text-sm">Meu Perfil</span>
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-rose-500/20 transition-colors">
                        <LogOut size={20} />
                      </div>
                      <span className="text-sm">Sair do Sistema</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
