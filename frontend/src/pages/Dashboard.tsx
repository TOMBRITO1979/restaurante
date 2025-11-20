import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/authStore';
import { ShoppingBag, Users, Building2, TrendingUp, Clock, Tag as TagIcon } from 'lucide-react';
import { api } from '@/services/api';

interface DashboardStats {
  totalProducts: number;
  salesToday: {
    count: number;
    revenue: number;
  };
  totalUsers: number;
  totalCompanies: number | null;
}

interface RecentSale {
  id: string;
  orderNumber: number;
  total: number;
  paymentMethod: string;
  closedAt: string;
  customer?: {
    name: string;
  };
}

interface FeaturedProduct {
  id: string;
  displayName: string;
  price: number;
  hasPromotion: boolean;
  promotionDiscount?: number;
  category?: {
    name: string;
  };
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const statsResponse = await api.get<DashboardStats>('/dashboard/stats');
        setStats(statsResponse.data);

        // Fetch recent sales
        const salesResponse = await api.get('/sales?limit=5');
        const salesData = salesResponse.data?.sales || salesResponse.data?.data || salesResponse.data;
        setRecentSales(Array.isArray(salesData) ? salesData.slice(0, 5) : []);

        // Fetch featured products (with promotion or top products)
        const productsResponse = await api.get('/products?limit=5');
        const productsData = productsResponse.data?.data || productsResponse.data;
        const products = Array.isArray(productsData) ? productsData : [];
        // Prioritize products with promotion
        const sortedProducts = products.sort((a: FeaturedProduct, b: FeaturedProduct) => {
          if (a.hasPromotion && !b.hasPromotion) return -1;
          if (!a.hasPromotion && b.hasPromotion) return 1;
          return 0;
        });
        setFeaturedProducts(sortedProducts.slice(0, 5));
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const dashboardStats = [
    {
      title: 'Total de Produtos',
      value: loading ? '...' : (stats?.totalProducts ?? 0).toString(),
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: 'Usuários Ativos',
      value: loading ? '...' : (stats?.totalUsers ?? 0).toString(),
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Empresas',
      value: loading ? '...' : (stats?.totalCompanies ?? 0).toString(),
      icon: Building2,
      color: 'bg-purple-500',
      visible: user?.role === 'SUPER_ADMIN',
    },
    {
      title: 'Vendas Hoje',
      value: loading ? '...' : formatCurrency(stats?.salesToday?.revenue ?? 0),
      subtitle: loading ? '' : `${stats?.salesToday?.count ?? 0} vendas`,
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ].filter((stat) => stat.visible !== false);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo, {user?.name}!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg mr-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {'subtitle' in stat && stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Atividade Recente">
            {loading ? (
              <p className="text-gray-500 text-sm">Carregando...</p>
            ) : recentSales.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Venda #{sale.orderNumber}</span>
                        {sale.customer && (
                          <span className="text-sm text-gray-600">- {sale.customer.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(sale.closedAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 capitalize">{sale.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600">{formatCurrency(sale.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Produtos em Destaque">
            {loading ? (
              <p className="text-gray-500 text-sm">Carregando...</p>
            ) : featuredProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum produto cadastrado</p>
            ) : (
              <div className="space-y-3">
                {featuredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{product.displayName}</span>
                        {product.hasPromotion && product.promotionDiscount && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full">
                            -{product.promotionDiscount}%
                          </span>
                        )}
                      </div>
                      {product.category && (
                        <div className="flex items-center gap-1 mt-1">
                          <TagIcon size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">{product.category.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {product.hasPromotion && product.promotionDiscount ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(product.price * (1 - product.promotionDiscount / 100))}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};
