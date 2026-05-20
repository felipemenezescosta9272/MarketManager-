import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_CHARS = 500;
const MAX_MESSAGES = 50;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  products?: any[];
  bills?: any[];
  batches?: any[];
  customers?: any[];
  suppliers?: any[];
  sales?: any[];
  settings?: any;
  stats?: any;
  user?: any;
}

export default function AIChat({ 
  products = [], 
  bills = [], 
  batches = [],
  customers = [],
  suppliers = [],
  sales = [],
  settings = {},
  stats = {},
  user = null
}: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (messages.filter(m => m.role === 'user').length >= MAX_MESSAGES) {
      setError('Limite de mensagens atingido para esta sessão.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      // Prepare context summary
      const productSummary = products.slice(0, 50).map(p => `${p.name} (Venda: R$ ${p.price}, Custo: R$ ${p.cost_price}, Est: ${p.stock_quantity})`).join(', ');
      const recentSales = sales.slice(0, 10).map(s => `Venda: R$ ${s.total_amount} (${new Date(s.created_at).toLocaleDateString()})`).join(', ');
      const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level).slice(0, 10).map(p => p.name).join(', ');
      
      const systemContext = `
        Você é o "Especialista de Gestão Inteligente", um consultor de negócios integrado a este sistema de PDV.
        Seu objetivo é fornecer análises precisas, insights estratégicos e suporte técnico rápido, cruzando dados financeiros e de estoque.
        
        Contexto Atual do Negócio:
        - Operador: ${user?.name || user?.email}
        - Inventário: ${products.length} produtos cadastrados.
        - Detalhes de Produtos (Top 50): ${productSummary}.
        - Alertas de Estoque: ${lowStock || 'Nenhum item em nível crítico'}.
        - Base de Clientes: ${customers.length} clientes fiéis.
        - Fluxo de Vendas: ${sales.length} transações totais.
        - Desempenho Recente: ${recentSales || 'Sem vendas recentes'}.
        - Saúde Financeira: ${bills.filter(b => b.status === 'Pendente').length} contas a pagar pendentes.
        - Resultado de Hoje: Faturamento R$ ${stats?.todayRevenue || 0}, Lucro R$ ${stats?.todayProfit || 0}.
        - Tendência (Últimos dias): ${JSON.stringify(stats?.salesTrend?.slice(-7) || [])}.
        
        Diretrizes de Resposta:
        1. Responda **estritamente** apenas o que for perguntado.
        2. **Cruze dados para precisão:** Use o 'cost_price' e 'price' dos produtos para calcular margens de lucro se solicitado. Use a 'salesTrend' para analisar crescimento ou queda.
        3. Seja consultivo e profissional, fundamentando-se nos dados fornecidos.
        4. Se perguntado sobre lucro ou rentabilidade, use os dados de 'todayProfit' e as margens dos produtos.
        5. Use Markdown para clareza (negrito, listas, tabelas).
        6. Se a pergunta for irrelevante ao negócio/sistema, redirecione gentilmente para o foco em gestão.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemContext,
          maxOutputTokens: 2048,
          temperature: 0.7,
        }
      });

      const aiResponse = response.text || "Desculpe, não consegui processar sua pergunta.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      setError('Erro ao conectar com a IA. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[calc(100vw-2rem)] sm:w-96 h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">Assistente IA</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 p-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <Sparkles size={32} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Como posso ajudar?</p>
                    <p className="text-[10px] text-slate-400 font-medium">Tire dúvidas rápidas sobre o sistema ou gestão.</p>
                  </div>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-amber-100 text-amber-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-xs leading-relaxed shadow-sm markdown-container",
                    msg.role === 'user' 
                      ? "bg-amber-600 text-white rounded-tr-none" 
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                  )}>
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
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 animate-pulse">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-tight border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Digite sua dúvida..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 ring-amber-500/20 resize-none custom-scrollbar"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-2 bottom-2 p-2 rounded-xl transition-all",
                    input.trim() && !isLoading 
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95" 
                      : "text-slate-300 cursor-not-allowed"
                  )}
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest",
                  input.length >= MAX_CHARS ? "text-rose-500" : "text-slate-400"
                )}>
                  {input.length}/{MAX_CHARS} caracteres
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {MAX_MESSAGES - messages.filter(m => m.role === 'user').length} envios restantes
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all",
          isOpen 
            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" 
            : "bg-amber-600 text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}
