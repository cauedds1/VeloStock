import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "pt-BR" | "en-US";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  "pt-BR": {
    "common.loading": "Carregando...",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.add": "Adicionar",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.actions": "Ações",
    "common.confirm": "Confirmar",
    "common.back": "Voltar",
    "common.next": "Próximo",
    "common.previous": "Anterior",
    "common.yes": "Sim",
    "common.no": "Não",
    "common.all": "Todos",
    "common.none": "Nenhum",
    "common.close": "Fechar",
    "common.open": "Abrir",
    "common.view": "Visualizar",
    "common.details": "Detalhes",
    "common.status": "Status",
    "common.date": "Data",
    "common.value": "Valor",
    "common.total": "Total",
    "common.success": "Sucesso",
    "common.error": "Erro",
    "common.warning": "Aviso",
    "common.info": "Informação",

    "nav.dashboard": "Dashboard",
    "nav.vehicles": "Veículos",
    "nav.costs": "Custos",
    "nav.sales": "Vendas",
    "nav.reports": "Relatórios",
    "nav.bills": "Contas",
    "nav.leads": "Leads",
    "nav.users": "Usuários",
    "nav.settings": "Configurações",
    "nav.logout": "Sair",
    "nav.profile": "Perfil",

    "settings.title": "Configurações",
    "settings.company": "Empresa",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.notifications": "Notificações",
    "settings.security": "Segurança",
    "settings.selectLanguage": "Selecionar Idioma",
    "settings.languageDescription": "Escolha o idioma do sistema",

    "dashboard.title": "Dashboard",
    "dashboard.totalVehicles": "Total de Veículos",
    "dashboard.readyForSale": "Prontos para Venda",
    "dashboard.inProcess": "Em Preparação",
    "dashboard.soldThisMonth": "Vendidos este Mês",
    "dashboard.totalRevenue": "Receita Total",
    "dashboard.averageProfit": "Lucro Médio",
    "dashboard.recentActivity": "Atividade Recente",
    "dashboard.alerts": "Alertas",

    "vehicles.title": "Veículos",
    "vehicles.addVehicle": "Adicionar Veículo",
    "vehicles.brand": "Marca",
    "vehicles.model": "Modelo",
    "vehicles.year": "Ano",
    "vehicles.plate": "Placa",
    "vehicles.color": "Cor",
    "vehicles.mileage": "Quilometragem",
    "vehicles.purchasePrice": "Preço de Compra",
    "vehicles.salePrice": "Preço de Venda",
    "vehicles.status": "Status",
    "vehicles.location": "Localização",
    "vehicles.fipePrice": "Preço FIPE",
    "vehicles.noVehicles": "Nenhum veículo encontrado",
    "vehicles.searchPlaceholder": "Buscar veículos...",

    "vehicles.status.intake": "Entrada",
    "vehicles.status.preparation": "Preparação",
    "vehicles.status.ready": "Pronto",
    "vehicles.status.sold": "Vendido",

    "costs.title": "Custos",
    "costs.addCost": "Adicionar Custo",
    "costs.category": "Categoria",
    "costs.description": "Descrição",
    "costs.amount": "Valor",
    "costs.date": "Data",
    "costs.totalCosts": "Custos Totais",

    "sales.title": "Vendas",
    "sales.registerSale": "Registrar Venda",
    "sales.buyer": "Comprador",
    "sales.seller": "Vendedor",
    "sales.commission": "Comissão",
    "sales.profit": "Lucro",
    "sales.saleDate": "Data da Venda",

    "reports.title": "Relatórios",
    "reports.generate": "Gerar Relatório",
    "reports.export": "Exportar",
    "reports.period": "Período",
    "reports.salesReport": "Relatório de Vendas",
    "reports.inventoryReport": "Relatório de Estoque",
    "reports.financialReport": "Relatório Financeiro",

    "bills.title": "Contas",
    "bills.payable": "Contas a Pagar",
    "bills.receivable": "Contas a Receber",
    "bills.dueDate": "Data de Vencimento",
    "bills.paid": "Pago",
    "bills.pending": "Pendente",
    "bills.overdue": "Vencido",

    "leads.title": "Leads",
    "leads.name": "Nome",
    "leads.phone": "Telefone",
    "leads.email": "E-mail",
    "leads.interest": "Interesse",
    "leads.source": "Origem",
    "leads.followUp": "Acompanhamento",

    "users.title": "Usuários",
    "users.addUser": "Adicionar Usuário",
    "users.role": "Cargo",
    "users.roles.owner": "Proprietário",
    "users.roles.manager": "Gerente",
    "users.roles.seller": "Vendedor",
    "users.roles.driver": "Motorista",

    "auth.login": "Entrar",
    "auth.logout": "Sair",
    "auth.email": "E-mail",
    "auth.password": "Senha",
    "auth.forgotPassword": "Esqueci minha senha",
    "auth.register": "Cadastrar",
    "auth.welcomeBack": "Bem-vindo de volta",
    "auth.loginSubtitle": "Entre na sua conta para continuar",

    "velobot.title": "VeloBot",
    "velobot.placeholder": "Digite sua mensagem...",
    "velobot.greeting": "Olá! Sou o VeloBot, seu assistente inteligente. Como posso ajudar?",
    "velobot.thinking": "Pensando...",

    "alerts.title": "Alertas",
    "alerts.noAlerts": "Nenhum alerta",
    "alerts.markAsRead": "Marcar como lido",
    "alerts.viewAll": "Ver todos",

    "language.portuguese": "Português",
    "language.english": "Inglês",
  },
  "en-US": {
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.actions": "Actions",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.yes": "Yes",
    "common.no": "No",
    "common.all": "All",
    "common.none": "None",
    "common.close": "Close",
    "common.open": "Open",
    "common.view": "View",
    "common.details": "Details",
    "common.status": "Status",
    "common.date": "Date",
    "common.value": "Value",
    "common.total": "Total",
    "common.success": "Success",
    "common.error": "Error",
    "common.warning": "Warning",
    "common.info": "Information",

    "nav.dashboard": "Dashboard",
    "nav.vehicles": "Vehicles",
    "nav.costs": "Costs",
    "nav.sales": "Sales",
    "nav.reports": "Reports",
    "nav.bills": "Bills",
    "nav.leads": "Leads",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "nav.logout": "Logout",
    "nav.profile": "Profile",

    "settings.title": "Settings",
    "settings.company": "Company",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.notifications": "Notifications",
    "settings.security": "Security",
    "settings.selectLanguage": "Select Language",
    "settings.languageDescription": "Choose the system language",

    "dashboard.title": "Dashboard",
    "dashboard.totalVehicles": "Total Vehicles",
    "dashboard.readyForSale": "Ready for Sale",
    "dashboard.inProcess": "In Preparation",
    "dashboard.soldThisMonth": "Sold This Month",
    "dashboard.totalRevenue": "Total Revenue",
    "dashboard.averageProfit": "Average Profit",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.alerts": "Alerts",

    "vehicles.title": "Vehicles",
    "vehicles.addVehicle": "Add Vehicle",
    "vehicles.brand": "Brand",
    "vehicles.model": "Model",
    "vehicles.year": "Year",
    "vehicles.plate": "Plate",
    "vehicles.color": "Color",
    "vehicles.mileage": "Mileage",
    "vehicles.purchasePrice": "Purchase Price",
    "vehicles.salePrice": "Sale Price",
    "vehicles.status": "Status",
    "vehicles.location": "Location",
    "vehicles.fipePrice": "FIPE Price",
    "vehicles.noVehicles": "No vehicles found",
    "vehicles.searchPlaceholder": "Search vehicles...",

    "vehicles.status.intake": "Intake",
    "vehicles.status.preparation": "Preparation",
    "vehicles.status.ready": "Ready",
    "vehicles.status.sold": "Sold",

    "costs.title": "Costs",
    "costs.addCost": "Add Cost",
    "costs.category": "Category",
    "costs.description": "Description",
    "costs.amount": "Amount",
    "costs.date": "Date",
    "costs.totalCosts": "Total Costs",

    "sales.title": "Sales",
    "sales.registerSale": "Register Sale",
    "sales.buyer": "Buyer",
    "sales.seller": "Seller",
    "sales.commission": "Commission",
    "sales.profit": "Profit",
    "sales.saleDate": "Sale Date",

    "reports.title": "Reports",
    "reports.generate": "Generate Report",
    "reports.export": "Export",
    "reports.period": "Period",
    "reports.salesReport": "Sales Report",
    "reports.inventoryReport": "Inventory Report",
    "reports.financialReport": "Financial Report",

    "bills.title": "Bills",
    "bills.payable": "Accounts Payable",
    "bills.receivable": "Accounts Receivable",
    "bills.dueDate": "Due Date",
    "bills.paid": "Paid",
    "bills.pending": "Pending",
    "bills.overdue": "Overdue",

    "leads.title": "Leads",
    "leads.name": "Name",
    "leads.phone": "Phone",
    "leads.email": "Email",
    "leads.interest": "Interest",
    "leads.source": "Source",
    "leads.followUp": "Follow Up",

    "users.title": "Users",
    "users.addUser": "Add User",
    "users.role": "Role",
    "users.roles.owner": "Owner",
    "users.roles.manager": "Manager",
    "users.roles.seller": "Seller",
    "users.roles.driver": "Driver",

    "auth.login": "Login",
    "auth.logout": "Logout",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password",
    "auth.register": "Register",
    "auth.welcomeBack": "Welcome back",
    "auth.loginSubtitle": "Sign in to your account to continue",

    "velobot.title": "VeloBot",
    "velobot.placeholder": "Type your message...",
    "velobot.greeting": "Hello! I'm VeloBot, your intelligent assistant. How can I help you?",
    "velobot.thinking": "Thinking...",

    "alerts.title": "Alerts",
    "alerts.noAlerts": "No alerts",
    "alerts.markAsRead": "Mark as read",
    "alerts.viewAll": "View all",

    "language.portuguese": "Portuguese",
    "language.english": "English",
  },
};

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("velo-language");
    return (saved as Language) || "pt-BR";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("velo-language", lang);
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations["pt-BR"][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      });
    }
    
    return text;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}
