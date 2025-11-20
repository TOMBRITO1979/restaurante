import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, Building2, Users, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Company {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  plan: string;
  _count?: {
    users: number;
  };
}

const companySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']),
  adminName: z.string().min(1, 'Nome do admin é obrigatório').optional().or(z.literal('')),
  adminEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  adminPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

export const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  const companyName = watch('name');

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-gerar slug a partir do nome
  useEffect(() => {
    if (companyName && !editingCompany) {
      const slug = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  }, [companyName, editingCompany, setValue]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await api.get(`/companies?${params.toString()}`);
      setCompanies(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta empresa? Todos os dados associados serão removidos!')) return;

    try {
      await api.delete(`/companies/${id}`);
      toast.success('Empresa deletada com sucesso');
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar empresa');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/companies/${id}`, { isActive: !isActive });
      toast.success(`Empresa ${!isActive ? 'ativada' : 'desativada'} com sucesso`);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar empresa');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    reset({
      name: company.name,
      slug: company.slug,
      plan: company.plan as any,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    reset({
      name: '',
      slug: '',
      plan: 'FREE',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (editingCompany) {
        // Ao editar, não enviar dados do admin
        const { adminName, adminEmail, adminPassword, ...companyData } = data;
        await api.put(`/companies/${editingCompany.id}`, companyData);
        toast.success('Empresa atualizada com sucesso');
      } else {
        // Ao criar, validar dados do admin
        if (!data.adminName || !data.adminEmail || !data.adminPassword) {
          toast.error('Preencha todos os dados do administrador');
          return;
        }

        await api.post('/companies', data);
        toast.success('Empresa e administrador criados com sucesso');
      }

      handleCloseModal();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar empresa');
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      FREE: 'bg-gray-100 text-gray-800',
      BASIC: 'bg-blue-100 text-blue-800',
      PRO: 'bg-purple-100 text-purple-800',
      ENTERPRISE: 'bg-orange-100 text-orange-800',
    };
    return colors[plan as keyof typeof colors] || colors.FREE;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
            <p className="text-gray-600 mt-1">Gerencie todas as empresas do sistema</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Nova Empresa
          </Button>
        </div>

        <Card>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar empresas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchCompanies()}
              />
            </div>
            <Button onClick={fetchCompanies}>Filtrar</Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${
                    company.isActive ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${company.isActive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <Building2 size={24} className={company.isActive ? 'text-emerald-600' : 'text-red-600'} />
                      </div>
                    </div>
                    {company.isActive ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <XCircle size={20} className="text-red-500" />
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">/{company.slug}</p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadge(company.plan)}`}>
                      {company.plan}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Users size={16} className="mr-2" />
                    <span>{company._count?.users || 0} usuários</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={company.isActive ? 'secondary' : 'primary'}
                      fullWidth
                      onClick={() => handleToggleActive(company.id, company.isActive)}
                    >
                      {company.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(company.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome da Empresa *"
            placeholder="Restaurante do João"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Slug (URL única) *"
            placeholder="restaurante-do-joao"
            error={errors.slug?.message}
            {...register('slug')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano *</label>
            <select
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.plan ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('plan')}
            >
              <option value="FREE">FREE - Plano Gratuito</option>
              <option value="BASIC">BASIC - Plano Básico</option>
              <option value="PRO">PRO - Plano Profissional</option>
              <option value="ENTERPRISE">ENTERPRISE - Plano Empresarial</option>
            </select>
            {errors.plan && <p className="mt-1 text-sm text-red-600">{errors.plan.message}</p>}
          </div>

          {!editingCompany && (
            <>
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Administrador</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Crie o primeiro usuário administrador desta empresa.
                </p>
              </div>

              <Input
                label="Nome do Admin *"
                placeholder="João Silva"
                error={errors.adminName?.message}
                {...register('adminName')}
              />

              <Input
                label="Email do Admin *"
                type="email"
                placeholder="admin@empresa.com"
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
              />

              <Input
                label="Senha do Admin *"
                type="password"
                placeholder="Mínimo 6 caracteres"
                error={errors.adminPassword?.message}
                {...register('adminPassword')}
              />
            </>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              {editingCompany ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
