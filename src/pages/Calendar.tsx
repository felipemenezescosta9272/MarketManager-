import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  Users,
  Briefcase,
  Wallet,
  Settings,
  Search,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/utils';
import { apiFetch } from '@/src/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';

// Define Event Types
type EventType = 'Pedido' | 'Entrega' | 'Reunião' | 'Cobrança' | 'Visita Técnica' | 'Manutenção' | 'Atendimento' | 'Financeiro' | 'Tarefa';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: EventType;
  status: 'Pendente' | 'Em andamento' | 'Confirmado' | 'Concluído' | 'Cancelado' | 'Atrasado';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  customer?: string;
  location?: string;
  description?: string;
  responsible?: string;
  value?: number;
  tags?: string[];
  color?: string;
}

const EVENT_CONFIG: Record<EventType, { color: string, icon: React.ReactNode, bgColor: string }> = {
  'Pedido': { color: 'text-blue-600', bgColor: 'bg-blue-500', icon: <Package className="w-4 h-4" /> },
  'Entrega': { color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: <Truck className="w-4 h-4" /> },
  'Reunião': { color: 'text-purple-600', bgColor: 'bg-purple-500', icon: <Users className="w-4 h-4" /> },
  'Cobrança': { color: 'text-amber-600', bgColor: 'bg-amber-500', icon: <Wallet className="w-4 h-4" /> },
  'Visita Técnica': { color: 'text-indigo-600', bgColor: 'bg-indigo-500', icon: <Briefcase className="w-4 h-4" /> },
  'Manutenção': { color: 'text-slate-600', bgColor: 'bg-slate-500', icon: <Settings className="w-4 h-4" /> },
  'Atendimento': { color: 'text-pink-600', bgColor: 'bg-pink-500', icon: <Users className="w-4 h-4" /> },
  'Financeiro': { color: 'text-green-600', bgColor: 'bg-green-500', icon: <DollarSign className="w-4 h-4" /> },
  'Tarefa': { color: 'text-cyan-600', bgColor: 'bg-cyan-500', icon: <CheckCircle2 className="w-4 h-4" /> },
};

