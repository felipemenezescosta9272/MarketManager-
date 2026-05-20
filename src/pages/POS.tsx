import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Menu,
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  User as UserIcon,
  Barcode,
  Camera,
  X,
  CheckCircle2,
  Printer,
  MessageCircle,
  Package,
  LayoutGrid,
  List,
  Table as TableIcon,
  ClipboardList,
  History,
  ArrowLeft,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { Product, Customer, CashSession } from '../types';

import ConfirmationModal from '../components/ConfirmationModal';
import BarcodeScanner from '../components/BarcodeScanner';

interface POSProps {
  user: any;
  products: Product[];
  customers: Customer[];
  cashSession: CashSession | null;
  onCheckout: (paymentMethod: string, cart: any[], customerId: number | null, discount: number, payments?: any[], notes?: string, changeAmount?: number) => Promise<any>;
  onOpenCash: (initialValue: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
  apiFetch: (url: string, options?: any) => Promise<any>;
  fetchAllData: () => Promise<void>;
  settings: any;
  onUpdateSettings?: (data: any) => Promise<void>;
}

export default function POS({ user, products, customers, cashSession, onCheckout, onOpenCash, addToast, apiFetch, fetchAllData, settings, onUpdateSettings }: POSProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useOutletContext<any>() || {};
  
  // POS Mode: 'direct' (Normal) or 'table' (Mesa/Comanda)
  const [posMode, setPosMode] = useState<'direct' | 'table'>(() => {
    return (localStorage.getItem('pos_mode') as any) || 'direct';
  });

  // Active Tables State
  const [activeTables, setActiveTables] = useState<any[]>(() => {
    const saved = localStorage.getItem('active_tables');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [newTableName, setNewTableName] = useState('');
  const [showDeleteTableConfirm, setShowDeleteTableConfirm] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<any>(null);

  const [cart, setCart] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings?.pos_view_mode || 'grid');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [initialCashValue, setInitialCashValue] = useState('0');
  const [payments, setPayments] = useState<{ method: string, amount: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Barcode Scanner (USB HID) logic
  const handleBarcodeScan = React.useCallback((decodedText: string) => {
    const product = products.find(p => p.barcode === decodedText);
    if (product) {
      addToCart(product);
      addToast(`${product.name} adicionado!`, "success");
      setIsScannerOpen(false);
    } else {
      addToast(`Produto não encontrado: ${decodedText}`, "error");
    }
  }, [products, addToast]);

  const addToCart = React.useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      addToast("Produto sem estoque!", "warning");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, notes: '' }];
    });
  }, [addToast]);

  // Global Barcode Listener (USB Scanner)
  useEffect(() => {
    if (settings?.peripheral_barcode_enabled !== 'true') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If we're in a modal or checkout, maybe we shouldn't scan? 
      // But usually, scanners are used to add items to the cart.
      
      // Ignore if typing in an input/textarea (unless it's the search input and we want to allow it)
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      // Scanners are fast. If the interval between keys is > 50ms, it's likely manual typing.
      const now = Date.now();
      const diff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (diff > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        const suffix = settings?.peripheral_barcode_suffix || 'enter';
        if (e.key.toLowerCase() === suffix.toLowerCase()) {
          if (barcodeBuffer.current.length > 2) {
            handleBarcodeScan(barcodeBuffer.current);
            barcodeBuffer.current = '';
            // If it was an input, we might want to clear it if it was the search input
            if (isInput && e.target instanceof HTMLInputElement) {
              // e.target.value = ''; // This might be intrusive if they were actually typing
            }
            e.preventDefault();
          }
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [settings?.peripheral_barcode_enabled, settings?.peripheral_barcode_suffix, handleBarcodeScan]);

  // Auto-focus search field
  useEffect(() => {
    if (settings?.pos_auto_focus === 'true' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [settings?.pos_auto_focus, isCheckoutOpen, isScannerOpen, showSuccessModal]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (settings?.pos_shortcuts_enabled !== 'true') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCart([]);
        setSelectedCustomer(null);
        setDiscount(0);
        setPayments([]);
        setEditingSale(null);
        addToast("Nova venda iniciada", "info");
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setIsScannerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings?.pos_shortcuts_enabled, cart.length, addToast]);

  // Persist active tables and mode
  useEffect(() => {
    localStorage.setItem('active_tables', JSON.stringify(activeTables));
  }, [activeTables]);

  useEffect(() => {
    localStorage.setItem('pos_mode', posMode);
  }, [posMode]);

  // Sync cart with selected table
  useEffect(() => {
    if (posMode === 'table' && selectedTableId) {
      const table = activeTables.find(t => t.id === selectedTableId);
      if (table) {
        setCart(table.cart || []);
        setSelectedCustomer(customers.find(c => c.id === table.customerId) || null);
        setDiscount(table.discount || 0);
        setSaleNotes(table.notes || '');
      }
    } else if (posMode === 'direct') {
      // If switching to direct, we might want to keep the current cart or clear it.
      // Usually, direct sale is its own thing.
    }
  }, [selectedTableId, posMode]);

  // Update active table when cart/customer/discount changes
  useEffect(() => {
    if (posMode === 'table' && selectedTableId) {
      setActiveTables(prev => prev.map(t => 
        t.id === selectedTableId 
          ? { ...t, cart, customerId: selectedCustomer?.id || null, discount, notes: saleNotes }
          : t
      ));
    }
  }, [cart, selectedCustomer, discount, saleNotes]);

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      addToast("Informe um nome para a comanda", "warning");
      return;
    }
    const newTable = {
      id: Date.now().toString(),
      name: newTableName,
      cart: [],
      customerId: null,
      discount: 0,
      notes: '',
      createdAt: new Date().toISOString()
    };
    setActiveTables(prev => [...prev, newTable]);
    setSelectedTableId(newTable.id);
    setNewTableName('');
    setIsNewTableModalOpen(false);
    addToast(`Comanda ${newTable.name} aberta!`, "success");
  };

  const handleUpdateTable = () => {
    if (!newTableName.trim() || !editingTable) {
      addToast("Informe um nome para a comanda", "warning");
      return;
    }
    setActiveTables(prev => prev.map(t => 
      t.id === editingTable.id ? { ...t, name: newTableName } : t
    ));
    setNewTableName('');
    setEditingTable(null);
    setIsEditTableModalOpen(false);
    addToast("Comanda atualizada!", "success");
  };

  const handleCloseTable = (tableId: string) => {
    setActiveTables(prev => prev.filter(t => t.id !== tableId));
    if (selectedTableId === tableId) {
      setSelectedTableId(null);
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setSaleNotes('');
    }
  };

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'Geral')))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.barcode?.includes(search);
    const matchesCategory = selectedCategory === 'Todos' || (p.category || 'Geral') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Load editing sale if provided (via location state or event)
  useEffect(() => {
    const loadSale = async (sale: any) => {
      if (!sale || !sale.id) {
        console.error("loadSale: Invalid sale object", sale);
        return;
      }

      let fullSale = sale;
      if (!sale.items) {
        try {
          fullSale = await apiFetch(`/api/sales/${sale.id}`);
        } catch (err) {
          console.error("Error loading sale details:", err);
          addToast("Erro ao carregar detalhes da venda", "error");
          return;
        }
      }
      
      setEditingSale(fullSale);
      setCart(fullSale.items.map((i: any) => ({
        id: i.product_id,
        name: i.product_name,
        price: i.unit_price,
        quantity: i.quantity,
        image_url: i.image_url,
        notes: i.notes
      })));
      setSelectedCustomer(customers.find(c => c.id === fullSale.customer_id) || null);
      setDiscount(fullSale.discount || 0);
      setSaleNotes(fullSale.notes || '');
      setIsCheckoutOpen(true);
    };

    if (location.state?.editSale) {
      loadSale(location.state.editSale);
      // Clear state so it doesn't reload on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }

    const handleEditSale = (e: any) => {
      loadSale(e.detail);
    };

    window.addEventListener('edit-sale', handleEditSale);
    return () => {
      window.removeEventListener('edit-sale', handleEditSale);
    };
  }, [customers, location.state, navigate, location.pathname, addToast, apiFetch]);

  const handleToggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (onUpdateSettings) {
      onUpdateSettings({ pos_view_mode: mode });
    }
  };

  const updateNotes = (productId: number, notes: string) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, notes } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    if (posMode === 'table' && !selectedTableId) {
      addToast("Selecione ou abra uma comanda primeiro", "warning");
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - finalTotal) > 0.01 && totalPaid < finalTotal) {
      addToast(`O valor total pago (R$ ${totalPaid.toFixed(2)}) deve ser igual ao total da venda (R$ ${finalTotal.toFixed(2)})`, "warning");
      return;
    }

    const changeAmount = Math.max(0, totalPaid - finalTotal);

    try {
      if (editingSale) {
        try {
          await apiFetch(`/api/sales/${editingSale.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              customer_id: selectedCustomer?.id || null,
              items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price,
                discount: 0,
                notes: item.notes
              })),
              total_amount: finalTotal,
              discount,
              payment_method: payments.length === 1 ? payments[0].method : "Múltiplos",
              payments,
              notes: saleNotes,
              change_amount: changeAmount,
              operator_name: user?.name || user?.email || 'Operador'
            })
          });
          addToast("Venda atualizada com sucesso!", "success");
          await fetchAllData();
          
          const updatedSale = {
            id: editingSale.id,
            items: [...cart],
            total: finalTotal,
            discount,
            subtotal,
            payments: [...payments],
            customer: selectedCustomer,
            date: new Date(),
            notes: saleNotes,
            change: changeAmount,
            operator: user?.name || user?.email || 'Operador'
          };
          
          setLastSale(updatedSale);
          
          console.log("Settings.pos_auto_print:", settings?.pos_auto_print);
          if (settings?.pos_auto_print === 'true') {
            handlePrintReceipt(updatedSale);
          }
          
          setShowSuccessModal(true);
        } catch (err: any) {
          console.error("Error updating sale:", err);
          addToast(err.message || "Erro ao atualizar venda", "error");
          return;
        }
      } else {
        const result = await onCheckout(payments.length === 1 ? payments[0].method : "Múltiplos", cart, selectedCustomer?.id || null, discount, payments, saleNotes, changeAmount);
        const newSale = {
          id: result.saleId,
          items: [...cart],
          total: finalTotal,
          discount,
          subtotal,
          payments: [...payments],
          customer: selectedCustomer,
          date: new Date(),
          notes: saleNotes,
          change: changeAmount,
          operator: user?.name || user?.email || 'Operador'
        };
        setLastSale(newSale);
        
        // Auto print if enabled
        console.log("Settings.pos_auto_print:", settings?.pos_auto_print);
        if (settings?.pos_auto_print === 'true') {
          handlePrintReceipt(newSale);
        }
        
        setShowSuccessModal(true);
      }

      // If it was a table, close it
      if (posMode === 'table' && selectedTableId) {
        handleCloseTable(selectedTableId);
      } else {
        setCart([]);
        setSelectedCustomer(null);
        setDiscount(0);
        setSaleNotes('');
        setPayments([]);
        setEditingSale(null);
      }
      setIsCheckoutOpen(false);
    } catch (err) {
      // Error handled by parent
    }
  };

  const handlePrintReceipt = (saleToPrint?: any) => {
    // If called from onClick, saleToPrint might be an event object
    const sale = (saleToPrint && saleToPrint.id) ? saleToPrint : lastSale;
    if (!sale) {
      addToast("Nenhuma venda selecionada para impressão", "error");
      return;
    }

    const event = new CustomEvent('print-receipt', { detail: sale });
    console.log("Dispatching print-receipt:", event);
    window.dispatchEvent(event);
  };

  const addPayment = (method: string) => {
    const remaining = finalTotal - payments.reduce((sum, p) => sum + p.amount, 0);
    if (remaining <= 0) return;
    const newPayments = [...payments, { method, amount: remaining }];
    setPayments(newPayments);
    
    // Auto finalize if enabled
    if (settings?.pos_auto_finalize === 'true') {
      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - finalTotal) < 0.01) {
        // Small delay to let the user see the payment added
        setTimeout(() => {
          handleCheckout();
        }, 300);
      }
    }
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  if (!cashSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
          <Banknote size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900">Caixa Fechado</h2>
          <p className="text-slate-500 max-w-md mx-auto mt-2">Você precisa abrir o caixa para realizar vendas. Vá para o Dashboard ou clique no botão abaixo.</p>
        </div>
        <button 
          onClick={() => setShowOpenCashModal(true)}
          className="px-8 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all"
        >
          ABRIR CAIXA AGORA
        </button>

        <AnimatePresence>
          {showOpenCashModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOpenCashModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Abrir Caixa</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor Inicial em Fundo</label>
                    <input 
                      type="number" 
                      value={initialCashValue}
                      onChange={(e) => setInitialCashValue(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" 
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowOpenCashModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all">
                      CANCELAR
                    </button>
                    <button 
                      onClick={async () => {
                        await onOpenCash(Number(initialCashValue));
                        setShowOpenCashModal(false);
                      }}
                      className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all"
                    >
                      ABRIR CAIXA
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-8 overflow-hidden min-h-0">
      {/* Mode Switcher & Mobile Tab Switcher */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => {
              setPosMode('direct');
              setSelectedTableId(null);
              setCart([]);
              setSelectedCustomer(null);
              setDiscount(0);
              setSaleNotes('');
            }}
            className={cn(
              "flex-1 py-2 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2",
              posMode === 'direct' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400"
            )}
          >
            <ShoppingCart size={14} />
            VENDA DIRETA
          </button>
          <button 
            onClick={() => setPosMode('table')}
            className={cn(
              "flex-1 py-2 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2",
              posMode === 'table' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400"
            )}
          >
            <TableIcon size={14} />
            MESAS / COMANDAS
          </button>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2",
              activeTab === 'products' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-400"
            )}
          >
            <Package size={16} />
            PRODUTOS
          </button>
          <button 
            onClick={() => setActiveTab('cart')}
            className={cn(
              "flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'cart' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-400"
            )}
          >
            <ShoppingCart size={16} />
            CARRINHO
            {cart.length > 0 && (
              <span className="absolute top-2 right-4 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Mode Switcher Sidebar */}
      <div className="hidden lg:flex flex-col gap-6 w-72 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col h-full">
          <div className="flex-shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Modo de Operação</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => {
                  setPosMode('direct');
                  setSelectedTableId(null);
                  setCart([]);
                  setSelectedCustomer(null);
                  setDiscount(0);
                  setSaleNotes('');
                }}
                className={cn(
                  "w-full p-4 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border-2",
                  posMode === 'direct' 
                    ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20" 
                    : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <ShoppingCart size={18} />
                VENDA DIRETA
              </button>
              <button 
                onClick={() => setPosMode('table')}
                className={cn(
                  "w-full p-4 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border-2",
                  posMode === 'table' 
                    ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20" 
                    : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <TableIcon size={18} />
                MESAS / COMANDAS
              </button>
            </div>
          </div>

          {posMode === 'table' && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Comandas Ativas</h3>
                <button 
                  onClick={() => setIsNewTableModalOpen(true)}
                  className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                {activeTables.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <ClipboardList size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma aberta</p>
                  </div>
                ) : (
                  activeTables.map(table => (
                    <div
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left transition-all border-2 flex flex-col gap-1 cursor-pointer group",
                        selectedTableId === table.id 
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30" 
                          : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                    <div className="flex items-center justify-between">
                      <span className={cn("font-black text-xs uppercase tracking-tight", selectedTableId === table.id ? "text-amber-600" : "text-slate-700 dark:text-white")}>
                        {table.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTable(table);
                            setNewTableName(table.name);
                            setIsEditTableModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setTableToDelete(table);
                            setShowDeleteTableConfirm(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-1">
                          {table.cart?.length || 0}
                        </span>
                      </div>
                    </div>
                      <div className="text-xs font-black text-amber-600 mt-1">
                        R$ {(table.cart?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) - (table.discount || 0)).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Section */}
      <div className={cn(
        "flex-1 flex flex-col gap-3 lg:gap-4 min-w-0 min-h-0",
        activeTab !== 'products' && "hidden lg:flex"
      )}>
        {/* Mobile Tables List (if in table mode and no table selected) */}
        {posMode === 'table' && !selectedTableId && (
          <div className="lg:hidden flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Comandas Ativas</h3>
              <button 
                onClick={() => setIsNewTableModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-black text-xs"
              >
                <Plus size={16} /> NOVA COMANDA
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {activeTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setActiveTab('products');
                  }}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-black text-slate-900 dark:text-white">{table.name}</div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTable(table);
                          setNewTableName(table.name);
                          setIsEditTableModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableToDelete(table);
                          setShowDeleteTableConfirm(true);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{table.cart?.length || 0} itens</div>
                  <div className="text-sm font-black text-amber-600">
                    R$ {(table.cart?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) - (table.discount || 0)).toFixed(2)}
                  </div>
                </button>
              ))}
              {activeTables.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400">
                  <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest">Nenhuma comanda aberta</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Search & List (Hidden on mobile if in table mode and no table selected) */}
        <div className={cn(
          "flex-1 flex flex-col gap-4 lg:gap-6",
          posMode === 'table' && !selectedTableId && "hidden lg:flex"
        )}>
          {posMode === 'table' && selectedTableId && (
            <div className="lg:hidden flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedTableId(null)} className="p-2 text-amber-600"><ArrowLeft size={18} /></button>
                <span className="font-black text-amber-600 uppercase tracking-tight">
                  {activeTables.find(t => t.id === selectedTableId)?.name}
                </span>
              </div>
              <span className="text-xs font-black text-amber-600">
                R$ {finalTotal.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex gap-3 lg:gap-4">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-4 lg:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-600 rounded-2xl lg:rounded-[1.5rem] transition-all shadow-sm hover:shadow-md"
                title="Abrir Menu"
              >
                <Menu size={24} />
              </button>
            )}
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar produtos ou código de barras..." 
                className="w-full pl-14 pr-12 py-3.5 lg:py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold text-sm lg:text-base text-slate-700 dark:text-white focus:ring-4 ring-amber-500/10 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="p-3.5 lg:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-600 rounded-xl lg:rounded-2xl transition-all shadow-sm hover:shadow-md"
                title="Escanear Código de Barras"
              >
                <Camera size={22} />
              </button>
              
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:rounded-2xl p-1 shadow-sm">
                <button
                  onClick={() => handleToggleView('grid')}
                  className={cn(
                    "p-2.5 rounded-lg lg:rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => handleToggleView('list')}
                  className={cn(
                    "p-2.5 rounded-lg lg:rounded-xl transition-all",
                    viewMode === 'list' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Categories Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-[10px] lg:text-xs whitespace-nowrap transition-all border uppercase tracking-wider",
                  selectedCategory === cat
                    ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-200 dark:hover:border-amber-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Produto' : 'Produtos'} encontrado(s)
            </p>
          </div>

        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-32 lg:pb-24">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl mb-6 text-slate-300 dark:text-slate-700">
                <Package size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Nenhum produto encontrado</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                Não encontramos nenhum produto com os critérios selecionados. Tente ajustar sua busca ou categoria.
              </p>
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="mt-6 px-6 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-5">
              {filteredProducts.map(product => (
                <motion.button
                  key={product.id}
                  layout
                  whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    addToCart(product);
                    if (window.innerWidth < 1024) {
                      addToast(`${product.name} adicionado!`, "success");
                    }
                  }}
                  className="bg-white dark:bg-slate-900 p-3 lg:p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-amber-200 dark:hover:border-amber-900/30 transition-all text-left flex flex-col h-full group relative overflow-hidden"
                >
                  <div className="aspect-square bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-3 overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                        <Package size={32} strokeWidth={1.5} />
                      </div>
                    )}
                    {product.stock_quantity <= 5 && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg">
                        Baixo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 mb-3">
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] lg:text-xs line-clamp-2 leading-tight uppercase tracking-tight">{product.name}</h4>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.category || 'Geral'}</p>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{product.stock_quantity} UN</span>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Preço</span>
                      <span className="text-xs lg:text-base font-black text-amber-600">R$ {product.price.toFixed(2)}</span>
                    </div>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-all">
                      <Plus size={16} strokeWidth={3} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => (
                <motion.button
                  key={product.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    addToCart(product);
                    if (window.innerWidth < 1024) {
                      addToast(`${product.name} adicionado!`, "success");
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 p-2.5 lg:p-3.5 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-3 lg:gap-4 group"
                >
                  <div className="w-10 h-10 lg:w-14 lg:h-14 bg-slate-50 dark:bg-slate-800 rounded-lg lg:rounded-xl overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={18} className="lg:w-5 lg:h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs lg:text-sm line-clamp-2 uppercase tracking-tight leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque: {product.stock_quantity} UN</span>
                      {product.barcode && (
                        <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Barcode size={9} /> {product.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm lg:text-lg font-black text-amber-600">R$ {product.price.toFixed(2)}</div>
                    <div className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Adicionar</div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Cart Section */}
      <div className={cn(
        "w-full lg:w-[26rem] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden h-fit max-h-full",
        activeTab !== 'cart' && "hidden lg:flex"
      )}>
        <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Carrinho</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {cart.reduce((s, i) => s + i.quantity, 0)} itens
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
            <span className="text-2xl font-black text-amber-600 tracking-tighter leading-none">R$ {finalTotal.toFixed(2)}</span>
            <div className="flex gap-2 mt-2">
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  title="Limpar Carrinho"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                disabled={cart.length === 0 || (posMode === 'table' && !selectedTableId)}
                onClick={() => setIsCheckoutOpen(true)}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  cart.length > 0 && !(posMode === 'table' && !selectedTableId)
                    ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-95" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                <CreditCard size={14} />
                FINALIZAR
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <AnimatePresence mode="popLayout" initial={false}>
            {cart.length === 0 ? (
              <motion.div 
                key="empty-cart"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="min-h-[200px] flex flex-col items-center justify-center text-center space-y-4 opacity-40"
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <ShoppingCart size={32} className="text-slate-400" />
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Carrinho Vazio</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  drag="x"
                  dragConstraints={{ left: -100, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) {
                      removeFromCart(item.id);
                      if (navigator.vibrate) navigator.vibrate(50);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 group relative touch-pan-y"
                >
                  <div className="absolute inset-y-0 right-0 w-20 bg-rose-500 rounded-3xl flex items-center justify-center text-white -z-10">
                    <Trash2 size={20} />
                  </div>
                  <div className="flex gap-3 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-900 dark:text-white text-[10px] uppercase truncate pr-4 leading-tight">{item.name}</h4>
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700 shadow-sm">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors">
                            <Minus size={12} strokeWidth={3} />
                          </button>
                          <span className="w-6 text-center font-black text-[10px] text-slate-700 dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors">
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-amber-600 text-xs">R$ {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                      <input 
                        type="text"
                        placeholder="Adicionar observação..."
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-full mt-3 px-3 py-1.5 bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-lg text-[9px] outline-none focus:ring-2 ring-amber-500/10 italic"
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black text-slate-400 uppercase tracking-[0.2em]">Subtotal</span>
              <span className="font-black text-slate-700 dark:text-white">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Desconto</span>
                {discount > 0 && <button onClick={() => setDiscount(0)} className="text-[9px] font-bold text-rose-500 hover:underline uppercase">Limpar</button>}
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-black text-slate-400">R$</span>
                <input 
                  type="number" 
                  value={discount || ''} 
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-16 text-right bg-transparent font-black text-rose-500 outline-none text-xs"
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select 
                  className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-tight outline-none focus:ring-2 ring-amber-500/10 appearance-none"
                  onChange={(e) => setSelectedCustomer(customers.find(c => c.id === Number(e.target.value)) || null)}
                  value={selectedCustomer?.id || ""}
                >
                  <option value="">Consumidor Final</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <textarea 
                placeholder="Observações da venda..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                rows={1}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-medium outline-none focus:ring-2 ring-amber-500/10 resize-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            </div>
          </div>

          <button
            disabled={cart.length === 0 || (posMode === 'table' && !selectedTableId)}
            onClick={() => setIsCheckoutOpen(true)}
            className={cn(
              "w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl hidden",
              cart.length > 0 && !(posMode === 'table' && !selectedTableId)
                ? "bg-amber-600 text-white shadow-amber-600/30 hover:scale-[1.02] hover:bg-amber-700 active:scale-95" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            <CreditCard size={18} strokeWidth={2.5} />
            {posMode === 'table' && !selectedTableId ? 'Selecione uma Comanda' : 'Finalizar Venda'}
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md lg:rounded-[3rem] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 lg:p-10 text-center bg-amber-600 text-white">
                <div className="w-12 h-12 lg:w-20 lg:h-20 bg-white/20 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6 rotate-12">
                  <CheckCircle2 size={24} className="lg:w-10 lg:h-10" />
                </div>
                <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight">Pagamento</h3>
                <p className="opacity-80 font-bold mt-1 text-xs lg:text-base">Selecione o método desejado</p>
              </div>

              <div className="p-6 lg:p-10 space-y-6 lg:space-y-8">
                <div className="text-center">
                  <span className="text-slate-400 text-[8px] lg:text-[10px] font-black uppercase tracking-widest">Total a Pagar</span>
                  <div className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white mt-1 lg:mt-2">R$ {finalTotal.toFixed(2)}</div>
                  {settings?.pos_show_change === 'true' && payments.reduce((s, p) => s + p.amount, 0) > finalTotal && (
                    <div className="mt-3 lg:mt-4 p-3 lg:p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl lg:rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <span className="text-[8px] lg:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Troco</span>
                      <div className="text-xl lg:text-3xl font-black text-emerald-600">
                        R$ {(payments.reduce((s, p) => s + p.amount, 0) - finalTotal).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {payments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamentos Adicionados</span>
                    <div className="space-y-2">
                      {payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2 lg:p-3 bg-slate-50 dark:bg-slate-800 rounded-lg lg:rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs lg:text-sm">{p.method}</span>
                          </div>
                          <div className="flex items-center gap-2 lg:gap-3">
                            <input 
                              type="number" 
                              value={p.amount}
                              onChange={(e) => {
                                const newPayments = [...payments];
                                newPayments[i].amount = Number(e.target.value);
                                setPayments(newPayments);
                              }}
                              className="w-16 lg:w-24 bg-transparent text-right font-black text-amber-600 outline-none text-xs lg:text-base"
                            />
                            <button onClick={() => removePayment(i)} className="text-rose-500 hover:text-rose-600"><X size={14} className="lg:w-4 lg:h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Restante</span>
                      <span className={cn("font-black text-xs lg:text-base", (finalTotal - payments.reduce((s, p) => s + p.amount, 0)) > 0 ? "text-rose-500" : "text-emerald-500")}>
                        R$ {(finalTotal - payments.reduce((s, p) => s + p.amount, 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  {[
                    { id: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
                    { id: 'PIX', icon: QrCode, label: 'PIX' },
                    { id: 'Crédito', icon: CreditCard, label: 'Crédito' },
                    { id: 'Débito', icon: CreditCard, label: 'Débito' }
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => addPayment(method.id)}
                      className="flex flex-col items-center gap-2 lg:gap-3 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all group"
                    >
                      <method.icon size={24} className="lg:w-8 lg:h-8 text-slate-400 group-hover:text-amber-600 transition-colors" />
                      <span className="font-black text-[8px] lg:text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-amber-600">{method.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleCheckout}
                    disabled={Math.abs(payments.reduce((s, p) => s + p.amount, 0) - finalTotal) > 0.01}
                    className="w-full py-4 lg:py-5 bg-emerald-600 text-white font-black rounded-xl lg:rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-xs lg:text-sm"
                  >
                    {editingSale ? 'ATUALIZAR VENDA' : 'CONFIRMAR PAGAMENTO'}
                  </button>
                  <button 
                    onClick={() => {
                      if (settings?.pos_confirm_cancel === 'true') {
                        setShowConfirmCancel(true);
                      } else {
                        setIsCheckoutOpen(false);
                        setEditingSale(null);
                        setPayments([]);
                      }
                    }}
                    className="w-full py-3 text-slate-400 font-black hover:text-slate-600 transition-colors uppercase text-[10px] lg:text-xs tracking-widest"
                  >
                    Cancelar Operação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setIsCheckoutOpen(false);
          setEditingSale(null);
          setPayments([]);
        }}
        title="Cancelar Operação?"
        message="Tem certeza que deseja cancelar esta operação? Todos os dados não salvos serão perdidos."
        confirmText="SIM, CANCELAR"
        cancelText="NÃO, VOLTAR"
        type="danger"
      />

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSuccessModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Venda Concluída!</h3>
              <p className="text-slate-500 font-medium mb-8">A venda foi processada com sucesso no sistema.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={handlePrintReceipt}
                  className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
                >
                  <Printer size={20} /> IMPRIMIR COMPROVANTE
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 text-slate-400 font-black hover:text-slate-600 transition-colors uppercase text-xs tracking-widest"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Table Modal */}
      <AnimatePresence>
        {isNewTableModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewTableModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Abrir Comanda</h3>
              <p className="text-slate-500 font-medium mb-6">Informe um nome ou número para identificar a mesa/comanda.</p>
              
              <input 
                autoFocus
                type="text"
                placeholder="Ex: Mesa 05, João Silva..."
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-900 dark:text-white mb-6"
              />

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCreateTable}
                  className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all"
                >
                  ABRIR COMANDA
                </button>
                <button 
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="w-full py-3 text-slate-400 font-black hover:text-slate-600 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Table Modal */}
      <AnimatePresence>
        {isEditTableModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditTableModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Editar Comanda</h3>
              <p className="text-slate-500 font-medium mb-6">Altere o nome ou número de identificação.</p>
              
              <input 
                autoFocus
                type="text"
                placeholder="Ex: Mesa 05, João Silva..."
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTable()}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-900 dark:text-white mb-6"
              />

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleUpdateTable}
                  className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all"
                >
                  SALVAR ALTERAÇÕES
                </button>
                <button 
                  onClick={() => {
                    setIsEditTableModalOpen(false);
                    setEditingTable(null);
                    setNewTableName('');
                  }}
                  className="w-full py-3 text-slate-400 font-black hover:text-slate-600 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteTableConfirm}
        onClose={() => {
          setShowDeleteTableConfirm(false);
          setTableToDelete(null);
        }}
        onConfirm={() => {
          if (tableToDelete) {
            handleCloseTable(tableToDelete.id);
            setShowDeleteTableConfirm(false);
            setTableToDelete(null);
            addToast("Comanda excluída!", "success");
          }
        }}
        title="Excluir Comanda?"
        message={`Tem certeza que deseja excluir a comanda "${tableToDelete?.name}"? Todos os itens lançados serão perdidos.`}
        confirmText="SIM, EXCLUIR"
        cancelText="NÃO, MANTER"
        type="danger"
      />

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner 
            onScan={handleBarcodeScan}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
