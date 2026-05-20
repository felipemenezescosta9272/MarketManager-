import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import AIChat from './AIChat';
import { User, Product, Bill } from '../types';
import { cn } from '../utils';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  products: Product[];
  bills: Bill[];
  batches: any[];
  customers: any[];
  suppliers: any[];
  sales: any[];
  settings: any;
  stats: any;
}

export default function Layout({ 
  user, 
  onLogout, 
  theme, 
  setTheme, 
  products, 
  bills, 
  batches,
  customers,
  suppliers,
  sales,
  settings,
  stats
}: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPOS = location.pathname === '/pos';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isPOS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const routes = [
    '/dashboard',
    '/pos',
    '/orders',
    '/products',
    '/shopping-list',
    '/financial'
  ];

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = routes.indexOf(location.pathname);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < routes.length - 1) {
      navigate(routes[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      navigate(routes[currentIndex - 1]);
    }
  };

  // Auto-collapse sidebar when entering POS
  useEffect(() => {
    if (isPOS) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isPOS]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className={cn(
        "flex-1 flex flex-col min-w-0 pb-16 sm:pb-20 lg:pb-0 landscape:pb-14 transition-all duration-300 relative",
        isSidebarCollapsed ? "lg:ml-0" : ""
      )}>
        <Header 
          user={user} 
          theme={theme} 
          setTheme={setTheme} 
          onLogout={onLogout} 
          products={products}
          bills={bills}
          batches={batches}
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setIsMobileMenuOpen(true);
            } else {
              setIsSidebarCollapsed(!isSidebarCollapsed);
            }
          }}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <motion.main 
          key={location.pathname}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const swipeThreshold = 50;
            if (info.offset.x < -swipeThreshold) {
              handleSwipe('left');
            } else if (info.offset.x > swipeThreshold) {
              handleSwipe('right');
            }
          }}
          className={cn(
            "flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto transition-all duration-300 touch-pan-y",
            isPOS && "p-2 sm:p-4 lg:p-6 flex flex-col overflow-hidden"
          )}
        >
          <Outlet context={{ isSidebarCollapsed, setIsSidebarCollapsed }} />
        </motion.main>

        {/* Mobile Floating Action Button (FAB) for Quick POS */}
        {!isPOS && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/pos')}
            className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-amber-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white dark:border-slate-900"
          >
            <ShoppingCart size={24} />
          </motion.button>
        )}
      </div>
      <MobileNav 
        user={user} 
        onLogout={onLogout} 
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />
      <AIChat 
        products={products} 
        bills={bills} 
        batches={batches} 
        customers={customers}
        suppliers={suppliers}
        sales={sales}
        settings={settings}
        stats={stats}
        user={user}
      />
    </div>
  );
}
