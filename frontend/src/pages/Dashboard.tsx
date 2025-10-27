import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/authStore';
import { ShoppingBag, Users, Building2, TrendingUp } from 'lucide-react';
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

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<DashboardStats>('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
            <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
          </Card>

          <Card title="Produtos em Destaque">
            <p className="text-gray-500 text-sm">Nenhum produto cadastrado</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
