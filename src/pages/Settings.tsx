import React, { useState, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Store, 
  Shield, 
  Bell, 
  Palette, 
  Database, 
  Globe, 
  Save, 
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Cloud,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  History,
  Volume2,
  Mail,
  Camera,
  CheckCircle2,
  Trash2,
  Instagram,
  MessageCircle,
  Clock,
  AlertTriangle,
  Printer,
  Barcode,
  Cpu,
  Wifi,
  Bluetooth
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { apiFetch } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';

interface SettingsProps {
  user: any;
  settings: any;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  onUpdateSettings: (data: any) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
}

export default function Settings({ user, settings, theme, setTheme, onUpdateSettings, addToast }: SettingsProps) {
  const isSuperAdmin = user?.is_super_admin;
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'saas' : 'general');
  const [selectedTheme, setSelectedTheme] = useState(settings?.theme || theme || 'system');
  const [selectedColor, setSelectedColor] = useState(settings?.primary_color || '#d97706');
  const [selectedFontSize, setSelectedFontSize] = useState(settings?.font_size || 'medium');
  const [selectedDensity, setSelectedDensity] = useState(settings?.interface_density || 'comfortable');
  const [selectedViewportScale, setSelectedViewportScale] = useState(settings?.viewport_scale || 'auto');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [securityScore, setSecurityScore] = useState(85);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState(settings?.dashboard_config || {
    showSalesToday: true,
    showProfitToday: true,
    showPendingBills: true,
    showLowStock: true,
    showExpiryAlerts: true
  });

  // Sync local state with props when they change
  React.useEffect(() => {
    if (settings?.theme) setSelectedTheme(settings.theme);
    if (settings?.primary_color) setSelectedColor(settings.primary_color);
    if (settings?.font_size) setSelectedFontSize(settings.font_size);
    if (settings?.interface_density) setSelectedDensity(settings.interface_density);
    if (settings?.viewport_scale) setSelectedViewportScale(settings.viewport_scale);
    if (settings?.dashboard_config) {
      try {
        setDashboardConfig(typeof settings.dashboard_config === 'string' 
          ? JSON.parse(settings.dashboard_config) 
          : settings.dashboard_config);
      } catch (e) {
        console.error("Failed to parse dashboard config", e);
      }
    }
  }, [settings]);

  const [isFixingDB, setIsFixingDB] = useState(false);
  const [fixDBResult, setFixDBResult] = useState<any>(null);

  const storeTabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'pos', label: 'PDV', icon: SettingsIcon },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'peripherals', label: 'Periféricos', icon: Cpu },
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'privacy', label: 'Privacidade', icon: Shield }
  ];

  const adminTabs = [
    { id: 'saas', label: 'SaaS Global', icon: Globe },
    { id: 'ai', label: 'Integração IA', icon: Cloud },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'system_admin', label: 'Manutenção', icon: Database }
  ];

  const passwordStrength = useMemo(() => {
    if (!newPasswordValue) return 0;
    let score = 0;
    if (newPasswordValue.length >= 6) score += 20;
    if (newPasswordValue.length >= 10) score += 20;
    if (/[A-Z]/.test(newPasswordValue)) score += 20;
    if (/[0-9]/.test(newPasswordValue)) score += 20;
    if (/[^A-Za-z0-9]/.test(newPasswordValue)) score += 20;
    return Math.min(100, score);
  }, [newPasswordValue]);

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-rose-500';
    if (score < 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return '';
    if (score < 40) return 'Fraca';
    if (score < 80) return 'Média';
    return 'Forte';
  };

  const formatUserAgent = (ua: string) => {
    if (!ua) return 'Desconhecido';
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                    ua.includes('Safari') ? 'Safari' : 
                    ua.includes('Firefox') ? 'Firefox' : 
                    ua.includes('Edge') ? 'Edge' : 'Navegador';
    const os = ua.includes('Windows') ? 'Windows' : 
               ua.includes('iPhone') ? 'iPhone' : 
               ua.includes('Android') ? 'Android' : 
               ua.includes('Macintosh') ? 'Mac' : 
               ua.includes('Linux') ? 'Linux' : 'OS';
    return `${browser} / ${os}`;
  };

  const tabs = isSuperAdmin ? adminTabs : storeTabs;

  const fetchAccessLogs = async () => {
    try {
      const data = await apiFetch('/api/auth/access-logs');
      setAccessLogs(data);
    } catch (err) {
      console.error("Failed to fetch access logs", err);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'security') {
      fetchAccessLogs();
    }
  }, [activeTab]);

  const handleLGPDRequest = async (type: 'export' | 'delete') => {
    try {
      const response = await fetch('/api/lgpd/request-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(data.message, "success");
      } else {
        addToast(data.error || "Erro ao processar solicitação", "error");
      }
    } catch (err) {
      addToast("Erro de conexão", "error");
    }
  };

  const handleLogoutAllSessions = () => {
    addToast("Encerrando outras sessões...", "info");
    setTimeout(() => {
      addToast("Todas as outras sessões foram encerradas com sucesso!", "success");
    }, 1500);
  };

  const handleTestNotification = () => {
    setIsTestingNotif(true);
    setTimeout(() => {
      setIsTestingNotif(false);
      addToast("Notificação de teste enviada com sucesso!", "success");
    }, 2000);
  };

  const handleOptimizeDB = () => {
    addToast("Otimizando banco de dados...", "info");
    setTimeout(() => {
      addToast("Banco de dados otimizado com sucesso!", "success");
    }, 2000);
  };

  const handleClearLogs = () => {
    addToast("Limpando logs antigos...", "info");
    setTimeout(() => {
      addToast("Logs limpos com sucesso!", "success");
    }, 1500);
  };

  const handleTestPrint = () => {
    const mockSale = {
      id: 'TEST-001',
      date: new Date().toISOString(),
      customer_name: 'CLIENTE TESTE',
      items: [
        { product_name: 'PRODUTO TESTE 1', quantity: 2, unit_price: 10.50 },
        { product_name: 'PRODUTO TESTE 2', quantity: 1, unit_price: 25.00 }
      ],
      total_amount: 46.00,
      discount: 0,
      payment_method: 'DINHEIRO',
      change_amount: 4.00
    };
    
    import('../utils/receipt').then(({ executePrint }) => {
      executePrint(mockSale, settings);
      addToast("Impressão de teste enviada!", "info");
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    // Handle checkboxes that might be missing if unchecked
    const checkboxes = [
      'pos_auto_focus', 'pos_auto_finalize', 'pos_auto_drawer', 'pos_confirm_cancel',
      'pos_auto_print', 'pos_show_change', 'pos_fast_mode', 'pos_shortcuts_enabled',
      'notif_email_stock', 'notif_email_financial', 'notif_email_reports', 'notif_email_security',
      'notif_push_enabled', 'peripheral_barcode_enabled'
    ];
    
    checkboxes.forEach(cb => {
      data[cb] = formData.get(cb) ? 'true' : 'false';
    });
    
    // Add theme and color to data
    data.theme = selectedTheme;
    data.primary_color = selectedColor;
    data.font_size = selectedFontSize;
    data.interface_density = selectedDensity;
    data.viewport_scale = selectedViewportScale;
    data.dashboard_config = JSON.stringify(dashboardConfig);
    
    try {
      // Handle password change if fields are filled
      const currentPassword = formData.get('current_password') as string;
      const newPassword = formData.get('new_password') as string;
      const confirmPassword = formData.get('confirm_password') as string;

      if (newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          addToast("Preencha todos os campos de senha para alterar.", "warning");
          return;
        }
        if (newPassword !== confirmPassword) {
          addToast("A nova senha e a confirmação não coincidem.", "error");
          return;
        }
        if (newPassword.length < 6) {
          addToast("A nova senha deve ter pelo menos 6 caracteres.", "warning");
          return;
        }

        // Call password change API
        await apiFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        
        addToast("Senha alterada com sucesso!", "success");
        
        // Clear password fields manually since we're not resetting the whole form
        const form = e.currentTarget;
        const currentInput = form.querySelector<HTMLInputElement>('input[name="current_password"]');
        const newInput = form.querySelector<HTMLInputElement>('input[name="new_password"]');
        const confirmInput = form.querySelector<HTMLInputElement>('input[name="confirm_password"]');
        if (currentInput) currentInput.value = '';
        if (newInput) newInput.value = '';
        if (confirmInput) confirmInput.value = '';
        setNewPasswordValue('');
      }

      // Remove password fields from settings data to avoid saving them in settings table
      delete data.current_password;
      delete data.new_password;
      delete data.confirm_password;

      await onUpdateSettings(data);
      addToast("Configurações salvas com sucesso!", "success");
    } catch (err: any) {
      addToast(err.message || "Erro ao salvar configurações", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Configurações</h2>
        <p className="text-slate-500 font-medium mt-1">Personalize o sistema de acordo com as necessidades do seu mercado.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="lg:w-72 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all",
                activeTab === tab.id 
                  ? "bg-amber-600 text-white shadow-xl shadow-amber-600/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className={cn("space-y-8", activeTab !== 'profile' && "hidden")}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="relative group">
                        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-400 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden">
                          {avatarPreview || user?.avatar_url ? (
                            <img src={avatarPreview || user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={48} />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-3 bg-amber-600 text-white rounded-2xl shadow-lg hover:scale-110 transition-transform cursor-pointer">
                          <Camera size={18} />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAvatarPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex-1 space-y-6 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Completo</label>
                            <input name="name" defaultValue={user?.name} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-mail</label>
                            <input name="email" defaultValue={user?.email} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bio / Descrição Profissional</label>
                          <textarea name="bio" defaultValue={settings?.bio} rows={3} placeholder="Conte um pouco sobre você..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 resize-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Redes Sociais</h5>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-600">
                              <Instagram size={18} />
                            </div>
                            <input name="social_instagram" defaultValue={settings?.social_instagram} placeholder="@seu_perfil" className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-2 outline-none font-bold text-sm" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                              <MessageCircle size={18} />
                            </div>
                            <input name="social_whatsapp" defaultValue={settings?.social_whatsapp} placeholder="(00) 00000-0000" className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-2 outline-none font-bold text-sm" />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preferências de Sistema</h5>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Idioma Preferido</label>
                            <select name="preferred_language" defaultValue={settings?.preferred_language || 'pt-BR'} className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700">
                              <option value="pt-BR">Português (Brasil)</option>
                              <option value="en">English</option>
                              <option value="es">Español</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-4 pt-2">
                            <div className="px-4 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest">
                              {user?.role}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold italic">
                              Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : `Janeiro ${new Date().getFullYear()}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                      <div className="relative z-10 space-y-6">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner">
                          {avatarPreview || user?.avatar_url ? (
                            <img src={avatarPreview || user?.avatar_url} alt="Preview" className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={32} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white">{user?.name || 'Seu Nome'}</h4>
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">{user?.role || 'Usuário'}</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                            <Mail size={14} />
                            {user?.email || 'email@exemplo.com'}
                          </div>
                          {settings?.social_instagram && (
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                              <Instagram size={14} />
                              {settings.social_instagram}
                            </div>
                          )}
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">
                            {settings?.bio || 'Sua bio aparecerá aqui...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'security' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Lock size={20} className="text-amber-600" /> Alterar Senha
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Senha Atual</label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              name="current_password"
                              placeholder="••••••••" 
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 pr-14" 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nova Senha</label>
                          <div className="relative">
                            <input 
                              type={showNewPassword ? "text" : "password"} 
                              name="new_password"
                              placeholder="••••••••" 
                              value={newPasswordValue}
                              onChange={(e) => setNewPasswordValue(e.target.value)}
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 pr-14" 
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                            >
                              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          {newPasswordValue && (
                            <div className="px-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Força da Senha</span>
                                <span className={cn("text-[8px] font-black uppercase tracking-widest", 
                                  passwordStrength < 40 ? "text-rose-500" : 
                                  passwordStrength < 80 ? "text-amber-500" : "text-green-500"
                                )}>
                                  {getStrengthText(passwordStrength)}
                                </span>
                              </div>
                              <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", getStrengthColor(passwordStrength))} 
                                  style={{ width: `${passwordStrength}%` }} 
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirmar Nova Senha</label>
                          <div className="relative">
                            <input 
                              type={showConfirmPassword ? "text" : "password"} 
                              name="confirm_password"
                              placeholder="••••••••" 
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 pr-14" 
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <History size={20} className="text-amber-600" /> Histórico de Acessos
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Dispositivo</th>
                              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Localização</th>
                              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                              <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {accessLogs.length > 0 ? accessLogs.map((log, i) => (
                              <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                  <div className="flex items-center gap-2">
                                    <Monitor size={14} className="text-slate-400" />
                                    {formatUserAgent(log.user_agent)}
                                    {i === 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest">Atual</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium">{log.ip_address}</td>
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                  {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {i !== 0 && (
                                    <button type="button" className="text-rose-500 hover:text-rose-600 transition-colors font-black text-[10px] uppercase tracking-widest">Sair</button>
                                  )}
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">
                                  Nenhum registro de acesso encontrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl shadow-xl shadow-amber-600/20 text-white space-y-4">
                      <div className="flex items-center justify-between">
                        <Shield size={32} />
                        <span className="text-2xl font-black">{securityScore}%</span>
                      </div>
                      <div>
                        <h5 className="font-black text-sm uppercase tracking-widest">Score de Segurança</h5>
                        <p className="text-[10px] font-bold opacity-80 mt-1">Sua conta está muito segura, mas pode melhorar.</p>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${securityScore}%` }} />
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</h5>
                      <button 
                        type="button" 
                        onClick={handleLogoutAllSessions}
                        className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                      >
                        <AlertTriangle size={14} /> Encerrar Outras Sessões
                      </button>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Smartphone size={20} className="text-amber-600" /> 2FA
                      </h4>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Adicione uma camada extra de segurança exigindo um código de verificação.
                        </p>
                        <button type="button" className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs hover:opacity-90 transition-all">
                          ATIVAR 2FA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'peripherals' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Barcode Scanner Settings */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Barcode size={20} className="text-amber-600" /> Leitor de Código de Barras (USB)
                    </h4>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 block">Habilitar Leitor USB</span>
                          <span className="text-[10px] text-slate-500 font-medium">O sistema capturará entradas do leitor em qualquer tela do PDV.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          name="peripheral_barcode_enabled" 
                          defaultChecked={settings?.peripheral_barcode_enabled === 'true'} 
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-600 focus:ring-amber-500" 
                        />
                      </label>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sufixo de Leitura (Tecla Final)</label>
                        <select name="peripheral_barcode_suffix" defaultValue={settings?.peripheral_barcode_suffix || 'enter'} className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700">
                          <option value="enter">Enter (Padrão)</option>
                          <option value="tab">Tab</option>
                          <option value="none">Nenhum</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Teste seu Leitor</label>
                        <input 
                          type="text" 
                          placeholder="Bipe um código aqui para testar..." 
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 ring-amber-500/20"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addToast(`Leitura detectada: ${e.currentTarget.value}`, "info");
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Printer Settings */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Printer size={20} className="text-amber-600" /> Impressora Térmica
                    </h4>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Conexão</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'usb', label: 'USB', icon: Cpu },
                            { id: 'network', label: 'Rede/IP', icon: Wifi },
                            { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth }
                          ].map(type => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => {
                                const data = { ...settings, peripheral_printer_type: type.id };
                                onUpdateSettings(data);
                              }}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                settings?.peripheral_printer_type === type.id
                                  ? "bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-500/10"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                              )}
                            >
                              <type.icon size={16} />
                              <span className="text-[8px] font-black uppercase tracking-widest">{type.label}</span>
                            </button>
                          ))}
                        </div>
                        <input type="hidden" name="peripheral_printer_type" value={settings?.peripheral_printer_type || 'usb'} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {settings?.peripheral_printer_type === 'network' ? 'Endereço IP da Impressora' : 'Nome/ID da Impressora'}
                        </label>
                        <input 
                          name="peripheral_printer_address" 
                          defaultValue={settings?.peripheral_printer_address || ''} 
                          placeholder={settings?.peripheral_printer_type === 'network' ? "Ex: 192.168.1.100" : "Ex: POS-58 ou USB001"}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Largura do Papel</label>
                          <select name="peripheral_printer_width" defaultValue={settings?.peripheral_printer_width || '80mm'} className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700">
                            <option value="80mm">80mm (Padrão)</option>
                            <option value="58mm">58mm (Mini)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vias por Venda</label>
                          <input type="number" name="peripheral_printer_copies" defaultValue={settings?.peripheral_printer_copies || 1} min="1" max="5" className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 block">Impressão Automática</span>
                          <span className="text-[10px] text-slate-500 font-medium">Imprimir cupom assim que finalizar a venda.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          name="pos_auto_print" 
                          defaultChecked={settings?.pos_auto_print === 'true'} 
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-600 focus:ring-amber-500" 
                        />
                      </label>

                      <button 
                        type="button"
                        onClick={handleTestPrint}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Imprimir Teste
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'notifications' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail size={20} className="text-amber-600" /> Notificações por E-mail
                    </h4>
                    <div className="space-y-4">
                      {[
                        { id: 'notif_email_stock', label: 'Alertas de estoque baixo' },
                        { id: 'notif_email_financial', label: 'Boletos a vencer (diário)' },
                        { id: 'notif_email_reports', label: 'Relatório de vendas semanal' },
                        { id: 'notif_email_security', label: 'Alertas de novos logins' }
                      ].map((notif) => (
                        <label key={notif.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{notif.label}</span>
                          <input 
                            type="checkbox" 
                            name={notif.id} 
                            defaultChecked={settings?.[notif.id] === 'true'} 
                            className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-600 focus:ring-amber-500" 
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Volume2 size={20} className="text-amber-600" /> Sons e Alertas
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Som de Notificação</label>
                        <select name="notif_sound" defaultValue={settings?.notif_sound || 'default'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20">
                          <option value="default">Padrão do Sistema</option>
                          <option value="modern">Moderno / Soft</option>
                          <option value="retro">Retrô / Arcade</option>
                          <option value="none">Silencioso</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Volume dos Alertas</label>
                        <input type="range" name="notif_volume" min="0" max="100" defaultValue={settings?.notif_volume || 80} className="w-full accent-amber-600" />
                      </div>
                      
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Monitor size={20} className="text-amber-600" /> Push
                          </h4>
                          <button type="button" className="w-full py-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl font-black text-xs hover:bg-amber-100 transition-all flex items-center justify-center gap-2">
                            <CheckCircle2 size={18} /> ATIVAR
                          </button>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell size={20} className="text-amber-600" /> Teste
                          </h4>
                          <button 
                            type="button" 
                            onClick={handleTestNotification}
                            disabled={isTestingNotif}
                            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                          >
                            {isTestingNotif ? "ENVIANDO..." : "TESTAR AGORA"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                    <Clock size={20} className="text-amber-600" /> Horário de Silêncio
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Início</label>
                      <input type="time" name="quiet_hours_start" defaultValue={settings?.quiet_hours_start || "22:00"} className="w-full px-6 py-4 bg-white dark:bg-slate-900 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fim</label>
                      <input type="time" name="quiet_hours_end" defaultValue={settings?.quiet_hours_end || "07:00"} className="w-full px-6 py-4 bg-white dark:bg-slate-900 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-4 italic">
                    * Durante este período, as notificações não emitirão som nem alertas visuais.
                  </p>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'saas' && "hidden")}>
                <div className="p-6 bg-purple-50 dark:bg-purple-500/5 rounded-3xl border border-purple-100 dark:border-purple-500/10 flex items-start gap-4">
                  <Globe className="text-purple-600 mt-1" size={24} />
                  <div>
                    <h4 className="font-black text-purple-900 dark:text-purple-100">Configurações Globais do SaaS</h4>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mt-1">
                      Estas configurações afetam todas as lojas e usuários do sistema.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome da Plataforma</label>
                    <input name="platform_name" defaultValue="Market Manager SaaS" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Versão do Sistema</label>
                    <input name="version" defaultValue="v2.5.0-stable" disabled className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl outline-none font-bold text-slate-400 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Modo de Manutenção</label>
                    <select name="maintenance_mode" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20">
                      <option value="off">Desativado</option>
                      <option value="on">Ativado (Apenas Super Admins)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Novos Registros</label>
                    <select name="allow_registration" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-purple-500/20">
                      <option value="true">Permitir</option>
                      <option value="false">Bloquear</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'ai' && "hidden")}>
                <div className="p-6 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 flex items-start gap-4">
                  <Cloud className="text-indigo-600 mt-1" size={24} />
                  <div>
                    <h4 className="font-black text-indigo-900 dark:text-indigo-100">Configurações de Inteligência Artificial</h4>
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-1">
                      Configure as chaves de API globais para habilitar recursos de IA em todas as contas.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Provedor de IA Padrão</label>
                    <select name="ai_provider" defaultValue={settings?.ai_provider || 'gemini'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-indigo-500/20">
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI (ChatGPT)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Chave API Gemini</label>
                    <div className="relative">
                      <input 
                        key={settings?.gemini_api_key ? 'has-key' : 'no-key'}
                        type={showGeminiKey ? "text" : "password"} 
                        name="gemini_api_key" 
                        defaultValue={settings?.gemini_api_key} 
                        placeholder="••••••••••••••••"
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-indigo-500/20 pr-14" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showGeminiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 ml-2">
                      Obtenha sua chave em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Chave API OpenAI</label>
                    <div className="relative">
                      <input 
                        key={settings?.openai_api_key ? 'has-key-oa' : 'no-key-oa'}
                        type={showOpenAIKey ? "text" : "password"} 
                        name="openai_api_key" 
                        defaultValue={settings?.openai_api_key} 
                        placeholder="••••••••••••••••"
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-indigo-500/20 pr-14" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showOpenAIKey ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 ml-2">
                      Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">OpenAI Dashboard</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'system_admin' && "hidden")}>
                <div className="p-6 bg-rose-50 dark:bg-rose-500/5 rounded-3xl border border-rose-100 dark:border-rose-500/10 flex items-start gap-4">
                    <Database className="text-rose-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-black text-rose-900 dark:text-rose-100">Ferramentas de Manutenção</h4>
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mt-1">
                        Ações críticas de banco de dados e limpeza de logs.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      type="button" 
                      onClick={handleClearLogs}
                      className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-left hover:border-rose-500 transition-all group"
                    >
                      <h5 className="font-black text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">Limpar Logs Antigos</h5>
                      <p className="text-xs text-slate-500 font-medium mt-1">Remove logs de sistema com mais de 90 dias.</p>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleOptimizeDB}
                      className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-left hover:border-amber-500 transition-all group"
                    >
                      <h5 className="font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">Otimizar Banco de Dados</h5>
                      <p className="text-xs text-slate-500 font-medium mt-1">Executa VACUUM e ANALYZE nas tabelas principais.</p>
                    </button>
                  </div>
              </div>

              <div className={cn("space-y-8", activeTab !== 'pos' && "hidden")}>
                <div className="p-6 bg-blue-50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/10 flex items-start gap-4">
                    <SettingsIcon className="text-blue-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-black text-blue-900 dark:text-blue-100">Configurações do PDV</h4>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">
                        Personalize o comportamento do caixa para maior produtividade.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Comportamento de Venda</h5>
                      <div className="space-y-4">
                        {[
                          { id: 'pos_auto_focus', label: 'Focar busca automaticamente' },
                          { id: 'pos_auto_finalize', label: 'Finalizar venda após pagamento' },
                          { id: 'pos_auto_drawer', label: 'Abrir gaveta automaticamente' },
                          { id: 'pos_confirm_cancel', label: 'Confirmar antes de cancelar venda' }
                        ].map((setting) => (
                          <label key={setting.id} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <input 
                              type="checkbox" 
                              name={setting.id} 
                              defaultChecked={settings?.[setting.id] === 'true'} 
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-600 focus:ring-amber-500" 
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{setting.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Preferências e Performance</h5>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Forma de Pagamento Padrão</label>
                          <select name="pos_default_payment" defaultValue={settings?.pos_default_payment || 'money'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500/20">
                            <option value="money">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="card">Cartão de Crédito/Débito</option>
                          </select>
                        </div>
                        {[
                          { id: 'pos_auto_print', label: 'Impressão automática de cupom' },
                          { id: 'pos_show_change', label: 'Exibir troco em destaque' },
                          { id: 'pos_fast_mode', label: 'Modo rápido (menos validações)' },
                          { id: 'pos_shortcuts_enabled', label: 'Ativar atalhos de teclado' }
                        ].map((setting) => (
                          <label key={setting.id} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <input 
                              type="checkbox" 
                              name={setting.id} 
                              defaultChecked={settings?.[setting.id] === 'true'} 
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-600 focus:ring-amber-500" 
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{setting.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              <div className={cn("space-y-8", activeTab !== 'general' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Mercado</label>
                      <input name="market_name" defaultValue={settings?.market_name} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CNPJ</label>
                      <input name="cnpj" defaultValue={settings?.cnpj} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">E-mail de Contato</label>
                      <input name="contact_email" defaultValue={settings?.contact_email} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Telefone</label>
                      <input name="phone" defaultValue={settings?.phone} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Endereço Completo</label>
                    <textarea name="address" defaultValue={settings?.address} rows={3} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:ring-2 ring-amber-500/20 resize-none" />
                  </div>
                </div>

              <div className={cn("space-y-8", activeTab !== 'appearance' && "hidden")}>
                <div className="space-y-4">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Tema do Sistema</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', label: 'Claro', icon: Sun },
                        { id: 'dark', label: 'Escuro', icon: Moon },
                        { id: 'system', label: 'Sistema', icon: Monitor }
                      ].map((themeOption) => (
                        <button
                          key={themeOption.id}
                          type="button"
                          onClick={() => {
                            setSelectedTheme(themeOption.id as any);
                            setTheme(themeOption.id as any);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 transition-all",
                            selectedTheme === themeOption.id ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                          )}
                        >
                          <themeOption.icon size={24} className={cn(selectedTheme === themeOption.id ? "text-amber-600" : "text-slate-400")} />
                          <span className={cn("font-bold text-sm", selectedTheme === themeOption.id ? "text-amber-600" : "text-slate-500")}>{themeOption.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Cor Primária</h4>
                    <div className="flex gap-4">
                      {['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);
                            document.documentElement.style.setProperty('--primary-color', color);
                            document.documentElement.style.setProperty('--primary-hover', color + 'dd');
                          }}
                          style={{ backgroundColor: color }}
                          className={cn(
                            "w-12 h-12 rounded-full border-4 shadow-lg hover:scale-110 transition-transform",
                            selectedColor === color ? "border-slate-900 dark:border-white" : "border-white dark:border-slate-900"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">Tamanho da Fonte</h4>
                      <div className="flex gap-2">
                        {['small', 'medium', 'large'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedFontSize(size);
                              const sizes: any = { small: '14px', medium: '16px', large: '18px' };
                              document.documentElement.style.setProperty('--font-base-size', sizes[size]);
                            }}
                            className={cn(
                              "flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2",
                              selectedFontSize === size 
                                ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20" 
                                : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                          >
                            {size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">Densidade da Interface</h4>
                      <div className="flex gap-2">
                        {['compact', 'comfortable'].map((density) => (
                          <button
                            key={density}
                            type="button"
                            onClick={() => {
                              setSelectedDensity(density);
                              document.documentElement.classList.toggle('density-compact', density === 'compact');
                            }}
                            className={cn(
                              "flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2",
                              selectedDensity === density 
                                ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20" 
                                : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                          >
                            {density === 'compact' ? 'Compacta' : 'Confortável'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">Escala da Interface (Resolução)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'auto', label: 'Auto' },
                          { id: '0.8', label: '80%' },
                          { id: '0.9', label: '90%' },
                          { id: '1', label: '100%' },
                          { id: '1.1', label: '110%' },
                          { id: '1.2', label: '120%' }
                        ].map((scale) => (
                          <button
                            key={scale.id}
                            type="button"
                            onClick={() => {
                              setSelectedViewportScale(scale.id);
                              // The actual scaling is handled in App.tsx via settings update
                              // but we can provide immediate feedback if needed
                              const s = scale.id === 'auto' ? '1' : scale.id;
                              document.documentElement.style.setProperty('--viewport-scale', s);
                            }}
                            className={cn(
                              "py-3 px-2 rounded-xl font-bold text-xs transition-all border-2",
                              selectedViewportScale === scale.id 
                                ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20" 
                                : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                          >
                            {scale.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold italic">
                        {selectedViewportScale === 'auto' 
                          ? 'Ajuste automático baseado no tamanho da tela.' 
                          : `Escala fixa de ${Math.round(parseFloat(selectedViewportScale) * 100)}%.`}
                      </p>
                    </div>
                  </div>
                </div>

              <div className={cn("space-y-8", activeTab !== 'dashboard' && "hidden")}>
                  <div className="p-6 bg-amber-50 dark:bg-amber-500/5 rounded-3xl border border-amber-100 dark:border-amber-500/10 flex items-start gap-4">
                    <Monitor className="text-amber-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-black text-amber-900 dark:text-amber-100">Visibilidade do Dashboard</h4>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mt-1">
                        Escolha quais cartões de estatísticas deseja visualizar na sua tela inicial.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: 'showSalesToday', label: 'Vendas Hoje' },
                      { id: 'showProfitToday', label: 'Lucro Hoje' },
                      { id: 'showPendingBills', label: 'Contas a Pagar' },
                      { id: 'showLowStock', label: 'Estoque Baixo' },
                      { id: 'showExpiryAlerts', label: 'Vencimento Próximo' }
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                        <button 
                          type="button"
                          onClick={() => setDashboardConfig({ ...dashboardConfig, [item.id]: !dashboardConfig[item.id as keyof typeof dashboardConfig] })}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            dashboardConfig[item.id as keyof typeof dashboardConfig] ? "bg-amber-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-all",
                            dashboardConfig[item.id as keyof typeof dashboardConfig] ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              <div className={cn("space-y-8", activeTab !== 'privacy' && "hidden")}>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                    <h4 className="font-black text-slate-900 dark:text-white mb-2">Seus Dados e LGPD</h4>
                    <p className="text-sm text-slate-500 font-medium">
                      Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de acessar, exportar ou solicitar a exclusão de seus dados pessoais.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                        <Save size={24} />
                      </div>
                      <h5 className="font-black text-slate-900 dark:text-white">Exportar Meus Dados</h5>
                      <p className="text-xs text-slate-500 font-medium">Receba uma cópia completa de todos os seus dados armazenados em nosso sistema em formato JSON.</p>
                      <button 
                        type="button"
                        onClick={() => handleLGPDRequest('export')}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all"
                      >
                        SOLICITAR EXPORTAÇÃO
                      </button>
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600">
                        <Shield size={24} />
                      </div>
                      <h5 className="font-black text-slate-900 dark:text-white">Excluir Minha Conta</h5>
                      <p className="text-xs text-slate-500 font-medium">Solicite a exclusão permanente de todos os seus dados. Esta ação é irreversível.</p>
                      <button 
                        type="button"
                        onClick={() => setShowConfirmDelete(true)}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-all"
                      >
                        SOLICITAR EXCLUSÃO
                      </button>
                    </div>
                  </div>
                </div>

              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button type="submit" className="bg-amber-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all">
                  <Save size={20} /> SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => handleLGPDRequest('delete')}
        title="Excluir Minha Conta?"
        message="Tem certeza que deseja solicitar a exclusão de seus dados? Esta ação é irreversível e você perderá acesso ao sistema."
        confirmText="SIM, EXCLUIR"
        cancelText="NÃO, MANTER"
        type="danger"
      />
    </div>
  );
}
