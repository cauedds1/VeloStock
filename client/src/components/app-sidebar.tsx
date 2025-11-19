import { LayoutDashboard, Car, Settings, BarChart3, StickyNote, CheckSquare, Users, UserPlus, Calendar, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/use-permissions";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Veículos",
    url: "/veiculos",
    icon: Car,
  },
  {
    title: "Leads",
    url: "/leads",
    icon: UserPlus,
  },
  {
    title: "Contas",
    url: "/contas",
    icon: DollarSign,
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
  },
  {
    title: "Observações Gerais",
    url: "/anotacoes",
    icon: StickyNote,
  },
  {
    title: "Checklists",
    url: "/checklists",
    icon: CheckSquare,
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: Users,
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { can } = usePermissions();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Filtra itens baseado em permissões
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.url === "/configuracoes") return can.companySettings;
    if (item.url === "/usuarios") return can.manageUsers;
    if (item.url === "/") return can.viewDashboard;
    if (item.url === "/contas") return can.viewBills;
    return true;
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img 
            src="/velostock-logo.svg" 
            alt="VeloStock" 
            className="h-14 w-auto object-contain"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
