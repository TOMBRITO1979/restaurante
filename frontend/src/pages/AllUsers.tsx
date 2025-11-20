import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Search, UserCheck, Building2, Trash2, Ban } from 'lucide-react';

interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface Permissions {
  products?: Permission;
  categories?: Permission;
  sales?: Permission;
  orders?: Permission;
  expenses?: Permission;
  reports?: Permission;
  users?: Permission;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  permissions: Permissions;
  companyId: string | null;
  company?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
}

export const AllUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/all');
      setUsers(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.patch(`/users/${id}/activate`);
      toast.success('Usuário ativado com sucesso');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao ativar usuário');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Tem certeza que deseja suspender este usuário?')) return;

    try {
      await api.patch(`/users/${id}/suspend`);
      toast.success('Usuário suspenso com sucesso');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao suspender usuário');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja DELETAR este usuário? Esta ação não pode ser desfeita!')) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuário deletado com sucesso');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar usuário');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.company?.name.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'USER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Todos os Usuários</h1>
            <p className="text-gray-600 mt-1">Gerenciar todos os usuários do sistema</p>
          </div>
        </div>

        <Card>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, email ou empresa..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todas as funções</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissões
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.company ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <Building2 size={16} className="mr-2 text-gray-400" />
                            {user.company.name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {user.role === 'SUPER_ADMIN' ? (
                            <span className="text-red-600 font-semibold">Acesso Total</span>
                          ) : user.role === 'ADMIN' ? (
                            <span className="text-purple-600 font-semibold">Acesso Admin</span>
                          ) : user.permissions && Object.keys(user.permissions).length > 0 ? (
                            `${Object.keys(user.permissions).length} módulo(s)`
                          ) : (
                            'Nenhuma'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          {user.isActive ? (
                            <button
                              onClick={() => handleSuspend(user.id)}
                              className="text-orange-600 hover:text-orange-900 transition-colors"
                              title="Suspender usuário"
                            >
                              <Ban size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user.id)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Ativar usuário"
                            >
                              <UserCheck size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Deletar usuário"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 px-6 py-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Super Admins</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredUsers.filter((u) => u.role === 'SUPER_ADMIN').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Admins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredUsers.filter((u) => u.role === 'ADMIN').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Users</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredUsers.filter((u) => u.role === 'USER').length}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
