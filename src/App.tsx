import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { apiFetch } from './api';
import { 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  Bill, 
  User, 
  Tenant, 
  CashSession 
} from './types';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';
import ConsentBanner from './components/LGPD/ConsentBanner';
import PrivacyPolicy from './components/LGPD/PrivacyPolicy';
import ReceiptPreviewModal from './components/ReceiptPreviewModal';

// Pages
import Login from './pages/Login';
import DashboardView from './components/DashboardView';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Financial from './pages/Financial';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Expiry from './pages/Expiry';
import ShoppingList from './pages/ShoppingList';
import AdminTenants from './pages/AdminTenants';
import AdminUsers from './pages/AdminUsers';
import LandingPage from './pages/LandingPage';
import Orders from './pages/Orders';
import Calendar from './pages/Calendar';

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (!saved || saved === 'undefined') return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [stats, setStats] = useState<any>({
    todayRevenue: 0,
    totalPendingBills: 0,
    lowStockCount: 0,
    expiryAlertsCount: 0,
    salesTrend: [],
    topProducts: []
  });
  const [statsPeriod, setStatsPeriod] = useState(7);
  const [toasts, setToasts] = useState<any[]>([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptSale, setReceiptSale] = useState<any>(null);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as any) || 'system';
  });

  const handleUpdateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (user) {
      try {
        const endpoint = user.is_super_admin ? '/api/admin/settings' : '/api/settings';
        await apiFetch(endpoint, { 
          method: 'POST', 
          body: JSON.stringify({ theme: newTheme }) 
        });
        setSettings((prev: any) => ({ ...prev, theme: newTheme }));
      } catch (err) {
        console.error('Failed to save theme setting:', err);
      }
    }
  };

  // Sync theme with settings
  useEffect(() => {
    if (settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
    if (settings.primary_color) {
      document.documentElement.style.setProperty('--primary-color', settings.primary_color);
      // Generate a slightly darker color for hover
      const hoverColor = settings.primary_color + 'dd'; // Simple alpha-based hover
      document.documentElement.style.setProperty('--primary-hover', hoverColor);
    }
    
    // Apply font size
    if (settings.font_size) {
      const sizes: any = { small: '14px', medium: '16px', large: '18px' };
      document.documentElement.style.setProperty('--font-base-size', sizes[settings.font_size] || '16px');
    }
    
    // Apply interface density
    if (settings.interface_density) {
      document.documentElement.classList.toggle('density-compact', settings.interface_density === 'compact');
    }

    // Apply viewport scaling
    const applyScale = () => {
      let scale = 1;
      if (settings.viewport_scale === 'auto') {
        const width = window.innerWidth;
        if (width < 640) scale = 0.85; // Mobile
        else if (width < 1024) scale = 0.95; // Tablet
        else if (width > 2000) scale = 1.1; // Ultra-wide
        else scale = 1;
      } else if (settings.viewport_scale) {
        scale = parseFloat(settings.viewport_scale) || 1;
      }
      document.documentElement.style.setProperty('--viewport-scale', scale.toString());
    };

    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, [settings.theme, settings.primary_color, settings.font_size, settings.interface_density, settings.viewport_scale]);

  // AI State
  const [aiInsights, setAiInsights] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setIsAuthReady(true);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleEditSale = (e: any) => {
      navigate('/pos', { state: { editSale: e.detail } });
    };

    const handlePrintReceiptEvent = (e: any) => {
      console.log("Recebido print-receipt:", e.detail);
      const sale = e.detail;
      if (!sale) return;

      // We need to make sure we have full items
      const hasFullItems = sale.items && sale.items.length > 0 && (sale.items[0].product_name || sale.items[0].name);
      
      if (!hasFullItems) {
        apiFetch(`/api/sales/${sale.id}`).then(fullSale => {
          setReceiptSale(fullSale);
          setShowReceiptPreview(true);
        }).catch(err => {
          console.error("Error fetching sale for print:", err);
          addToast("Erro ao carregar venda para visualização", "error");
        });
      } else {
        setReceiptSale(sale);
        setShowReceiptPreview(true);
      }
    };

    window.addEventListener('edit-sale', handleEditSale);
    window.addEventListener('print-receipt', handlePrintReceiptEvent);
    return () => {
      window.removeEventListener('edit-sale', handleEditSale);
      window.removeEventListener('print-receipt', handlePrintReceiptEvent);
    };
  }, [navigate]);

  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchAllData = async (currentUser?: User | null) => {
    const activeUser = currentUser !== undefined ? currentUser : user;
    if (!activeUser || isFetching) return;

    // Prevent redundant auto-fetches if we recently fetched data for this user (within 10 seconds)
    const now = Date.now();
    if (!currentUser && activeUser.id === lastFetchedUserId && (now - lastFetchTime < 10000)) {
      setIsAuthReady(true);
      return;
    }

    setIsFetching(true);
    setLastFetchTime(now);
    try {
      const results = await Promise.allSettled([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/suppliers'),
        apiFetch('/api/sales'),
        apiFetch('/api/accounts-payable'),
        apiFetch('/api/cash-flow/current'),
        apiFetch('/api/settings'),
        apiFetch('/api/inventory-logs'),
        apiFetch('/api/batches'),
        apiFetch(`/api/dashboard/stats?days=${statsPeriod}`)
      ]);

      const [
        productsRes,
        customersRes,
        suppliersRes,
        salesRes,
        billsRes,
        cashSessionRes,
        settingsRes,
        logsRes,
        batchesRes,
        statsRes
      ] = results.map(r => r.status === 'fulfilled' ? r.value : null);

      if (productsRes !== null) setProducts(productsRes);
      if (customersRes !== null) setCustomers(customersRes);
      if (suppliersRes !== null) setSuppliers(suppliersRes);
      if (salesRes !== null) setSales(salesRes);
      if (billsRes !== null) setBills(billsRes);
      setCashSession(cashSessionRes);
      if (settingsRes !== null) setSettings(settingsRes);
      if (logsRes !== null) setInventoryLogs(logsRes);
      if (batchesRes !== null) setBatches(batchesRes);
      if (statsRes !== null) setStats(statsRes);
      
      setLastFetchedUserId(activeUser.id);

      if (activeUser.is_super_admin) {
        const adminResults = await Promise.allSettled([
          apiFetch('/api/tenants'),
          apiFetch('/api/admin/users')
        ]);
        const [tenantsRes, usersRes] = adminResults.map(r => r.status === 'fulfilled' ? r.value : null);
        if (tenantsRes !== null) setTenants(tenantsRes);
        if (usersRes !== null) setUsers(usersRes);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        // Handle session errors silently if it's just "User not found"
        if (err.message !== "Usuário não encontrado") {
          console.error('Session error:', err.status, err.message);
        }
        handleLogout();
      } else {
        console.error('Error fetching data:', err);
        if (err.status === 429) {
          addToast("Sistema ocupado. Reduzindo frequência de atualização.", "warning");
        }
      }
    } finally {
      setIsFetching(false);
      setIsAuthReady(true);
    }
  };

  useEffect(() => {
    if (user && isAuthReady && !isFetching) {
      const fetchStatsOnly = async () => {
        try {
          const statsData = await apiFetch(`/api/dashboard/stats?days=${statsPeriod}`);
          setStats(statsData);
        } catch (err: any) {
          if (err.status !== 401 && err.status !== 403) {
            console.error("Error fetching stats:", err);
          }
        }
      };
      fetchStatsOnly();
    }
  }, [statsPeriod]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      // Start fetching data immediately to reduce perceived delay
      // The useEffect will also trigger, but isFetching guard will prevent double call
      fetchAllData(data);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const analyzeBusiness = async (type: string = 'general') => {
    setIsAnalyzing(true);
    try {
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const todayProfit = stats?.todayProfit || 0;
      const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
      const pendingBills = bills.filter(b => b.status === 'Pendente').reduce((sum, b) => sum + Number(b.amount), 0);
      const topProducts = products.sort((a, b) => b.stock_quantity - a.stock_quantity).slice(0, 5).map(p => `${p.name} (Venda: R$ ${p.price}, Custo: R$ ${p.cost_price})`).join(', ');
      const expiryAlerts = batches.filter(b => {
        const days = Math.floor((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days <= 30 && days > 0;
      }).length;
      
      const sessionResponse = await apiFetch('/api/gemini/analyze', {
        method: 'POST',
        body: JSON.stringify({
          type,
          totalSales,
          todayProfit,
          salesCount: sales.length,
          ticketAverage: sales.length > 0 ? totalSales / sales.length : 0,
          marginEstimate: stats?.todayRevenue > 0 ? ((stats.todayProfit / stats.todayRevenue) * 100) : 0,
          lowStockCount,
          expiryAlerts,
          pendingBills,
          topProducts,
          salesTrend: stats?.salesTrend?.slice(-7) || [],
          customersCount: customers.length
        })
      });

      setAiInsights(sessionResponse.text || '');
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      
      let errorMessage = "Falha na análise de IA";
      const errorString = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      
      if (errorString.includes("API key not valid") || errorString.includes("API_KEY_INVALID")) {
        errorMessage = "Chave de API inválida. Por favor, verifique a chave configurada em Configurações > Integração IA.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      addToast(errorMessage, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckout = async (paymentMethod: string, cart: any[], customerId: number | null, discount: number, payments?: any[], notes?: string, changeAmount?: number) => {
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - discount;
      const response = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          total_amount: totalAmount,
          discount,
          payment_method: paymentMethod,
          payments,
          notes,
          change_amount: changeAmount || 0,
          operator_name: user?.name || user?.email || 'Operador',
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            discount: 0,
            notes: item.notes
          }))
        })
      });
      addToast("Venda realizada com sucesso!", "success");
      fetchAllData(user);
      return response;
    } catch (err: any) {
      addToast(err.message || "Erro ao processar venda", "error");
      throw err;
    }
  };

  const handleOpenCashSession = async (initialValue: number) => {
    try {
      await apiFetch('/api/cash-flow/open', {
        method: 'POST',
        body: JSON.stringify({ user_id: user?.id, initial_value: initialValue })
      });
      addToast("Caixa aberto com sucesso!", "success");
      fetchAllData(user);
    } catch (err) {
      addToast("Erro ao abrir caixa", "error");
    }
  };

  const handleCloseCashSession = async (id: number, finalValue: number) => {
    try {
      await apiFetch('/api/cash-flow/close', {
        method: 'POST',
        body: JSON.stringify({ id, final_value: finalValue })
      });
      addToast("Caixa fechado com sucesso!", "success");
      fetchAllData(user);
    } catch (err) {
      addToast("Erro ao fechar caixa", "error");
    }
  };

  const handleUpdateSettings = async (data: any) => {
    const endpoint = user?.is_super_admin ? '/api/admin/settings' : '/api/settings';
    await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) });
    fetchAllData(user);
  };

  // CRUD Handlers
  const crudHandlers = {
    products: {
      add: async (data: any) => { await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
      update: async (id: number, data: any) => { await apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }); fetchAllData(user); },
      delete: async (id: number) => { await apiFetch(`/api/products/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    customers: {
      add: async (data: any) => { await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
      update: async (id: number, data: any) => { await apiFetch(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); fetchAllData(user); },
      delete: async (id: number) => { await apiFetch(`/api/customers/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    suppliers: {
      add: async (data: any) => { await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
      update: async (id: number, data: any) => { await apiFetch(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); fetchAllData(user); },
      delete: async (id: number) => { await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    bills: {
      add: async (data: any) => { await apiFetch('/api/accounts-payable', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
      update: async (id: number, data: any) => { await apiFetch(`/api/accounts-payable/${id}`, { method: 'PUT', body: JSON.stringify(data) }); fetchAllData(user); },
      pay: async (id: number) => { await apiFetch(`/api/accounts-payable/${id}/pay`, { method: 'PATCH' }); fetchAllData(user); },
      delete: async (id: number) => { await apiFetch(`/api/accounts-payable/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    sales: {
      delete: async (id: number) => { await apiFetch(`/api/sales/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    batches: {
      add: async (data: any) => { await apiFetch('/api/batches', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
      delete: async (id: number) => { await apiFetch(`/api/batches/${id}`, { method: 'DELETE' }); fetchAllData(user); }
    },
    admin: {
      tenants: {
        add: async (data: any) => { await apiFetch('/api/tenants', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
        update: async (id: number, data: any) => { await apiFetch(`/api/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); fetchAllData(user); },
        delete: async (id: number) => { await apiFetch(`/api/tenants/${id}`, { method: 'DELETE' }); fetchAllData(user); }
      },
      users: {
        add: async (data: any) => { await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }); fetchAllData(user); },
        update: async (id: number, data: any) => { await apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); fetchAllData(user); },
        delete: async (id: number) => { await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }); fetchAllData(user); }
      }
    }
  };

  const dashboardConfig = (() => {
    const defaults = {
      showSalesToday: true,
      showProfitToday: true,
      showPendingBills: true,
      showLowStock: true,
      showExpiryAlerts: true
    };
    if (!settings.dashboard_config) return defaults;
    try {
      const parsed = typeof settings.dashboard_config === 'string' 
        ? JSON.parse(settings.dashboard_config) 
        : settings.dashboard_config;
      return { ...defaults, ...parsed };
    } catch (e) {
      return defaults;
    }
  })();

  return (
    <>
      <ConsentBanner onShowPolicy={() => setShowPrivacyPolicy(true)} />
      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />}
      
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} isLoading={isLoading} />} />
        
        <Route element={<ProtectedRoute user={user} isAuthReady={isAuthReady} />}>
          <Route element={<Layout 
            user={user} 
            onLogout={handleLogout} 
            theme={theme} 
            setTheme={handleUpdateTheme} 
            products={products}
            bills={bills}
            batches={batches}
            customers={customers}
            suppliers={suppliers}
            sales={sales}
            settings={settings}
            stats={stats}
          />}>
            <Route path="/dashboard" element={
              user?.is_super_admin ? (
                <Navigate to="/admin/tenants" replace />
              ) : (
                <DashboardView 
                  stats={stats} 
                  dashboardConfig={dashboardConfig} 
                  aiInsights={aiInsights} 
                  onAnalyze={analyzeBusiness} 
                  isAnalyzing={isAnalyzing} 
                  cashSession={cashSession}
                  onOpenCash={handleOpenCashSession}
                  onCloseCash={handleCloseCashSession}
                  statsPeriod={statsPeriod}
                  onStatsPeriodChange={setStatsPeriod}
                />
              )
            } />
            <Route path="/pos" element={<POS user={user} products={products} customers={customers} cashSession={cashSession} onCheckout={handleCheckout} onOpenCash={handleOpenCashSession} addToast={addToast} apiFetch={apiFetch} fetchAllData={fetchAllData} settings={settings} onUpdateSettings={handleUpdateSettings} />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/products" element={<Products products={products} suppliers={suppliers} onAddProduct={crudHandlers.products.add} onUpdateProduct={crudHandlers.products.update} onDeleteProduct={crudHandlers.products.delete} addToast={addToast} settings={settings} onUpdateSettings={handleUpdateSettings} />} />
            <Route path="/customers" element={<Customers customers={customers} onAddCustomer={crudHandlers.customers.add} onUpdateCustomer={crudHandlers.customers.update} onDeleteCustomer={crudHandlers.customers.delete} addToast={addToast} />} />
            <Route path="/suppliers" element={<Suppliers suppliers={suppliers} onAddSupplier={crudHandlers.suppliers.add} onUpdateSupplier={crudHandlers.suppliers.update} onDeleteSupplier={crudHandlers.suppliers.delete} addToast={addToast} />} />
            <Route path="/financial" element={<Financial bills={bills} suppliers={suppliers} onAddBill={crudHandlers.bills.add} onUpdateBill={crudHandlers.bills.update} onPayBill={crudHandlers.bills.pay} onDeleteBill={crudHandlers.bills.delete} addToast={addToast} />} />
            <Route path="/expiry" element={<Expiry batches={batches} products={products} onAddBatch={crudHandlers.batches.add} onDeleteBatch={crudHandlers.batches.delete} addToast={addToast} />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/reports" element={<Reports sales={sales} products={products} customers={customers} bills={bills} onAnalyze={analyzeBusiness} isAnalyzing={isAnalyzing} aiInsights={aiInsights} />} />
            <Route path="/settings" element={
              <Settings 
                user={user} 
                settings={settings} 
                theme={theme}
                setTheme={handleUpdateTheme}
                onUpdateSettings={handleUpdateSettings} 
                addToast={addToast} 
              />
            } />
            <Route path="/inventory" element={<Inventory logs={inventoryLogs} products={products} />} />
            <Route path="/sales" element={<Sales sales={sales} onDeleteSale={crudHandlers.sales.delete} addToast={addToast} />} />
            
            {/* Admin Routes */}
            <Route element={<ProtectedRoute user={user} isAuthReady={isAuthReady} requiredAdmin />}>
              <Route path="/admin/tenants" element={<AdminTenants tenants={tenants} onAddTenant={crudHandlers.admin.tenants.add} onUpdateTenant={crudHandlers.admin.tenants.update} onDeleteTenant={crudHandlers.admin.tenants.delete} addToast={addToast} />} />
              <Route path="/admin/users" element={<AdminUsers users={users} tenants={tenants} onAddUser={crudHandlers.admin.users.add} onUpdateUser={crudHandlers.admin.users.update} onDeleteUser={crudHandlers.admin.users.delete} addToast={addToast} />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      
      <ReceiptPreviewModal 
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        sale={receiptSale}
        settings={settings}
      />
    </>
  );
}