const STATUS_COLORS: Record<string, string> = {
  'Pendente': 'bg-slate-400',
  'Em andamento': 'bg-blue-500',
  'Confirmado': 'bg-indigo-500',
  'Concluído': 'bg-emerald-500',
  'Cancelado': 'bg-rose-500',
  'Atrasado': 'bg-amber-500',
};

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Entrega Especial - Cliente Maria',
    start: new Date().toISOString().split('T')[0] + 'T10:00:00',
    end: new Date().toISOString().split('T')[0] + 'T12:00:00',
    type: 'Entrega',
    status: 'Pendente',
    priority: 'Alta',
    customer: 'Maria Silva',
    location: 'Rua das Flores, 123',
    value: 450.00,
    color: '#10b981'
  },
  {
    id: '2',
    title: 'Reunião de Alinhamento Semanal',
    start: new Date().toISOString().split('T')[0] + 'T14:00:00',
    end: new Date().toISOString().split('T')[0] + 'T15:30:00',
    type: 'Reunião',
    status: 'Confirmado',
    priority: 'Média',
    responsible: 'João Almeida',
    color: '#8b5cf6'
  },
  {
    id: '3',
    title: 'Cobrança Pendente - Loja Sul',
    start: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T09:00:00',
    type: 'Cobrança',
    status: 'Atrasado',
    priority: 'Crítica',
    customer: 'Loja Sul Ltda',
    value: 1250.00,
    color: '#f59e0b'
  }
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [viewMode, setViewMode] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('dayGridMonth');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    try {
      const data = await apiFetch('/api/calendar/events');
      setEvents(data.map((e: any) => ({
        id: String(e.id),
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        type: e.type,
        status: e.status,
        priority: e.priority,
        customer: e.customer,
        location: e.location,
        description: e.description,
        responsible: e.responsible_id,
        value: e.value,
        tags: e.tags,
        color: e.color
      })));
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent({
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      status: 'Pendente',
      priority: 'Média',
      type: 'Tarefa'
    });
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsDialogOpen(true);
    }
  };

  const handleEventDrop = async (dropInfo: any) => {
    const event = events.find(e => e.id === dropInfo.event.id);
    if (!event) return;

    const updatedEvent = {
      ...event,
      start: dropInfo.event.startStr,
      end: dropInfo.event.endStr || event.end
    };

    try {
      await apiFetch(`/api/calendar/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...updatedEvent,
          start_at: updatedEvent.start,
          end_at: updatedEvent.end,
          responsible_id: updatedEvent.responsible
        })
      });
      setEvents(events.map(e => e.id === event.id ? updatedEvent : e));
    } catch (err) {
      console.error('Failed to update event position:', err);
      dropInfo.revert();
    }
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent?.title) return;

    try {
      const eventData = {
        title: selectedEvent.title,
        description: selectedEvent.description,
        start_at: selectedEvent.start,
        end_at: selectedEvent.end,
        type: selectedEvent.type,
        status: selectedEvent.status,
        priority: selectedEvent.priority,
        customer: selectedEvent.customer,
        location: selectedEvent.location,
        responsible_id: selectedEvent.responsible,
        value: selectedEvent.value,
        color: selectedEvent.color || EVENT_CONFIG[selectedEvent.type as EventType]?.bgColor,
        tags: selectedEvent.tags
      };

      if (selectedEvent.id) {
        await apiFetch(`/api/calendar/events/${selectedEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(eventData)
        });
      } else {
        await apiFetch('/api/calendar/events', {
          method: 'POST',
          body: JSON.stringify(eventData)
        });
      }
      
      await fetchEvents();
      setIsDialogOpen(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent?.id) {
      try {
        await apiFetch(`/api/calendar/events/${selectedEvent.id}`, {
          method: 'DELETE'
        });
        setEvents(events.filter(e => e.id !== selectedEvent.id));
        setIsDialogOpen(false);
        setSelectedEvent(null);
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.customer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 animate-in fade-in duration-700 bg-slate-50/50 dark:bg-slate-950/20 min-h-screen">
      
      {/* Sidebar Widgets */}
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Atividade</h2>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400">
              <MoreVertical size={18} />
            </Button>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Truck size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entregas</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">08</span>
                  <span className="text-xs font-bold text-emerald-500">+12%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atrasados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">03</span>
                  <span className="text-xs font-bold text-rose-500">-5%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <DollarSign size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financeiro</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">R$ 12k</span>
                  <span className="text-xs font-bold text-emerald-500">+8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Próximos</h2>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-600">Ver Todos</Button>
          </div>

          <div className="space-y-4">
            {events.slice(0, 3).map(event => (
              <motion.div 
                key={event.id}
                whileHover={{ x: 5 }}
                className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 group"
              >
                <div className={cn("absolute -left-[1.5px] top-0 bottom-0 w-[3px] rounded-full", EVENT_CONFIG[event.type].bgColor)} />
                <div className="py-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", EVENT_CONFIG[event.type].color)}>{event.type}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CalendarIcon size={160} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Produtividade AI</p>
          <h3 className="text-lg font-bold leading-tight mb-4">Otimize suas rotas de entrega hoje.</h3>
          <Button className="w-full rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border-none text-white font-bold h-12 shadow-none group">
            Começar Agora
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="flex-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden min-h-[800px]">
          
          {/* Custom Calendar Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Calendário Operacional</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Gestão centralizada de compromissos e entregas.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input 
                  placeholder="Pesquisar eventos..." 
                  className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger 
                  render={
                    <Button 
                      className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                      onClick={() => { setSelectedEvent(null); setIsDialogOpen(true); }}
                    >
                      <Plus className="mr-2 h-5 w-5" /> Novo Evento
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black tracking-tight">{selectedEvent?.id ? 'Editar Evento' : 'Novo Agendamento'}</DialogTitle>
                      <DialogDescription className="text-white/70 font-medium">Preencha os detalhes para organizar sua agenda.</DialogDescription>
                    </DialogHeader>
                  </div>
                  
                  <div className="p-8 space-y-6 bg-white dark:bg-slate-900 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título do Compromisso</label>
                        <Input 
                          placeholder="Ex: Entrega de Pedido #1234" 
                          className="h-12 rounded-2xl border-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 font-bold"
                          value={selectedEvent?.title || ''}
                          onChange={e => setSelectedEvent({...selectedEvent, title: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Evento</label>
                          <select 
                            className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50 dark:bg-slate-800 font-bold px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedEvent?.type || 'Tarefa'}
                            onChange={e => setSelectedEvent({...selectedEvent, type: e.target.value as EventType})}
                          >
                            {Object.keys(EVENT_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridade</label>
                          <select 
                            className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50 dark:bg-slate-800 font-bold px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedEvent?.priority || 'Média'}
                            onChange={e => setSelectedEvent({...selectedEvent, priority: e.target.value as any})}
                          >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Crítica">Crítica</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Início</label>
                          <Input 
                            type="datetime-local"
                            className="h-12 rounded-2xl border-slate-100 font-bold"
                            value={selectedEvent?.start?.slice(0, 16) || ''}
                            onChange={e => setSelectedEvent({...selectedEvent, start: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fim (Opcional)</label>
                          <Input 
                            type="datetime-local"
                            className="h-12 rounded-2xl border-slate-100 font-bold"
                            value={selectedEvent?.end?.slice(0, 16) || ''}
                            onChange={e => setSelectedEvent({...selectedEvent, end: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente / Endereço</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600" />
                          <Input 
                            placeholder="Nome do cliente ou logradouro" 
                            className="pl-12 h-12 rounded-2xl border-slate-100 font-bold"
                            value={selectedEvent?.location || ''}
                            onChange={e => setSelectedEvent({...selectedEvent, location: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                          <div className="flex flex-wrap gap-2 pt-2">
                             {['Pendente', 'Em andamento', 'Confirmado', 'Concluído', 'Cancelado'].map(s => (
                               <button
                                 key={s}
                                 onClick={() => setSelectedEvent({...selectedEvent, status: s as any})}
                                 className={cn(
                                   "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                   selectedEvent?.status === s 
                                     ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105" 
                                     : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-100"
                                 )}
                               >
                                 {s}
                               </button>
                             ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor (R$)</label>
                          <Input 
                            type="number"
                            placeholder="0,00"
                            className="h-12 rounded-2xl border-slate-100 font-bold"
                            value={selectedEvent?.value || ''}
                            onChange={e => setSelectedEvent({...selectedEvent, value: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observações</label>
                        <textarea 
                          className="w-full rounded-2xl border-slate-100 bg-slate-50 dark:bg-slate-800 p-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                          placeholder="Detalhes adicionais sobre o compromisso..."
                          value={selectedEvent?.description || ''}
                          onChange={e => setSelectedEvent({...selectedEvent, description: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                    {selectedEvent?.id && (
                      <Button 
                        variant="ghost" 
                        className="rounded-2xl h-12 px-6 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold"
                        onClick={handleDeleteEvent}
                      >
                        Excluir
                      </Button>
                    )}
                    <div className="flex gap-3 ml-auto">
                      <Button 
                        variant="ghost" 
                        onClick={() => setIsDialogOpen(false)} 
                        className="rounded-2xl h-12 px-6 font-bold"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveEvent}
                        className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20"
                      >
                        Salvar Compromisso
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mb-8 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl w-fit">
            {[
              { id: 'dayGridMonth', label: 'Mês', icon: <Layers size={14} /> },
              { id: 'timeGridWeek', label: 'Semana', icon: <Clock size={14} /> },
              { id: 'timeGridDay', label: 'Dia', icon: <CalendarIcon size={14} /> },
              { id: 'listWeek', label: 'Agenda', icon: <Filter size={14} /> },
            ].map(view => (
              <Button
                key={view.id}
                variant={viewMode === view.id ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "rounded-xl h-9 px-4 text-xs font-bold transition-all",
                  viewMode === view.id ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
                onClick={() => setViewMode(view.id as any)}
              >
                {view.icon}
                <span className="ml-2">{view.label}</span>
              </Button>
            ))}
          </div>

          {/* FullCalendar Integration */}
          <div className="calendar-container premium-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={viewMode}
              events={filteredEvents}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              locale={ptBrLocale}
              headerToolbar={false} // Hidden as we use custom header
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="800px"
              eventContent={(eventInfo) => {
                const event = events.find(e => e.id === eventInfo.event.id);
                if (!event) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "flex items-center gap-1.5 p-1 px-2 rounded-lg text-[10px] w-full border-l-2 shadow-sm transition-all hover:brightness-110",
                      EVENT_CONFIG[event.type].bgColor,
                      "border-white/20 text-white font-bold"
                    )}
                  >
                    {EVENT_CONFIG[event.type].icon}
                    <span className="truncate">{eventInfo.event.title}</span>
                  </motion.div>
                );
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        /* Premium Calendar Styling Override */
        .premium-calendar .fc {
          --fc-border-color: rgba(226, 232, 240, 0.4);
          --fc-button-bg-color: transparent;
          --fc-button-border-color: transparent;
          --fc-button-hover-bg-color: rgba(241, 245, 249, 1);
          --fc-button-active-bg-color: rgba(241, 245, 249, 1);
          --fc-today-bg-color: rgba(59, 130, 246, 0.03);
          font-family: inherit;
        }

        .dark .premium-calendar .fc {
          --fc-border-color: rgba(30, 41, 59, 0.5);
          --fc-today-bg-color: rgba(59, 130, 246, 0.05);
        }

        .premium-calendar .fc-theme-standard td, 
        .premium-calendar .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }

        .premium-calendar .fc-col-header-cell {
          padding: 1rem 0;
          background: transparent;
        }

        .premium-calendar .fc-col-header-cell-cushion {
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          color: #94a3b8;
          text-decoration: none !important;
        }

        .premium-calendar .fc-daygrid-day-number {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          padding: 0.75rem;
          text-decoration: none !important;
        }

        .premium-calendar .fc-day-today .fc-daygrid-day-number {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 99px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
        }

        .premium-calendar .fc-event {
          border-radius: 8px;
          padding: 0;
          margin: 2px 4px;
          border: none;
          cursor: pointer;
        }

        .premium-calendar .fc-day-other {
          opacity: 0.3;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
}
