import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { CreditCard, ArrowLeft, Loader2 } from 'lucide-react';

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
}

function CheckoutForm({ amount, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (stripe && elements) {
      console.log('✅ Stripe and Elements loaded successfully');
    } else {
      console.log('⏳ Waiting for Stripe and Elements...');
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('❌ Stripe or Elements not loaded');
      toast.error('Sistema de pagamento ainda não carregado. Aguarde...');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Confirming payment...');
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('❌ Payment error:', error);
        toast.error(error.message || 'Erro ao processar pagamento');
      } else {
        console.log('✅ Payment successful!');

        // Complete payment and close tab on backend
        try {
          console.log('📋 Closing tab on backend...');
          const urlParams = new URLSearchParams(window.location.search);
          const tabId = urlParams.get('tabId');

          const completeResponse = await api.post('/payments/complete', {
            paymentIntentId: paymentIntent?.id,
            tabId: tabId,
          });

          if (completeResponse.data.success) {
            console.log('✅ Tab closed successfully');
            toast.success('Pagamento realizado e comanda fechada com sucesso!');
          } else {
            console.warn('⚠️ Payment succeeded but tab closure failed:', completeResponse.data);
            toast.success('Pagamento realizado! Fechando comanda...');
          }
        } catch (completeError: any) {
          console.error('❌ Error closing tab:', completeError);
          toast.success('Pagamento realizado! Verifique se a comanda foi fechada.');
        }

        onSuccess();
      }
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base text-gray-700 font-medium">Total a pagar:</span>
          <span className="text-xl sm:text-2xl font-bold text-blue-600">
            R$ {amount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
          Dados do Cartão
        </label>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            <span className="text-sm sm:text-base font-semibold">Processando pagamento...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base font-semibold">Pagar R$ {amount.toFixed(2)}</span>
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        Pagamento seguro processado pelo Stripe. Seus dados estão protegidos.
      </p>
    </form>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabId = searchParams.get('tabId');

  const [clientSecret, setClientSecret] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    // Initialize Stripe and Payment Intent together
    const initialize = async () => {
      try {
        console.log('🔄 Initializing Stripe checkout...');

        if (!tabId) {
          setError('ID da comanda não fornecido');
          setLoading(false);
          return;
        }

        // Step 1: Load Stripe publishable key
        console.log('📡 Fetching Stripe config...');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const configResponse = await fetch(`${API_URL}/api/payments/config`);
        const configData = await configResponse.json();

        if (!configData.success || !configData.data.publishableKey) {
          throw new Error('Chave do Stripe não encontrada');
        }

        console.log('🔑 Stripe publishable key loaded');
        const stripeInstance = await loadStripe(configData.data.publishableKey);

        if (!stripeInstance) {
          throw new Error('Falha ao carregar Stripe');
        }

        console.log('✅ Stripe instance created');
        setStripePromise(stripeInstance);

        // Step 2: Get tab details
        console.log('📋 Fetching tab details...');
        const tabResponse = await api.get('/tabs');
        const tabs = tabResponse.data;
        const tab = tabs.find((t: any) => t.id === tabId);

        if (!tab) {
          throw new Error('Comanda não encontrada');
        }

        if (tab.status === 'closed') {
          throw new Error('Comanda já está fechada');
        }

        const totalAmount = parseFloat(tab.total || '0');
        setAmount(totalAmount);
        console.log(`💰 Amount: R$ ${totalAmount.toFixed(2)}`);

        // Step 3: Create payment intent
        console.log('💳 Creating payment intent...');
        const paymentResponse = await api.post('/payments/create-intent', {
          amount: totalAmount,
          tabId: tabId,
          tableNumber: tab.tableNumber,
          phoneNumber: tab.phoneNumber,
          customerName: tab.customerName || undefined,
          description: `Pagamento - Mesa ${tab.tableNumber || tab.phoneNumber}`,
        });

        if (paymentResponse.data.success) {
          console.log('✅ Payment intent created:', paymentResponse.data.data.paymentIntentId);
          setClientSecret(paymentResponse.data.data.clientSecret);
        } else {
          throw new Error('Falha ao criar intenção de pagamento');
        }

        setLoading(false);
        console.log('✅ Checkout initialized successfully');
      } catch (err: any) {
        console.error('❌ Error initializing checkout:', err);
        setError(err.response?.data?.message || err.message || 'Erro ao inicializar pagamento');
        toast.error('Erro ao carregar dados do pagamento');
        setLoading(false);
      }
    };

    initialize();
  }, [tabId]);

  const handlePaymentSuccess = () => {
    setTimeout(() => {
      navigate('/orders?payment=success');
    }, 1500);
  };

  if (loading || !stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Erro ao Carregar Pagamento
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || 'Não foi possível inicializar o pagamento'}</p>
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-gray-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 text-sm sm:text-base rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">Voltar para Comandas</span>
            <span className="sm:hidden">Voltar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Voltar
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            Pagamento com Cartão
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Complete o pagamento de forma segura usando seu cartão de crédito ou débito
          </p>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {stripePromise && clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                  },
                },
                locale: 'pt-BR',
              }}
            >
              <CheckoutForm
                amount={amount}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-600">Carregando formulário de pagamento...</p>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-4 sm:mt-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-semibold text-green-900 mb-2 flex items-center gap-2">
            🔒 Pagamento 100% Seguro
          </h3>
          <ul className="text-xs sm:text-sm text-green-800 space-y-1">
            <li>✓ Processado pelo Stripe (certificado PCI DSS)</li>
            <li>✓ Seus dados de cartão não passam pelo nosso servidor</li>
            <li>✓ Criptografia de ponta a ponta</li>
            <li>✓ Proteção contra fraudes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
