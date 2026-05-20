import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, ShoppingCart, TrendingUp, DollarSign, Clock, Trash2, ChevronDown, Pencil, Package, ClipboardList, Wallet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Product = { id: string; code: string; name: string; brand: string; cost: number; price: number; imageUrl: string };
type OrderItem = Product & { quantity: number };

type Payment = {
    id: string;
    dueDate: string;
    amount: number;
    status: 'Pendente' | 'Pago';
};

type Order = {
    id: string;
    customer: string;
    phone: string;
    address: string;
    products: OrderItem[];
    status: 'Em análise' | 'Separando' | 'Pedido enviado' | 'Em transporte' | 'Entregue' | 'Cancelado';
    total: number;
    profit: number;
    paymentMethod: 'Pix' | 'Cartão' | 'Dinheiro' | 'Carnê';
    installments?: number;
    observation?: string;
    payments: Payment[];
};

const ORDER_STATUSES = ['Em análise', 'Separando', 'Pedido enviado', 'Em transporte', 'Entregue', 'Cancelado'];
const STATUS_CONFIG: Record<string, { color: string, icon: React.ReactNode }> = {
  'Em análise': { color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: <Clock className="w-3 h-3" /> },
  'Separando': { color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: <Package className="w-3 h-3" /> },
  'Pedido enviado': { color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', icon: <ClipboardList className="w-3 h-3" /> },
  'Em transporte': { color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', icon: <ShoppingCart className="w-3 h-3" /> },
  'Entregue': { color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Cancelado': { color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: <X className="w-3 h-3" /> },
};

const STATUS_SIMPLE_COLORS: Record<string, string> = {
    'Em análise': 'bg-amber-500',
    'Separando': 'bg-blue-500',
    'Pedido enviado': 'bg-purple-500',
    'Em transporte': 'bg-indigo-500',
    'Entregue': 'bg-green-500',
    'Cancelado': 'bg-red-500',
};

export default function Orders() {
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'finance'>('orders');
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orders_central');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing orders_central", e);
      }
    }
    return [
      { 
          id: '123', 
          customer: 'Maria Silva', 
          phone: '(11) 99999-9999', 
          address: 'Rua A, 123', 
          products: [{ id: 'p1', code: 'PROD001', name: 'Batom', brand: 'Avon', cost: 20, price: 50, imageUrl: '', quantity: 1 }], 
          status: 'Em análise', 
          total: 50, 
          profit: 30, 
          paymentMethod: 'Pix',
          payments: [{ id: 'pm1', dueDate: new Date().toISOString(), amount: 50, status: 'Pago' }]
      },
    ];
  });

  const [catalogProducts, setCatalogProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('catalog_products_central');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing catalog_products_central", e);
      }
    }
    return [
      { id: 'p1', code: 'PROD001', name: 'Batom', brand: 'Avon', cost: 20, price: 50, imageUrl: '' },
      { id: 'p2', code: 'PROD002', name: 'Base', brand: 'Boticário', cost: 40, price: 100, imageUrl: '' },
      { id: 'p3', code: 'PROD003', name: 'Máscara', brand: 'Natura', cost: 25, price: 60, imageUrl: '' },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('orders_central', JSON.stringify(orders));
  }, [orders]);

  React.useEffect(() => {
    localStorage.setItem('catalog_products_central', JSON.stringify(catalogProducts));
  }, [catalogProducts]);

  const [newProduct, setNewProduct] = useState({ code: '', name: '', brand: '', cost: 0, price: 0, imageUrl: '' });
  const [newOrder, setNewOrder] = useState<Partial<Order>>({ products: [], customer: '', phone: '', address: '', total: 0, profit: 0, paymentMethod: 'Pix', observation: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  const filteredCatalog = catalogProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.customer.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.products.some(p => p.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const addProductToCatalog = () => {
    if (!newProduct.name || !newProduct.code || !newProduct.brand || newProduct.cost <= 0 || newProduct.price <= 0) return;
    setCatalogProducts([...catalogProducts, { ...newProduct, id: Math.random().toString(36).substr(2, 9) }]);
    setNewProduct({ code: '', name: '', brand: '', cost: 0, price: 0, imageUrl: '' });
  };
    
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const editingOrder = orders.find(o => o.id === editingOrderId);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  
  const openEditProduct = (product: Product) => {
      setEditingProduct(product);
      setNewProduct(product);
      setIsEditProductDialogOpen(true);
  };
    
  const updateProductInCatalog = () => {
    if (!editingProduct || !newProduct.name || !newProduct.code || !newProduct.brand || newProduct.cost <= 0 || newProduct.price <= 0) return;
    setCatalogProducts(catalogProducts.map(p => p.id === editingProduct.id ? {...newProduct, id: editingProduct.id} : p));
    setNewProduct({ code: '', name: '', brand: '', cost: 0, price: 0, imageUrl: '' });
    setIsEditProductDialogOpen(false);
    setEditingProduct(null);
  };

  const deleteProductFromCatalog = (id: string) => {
      setCatalogProducts(catalogProducts.filter(p => p.id !== id));
  };

  const deleteOrder = (id: string) => setOrders(orders.filter(o => o.id !== id));
  
  const updateStatus = (id: string, status: Order['status']) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const addProductToOrder = (product: Product) => {
      const existingProduct = newOrder.products?.find(p => p.id === product.id);
      let updatedProducts;
      if (existingProduct) {
          updatedProducts = newOrder.products?.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p) || [];
      } else {
          updatedProducts = [...(newOrder.products || []), { ...product, quantity: 1 }];
      }
      
      const total = updatedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const cost = updatedProducts.reduce((sum, p) => sum + p.cost * p.quantity, 0);
      setNewOrder({ ...newOrder, products: updatedProducts, total, profit: total - cost });
  };

  const getNextOrderId = () => {
    let nextIdNumber = 1001;
    if (orders.length > 0) {
      const numericIds = orders
        .map(o => {
          const match = o.id.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(id => id > 0);
      if (numericIds.length > 0) {
        nextIdNumber = Math.max(...numericIds) + 1;
      }
    }
    return String(nextIdNumber);
  };

  const addOrder = () => {
    const total = newOrder.total || 0;
    const installmentsNum = newOrder.installments || 1;
    const payments: Payment[] = [];

    if (newOrder.paymentMethod === 'Carnê' && installmentsNum > 1) {
        const installmentAmount = total / installmentsNum;
        for (let i = 0; i < installmentsNum; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i);
            payments.push({
                id: Math.random().toString(36).substr(2, 9),
                dueDate: dueDate.toISOString(),
                amount: installmentAmount,
                status: 'Pendente'
            });
        }
    } else {
        payments.push({
            id: Math.random().toString(36).substr(2, 9),
            dueDate: new Date().toISOString(),
            amount: total,
            status: newOrder.paymentMethod === 'Pix' || newOrder.paymentMethod === 'Dinheiro' ? 'Pago' : 'Pendente'
        });
    }

    const newOrderFull: Order = {
        id: getNextOrderId(),
        customer: newOrder.customer || 'Cliente',
        phone: newOrder.phone || '',
        address: newOrder.address || '',
        products: newOrder.products || [],
        status: 'Em análise',
        total: total,
        profit: newOrder.profit || 0,
        paymentMethod: newOrder.paymentMethod || 'Pix',
        installments: newOrder.installments,
        observation: newOrder.observation,
        payments: payments,
    };
    setOrders([...orders, newOrderFull]);
    setIsNewOrderOpen(false);
    setNewOrder({ products: [], customer: '', phone: '', address: '', total: 0, profit: 0, paymentMethod: 'Pix', observation: '' });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] dark:bg-[#0A0A0A] p-4 md:p-8 space-y-8 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
          >
            Central de Pedidos
          </motion.h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Gerencie seu catálogo, pedidos e financeiro em um só lugar.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg h-8 px-3 text-xs font-semibold transition-all" 
                    onClick={() => setViewMode('list')}
                >
                    Lista
                </Button>
                <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg h-8 px-3 text-xs font-semibold transition-all" 
                    onClick={() => setViewMode('grid')}
                >
                    Grade
                </Button>
            </div>
            
            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
              <DialogTrigger render={
                <Button className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 h-10 px-6 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex-1 md:flex-none">
                    <Plus className="mr-2 h-5 w-5" /> Novo Pedido
                </Button>
              } />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Pedido #{getNextOrderId()}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input placeholder="Nome do cliente" value={newOrder.customer ?? ''} onChange={e => setNewOrder({...newOrder, customer: e.target.value})} />
                <Input placeholder="Telefone" value={newOrder.phone ?? ''} onChange={e => setNewOrder({...newOrder, phone: e.target.value})} />
                <Input placeholder="Endereço" value={newOrder.address ?? ''} onChange={e => setNewOrder({...newOrder, address: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newOrder.paymentMethod}
                    onChange={e => setNewOrder({...newOrder, paymentMethod: e.target.value as Order['paymentMethod']})}
                  >
                      <option value="Pix">Pix</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Carnê">Carnê</option>
                  </select>
                  {newOrder.paymentMethod === 'Carnê' && (
                      <Input placeholder="Parcelas" type="number" value={newOrder.installments ?? ''} onChange={e => setNewOrder({...newOrder, installments: parseInt(e.target.value) || 0})} />
                  )}
                </div>

                <textarea 
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Observações do pedido"
                    value={newOrder.observation ?? ''}
                    onChange={e => setNewOrder({...newOrder, observation: e.target.value})}
                />
                
                <div className="space-y-2">
                    <label className="text-sm font-medium">Buscar Produtos</label>
                    <Input placeholder="Buscar por código ou nome" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {filteredCatalog.map(p => (
                            <Button key={p.id} variant="outline" size="sm" onClick={() => addProductToOrder(p)}>{p.name} ({p.code})</Button>
                        ))}
                    </div>
                </div>

                <div className="text-sm border-t pt-2">
                    <label className="font-medium">Produtos no pedido:</label>
                    {newOrder.products?.map(p => (
                        <div key={p.id} className="flex justify-between">
                            <span>{p.quantity}x {p.name}</span>
                            <span>R$ {(p.price * p.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="font-semibold">Total: R$ {newOrder.total?.toFixed(2)} | Lucro: R$ {newOrder.profit?.toFixed(2)}</div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={addOrder}>Salvar Pedido</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      
      <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar shadow-inner">
        {[
          { id: 'orders', label: 'Pedidos', icon: <ClipboardList className="w-4 h-4 mr-2" /> },
          { id: 'catalog', label: 'Catálogo', icon: <Package className="w-4 h-4 mr-2" /> },
          { id: 'finance', label: 'Financeiro', icon: <Wallet className="w-4 h-4 mr-2" /> }
        ].map((tab) => (
          <Button 
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={cn(
              "flex-1 sm:flex-none h-11 px-6 rounded-xl font-bold transition-all duration-300 whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-md border border-slate-200/50 dark:border-slate-700/50" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            )}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      <Dialog open={isEditOrderDialogOpen} onOpenChange={setIsEditOrderDialogOpen}>
        <DialogContent className="p-0 overflow-hidden">
            {editingOrder && (
                <div className={cn("h-2 w-full", STATUS_SIMPLE_COLORS[editingOrder.status])}></div>
            )}
            <DialogHeader className="p-6">
                <DialogTitle className="flex justify-between items-center">
                    Detalhes do Pedido #{editingOrder?.id}
                    {editingOrder && (
                        <span className={cn("px-2 py-1 rounded text-sm text-white", STATUS_SIMPLE_COLORS[editingOrder.status])}>
                            {editingOrder.status}
                        </span>
                    )}
                </DialogTitle>
            </DialogHeader>
            {editingOrder && (
                <div className="space-y-4 p-6 pt-0">
                    <p><strong>Cliente:</strong> {editingOrder.customer}</p>
                    <p><strong>Status:</strong> {editingOrder.status}</p>
                    <p><strong>Forma de Pagamento:</strong> {editingOrder.paymentMethod} {editingOrder.installments ? `(${editingOrder.installments}x)` : ''}</p>
                    {editingOrder.observation && <p><strong>Observação:</strong> {editingOrder.observation}</p>}
                    <div className="border-t pt-2">
                        <label className="font-semibold">Produtos:</label>
                        {editingOrder.products.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.quantity}x {p.name}</span>
                                <span>R$ {(p.price * p.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <p><strong>Total:</strong> R$ {editingOrder.total.toFixed(2)}</p>
                </div>
            )}
            <DialogFooter className="p-6 pt-0">
                <Button onClick={() => setIsEditOrderDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Editar Produto</DialogTitle>
            <DialogDescription>Altere as informações do produto selecionado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Imagem URL</label>
                <Input placeholder="URL da imagem do produto" className="h-11 rounded-xl" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Código</label>
                  <Input placeholder="Ex: PROD001" className="h-11 rounded-xl" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Marca</label>
                  <Input placeholder="Ex: Avon, Natura" className="h-11 rounded-xl" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Produto</label>
                <Input placeholder="Nome completo" className="h-11 rounded-xl" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Custo (R$)</label>
                  <Input type="number" className="h-11 rounded-xl bg-red-50/10" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preço de Venda (R$)</label>
                  <Input type="number" className="h-11 rounded-xl bg-green-50/10" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditProductDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold">Cancelar</Button>
            <Button onClick={updateProductInCatalog} className="rounded-xl h-11 px-8 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 font-bold shadow-lg">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTab === 'orders' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header block with search & status filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pedidos Ativos</h2>
              <p className="text-sm text-slate-500 font-medium">Acompanhe e gerencie todos os seus pedidos em tempo real.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {/* Search bar */}
              <div className="relative flex-1 md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold transition-all" />
                <Input 
                  placeholder="Buscar pedido..." 
                  className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                />
              </div>
              {/* Status filter selection drop-down */}
              <div className="relative">
                <select 
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 pr-8 text-xs font-bold text-slate-600 dark:text-slate-350 focus:outline-none appearance-none cursor-pointer shadow-sm min-w-[130px]"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">Filtro: Todos</option>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="w-full">
            <AnimatePresence mode="popLayout">
              {filteredOrders.length > 0 ? (
                viewMode === 'grid' ? (
                  /* Elegant Column Grid view */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col"
                      >
                        <Card className="group rounded-[24px] border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full bg-white dark:bg-slate-950">
                          {/* Colored status bar indicator */}
                          <div className={cn("h-1.5 w-full", STATUS_SIMPLE_COLORS[order.status])} />
                          
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            {/* Header details: ID, payment code & Date */}
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">#{order.id}</span>
                                  <Badge variant="secondary" className="rounded-md font-bold text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">{order.paymentMethod}</Badge>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={order.customer}>{order.customer}</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                                  <Clock className="w-3 h-3 text-slate-400" /> {new Date().toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              
                              <Badge className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-none shrink-0 flex items-center gap-1", STATUS_CONFIG[order.status].color)}>
                                {STATUS_CONFIG[order.status].icon}
                                <span>{order.status}</span>
                              </Badge>
                            </div>

                            {/* Middle part: Products Breakdown list inside the card */}
                            <div className="space-y-2 py-3 border-y border-dashed border-slate-150 dark:border-slate-800/80 my-2 flex-1 min-h-[90px]">
                              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Produtos</p>
                              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                                {order.products.map((p, i) => (
                                  <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium leading-normal gap-2">
                                    <span className="truncate">{p.quantity}x {p.name} <span className="text-[10px] text-slate-400">({p.brand})</span></span>
                                    <span className="shrink-0 text-slate-500 font-mono text-[11px]">R$ {(p.price * p.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Totals box */}
                            <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block leading-none mb-0.5">Total</span>
                                <span className="text-lg font-black text-slate-950 dark:text-white tracking-tight font-mono">R$ {order.total.toFixed(2)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest block leading-none mb-0.5">Lucro</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">R$ {order.profit.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Footer options */}
                          <div className="bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-900/85 p-3 flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                              <select 
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none shadow-sm pr-6"
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value as any)}
                              >
                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            
                            <div className="flex gap-1 shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-[11px] px-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
                                onClick={() => {
                                  setEditingOrderId(order.id);
                                  setIsEditOrderDialogOpen(true);
                                }}
                              >
                                Ver
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                onClick={() => deleteOrder(order.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Existing spacious column row list view */
                  <div className="grid grid-cols-1 gap-4">
                    {filteredOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                      >
                        <Card className="group rounded-[24px] border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                          <div className="flex flex-col lg:flex-row">
                            <div className="p-6 flex-1 space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">#{order.id}</span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{order.customer}</h3>
                                  </div>
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date().toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-none", STATUS_CONFIG[order.status].color)}>
                                    {STATUS_CONFIG[order.status].icon}
                                    <span className="ml-1.5">{order.status}</span>
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 pt-2">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produtos</p>
                                  <div className="flex -space-x-2 overflow-hidden">
                                    {order.products.slice(0, 3).map((p, i) => (
                                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 flex items-center justify-center text-[10px] font-bold shadow-sm">
                                        {p.name.charAt(0)}
                                      </div>
                                    ))}
                                    {order.products.length > 3 && (
                                      <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                        +{order.products.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                                  <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">R$ {order.total.toFixed(2)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagamento</p>
                                  <Badge variant="secondary" className="rounded-md font-bold text-[10px]">{order.paymentMethod}</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 p-6 flex lg:flex-col justify-between items-center lg:w-48 gap-4">
                              <select 
                                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none w-full cursor-pointer"
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value as any)}
                              >
                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              
                              <div className="flex gap-2 w-full">
                                <Button 
                                  variant="outline" 
                                  className="h-10 flex-1 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs"
                                  onClick={() => {
                                    setEditingOrderId(order.id);
                                    setIsEditOrderDialogOpen(true);
                                  }}
                                >
                                  Ver
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => deleteOrder(order.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum pedido encontrado.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {activeTab === 'catalog' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="rounded-[32px] border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6">
                <div>
                  <CardTitle className="text-xl font-bold">Catálogo de Produtos</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Gerencie o acervo de produtos disponíveis para venda.</p>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Button 
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="rounded-lg h-8 px-3 text-xs font-semibold"
                      onClick={() => setViewMode('list')}
                    >
                      Lista
                    </Button>
                    <Button 
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="rounded-lg h-8 px-3 text-xs font-semibold"
                      onClick={() => setViewMode('grid')}
                    >
                      Grade
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
            <div className="flex gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <Input 
                  placeholder="Pesquisar por nome ou código..." 
                  className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:ring-amber-500/20"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-left">
                            <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Produto</th>
                            <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] hidden sm:table-cell">Código</th>
                            <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] hidden md:table-cell">Marca</th>
                            <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Preço Venda</th>
                            <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                          {filteredCatalog.map(p => (
                              <motion.tr 
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                key={p.id} 
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group"
                              >
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          {p.imageUrl ? (
                                              <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform" />
                                          ) : (
                                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
                                                <Package className="w-5 h-5" />
                                              </div>
                                          )}
                                          <div>
                                            <p className="font-bold text-slate-900 dark:text-slate-200">{p.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight md:hidden">{p.brand} • {p.code}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4 hidden sm:table-cell">
                                    <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400">
                                      {p.code}
                                    </code>
                                  </td>
                                  <td className="p-4 hidden md:table-cell text-slate-600 dark:text-slate-400 font-medium">{p.brand}</td>
                                  <td className="p-4">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 text-base">R$ {p.price.toFixed(2)}</span>
                                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">Lucro R$ {(p.price - p.cost).toFixed(2)}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-1">
                                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 transition-colors" onClick={() => openEditProduct(p)}>
                                              <Pencil className='h-4 w-4'/>
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors" onClick={() => deleteProductFromCatalog(p.id)}>
                                              <Trash2 className='h-4 w-4'/>
                                          </Button>
                                      </div>
                                  </td>
                              </motion.tr>
                          ))}
                        </AnimatePresence>
                    </tbody>
                </table>
              </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    <AnimatePresence mode="popLayout">
                      {filteredCatalog.map((p, idx) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            key={p.id}
                          >
                            <Card className="rounded-[28px] border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 overflow-hidden group">
                                <div className="relative aspect-square overflow-hidden">
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                                          <Package className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                      <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all" onClick={() => openEditProduct(p)}>
                                        <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      </Button>
                                      <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all" onClick={() => deleteProductFromCatalog(p.id)}>
                                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                      </Button>
                                    </div>
                                    <div className="absolute bottom-3 left-3">
                                      <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-none font-bold text-[10px] rounded-full px-2">
                                        {p.brand}
                                      </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-5 space-y-3">
                                    <div>
                                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{p.name}</h4>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.code}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {p.price.toFixed(2)}</p>
                                      <div className="text-right">
                                        <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Lucro</p>
                                        <p className="text-xs font-bold text-green-600">R$ {(p.price - p.cost).toFixed(2)}</p>
                                      </div>
                                    </div>
                                </CardContent>
                            </Card>
                          </motion.div>
                      ))}
                    </AnimatePresence>
                </div>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-base font-bold mb-6 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-amber-600" />
                  </div>
                  Cadastrar Novo Produto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    <div className="space-y-1.5 xl:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Imagem URL</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50" placeholder="https://..." value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Código</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50" placeholder="EX: PROD001" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} />
                    </div>
                    <div className="space-y-1.5 xl:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50" placeholder="Nome do produto" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Marca</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50" placeholder="Marca" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
                    </div>
                    <div className="space-y-1.5 text-red-500">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Custo (R$)</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-red-50/10 dark:bg-red-950/10" type="number" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5 text-green-500">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Venda (R$)</label>
                      <Input className="rounded-xl border-slate-200 dark:border-slate-800 bg-green-50/10 dark:bg-green-950/10" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addProductToCatalog} className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Adicionar
                      </Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
      </motion.div>
      )}
      {activeTab === 'finance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard title="Total Bruto" value={`R$ ${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString('pt-BR')}`} icon={<DollarSign className="h-5 w-5" />} color="text-green-600" />
              <MetricCard title="Lucro Líquido" value={`R$ ${orders.reduce((acc, o) => acc + o.profit, 0).toLocaleString('pt-BR')}`} icon={<TrendingUp className="h-5 w-5" />} color="text-emerald-600" trend="+15%" />
              <MetricCard title="Contas a Receber" value={`R$ ${orders.reduce((acc, o) => acc + o.payments.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.amount, 0), 0).toLocaleString('pt-BR')}`} icon={<Clock className="h-5 w-5" />} color="text-amber-600" />
          </div>

          <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <Wallet className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
                Fluxo de Cobrança
              </h3>
              <div className="space-y-4">
                  {orders.map(order => (
                      <Card key={order.id} className="rounded-[32px] border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border-l-8" style={{ borderLeftColor: order.payments.every(p => p.status === 'Pago') ? '#22c55e' : '#f59e0b' }}>
                          <CardContent className="p-8">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">#{order.id} — {order.customer}</h4>
                                        {order.payments.every(p => p.status === 'Pago') ? (
                                          <Badge className="bg-green-100 text-green-700 border-green-200 rounded-full text-[10px] uppercase font-black tracking-widest px-3 h-6">Quitado</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-full text-[10px] uppercase font-black tracking-widest px-3 h-6">Pendente</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{order.paymentMethod} • {order.installments ? `${order.installments} parcelas` : 'Pagamento único'}</p>
                                  </div>
                                  <div className="text-left md:text-right">
                                      <p className="text-base font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Montante Total</p>
                                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {order.total.toFixed(2)}</p>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {order.payments.map((payment, idx) => (
                                      <motion.div 
                                        whileHover={{ scale: 1.02 }}
                                        key={payment.id} 
                                        className={cn(
                                          "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                          payment.status === 'Pago' 
                                            ? "bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/30" 
                                            : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                                        )}
                                      >
                                          <div className="space-y-0.5">
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{idx + 1}ª PARCELA</span>
                                              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", payment.status === 'Pago' ? "bg-green-500" : "bg-amber-500")} />
                                                {new Date(payment.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                              </div>
                                          </div>
                                          <div className="text-right space-y-2">
                                              <span className="font-black text-slate-900 dark:text-slate-100 block tracking-tight">R$ {payment.amount.toFixed(2)}</span>
                                              <Button 
                                                  variant={payment.status === 'Pago' ? 'secondary' : 'default'} 
                                                  size="sm" 
                                                  className={cn(
                                                    "h-7 px-4 text-[10px] font-black rounded-full uppercase tracking-widest transition-all",
                                                    payment.status === 'Pago' 
                                                      ? "bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-none" 
                                                      : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-lg"
                                                  )}
                                                  onClick={() => {
                                                      const updatedOrders = orders.map(o => {
                                                          if (o.id === order.id) {
                                                              const updatedPayments = o.payments.map(p => 
                                                                  p.id === payment.id ? { ...p, status: (p.status === 'Pago' ? 'Pendente' : 'Pago') as 'Pendente' | 'Pago' } : p
                                                              );
                                                              return { ...o, payments: updatedPayments };
                                                          }
                                                          return o;
                                                      });
                                                      setOrders(updatedOrders);
                                                  }}
                                              >
                                                  {payment.status === 'Pago' ? 'Pago' : 'Pagar'}
                                              </Button>
                                          </div>
                                      </motion.div>
                                  ))}
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>
      </motion.div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color, trend }: { title: string, value: string, icon: React.ReactNode, color: string, trend?: string }) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Card className="rounded-[24px] border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 overflow-hidden group">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform duration-300">
                            <div className={cn("w-6 h-6", color)}>{icon}</div>
                        </div>
                        {trend && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                {trend}
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{title}</p>
                        <div className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
                            {value}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
