import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import {
  TrendingUp,
  DollarSign,
  Clock,
  CreditCard,
  Filter,
  FileText,
  PieChart,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

interface ProfitData {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: string;
}

interface RevenueSummary {
  totalSales: number;
  subtotal: number;
  discounts: number;
  tips: number;
  taxes: number;
  totalRevenue: number;
}

interface PaymentMethodData {
  paymentMethod: string;
  count: number;
  total: number;
}

interface DeliveryTypeData {
  deliveryType: string;
  count: number;
  total: number;
}

interface RevenueData {
  summary: RevenueSummary;
  byPaymentMethod: PaymentMethodData[];
  byDeliveryType: DeliveryTypeData[];
}

interface DeliveryTimeData {
  totalOrders: number;
  averageDeliveryTime: string;
  minDeliveryTime: string;
  maxDeliveryTime: string;
  distribution?: Array<{ timeRange: string; count: number }>;
}

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dados dos relatórios
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [deliveryTimeData, setDeliveryTimeData] = useState<DeliveryTimeData | null>(null);

  // Definir datas padrão (mês atual)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ startDate, endDate });

      const [profitRes, revenueRes, deliveryTimeRes] = await Promise.all([
        api.get(`/reports/profit?${params}`),
        api.get(`/reports/revenue?${params}`),
        api.get(`/reports/delivery-time?${params}`),
      ]);

      setProfitData(profitRes.data);
      setRevenueData(revenueRes.data);
      setDeliveryTimeData(deliveryTimeRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/sales/export/pdf?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-vendas-${startDate}-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exportado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/sales/export/csv?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-vendas-${startDate}-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exportado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    credit: 'Crédito',
    debit: 'Débito',
    pix: 'PIX',
    bank_transfer: 'Transferência',
  };

  const deliveryTypeLabels: Record<string, string> = {
    dine_in: 'No Local',
    delivery: 'Delivery',
    takeout: 'Retirada',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-gray-600 mt-1">Análise completa do desempenho do restaurante</p>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-600" size={32} />
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Período</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Exportar CSV</span>
                <span className="sm:hidden">CSV</span>
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
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="text-gray-600 mt-4">Carregando relatórios...</p>
          </div>
        ) : (
          <>
            {/* Relatório de Lucro */}
            {profitData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" size={24} />
                  Lucro do Período
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Receitas</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">
                      {formatCurrency(profitData.revenue)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">Contas Pagas</p>
                    <p className="text-2xl font-bold text-red-800 mt-1">
                      {formatCurrency(profitData.expenses)}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${
                      profitData.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        profitData.profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      Lucro Líquido
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        profitData.profit >= 0 ? 'text-emerald-800' : 'text-red-800'
                      }`}
                    >
                      {formatCurrency(profitData.profit)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">Margem de Lucro</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">
                      {profitData.profitMargin}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Relatório de Receitas */}
            {revenueData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="text-emerald-600" size={24} />
                  Receitas Detalhadas
                </h2>

                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Total de Vendas</p>
                    <p className="text-lg font-bold text-gray-900">
                      {revenueData.summary.totalSales}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-700">Subtotal</p>
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(revenueData.summary.subtotal)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-red-700">Descontos</p>
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(revenueData.summary.discounts)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-700">Gorjetas</p>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(revenueData.summary.tips)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-700">Impostos</p>
                    <p className="text-lg font-bold text-yellow-800">
                      {formatCurrency(revenueData.summary.taxes)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-xs text-emerald-700">Total</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {formatCurrency(revenueData.summary.totalRevenue)}
                    </p>
                  </div>
                </div>

                {/* Por forma de pagamento */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard size={18} className="text-gray-600" />
                    Por Forma de Pagamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {revenueData.byPaymentMethod.map((item) => (
                      <div key={item.paymentMethod} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            {paymentMethodLabels[item.paymentMethod] || item.paymentMethod}
                          </p>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {item.count} vendas
                          </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Por tipo de entrega */}
                {revenueData.byDeliveryType && revenueData.byDeliveryType.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <PieChart size={18} className="text-gray-600" />
                      Por Tipo de Atendimento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {revenueData.byDeliveryType.map((item) => (
                        <div key={item.deliveryType} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              {deliveryTypeLabels[item.deliveryType] || item.deliveryType}
                            </p>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {item.count} vendas
                            </span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Relatório de Tempo de Entrega */}
            {deliveryTimeData && deliveryTimeData.totalOrders > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="text-emerald-600" size={24} />
                  Tempo de Entrega
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">
                      {deliveryTimeData.totalOrders}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-sm text-emerald-700 font-medium">Tempo Médio</p>
                    <p className="text-2xl font-bold text-emerald-800 mt-1">
                      {deliveryTimeData.averageDeliveryTime} min
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Tempo Mínimo</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">
                      {deliveryTimeData.minDeliveryTime} min
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-700 font-medium">Tempo Máximo</p>
                    <p className="text-2xl font-bold text-yellow-800 mt-1">
                      {deliveryTimeData.maxDeliveryTime} min
                    </p>
                  </div>
                </div>

                {/* Distribuição por faixas de tempo */}
                {deliveryTimeData.distribution && deliveryTimeData.distribution.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Distribuição de Tempo
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {deliveryTimeData.distribution.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">{item.timeRange}</p>
                          <p className="text-xl font-bold text-gray-900">{item.count}</p>
                          <p className="text-xs text-gray-500">pedidos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {deliveryTimeData && deliveryTimeData.totalOrders === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <Clock className="mx-auto text-yellow-600 mb-2" size={48} />
                <p className="text-yellow-800 font-medium">
                  Nenhum pedido entregue no período selecionado
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Os dados de tempo de entrega aparecerão quando houver pedidos marcados como
                  entregues
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
