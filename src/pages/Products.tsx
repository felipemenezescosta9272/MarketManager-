import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  Barcode,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  History,
  X,
  LayoutGrid,
  List,
  Camera,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import BarcodeScanner from '../components/BarcodeScanner';

interface ProductsProps {
  products: any[];
  suppliers: any[];
  onAddProduct: (data: any) => Promise<void>;
  onUpdateProduct: (id: number, data: any) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
  settings?: any;
  onUpdateSettings?: (data: any) => Promise<void>;
}

export default function Products({ 
  products, 
  suppliers, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  addToast,
  settings,
  onUpdateSettings
}: ProductsProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings?.view_mode || 'grid');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  // Sync with settings
  useEffect(() => {
    if (settings?.view_mode) setViewMode(settings.view_mode);
  }, [settings]);

  // Update barcodeValue when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setBarcodeValue(editingProduct.barcode || '');
    } else {
      setBarcodeValue('');
    }
  }, [editingProduct, showModal]);

  const handleToggleView = async (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (onUpdateSettings) {
      try {
        await onUpdateSettings({ view_mode: mode });
      } catch (err) {
        console.error("Failed to save view mode preference", err);
      }
    }
  };

  const addToShoppingList = (product: any) => {
    const saved = localStorage.getItem('shopping_list');
    const items = saved ? JSON.parse(saved) : [];
    
    const existing = items.find((i: any) => i.name === product.name);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        id: Date.now().toString(),
        name: product.name,
        quantity: 1,
        unit: 'un',
        notes: `Adicionado via aba de produtos`
      });
    }
    
    localStorage.setItem('shopping_list', JSON.stringify(items));
    addToast(`${product.name} adicionado à lista de compras!`, "success");
  };

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'Sem Categoria')))];

  const handleAdjustStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const quantity = Number(formData.get('quantity'));
    const notes = formData.get('notes') as string;

    try {
      const response = await fetch('/api/inventory-logs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': JSON.parse(localStorage.getItem('user') || '{}').id
        },
        body: JSON.stringify({
          product_id: adjustingProduct.id,
          type,
          quantity,
          notes
        })
      });

      if (!response.ok) throw new Error('Erro ao ajustar estoque');
      
      addToast("Estoque ajustado com sucesso!", "success");
      setShowAdjustModal(false);
      setAdjustingProduct(null);
      
      // Trigger data refresh
      window.dispatchEvent(new CustomEvent('refresh-data'));
    } catch (err) {
      addToast("Erro ao ajustar estoque", "error");
    }
  };

  const filteredProducts = products.filter(p => {
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = 
      (p.name?.toLowerCase().includes(searchLower) || false) || 
      (p.barcode?.includes(search.trim()) || false) ||
      (p.category?.toLowerCase().includes(searchLower) || false);
    
    const matchesCategory = categoryFilter === 'Todos' || (p.category || 'Sem Categoria') === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, data);
        addToast("Produto atualizado com sucesso!", "success");
      } else {
        await onAddProduct(data);
        addToast("Produto cadastrado com sucesso!", "success");
      }
      setShowModal(false);
      setEditingProduct(null);
    } catch (err) {
      addToast("Erro ao salvar produto", "error");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestão de Estoque</h2>
          <p className="text-slate-500 font-medium mt-1">Gerencie seus produtos, preços e níveis de estoque.</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setShowModal(true); }}
          className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
        >
          <Plus size={24} /> NOVO PRODUTO
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, código de barras..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-2xl transition-all border border-slate-100 dark:border-slate-700"
            title="Escanear Código de Barras"
          >
            <Camera size={20} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => handleToggleView('grid')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => handleToggleView('list')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'list' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List size={20} />
            </button>
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="pl-12 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold text-slate-700 dark:text-white appearance-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
            >
              <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={64} className="text-slate-300 dark:text-slate-700" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setAdjustingProduct(product); setShowAdjustModal(true); }}
                    className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-emerald-600 shadow-lg hover:scale-110 transition-transform"
                    title="Ajustar Estoque"
                  >
                    <Plus size={18} />
                  </button>
                  <button 
                    onClick={() => { setEditingProduct(product); setShowModal(true); }}
                    className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-amber-600 shadow-lg hover:scale-110 transition-transform"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-rose-600 shadow-lg hover:scale-110 transition-transform"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => addToShoppingList(product)}
                    className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-blue-600 shadow-lg hover:scale-110 transition-transform"
                    title="Adicionar à Lista de Compras"
                  >
                    <ClipboardList size={18} />
                  </button>
                </div>
                {product.stock_quantity <= product.min_stock_level && (
                  <div className="absolute top-4 left-4 bg-rose-500 text-white px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                    <AlertTriangle size={12} /> ESTOQUE BAIXO
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{product.category}</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">{product.name}</h4>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Venda</p>
                    <p className="text-lg font-black text-amber-600">R$ {product.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque</p>
                    <p className={cn(
                      "text-lg font-black",
                      product.stock_quantity <= product.min_stock_level ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {product.stock_quantity} <span className="text-xs">un</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Barcode size={14} />
                    <span className="text-xs font-bold">{product.barcode || 'Sem código'}</span>
                  </div>
                  <button 
                    onClick={() => window.location.href = `/inventory?product=${product.id}`}
                    className="text-slate-400 hover:text-amber-600 transition-colors"
                    title="Ver Histórico"
                  >
                    <History size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estoque</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{product.name}</p>
                        <p className="text-xs font-bold text-slate-400">{product.barcode || 'Sem código'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-black text-amber-600">R$ {product.price.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <p className={cn(
                        "font-black",
                        product.stock_quantity <= product.min_stock_level ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {product.stock_quantity} un
                      </p>
                      {product.stock_quantity <= product.min_stock_level && (
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Estoque Baixo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setAdjustingProduct(product); setShowAdjustModal(true); }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                        title="Ajustar Estoque"
                      >
                        <Plus size={18} />
                      </button>
                      <button 
                        onClick={() => { setEditingProduct(product); setShowModal(true); }}
                        className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => window.location.href = `/inventory?product=${product.id}`}
                        className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Histórico"
                      >
                        <History size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteProduct(product.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => addToShoppingList(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Adicionar à Lista de Compras"
                      >
                        <ClipboardList size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredProducts.map(product => (
            <div key={product.id} className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{product.category}</span>
                    {product.stock_quantity <= product.min_stock_level && (
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} /> BAIXO
                      </span>
                    )}
                  </div>
                  <p className="font-black text-slate-900 dark:text-white truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-black text-amber-600 text-sm">R$ {product.price.toFixed(2)}</p>
                    <p className={cn(
                      "font-black text-xs",
                      product.stock_quantity <= product.min_stock_level ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {product.stock_quantity} un
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                  <Barcode size={14} />
                  <span className="text-[10px] font-bold">{product.barcode || 'Sem código'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setAdjustingProduct(product); setShowAdjustModal(true); }}
                    className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={() => { setEditingProduct(product); setShowModal(true); }}
                    className="p-2 text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-lg"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => window.location.href = `/inventory?product=${product.id}`}
                    className="p-2 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    <History size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => addToShoppingList(product)}
                    className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                    title="Adicionar à Lista de Compras"
                  >
                    <ClipboardList size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-4 lg:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Produto</label>
                      <input name="name" defaultValue={editingProduct?.name} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Código de Barras</label>
                      <div className="flex gap-2">
                        <input 
                          name="barcode" 
                          value={barcodeValue}
                          onChange={(e) => setBarcodeValue(e.target.value)}
                          className="flex-1 px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" 
                        />
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="p-3 lg:p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-xl lg:rounded-2xl transition-all"
                        >
                          <Camera size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoria</label>
                      <input name="category" defaultValue={editingProduct?.category} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fornecedor</label>
                      <select name="supplier_id" defaultValue={editingProduct?.supplier_id} className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base">
                        <option value="">Selecione um fornecedor</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço de Custo</label>
                      <input name="cost_price" type="number" step="0.01" defaultValue={editingProduct?.cost_price} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço de Venda</label>
                      <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estoque Inicial</label>
                      <input name="stock_quantity" type="number" defaultValue={editingProduct?.stock_quantity || 0} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estoque Mínimo</label>
                      <input name="min_stock_level" type="number" defaultValue={editingProduct?.min_stock_level || 5} required className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URL da Imagem</label>
                    <input name="image_url" defaultValue={editingProduct?.image_url} className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 text-sm lg:text-base" placeholder="https://exemplo.com/imagem.jpg" />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-xl lg:rounded-2xl hover:bg-slate-200 transition-all text-sm lg:text-base">
                      CANCELAR
                    </button>
                    <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black rounded-xl lg:rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all text-sm lg:text-base">
                      SALVAR
                    </button>
                  </div>
                </form>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {showAdjustModal && adjustingProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[3rem] max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">Ajustar Estoque</h3>
                  <p className="text-[10px] lg:text-sm text-slate-400 font-bold uppercase tracking-widest">{adjustingProduct.name}</p>
                </div>
                <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="p-6 lg:p-8 space-y-4 lg:space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de Ajuste</label>
                  <select 
                    name="type"
                    required
                    className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-sm lg:text-base text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="Entrada">Entrada (+)</option>
                    <option value="Saída">Saída (-)</option>
                    <option value="Ajuste">Ajuste Direto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                  <input 
                    type="number"
                    name="quantity"
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-sm lg:text-base text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Observações</label>
                  <textarea 
                    name="notes"
                    placeholder="Motivo do ajuste..."
                    className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-sm lg:text-base text-slate-900 dark:text-white min-h-[80px] lg:min-h-[100px]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 px-4 lg:px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-xl lg:rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs lg:text-sm"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 lg:px-8 py-4 bg-amber-600 text-white font-black rounded-xl lg:rounded-2xl hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all text-xs lg:text-sm"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner 
            onScan={(code) => {
              if (showModal) {
                setBarcodeValue(code);
              } else {
                setSearch(code);
              }
              setIsScannerOpen(false);
              addToast("Código lido com sucesso!", "success");
            }}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
