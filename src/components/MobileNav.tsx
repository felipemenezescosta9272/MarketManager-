import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  LogOut,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Store,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { User } from '../types';

interface MobileNavProps {
  user: User | null;
  onLogout: () => void;
  onOpenMenu?: () => void;
}

export default function MobileNav({ user, onLogout, onOpenMenu }: MobileNavProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'pos', label: 'PDV', icon: ShoppingCart, path: '/pos' },
    { id: 'products', label: 'Produtos', icon: Package, path: '/products' },
    { id: 'shopping_list', label: 'Lista', icon: ClipboardList, path: '/shopping-list' },
    { id: 'bills', label: 'Financeiro', icon: DollarSign, path: '/financial' },
  ];

  const adminItems = [
    { id: 'tenants', label: 'Lojas', icon: Store, path: '/admin/tenants' },
    { id: 'users_admin', label: 'Usuários', icon: ShieldCheck, path: '/admin/users' },
  ];

  const displayItems = user?.is_super_admin ? adminItems : menuItems;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center shadow-lg text-slate-500 dark:text-slate-400 z-10"
        >
          {isMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <motion.nav 
          initial={false}
          animate={{ 
            height: isMinimized ? '48px' : 'auto',
            opacity: 1,
            y: 0
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 50) setIsMinimized(true);
            if (info.offset.y < -50) setIsMinimized(false);
          }}
          className={cn(
            "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all touch-none",
            isMinimized ? "px-6 py-2" : "px-3 py-3"
          )}
        >
          {/* Drag Handle Visual */}
          {!isMinimized && (
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-3 opacity-50" />
          )}

          <div className={cn(
            "flex items-center justify-around",
            isMinimized ? "gap-2" : "gap-2"
          )}>
            {displayItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center transition-all relative",
                  isMinimized ? "w-8 h-8" : "flex-1 py-3 px-1 rounded-2xl",
                  isActive 
                    ? (user?.is_super_admin ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600")
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={isMinimized ? 18 : 22} className={cn("transition-transform", isActive && !isMinimized && "scale-110")} />
                    {!isMinimized && (
                      <span className="text-[8px] font-black uppercase tracking-tighter mt-1.5 whitespace-nowrap">{item.label}</span>
                    )}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className={cn(
                          "absolute -bottom-1 w-1 h-1 rounded-full",
                          user?.is_super_admin ? "bg-purple-600" : "bg-amber-600"
                        )}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            
            {!isMinimized && (
              <button
                onClick={onOpenMenu}
                className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <Menu size={22} />
                <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Menu</span>
              </button>
            )}

            {!isMinimized && (
              <button
                onClick={onLogout}
                className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-rose-500"
              >
                <LogOut size={22} />
                <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Sair</span>
              </button>
            )}
          </div>
        </motion.nav>
      </div>
    </div>
  );
}
