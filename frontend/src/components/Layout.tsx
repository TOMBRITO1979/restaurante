import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { icon: ClipboardList, label: 'Pedidos', path: '/orders', roles: ['ADMIN', 'USER'] },
    { icon: ShoppingCart, label: 'Vendas (PDV)', path: '/sales', roles: ['ADMIN', 'USER'] },
    { icon: Receipt, label: 'Histórico de Vendas', path: '/sales-history', roles: ['ADMIN', 'USER'] },
    { icon: ShoppingBag, label: 'Produtos', path: '/products', roles: ['ADMIN', 'USER'] },
    { icon: Tag, label: 'Categorias', path: '/categories', roles: ['ADMIN', 'USER'] },
    { icon: TrendingDown, label: 'Despesas', path: '/expenses', roles: ['ADMIN'] },
    { icon: Users, label: 'Usuários', path: '/users', roles: ['ADMIN'] },
    { icon: Building2, label: 'Empresas', path: '/companies', roles: ['SUPER_ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 bg-white shadow-xl border-r border-gray-200">
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-emerald-600 to-green-600">
          <ChefHat className="w-6 h-6 text-white mr-2" />
          <h1 className="text-white text-xl font-bold">Restaurante SaaS</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all duration-200 group"
            >
              <item.icon size={20} className="mr-3 group-hover:scale-110 transition-transform" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <LogOut size={20} className="mr-3 group-hover:translate-x-1 transition-transform" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 bg-white shadow-sm px-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <p className="text-sm font-medium text-gray-700">
              {user?.company?.name || 'Sistema de Gestão'}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
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
