import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { Product, Category, ProductVariation, ProductAddition } from '@/types';
import { Input } from './Input';
import { Button } from './Button';
import { Plus, Trash2 } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  displayName: z.string().min(1, 'Nome de exibição é obrigatório'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().optional(),
  price: z.string().min(1, 'Preço é obrigatório'),
  sku: z.string().optional(),
  prepTime: z.string().optional(),
  cost: z.string().optional(),
  stock: z.string().optional(),
  tags: z.string().optional(),
  hasPromotion: z.boolean(),
  promotionDiscount: z.string().optional(),
  nutritionalInfo: z.string().optional(),
  allergens: z.string().optional(),
  priority: z.string().optional(),
  isAvailable: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [variations, setVariations] = useState<ProductVariation[]>(product?.variations || []);
  const [additions, setAdditions] = useState<ProductAddition[]>(product?.additions || []);
  const [scheduleEnabled, setScheduleEnabled] = useState(!!product?.availableSchedule);
  const [scheduleStart, setScheduleStart] = useState(product?.availableSchedule?.start || '');
  const [scheduleEnd, setScheduleEnd] = useState(product?.availableSchedule?.end || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      displayName: product?.displayName || '',
      categoryId: product?.categoryId || '',
      description: product?.description || '',
      price: product?.price?.toString() || '',
      sku: product?.sku || '',
      prepTime: product?.prepTime?.toString() || '',
      cost: product?.cost?.toString() || '',
      stock: product?.stock?.toString() || '',
      tags: product?.tags?.join(', ') || '',
      hasPromotion: product?.hasPromotion || false,
      promotionDiscount: product?.promotionDiscount?.toString() || '',
      nutritionalInfo: product?.nutritionalInfo || '',
      allergens: product?.allergens || '',
      priority: product?.priority?.toString() || '0',
      isAvailable: product?.isAvailable ?? true,
    },
  });

  const hasPromotion = watch('hasPromotion');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addVariation = () => {
    setVariations([...variations, { name: '', value: '', priceAdjust: 0 }]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  };

  const addAddition = () => {
    setAdditions([...additions, { name: '', price: 0 }]);
  };

  const removeAddition = (index: number) => {
    setAdditions(additions.filter((_, i) => i !== index));
  };

  const updateAddition = (index: number, field: keyof ProductAddition, value: any) => {
    const updated = [...additions];
    updated[index] = { ...updated[index], [field]: value };
    setAdditions(updated);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);

      const formData = new FormData();

      formData.append('name', data.name);
      formData.append('displayName', data.displayName);
      formData.append('categoryId', data.categoryId);
      if (data.description) formData.append('description', data.description);
      formData.append('price', data.price);
      formData.append('isAvailable', String(data.isAvailable));
      if (data.sku) formData.append('sku', data.sku);
      if (data.prepTime) formData.append('prepTime', data.prepTime);
      if (data.cost) formData.append('cost', data.cost);
      if (data.stock) formData.append('stock', data.stock);

      const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      formData.append('tags', JSON.stringify(tags));

      formData.append('hasPromotion', String(data.hasPromotion));
      if (data.hasPromotion && data.promotionDiscount) {
        formData.append('promotionDiscount', data.promotionDiscount);
      }

      if (data.nutritionalInfo) formData.append('nutritionalInfo', data.nutritionalInfo);
      if (data.allergens) formData.append('allergens', data.allergens);
      formData.append('priority', data.priority || '0');

      if (scheduleEnabled && scheduleStart && scheduleEnd) {
        formData.append('availableSchedule', JSON.stringify({ start: scheduleStart, end: scheduleEnd }));
      }

      if (variations.length > 0) {
        formData.append('variations', JSON.stringify(variations));
      }

      if (additions.length > 0) {
        formData.append('additions', JSON.stringify(additions));
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (product) {
        await api.put(`/products/${product.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Produto atualizado com sucesso');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Produto criado com sucesso');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome do Produto *"
          placeholder="X-Burger"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Nome Visível no Cardápio *"
          placeholder="X-Burger Especial"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
          <select
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.categoryId ? 'border-red-500' : 'border-gray-300'
            }`}
            {...register('categoryId')}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
        </div>

        <Input
          label="Preço (R$) *"
          type="number"
          step="0.01"
          placeholder="25.90"
          error={errors.price?.message}
          {...register('price')}
        />

        <Input
          label="SKU / Código"
          placeholder="PROD-001"
          error={errors.sku?.message}
          {...register('sku')}
        />

        <Input
          label="Tempo de Preparo (min)"
          type="number"
          placeholder="20"
          error={errors.prepTime?.message}
          {...register('prepTime')}
        />

        <Input
          label="Custo de Produção (R$)"
          type="number"
          step="0.01"
          placeholder="10.00"
          error={errors.cost?.message}
          {...register('cost')}
        />

        <Input
          label="Estoque Disponível"
          type="number"
          placeholder="100"
          error={errors.stock?.message}
          {...register('stock')}
        />

        <Input
          label="Prioridade"
          type="number"
          placeholder="0"
          error={errors.priority?.message}
          {...register('priority')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Descrição do produto..."
          {...register('description')}
        />
      </div>

      <Input
        label="Tags (separadas por vírgula)"
        placeholder="vegano, sem glúten, picante"
        {...register('tags')}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Produto</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {imagePreview && (
          <div className="mt-2">
            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" {...register('isAvailable')} />
          <span className="text-sm font-medium text-gray-700">Produto disponível</span>
        </label>

        <label className="flex items-center">
          <input type="checkbox" className="mr-2" {...register('hasPromotion')} />
          <span className="text-sm font-medium text-gray-700">Produto em promoção</span>
        </label>

        {hasPromotion && (
          <Input
            label="Desconto (%)"
            type="number"
            step="0.01"
            placeholder="10"
            error={errors.promotionDiscount?.message}
            {...register('promotionDiscount')}
          />
        )}

        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">Disponível em horários específicos</span>
        </label>

        {scheduleEnabled && (
          <div className="grid grid-cols-2 gap-4 ml-6">
            <Input
              label="Horário Início"
              type="time"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
            />
            <Input
              label="Horário Fim"
              type="time"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      <Input
        label="Informações Nutricionais"
        placeholder="Calorias, proteínas, carboidratos..."
        {...register('nutritionalInfo')}
      />

      <Input
        label="Alergênicos"
        placeholder="Contém lactose, glúten, amendoim..."
        {...register('allergens')}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Variações (Tamanhos, Tipos)</h3>
          <Button type="button" size="sm" onClick={addVariation}>
            <Plus size={16} className="mr-1" />
            Adicionar
          </Button>
        </div>
        {variations.map((variation, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Nome (ex: Tamanho)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={variation.name}
              onChange={(e) => updateVariation(index, 'name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Valor (ex: Grande)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={variation.value}
              onChange={(e) => updateVariation(index, 'value', e.target.value)}
            />
            <input
              type="number"
              placeholder="Ajuste R$"
              step="0.01"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
              value={variation.priceAdjust}
              onChange={(e) => updateVariation(index, 'priceAdjust', parseFloat(e.target.value) || 0)}
            />
            <Button type="button" variant="danger" size="sm" onClick={() => removeVariation(index)}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Adicionais</h3>
          <Button type="button" size="sm" onClick={addAddition}>
            <Plus size={16} className="mr-1" />
            Adicionar
          </Button>
        </div>
        {additions.map((addition, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Nome (ex: Queijo extra)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={addition.name}
              onChange={(e) => updateAddition(index, 'name', e.target.value)}
            />
            <input
              type="number"
              placeholder="Preço R$"
              step="0.01"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
              value={addition.price}
              onChange={(e) => updateAddition(index, 'price', parseFloat(e.target.value) || 0)}
            />
            <Button type="button" variant="danger" size="sm" onClick={() => removeAddition(index)}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-4 border-t">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Salvando...' : product ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
};
