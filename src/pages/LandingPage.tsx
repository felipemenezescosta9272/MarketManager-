import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight,
  Store,
  Zap,
  Package,
  BarChart3,
  ShieldCheck,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-amber-100 dark:selection:bg-amber-900/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Store className="text-white" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">Market<span className="text-amber-500">Manager</span></span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold text-sm hover:scale-105 transition-transform active:scale-95"
          >
            Acessar Sistema
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 sm:pt-48 sm:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Background Decorative Elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                A Nova Era da Gestão Comercial
              </span>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8">
                Transforme seu <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Negócio em Potência</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                A solução definitiva para quem busca agilidade no PDV, controle absoluto de estoque e inteligência estratégica para o seu negócio.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 group transition-all"
                >
                  Acessar Sistema
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Tudo o que você precisa para <span className="text-amber-500">crescer</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              Uma plataforma completa, intuitiva e poderosa para gerenciar todos os aspectos do seu negócio em um só lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="text-amber-500" size={24} />,
                title: "PDV Ultra Rápido",
                description: "Realize vendas em segundos com nossa interface otimizada para agilidade e facilidade de uso."
              },
              {
                icon: <Package className="text-blue-500" size={24} />,
                title: "Controle de Estoque",
                description: "Gestão inteligente de produtos, entradas, saídas e alertas de estoque baixo automáticos."
              },
              {
                icon: <BarChart3 className="text-emerald-500" size={24} />,
                title: "Relatórios Estratégicos",
                description: "Visualize o desempenho do seu negócio com gráficos detalhados e insights em tempo real."
              },
              {
                icon: <LayoutDashboard className="text-purple-500" size={24} />,
                title: "Gestão Financeira",
                description: "Controle total de fluxo de caixa, despesas e receitas para uma saúde financeira impecável."
              },
              {
                icon: <ShieldCheck className="text-rose-500" size={24} />,
                title: "Segurança em Nuvem",
                description: "Seus dados protegidos com criptografia de ponta e backups automáticos diários."
              },
              {
                icon: <Sparkles className="text-cyan-500" size={24} />,
                title: "Inteligência Artificial",
                description: "Insights preditivos de vendas e sugestões automáticas de reposição baseadas no comportamento do mercado."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 dark:bg-amber-500 rounded-[3rem] p-12 sm:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-8 relative z-10">
              Pronto para elevar o nível do seu negócio?
            </h2>
            <p className="text-white/80 text-lg mb-12 max-w-xl mx-auto relative z-10">
              Junte-se a centenas de empresas que já otimizaram seus processos com o Market Manager.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-12 py-5 bg-white text-slate-900 dark:text-amber-600 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-2xl relative z-10"
            >
              Criar Minha Conta
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Store size={20} />
            <span className="font-bold tracking-tighter uppercase italic">Market Manager</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Market Manager. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-amber-500 transition-colors text-sm font-bold">Termos</a>
            <a href="#" className="text-slate-500 hover:text-amber-500 transition-colors text-sm font-bold">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
