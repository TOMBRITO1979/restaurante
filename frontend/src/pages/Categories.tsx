import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Tag, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Category {
  id: string;
  name: string;
  description?: string;
  priority: number;
  productCount?: number;
}

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  priority: z.number().min(0, 'Prioridade deve ser maior ou igual a 0').default(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, productCount: number) => {
    if (productCount > 0) {
      toast.error('Não é possível deletar categoria com produtos');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar esta categoria?')) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Categoria deletada com sucesso');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar categoria');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      priority: category.priority,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      priority: 0,
    });
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, data);
        toast.success('Categoria atualizada com sucesso');
      } else {
        await api.post('/categories', data);
        toast.success('Categoria criada com sucesso');
      }

      handleCloseModal();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar categoria');
    }
  };

  const createDefaultCategories = async () => {
    try {
      const defaultCategories = [
        { name: 'Entradas', description: 'Petiscos e entradas', priority: 10 },
        { name: 'Pratos Principais', description: 'Pratos principais', priority: 9 },
        { name: 'Massas', description: 'Massas em geral', priority: 8 },
        { name: 'Carnes', description: 'Carnes variadas', priority: 7 },
        { name: 'Peixes e Frutos do Mar', description: 'Peixes e frutos do mar', priority: 6 },
        { name: 'Saladas', description: 'Saladas frescas', priority: 5 },
        { name: 'Sobremesas', description: 'Doces e sobremesas', priority: 4 },
        { name: 'Bebidas', description: 'Bebidas diversas', priority: 3 },
        { name: 'Sucos', description: 'Sucos naturais', priority: 2 },
        { name: 'Porções', description: 'Porções para compartilhar', priority: 1 },
      ];

      for (const cat of defaultCategories) {
        await api.post('/categories', cat);
      }

      toast.success('Categorias padrão criadas com sucesso');
      fetchCategories();
    } catch (error: any) {
      toast.error('Erro ao criar categorias padrão');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categorias</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie as categorias do cardápio</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {categories.length === 0 && !loading && (
              <Button variant="secondary" onClick={createDefaultCategories} className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2">
                <Tag size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">Criar Categorias Padrão</span>
                <span className="sm:hidden">Criar Padrões</span>
              </Button>
            )}
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2">
              <Plus size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">Nova Categoria</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Tag size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma categoria encontrada</p>
              <Button onClick={createDefaultCategories}>
                Criar Categorias Padrão
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 rounded-lg bg-emerald-100">
                        <Tag size={24} className="text-emerald-600" />
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Prioridade: {category.priority}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                    {category.description || 'Sem descrição'}
                  </p>

                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Package size={16} className="mr-2" />
                    <span>{category.productCount || 0} produtos</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => handleEdit(category)}
                    >
                      <Edit size={16} className="mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      fullWidth
                      onClick={() => handleDelete(category.id, category.productCount || 0)}
                      disabled={(category.productCount || 0) > 0}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Excluir
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
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome da Categoria *"
            placeholder="Ex: Entradas, Pratos Principais, Sobremesas"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
              placeholder="Descrição da categoria (opcional)"
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <Input
            label="Prioridade"
            type="number"
            placeholder="0"
            error={errors.priority?.message}
            {...register('priority', { valueAsNumber: true })}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> A prioridade define a ordem de exibição. Números maiores aparecem primeiro.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              {editingCategory ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
