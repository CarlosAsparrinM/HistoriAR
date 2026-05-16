/**
 * Barra Lateral de Navegación (AppSidebar)
 * 
 * Renderiza el menú de navegación del panel administrativo, agrupado por secciones.
 * Aplica control de permisos para mostrar u ocultar entradas según el rol del usuario.
 * Muestra información del usuario autenticado y opción para cerrar sesión.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BarChart3,
  Building2,
  Camera,
  ChevronUp,
  BookOpen,
  FileText,
  Flag,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  Shield,
  Users,
  LogOut,
  Eye,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function AppSidebar() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Definición del árbol de navegación con permisos requeridos por item.
  const navigationItems = [
    {
      group: "Principal",
      items: [
        {
          path: "/dashboard",
          title: "Panel Principal",
          icon: LayoutDashboard,
          permission: "dashboard:read",
        },
      ],
    },
    {
      group: "Gestión de Contenido",
      items: [
        {
          path: "/monuments",
          title: "Monumentos",
          icon: Building2,
          permission: "content:read",
        },
        {
          path: "/institutions",
          title: "Instituciones",
          icon: MapPin,
          permission: "content:read",
        },
        {
          path: "/categories",
          title: "Categorías",
          icon: Flag,
          permission: "content:read",
        },
        {
          path: "/cultures",
          title: "Culturas",
          icon: BookOpen,
          permission: "content:read",
        },
        {
          path: "/ar-experiences",
          title: "Experiencias AR",
          icon: Camera,
          permission: "content:read",
        },
        {
          path: "/tours",
          title: "Recorridos",
          icon: MapPin,
          permission: "content:read",
        },
        {
          path: "/historical-data",
          title: "Fichas Históricas",
          icon: FileText,
          permission: "content:read",
        },
        {
          path: "/quizzes",
          title: "Quizzes",
          icon: HelpCircle,
          permission: "content:read",
        },
      ],
    },
    {
      group: "Usuarios",
      items: [
        {
          path: "/users",
          title: "Usuarios App",
          icon: Users,
          permission: "users:read",
        },
      ],
    },
  ];

  // Filtra grupos y elementos según permisos del usuario.
  const filteredNavigation = navigationItems.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">HistoriAR</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Renderizar los grupos de navegación visibles */}
        {filteredNavigation.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={location.pathname === item.path}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{user?.name || 'Usuario'}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user?.role?.replace('_', ' ') || 'usuario'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
