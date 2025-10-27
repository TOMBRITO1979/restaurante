import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { ClipboardList, User, Phone, Hash, Truck, CheckCircle, Clock, DollarSign, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: 'pending' | 'delivered';
  notes?: string;
  createdAt: string;
  items: OrderItem[];
}

interface Tab {
  id: string;
  tableNumber?: string;
  deliveryType: 'dine_in' | 'delivery';
  customerName?: string;
  customerPhone?: string;
  status: 'open' | 'closed';
  total: number;
  createdAt: string;
  orders: Order[];
}

export const Orders: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'dine_in' | 'delivery'>('all');
  const [closingTab, setClosingTab] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    fetchTabs();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchTabs, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchTabs = async () => {
    try {
      const params = filter !== 'all' ? `?deliveryType=${filter}` : '';
      const response = await api.get(`/tabs${params}`);
      setTabs(response.data);
    } catch (error) {
      toast.error('Erro ao carregar comandas');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOrderDelivered = async (orderId: string) => {
    try {
      await api.patch(`/tabs/orders/${orderId}/delivered`);
      toast.success('Pedido marcado como entregue!');
      fetchTabs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar pedido');
    }
  };

  const handleCloseTab = async (tabId: string) => {
    if (!paymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    try {
      await api.post(`/tabs/${tabId}/close`, {
        paymentMethod,
        discount: discount || 0,
        tip: tip || 0,
        taxRate: taxRate || 0,
        amountPaid: amountPaid || 0,
      });
      toast.success('Conta fechada com sucesso!');
      setClosingTab(null);
      setPaymentMethod('');
      setDiscount(0);
      setTip(0);
      setTaxRate(0);
      setAmountPaid(0);
      fetchTabs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fechar conta');
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    return type === 'dine_in' ? 'Mesa/Salão' : 'Delivery';
  };

  const getDeliveryTypeIcon = (type: string) => {
    return type === 'dine_in' ? Hash : Truck;
  };

  const filteredTabs = tabs.filter(tab => {
    if (filter === 'all') return true;
    return tab.deliveryType === filter;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comandas Abertas</h1>
            <p className="text-gray-600 mt-1">Gerencie as comandas e pedidos em andamento</p>
          </div>
          <Button onClick={fetchTabs} variant="secondary">
            <Clock size={20} className="mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todos ({tabs.length})
          </button>
          <button
            onClick={() => setFilter('dine_in')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'dine_in'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Hash size={16} className="inline mr-1" />
            Mesa/Salão ({tabs.filter(t => t.deliveryType === 'dine_in').length})
          </button>
          <button
            onClick={() => setFilter('delivery')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'delivery'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Truck size={16} className="inline mr-1" />
            Delivery ({tabs.filter(t => t.deliveryType === 'delivery').length})
          </button>
        </div>

        {/* Lista de Comandas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : filteredTabs.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhuma comanda aberta</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTabs.map((tab) => {
              const DeliveryIcon = getDeliveryTypeIcon(tab.deliveryType);
              const isClosing = closingTab === tab.id;

              return (
                <Card key={tab.id}>
                  <div className="space-y-4">
                    {/* Cabeçalho da Comanda */}
                    <div className="flex items-start justify-between pb-4 border-b">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            tab.deliveryType === 'dine_in'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            <DeliveryIcon size={12} className="inline mr-1" />
                            {getDeliveryTypeLabel(tab.deliveryType)}
                          </span>
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Aberta
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Aberta em {format(new Date(tab.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    {/* Informações do Cliente */}
                    <div className="space-y-2">
                      {tab.tableNumber && tab.deliveryType === 'dine_in' && (
                        <div className="flex items-center text-sm">
                          <Hash size={16} className="text-gray-400 mr-2" />
                          <span className="text-gray-900 font-bold text-lg">Mesa {tab.tableNumber}</span>
                        </div>
                      )}
                      {tab.customerName && (
                        <div className="flex items-center text-sm">
                          <User size={16} className="text-gray-400 mr-2" />
                          <span className="text-gray-700">{tab.customerName}</span>
                        </div>
                      )}
                      {tab.customerPhone && (
                        <div className="flex items-center text-sm">
                          <Phone size={16} className="text-gray-400 mr-2" />
                          <span className="text-gray-700">{tab.customerPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Pedidos da Comanda */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-semibold text-gray-900">Pedidos:</h4>
                      {tab.orders && tab.orders.length > 0 ? (
                        tab.orders.map((order) => (
                          <div key={order.id} className={`border rounded-lg p-3 ${
                            order.status === 'delivered' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900">Pedido #{order.orderNumber}</span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  order.status === 'delivered'
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-yellow-200 text-yellow-800'
                                }`}>
                                  {order.status === 'delivered' ? 'Entregue' : 'Pendente'}
                                </span>
                              </div>
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleMarkOrderDelivered(order.id)}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                >
                                  <CheckCircle size={12} className="inline mr-1" />
                                  Entregue
                                </button>
                              )}
                            </div>
                            <div className="space-y-1">
                              {order.items?.map((item) => (
                                <div key={item.id} className="flex justify-between text-xs text-gray-700">
                                  <span>
                                    <span className="font-medium">{item.quantity}x</span> {item.productName}
                                  </span>
                                  <span className="font-medium">R$ {Number(item.totalPrice).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            {order.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">Obs: {order.notes}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum pedido adicionado</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total da Comanda:</span>
                        <span className="text-emerald-600">R$ {Number(tab.total).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Ações de Fechar Conta */}
                    {isClosing ? (
                      <div className="space-y-3 border-t pt-4 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                        <h4 className="font-semibold text-gray-900">Fechar Conta</h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento *</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="PIX">PIX</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              value={discount || ''}
                              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gorjeta (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              value={tip || ''}
                              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Imposto (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={taxRate || ''}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {(() => {
                          const subtotal = Number(tab.total);
                          const discountAmount = subtotal * (discount / 100);
                          const tipAmount = subtotal * (tip / 100);
                          const taxAmount = subtotal * (taxRate / 100);
                          const finalTotal = subtotal - discountAmount + tipAmount + taxAmount;
                          const changeAmount = amountPaid > 0 ? amountPaid - finalTotal : 0;

                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between text-sm text-gray-700">
                                <span>Subtotal:</span>
                                <span>R$ {subtotal.toFixed(2)}</span>
                              </div>
                              {discount > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                  <span>Desconto ({discount}%):</span>
                                  <span>- R$ {discountAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {tip > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>Gorjeta ({tip}%):</span>
                                  <span>+ R$ {tipAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {taxRate > 0 && (
                                <div className="flex justify-between text-sm text-blue-600">
                                  <span>Imposto ({taxRate}%):</span>
                                  <span>+ R$ {taxAmount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                                <span>Total Final:</span>
                                <span className="text-emerald-600">R$ {finalTotal.toFixed(2)}</span>
                              </div>

                              <div className="pt-2 border-t">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  value={amountPaid || ''}
                                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              {amountPaid > 0 && (
                                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                  <span className={changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {changeAmount >= 0 ? 'Troco:' : 'Falta:'}
                                  </span>
                                  <span className={changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    R$ {Math.abs(changeAmount).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex gap-2">
                          <Button
                            fullWidth
                            variant="secondary"
                            onClick={() => {
                              setClosingTab(null);
                              setPaymentMethod('');
                              setDiscount(0);
                              setTip(0);
                              setTaxRate(0);
                              setAmountPaid(0);
                            }}
                          >
                            <XCircle size={18} className="mr-2" />
                            Cancelar
                          </Button>
                          <Button
                            fullWidth
                            onClick={() => handleCloseTab(tab.id)}
                          >
                            <DollarSign size={18} className="mr-2" />
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        fullWidth
                        onClick={() => setClosingTab(tab.id)}
                        className="mt-4"
                      >
                        <DollarSign size={18} className="mr-2" />
                        Fechar Conta
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
