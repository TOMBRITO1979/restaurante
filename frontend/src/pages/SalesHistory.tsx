import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Receipt, Calendar, CreditCard, User, Phone, Hash, Filter, FileText, Download, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';

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
  status: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
}

interface Sale {
  id: string;
  saleNumber: number;
  tabId: string;
  tableNumber?: string;
  deliveryType: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  tipRate: number;
  tipAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  items: Order[];
  createdAt: string;
  closedAt: string;
}

interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
}

export const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros e estatísticas
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<SalesStats | null>(null);

  useEffect(() => {
    fetchSales();
    fetchStats();
  }, [currentPage, startDate, endDate]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/sales?${params.toString()}`);
      setSales(response.data.sales);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Erro ao carregar histórico de vendas:', error);
      toast.error('Erro ao carregar histórico de vendas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/sales/stats?${params.toString()}`);
      setStats(response.data.overall);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getDeliveryTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      dine_in: 'Mesa/Salão',
      delivery: 'Delivery',
      takeout: 'Para Viagem',
    };
    return types[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
    };
    return methods[method] || method;
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/sales/export/pdf?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendas_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF exportado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao exportar PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/sales/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendas_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('CSV exportado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao exportar CSV');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Vendas</h1>
            <p className="text-gray-600 mt-1">
              Visualize todas as vendas finalizadas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Vendas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.totalSales}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <ShoppingCart className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(parseFloat(stats.totalRevenue.toString()))}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <TrendingUp className="text-emerald-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(parseFloat(stats.averageTicket.toString()))}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <DollarSign className="text-purple-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filtros</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                title="Exportar para PDF"
              >
                <FileText size={18} />
                PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                title="Exportar para CSV"
              >
                <Download size={18} />
                CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {startDate && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {endDate && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-gray-600">
                As vendas finalizadas aparecer�o aqui
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Receipt size={20} className="text-blue-600" />
                          <span className="font-semibold text-lg">
                            Venda #{sale.saleNumber}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {getDeliveryTypeLabel(sale.deliveryType)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} />
                          <span>{formatDate(sale.closedAt)}</span>
                        </div>

                        {sale.tableNumber && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Hash size={16} />
                            <span>Mesa {sale.tableNumber}</span>
                          </div>
                        )}

                        {sale.customerName && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <User size={16} />
                            <span>{sale.customerName}</span>
                          </div>
                        )}

                        {sale.customerPhone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={16} />
                            <span>{sale.customerPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard size={16} />
                          <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(sale.total)}
                      </div>
                      {sale.discountAmount > 0 && (
                        <div className="text-sm text-gray-600">
                          Desconto: {formatCurrency(sale.discountAmount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSale?.id === sale.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold mb-4">Pedidos</h4>
                      {sale.items && sale.items.map((order) => (
                        <div key={order.id} className="mb-4 bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium">Pedido #{order.orderNumber}</span>
                            <span className="text-sm text-gray-600">
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                          {order.notes && (
                            <div className="text-sm text-gray-600 mb-2">
                              Obs: {order.notes}
                            </div>
                          )}
                          <div className="space-y-2">
                            {order.items && order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center text-sm"
                              >
                                <div className="flex-1">
                                  <span className="font-medium">{item.quantity}x</span>{' '}
                                  {item.productName}
                                  {item.notes && (
                                    <div className="text-xs text-gray-500 ml-6">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div>{formatCurrency(item.totalPrice)}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatCurrency(item.unitPrice)} cada
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="mt-4 pt-4 border-t border-gray-300 space-y-2">
                        <div className="flex justify-between items-center text-sm text-gray-700">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(sale.subtotal)}</span>
                        </div>
                        {sale.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-red-600">
                            <span>Desconto ({sale.discountRate}%):</span>
                            <span>- {formatCurrency(sale.discountAmount)}</span>
                          </div>
                        )}
                        {sale.tipAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-green-600">
                            <span>Gorjeta ({sale.tipRate}%):</span>
                            <span>+ {formatCurrency(sale.tipAmount)}</span>
                          </div>
                        )}
                        {sale.taxRate > 0 && (
                          <div className="flex justify-between items-center text-sm text-blue-600">
                            <span>Imposto ({sale.taxRate}%):</span>
                            <span>+ {formatCurrency(sale.taxAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xl font-bold pt-2 border-t">
                          <span>Total:</span>
                          <span className="text-emerald-600">{formatCurrency(sale.total)}</span>
                        </div>
                        {sale.amountPaid > 0 && (
                          <>
                            <div className="flex justify-between items-center text-sm text-gray-700 pt-2 border-t">
                              <span>Valor Pago:</span>
                              <span>{formatCurrency(sale.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-semibold text-green-600">
                              <span>Troco:</span>
                              <span>{formatCurrency(sale.changeAmount)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  </Card>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                  P�gina {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Pr�xima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
