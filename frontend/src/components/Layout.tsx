import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Building2,
  LogOut,
  ChefHat,
  Tag,
  ShoppingCart,
  ClipboardList,
  Receipt,
  TrendingDown,
  BarChart3,
  Settings as SettingsIcon,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const menuButton = document.getElementById('mobile-menu-button');
      if (isMobileMenuOpen && sidebar && menuButton &&
          !sidebar.contains(e.target as Node) &&
          !menuButton.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { icon: ShoppingCart, label: 'Vendas (PDV)', path: '/sales', roles: ['ADMIN', 'USER'], permission: 'sales' },
    { icon: ClipboardList, label: 'Pedidos', path: '/orders', roles: ['ADMIN', 'USER'], permission: 'orders' },
    { icon: Users, label: 'Clientes', path: '/customers', roles: ['ADMIN', 'USER'], permission: 'customers' },
    { icon: Receipt, label: 'Histórico de Vendas', path: '/sales-history', roles: ['ADMIN', 'USER'], permission: 'salesHistory' },
    { icon: ShoppingBag, label: 'Produtos', path: '/products', roles: ['ADMIN', 'USER'], permission: 'products' },
    { icon: Tag, label: 'Categorias', path: '/categories', roles: ['ADMIN', 'USER'], permission: 'categories' },
    { icon: TrendingDown, label: 'Contas a Pagar', path: '/expenses', roles: ['ADMIN'], permission: 'expenses' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports', roles: ['ADMIN'], permission: 'reports' },
    { icon: Users, label: 'Usuários', path: '/users', roles: ['ADMIN'], permission: 'users' },
    { icon: CreditCard, label: 'Stripe', path: '/payment-settings', roles: ['ADMIN'] },
    { icon: SettingsIcon, label: 'Configurações', path: '/settings', roles: ['ADMIN'] },
    { icon: Building2, label: 'Empresas', path: '/companies', roles: ['SUPER_ADMIN'] },
    { icon: Users, label: 'Todos os Usuários', path: '/all-users', roles: ['SUPER_ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    // Verificar role
    if (!item.roles.includes(user?.role || '')) {
      return false;
    }

    // SUPER_ADMIN e ADMIN tem acesso a tudo
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      return true;
    }

    // USER precisa ter permissão específica se o item requer permissão
    if (item.permission && user?.role === 'USER') {
      const hasPermission = user?.permissions?.[item.permission]?.view;
      return hasPermission === true;
    }

    // Se não requer permissão, permite acesso
    return true;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col bg-white shadow-xl border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-emerald-600 to-green-600 relative flex-shrink-0">
          <ChefHat className={`w-6 h-6 text-white ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && <h1 className="text-white text-xl font-bold">ChefWell</h1>}
          <button
            onClick={toggleSidebar}
            className="absolute right-2 text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="px-4 py-6 space-y-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all duration-200 group"
                title={isCollapsed ? item.label : ''}
              >
                <item.icon size={20} className={`group-hover:scale-110 transition-transform ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 pb-6">
          {!isCollapsed && (
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-600 mt-1 truncate">{user?.email}</p>
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                {user?.role}
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="mb-4 flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
            title={isCollapsed ? 'Sair' : ''}
          >
            <LogOut size={20} className={`group-hover:translate-x-1 transition-transform ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && 'Sair'}
          </button>
          {!isCollapsed && (
            <div className="text-center mt-2">
              <span className="text-xs text-gray-400">v1.0.7 • 16/11/2025</span>
            </div>
          )}
        </div>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        id="mobile-sidebar"
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:hidden flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 bg-gradient-to-r from-emerald-600 to-green-600 px-4 flex-shrink-0">
          <div className="flex items-center">
            <ChefHat className="w-6 h-6 text-white mr-2" />
            <h1 className="text-white text-xl font-bold">ChefWell</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white hover:bg-white/20 rounded-lg p-1"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="px-4 py-6 space-y-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all duration-200"
              >
                <item.icon size={20} className="mr-3" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 pb-6">
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-600 mt-1 truncate">{user?.email}</p>
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut size={20} className="mr-3" />
              Sair
            </button>
            <div className="text-center mt-2">
              <span className="text-xs text-gray-400">v1.0.7 • 16/11/2025</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 bg-white shadow-sm px-4 md:px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              id="mobile-menu-button"
              onClick={toggleMobileMenu}
              className="lg:hidden text-gray-700 hover:bg-gray-100 rounded-lg p-2"
            >
              <Menu size={24} />
            </button>
            <p className="text-sm md:text-base font-medium text-gray-700 truncate">
              {user?.company?.name || 'Sistema de Gestão'}
            </p>
          </div>
          <div className="lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">{children}</main>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
