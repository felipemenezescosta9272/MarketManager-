import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit3,
  FileText, 
  Download, 
  X,
  Package,
  ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { ShoppingListItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>(() => {
    const saved = localStorage.getItem('shopping_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'un', notes: '' });

  useEffect(() => {
    localStorage.setItem('shopping_list', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;

    if (editingItem) {
      setItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...item, ...newItem } : item
      ));
    } else {
      const item: ShoppingListItem = {
        id: Date.now().toString(),
        ...newItem
      };
      setItems(prev => [...prev, item]);
    }

    setNewItem({ name: '', quantity: 1, unit: 'un', notes: '' });
    setEditingItem(null);
    setShowModal(false);
  };

  const openEditModal = (item: ShoppingListItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const closeAndReset = () => {
    setShowModal(false);
    setEditingItem(null);
    setNewItem({ name: '', quantity: 1, unit: 'un', notes: '' });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearList = () => {
    setItems([]);
    setShowClearConfirm(false);
  };

  const generatePDF = () => {
    if (items.length === 0) return;

    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(20);
    doc.text('Lista de Compras / Pedido', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}`, 14, 30);

    const tableData = items.map((item, index) => [
      index + 1,
      item.name,
      `${item.quantity} ${item.unit}`,
      item.notes || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Item', 'Quantidade', 'Observações']],
      body: tableData,
      headStyles: { fillColor: [180, 83, 9] }, // amber-700
      styles: { font: 'helvetica', fontSize: 10 },
    });

    doc.save(`lista_compras_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Lista de Compras</h2>
          <p className="text-slate-500 font-medium mt-1">Organize seus pedidos e gere listas para fornecedores.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowClearConfirm(true)}
            disabled={items.length === 0}
            className="px-6 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 font-black rounded-2xl hover:bg-rose-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            LIMPAR LISTA
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
          >
            <Plus size={24} /> ADICIONAR ITEM
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-amber-600" size={24} />
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Itens na Lista</h3>
          </div>
          <button 
            onClick={generatePDF}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            <Download size={18} />
            GERAR PDF
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <ShoppingCart size={48} strokeWidth={1} />
                      <p className="font-bold uppercase tracking-widest text-xs">Sua lista está vazia</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900 dark:text-white">{item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg font-black text-sm">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 font-medium">{item.notes || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={closeAndReset} 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {editingItem ? 'Editar Item' : 'Adicionar Item'}
                </h3>
                <button onClick={closeAndReset} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddItem} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Item</label>
                  <input 
                    autoFocus
                    required
                    value={newItem.name}
                    onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Arroz 5kg"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quantidade</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      value={newItem.quantity}
                      onChange={e => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Unidade</label>
                    <select 
                      value={newItem.unit}
                      onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 appearance-none"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="pct">Pacote (pct)</option>
                      <option value="lt">Litro (lt)</option>
                      <option value="fardo">Fardo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Observações (Opcional)</label>
                  <textarea 
                    value={newItem.notes}
                    onChange={e => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ex: Marca específica, preço máximo..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 min-h-[100px] resize-none" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={closeAndReset} 
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all"
                  >
                    {editingItem ? 'SALVAR' : 'ADICIONAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowClearConfirm(false)} 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Limpar Lista?</h3>
              <p className="text-slate-500 font-medium mb-8">Esta ação removerá todos os itens da sua lista permanentemente.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearConfirm(false)} 
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  NÃO
                </button>
                <button 
                  onClick={clearList}
                  className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  SIM, LIMPAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
