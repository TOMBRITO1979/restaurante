import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Trash2, User, Phone, Hash } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  displayName: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: { id: string; name: string };
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export const Sales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryType, setDeliveryType] = useState('dine_in');
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?available=true');
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.displayName} adicionado ao carrinho`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
    setNotes('');
  };

  const handleAddOrder = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    // Validação: delivery precisa de telefone ou mesa precisa de número
    if (deliveryType === 'delivery' && !customerPhone) {
      toast.error('Para delivery, informe o telefone do cliente');
      return;
    }

    if (deliveryType === 'dine_in' && !tableNumber) {
      toast.error('Para pedidos no salão, informe o número da mesa');
      return;
    }

    setProcessing(true);

    try {
      // 1. Buscar ou criar comanda (tab)
      const tabResponse = await api.post('/tabs', {
        tableNumber: tableNumber || null,
        deliveryType,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      });

      const tab = tabResponse.data;

      // 2. Adicionar pedido à comanda
      const items = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.displayName,
        quantity: item.quantity,
        unitPrice: item.product.price,
        notes: item.notes || null
      }));

      await api.post(`/tabs/${tab.id}/orders`, {
        items,
        notes: notes || null
      });

      toast.success('Pedido adicionado com sucesso!');
      clearCart();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar pedido');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ponto de Venda (PDV)</h1>
          <p className="text-gray-600 mt-1">Realize vendas e gerencie pedidos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Produtos */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Produtos Disponíveis</h2>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum produto disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-emerald-500 transition-all cursor-pointer"
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingCart size={32} className="text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {product.displayName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">{product.category?.name}</p>
                      <p className="text-lg font-bold text-emerald-600">
                        R$ {Number(product.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Carrinho</h2>
                {cart.length > 0 && (
                  <Button variant="danger" size="sm" onClick={clearCart}>
                    Limpar
                  </Button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Itens do Carrinho */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">{item.product.displayName}</p>
                          <p className="text-sm text-gray-600">R$ {Number(item.product.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Dados do Cliente */}
                  <div className="space-y-3 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pedido *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={deliveryType}
                        onChange={(e) => setDeliveryType(e.target.value)}
                      >
                        <option value="dine_in">Mesa/Salão</option>
                        <option value="delivery">Delivery</option>
                      </select>
                    </div>

                    {deliveryType === 'dine_in' && (
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Nº da Mesa *"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Nome do Cliente (opcional)"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        placeholder={deliveryType === 'delivery' ? 'Telefone *' : 'Telefone (opcional)'}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observações do Pedido</label>
                    <textarea
                      placeholder="Ex: sem cebola, bem passado, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total do Pedido:</span>
                      <span className="text-emerald-600">R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botão Adicionar Pedido */}
                  <Button
                    fullWidth
                    onClick={handleAddOrder}
                    disabled={processing}
                  >
                    {processing ? 'Processando...' : 'Adicionar Pedido'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
