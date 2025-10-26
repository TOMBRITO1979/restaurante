import React from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/authStore';
import { ShoppingBag, Users, Building2, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Total de Produtos',
      value: '0',
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: 'Usuários Ativos',
      value: '0',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Empresas',
      value: '0',
      icon: Building2,
      color: 'bg-purple-500',
      visible: user?.role === 'SUPER_ADMIN',
    },
    {
      title: 'Vendas Hoje',
      value: 'R$ 0,00',
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
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg mr-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
