import React from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon,
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  FileText, 
  Settings, 
  LogOut, 
  History,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Store,
  ClipboardList,
  X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ user, onLogout, isCollapsed, onToggle, isMobileOpen, onCloseMobile }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'calendar', label: 'Agenda & Entregas', icon: CalendarIcon, path: '/calendar' },
    { id: 'pos', label: 'Venda (PDV)', icon: ShoppingCart, path: '/pos' },
    { id: 'orders', label: 'Central de Pedidos', icon: ShoppingCart, path: '/orders' },
    { id: 'products', label: 'Produtos', icon: Package, path: '/products' },
    { id: 'expiry', label: 'Validade', icon: AlertTriangle, path: '/expiry' },
    { id: 'sales_history', label: 'Vendas', icon: History, path: '/sales' },
    { id: 'customers', label: 'Clientes', icon: Users, path: '/customers' },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck, path: '/suppliers' },
    { id: 'bills', label: 'Financeiro', icon: DollarSign, path: '/financial' },
    { id: 'shopping_list', label: 'Lista de Compras', icon: ClipboardList, path: '/shopping-list' },
    { id: 'reports', label: 'Relatórios', icon: FileText, path: '/reports' },
    { id: 'settings', label: 'Configurações', icon: Settings, path: '/settings' },
  ];

  const adminItems = [
    { id: 'tenants', label: 'Lojas (SaaS)', icon: Store, path: '/admin/tenants' },
    { id: 'users_admin', label: 'Usuários', icon: ShieldCheck, path: '/admin/users' },
    { id: 'settings_admin', label: 'Configurações', icon: Settings, path: '/settings' },
  ];

  const isAdminRoute = window.location.pathname.startsWith('/admin') || (user?.is_super_admin && window.location.pathname === '/settings');

  const displayItems = user?.is_super_admin ? adminItems : menuItems;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-500 z-[70] shadow-2xl lg:shadow-none",
        isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-0 lg:overflow-hidden lg:border-none lg:opacity-0" : "lg:w-72 lg:opacity-100"
      )}>
        <div className="p-8 flex-1 overflow-y-auto min-w-[18rem]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all",
                user?.is_super_admin ? "bg-purple-600 shadow-purple-600/20" : "bg-amber-600 shadow-amber-600/20"
              )}>
                {user?.is_super_admin ? <ShieldCheck className="text-white" size={24} /> : <Store className="text-white" size={24} />}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {user?.is_super_admin ? 'ADMIN' : 'MARKET'}
                </h1>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  user?.is_super_admin ? "text-purple-600" : "text-amber-600"
                )}>
                  {user?.is_super_admin ? 'Painel SaaS' : 'Manager'}
                </p>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-1">
            {displayItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all group",
                  isActive 
                    ? (user?.is_super_admin ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600")
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive 
                      ? (user?.is_super_admin ? "text-purple-600" : "text-amber-600")
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )} />
                  <span className="text-sm">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  </>
);
}
