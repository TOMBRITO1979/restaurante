import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Trash2, User, Phone, Hash, Search, X, ArrowDown, ArrowUp } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  displayName: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  sku?: string;
  category?: { id: string; name: string };
  hasPromotion?: boolean;
  promotionDiscount?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const customerNameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (customerNameRef.current && !customerNameRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };

    if (showSuggestions || showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions, showCustomerSuggestions]);

  // Fetch customers when customerName changes (debounced)
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerName.trim().length < 2) {
        setCustomers([]);
        setShowCustomerSuggestions(false);
        return;
      }

      try {
        const response = await api.get(`/customers?search=${customerName}`);
        setCustomers(response.data);
        setShowCustomerSuggestions(true);
      } catch (error) {
        // Silently fail - don't show error for autocomplete
        setCustomers([]);
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [customerName]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?available=true');
      // Backend returns paginated response: {data: [...], pagination: {...}}
      const productsData = response.data?.data || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.displayName.toLowerCase().includes(search) ||
      (product.sku && product.sku.toLowerCase().includes(search)) ||
      (product.category?.name && product.category.name.toLowerCase().includes(search))
    );
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleProductSelect = (product: Product) => {
    addToCart(product);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setShowCustomerSuggestions(false);
  };

  const scrollToCart = () => {
    cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    // Try multiple methods to ensure scroll works on mobile
    // 1. Scroll window
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Scroll document elements (for older browsers)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 3. Find and scroll the main content container (Layout's main element)
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Calcula o preço final de um produto considerando desconto
  const getFinalPrice = (product: Product): number => {
    if (product.hasPromotion && product.promotionDiscount) {
      return Number(product.price) * (1 - Number(product.promotionDiscount) / 100);
    }
    return Number(product.price);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (getFinalPrice(item.product) * item.quantity), 0);
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
        unitPrice: getFinalPrice(item.product), // Usa preço com desconto aplicado
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">
              <span className="hidden lg:inline">Ponto de Venda (PDV)</span>
              <span className="lg:hidden">PDV</span>
            </h1>
            <button
              onClick={scrollToProducts}
              className="lg:hidden p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
              title="Ir para produtos"
            >
              <ArrowDown size={20} />
            </button>
          </div>
          <p className="text-gray-600 mt-1">Realize vendas e gerencie pedidos</p>
        </div>

        {/* Tipo de Pedido - Topo da Página */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pedido *</label>
              <select
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
              >
                <option value="dine_in">🍽️ Mesa/Salão</option>
                <option value="delivery">🛵 Delivery</option>
                <option value="takeout">🥡 Para Viagem</option>
              </select>
            </div>

            {deliveryType === 'dine_in' && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Número da Mesa *</label>
                <Hash className="absolute left-3 bottom-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Mesa 5"
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            )}

            <div className="relative" ref={customerNameRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cliente {deliveryType === 'delivery' ? '' : '(opcional)'}
              </label>
              <User className="absolute left-3 bottom-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nome ou telefone..."
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onFocus={() => customerName.trim().length >= 2 && setShowCustomerSuggestions(true)}
              />

              {/* Customer Autocomplete Suggestions */}
              {showCustomerSuggestions && customers.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {customers.slice(0, 8).map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 text-left transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                          <div className="flex flex-col gap-0.5 text-xs text-gray-500 mt-1">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {customer.phone}
                              </span>
                            )}
                            {customer.city && customer.state && (
                              <span className="truncate">{customer.city}, {customer.state}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone {deliveryType === 'delivery' ? '*' : '(opcional)'}
              </label>
              <Phone className="absolute left-3 bottom-3 text-gray-400" size={18} />
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Produtos */}
          <div className="lg:col-span-2" ref={productsRef}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Produtos Disponíveis</h2>
                <button
                  onClick={scrollToCart}
                  className="lg:hidden p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                  title="Ir para carrinho"
                >
                  <ArrowDown size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4 relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, SKU ou categoria..."
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 text-left transition-colors flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.displayName} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ShoppingCart size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{product.displayName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {product.category && <span>{product.category.name}</span>}
                            {product.sku && (
                              <>
                                <span>•</span>
                                <span>SKU: {product.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          {product.hasPromotion && product.promotionDiscount ? (
                            <>
                              <span className="text-xs text-gray-400 line-through">
                                R$ {Number(product.price).toFixed(2)}
                              </span>
                              <span className="font-bold text-green-600">
                                R$ {getFinalPrice(product).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-emerald-600">
                              R$ {Number(product.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length > 10 && (
                      <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                        +{filteredProducts.length - 10} produtos a mais...
                      </div>
                    )}
                  </div>
                )}

                {showSuggestions && filteredProducts.length === 0 && searchTerm.trim() && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
                    Nenhum produto encontrado para "{searchTerm}"
                  </div>
                )}
              </div>

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
                  {filteredProducts.map((product) => (
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
                      {product.hasPromotion && product.promotionDiscount && (
                        <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full mb-2">
                          -{product.promotionDiscount}%
                        </span>
                      )}
                      {product.hasPromotion && product.promotionDiscount ? (
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-400 line-through">
                            R$ {Number(product.price).toFixed(2)}
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {getFinalPrice(product).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-emerald-600">
                          R$ {Number(product.price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1" ref={cartRef}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollToTop}
                    className="lg:hidden p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                    title="Voltar ao topo"
                  >
                    <ArrowUp size={20} />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">Carrinho</h2>
                </div>
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
                          {item.product.hasPromotion && item.product.promotionDiscount ? (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400 line-through">R$ {Number(item.product.price).toFixed(2)}</p>
                              <p className="text-sm font-bold text-green-600">R$ {getFinalPrice(item.product).toFixed(2)}</p>
                              <span className="text-xs text-red-600">-{item.product.promotionDiscount}%</span>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">R$ {Number(item.product.price).toFixed(2)}</p>
                          )}
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

                  {/* Observações */}
                  <div className="border-t pt-4">
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
