import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Car, TrendingUp, BarChart, Sparkles, Wrench, Gauge, Shield,
  ChevronRight, Activity, DollarSign, CheckCircle2, Zap, MessageCircle, Brain, Lightbulb
} from "lucide-react";
import { useState, useEffect } from "react";
import dashboardImg from "@assets/image_1764685751623.png";
import metricsImg from "@assets/image_1764685752441.png";
import reportsImg from "@assets/image_1764685874050.png";
import veloBotImg from "@assets/image_1764686690039.png";

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      title: "Pipeline Visual",
      description: "Acompanhe cada veículo da entrada à venda em um kanban intuitivo",
      icon: TrendingUp,
      color: "from-green-400 to-green-600",
      demo: "Mova veículos entre os estágios: Entrada → Preparação → Pronto → Vendido"
    },
    {
      title: "Análise Completa",
      description: "Dashboard com métricas em tempo real e controle de custos detalhado",
      icon: BarChart,
      color: "from-blue-400 to-blue-600",
      demo: "Visualize lucros, margem, estoque e tendências de vendas"
    },
    {
      title: "IA Integrada",
      description: "Sugestões de preço e geração de anúncios com inteligência artificial",
      icon: Sparkles,
      color: "from-purple-400 to-purple-600",
      demo: "Gere anúncios profissionais e preços otimizados automaticamente"
    }
  ];

  const automations = [
    {
      icon: Wrench,
      title: "Checklists Completos",
      description: "Preparação padronizada para cada veículo"
    },
    {
      icon: Activity,
      title: "Rastreamento em Tempo Real",
      description: "Status de cada veículo atualizado instantaneamente"
    },
    {
      icon: DollarSign,
      title: "Gestão de Custos",
      description: "Controle precisão de gastos e lucratividade"
    },
    {
      icon: CheckCircle2,
      title: "Documentação Automática",
      description: "Relatórios e PDFs gerados com um clique"
    },
    {
      icon: Gauge,
      title: "Controle de Estoque",
      description: "Inventário sempre sincronizado e atualizado"
    },
    {
      icon: Shield,
      title: "Seguro Multi-tenant",
      description: "Seus dados sempre protegidos e isolados"
    }
  ];

  const veloBotPowers = [
    {
      icon: MessageCircle,
      title: "Assistência 24/7",
      description: "Respostas instantâneas para suas dúvidas e problemas"
    },
    {
      icon: Brain,
      title: "Inteligência Adaptativa",
      description: "Aprende com seu negócio e oferece sugestões personalizadas"
    },
    {
      icon: Lightbulb,
      title: "Recomendações Inteligentes",
      description: "Sugestões de preços otimizados e estratégias de vendas"
    },
    {
      icon: Zap,
      title: "Processamento Rápido",
      description: "Análise instantânea de dados e geração de insights"
    }
  ];

  const stats = [
    { value: "3x", label: "Mais rápido", subtext: "que spreadsheets" },
    { value: "100%", label: "Rastreável", subtext: "cada transação" },
    { value: "AI", label: "Otimizado", subtext: "por inteligência artificial" }
  ];

  return (
    <div className="w-full min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 z-50 transition-all duration-300"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              VeloStock
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost"
              onClick={() => window.location.href = '/login'}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => window.open('https://wa.me/5548999186426', '_blank')}
              data-testid="button-solicitar-demonstracao"
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-lg"
            >
              Demo Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-300 dark:border-green-700">
                <span className="text-green-700 dark:text-green-300 text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Transforme sua revenda automotiva
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
                <span className="block text-gray-900 dark:text-white mb-2">Gestão Completa</span>
                <span className="block bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  para Revenda de Veículos
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Controle total do estoque, preparação, custos e vendas em uma plataforma inteligente. 
                De spreadsheets caóticos para sistema profissional em minutos.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                    <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">{stat.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{stat.subtext}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button 
                size="lg"
                onClick={() => window.open('https://wa.me/5548999186426', '_blank')}
                data-testid="button-solicitar-demonstracao-hero"
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-lg px-8 py-6 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all w-full"
              >
                Comece Seu Teste Grátis <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Right side - Dashboard Image */}
            <div className="relative h-96 lg:h-full min-h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-2xl blur-3xl" />
              <img 
                src={dashboardImg}
                alt="Dashboard VeloStock"
                className="relative z-10 w-full h-full object-contain animate-float-slow filter drop-shadow-2xl rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Funcionalidades Poderosas
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Tudo que você precisa para gerenciar sua revenda de veículos
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              const isActive = activeFeature === idx;
              
              return (
                <Card 
                  key={idx}
                  onClick={() => setActiveFeature(idx)}
                  className={`group cursor-pointer overflow-hidden transition-all duration-300 ${
                    isActive 
                      ? 'ring-2 ring-blue-500 shadow-xl scale-105' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  <div className="p-8 space-y-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {feature.description}
                      </p>
                    </div>

                    {isActive && (
                      <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 animate-in fade-in">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-start gap-2">
                          <span className="mt-0.5">→</span>
                          <span>{feature.demo}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Metrics Section with Image */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative h-96 lg:h-full min-h-96 order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-2xl blur-3xl" />
              <img 
                src={metricsImg}
                alt="Métricas e Dashboard"
                className="relative z-10 w-full h-full object-contain animate-float filter drop-shadow-2xl rounded-xl"
              />
            </div>

            {/* Content */}
            <div className="space-y-8 order-1 lg:order-2">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  Visualize Tudo em Tempo Real
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Acompanhe métricas importantes do seu estoque com dashboards intuitivos e atualizados constantemente.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Prontos para venda, em preparação e em reparos",
                  "Margem média e lucratividade por veículo",
                  "Dias médios em estoque e rotatividade",
                  "Resumo financeiro com receitas vs despesas"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VeloBot Section */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* VeloBot Image */}
            <div className="relative h-96 lg:h-full min-h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-2xl blur-3xl" />
              <img 
                src={veloBotImg}
                alt="VeloBot - Assistente IA"
                className="relative z-10 w-full h-full object-contain animate-float-slow-reverse filter drop-shadow-2xl rounded-2xl"
              />
            </div>

            {/* VeloBot Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-300 dark:border-purple-700 mb-4">
                  <span className="text-purple-700 dark:text-purple-300 text-sm font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Powered by AI
                  </span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  VeloBot: Seu Assistente IA
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Um assistente inteligente que funciona 24/7, ajudando você a resolver problemas, responder dúvidas e otimizar seu negócio em tempo real. O VeloBot é o diferencial que transforma sua revenda.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {veloBotPowers.map((power, idx) => {
                  const Icon = power.icon;
                  return (
                    <div key={idx} className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900/50 hover:shadow-md transition-all group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{power.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{power.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-6">
                <p className="text-purple-900 dark:text-purple-100 font-semibold">
                  "Com o VeloBot, você tem um gestor IA na sua revenda, disponível a todo momento para ajudar a maximizar lucros e otimizar operações."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automation Features Grid */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo Automatizado
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Deixe o sistema trabalhar enquanto você vende
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automations.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:translate-y-[-4px]"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reports Section with Image */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  Relatórios Completos
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Análises detalhadas sobre seu negócio com gráficos, estatísticas e comparações.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Receitas, lucro liquido e margem de lucro",
                  "Análise de custos por veículo e categoria",
                  "Contas a pagar e receber com status atualizado",
                  "Exportar relatórios em PDF para compartilhar"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image */}
            <div className="relative h-96 lg:h-full min-h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-green-400/20 rounded-2xl blur-3xl" />
              <img 
                src={reportsImg}
                alt="Relatórios e Análises"
                className="relative z-10 w-full h-full object-contain animate-float-slow-reverse filter drop-shadow-2xl rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Resultados Reais
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Veja como o VeloStock transforma revendas automotivas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { metric: "↑ 45%", description: "Aumento na margem de lucro" },
              { metric: "↓ 60%", description: "Redução no tempo de gestão" },
              { metric: "↑ 3x", description: "Velocidade de vendas" }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {item.metric}
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Pronto para revolucionar sua revenda?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Teste o VeloStock com VeloBot gratuitamente. Sem cartão de crédito. Sem compromisso.
          </p>
          <Button 
            size="lg"
            onClick={() => window.open('https://wa.me/5548999186426', '_blank')}
            data-testid="button-demo-final"
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-lg px-8 py-6 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all"
          >
            Solicitar Demonstração <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 sm:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">VeloStock</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 VeloStock. Gestão inteligente para sua revenda automotiva.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
