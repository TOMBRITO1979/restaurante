import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CreditCard, Save, TestTube2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

interface PaymentSettings {
  id: string;
  provider: string;
  stripeSecretKey: string | null;
  stripePublishableKey: string | null;
  stripeWebhookSecret: string | null;
  isActive: boolean;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PaymentSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [settings, setSettings] = useState<PaymentSettings>({
    id: 'default',
    provider: 'stripe',
    stripeSecretKey: '',
    stripePublishableKey: '',
    stripeWebhookSecret: '',
    isActive: false,
    testMode: true,
    createdAt: '',
    updatedAt: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payment-settings');

      // Handle both success response with data and null data (no settings yet)
      if (response.data.success) {
        if (response.data.data) {
          setSettings({
            ...response.data.data,
            stripeSecretKey: response.data.data.stripeSecretKey || '',
            stripePublishableKey: response.data.data.stripePublishableKey || '',
            stripeWebhookSecret: response.data.data.stripeWebhookSecret || '',
          });
        }
        // If data is null, keep default empty settings (first time setup)
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast.error(error.response?.data?.message || 'Falha ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.stripeSecretKey || !settings.stripeSecretKey.trim()) {
      toast.error('Informe a Secret Key para testar');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const response = await api.post('/payment-settings/test', {
        secretKey: settings.stripeSecretKey,
      });

      if (response.data.success) {
        setTestResult({
          success: true,
          message: 'Conexão com Stripe OK! Chave válida.',
        });
        toast.success('Conexão com Stripe estabelecida com sucesso!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Falha ao testar conexão';
      setTestResult({
        success: false,
        message: message,
      });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!settings.stripeSecretKey?.trim() || !settings.stripePublishableKey?.trim()) {
      toast.error('Secret Key e Publishable Key são obrigatórias');
      return;
    }

    // Validar formato das chaves
    const secretKeyPrefix = settings.testMode ? 'sk_test_' : 'sk_live_';
    const publishableKeyPrefix = settings.testMode ? 'pk_test_' : 'pk_live_';

    if (!settings.stripeSecretKey.startsWith(secretKeyPrefix)) {
      toast.error(`Secret Key deve começar com ${secretKeyPrefix} (modo ${settings.testMode ? 'teste' : 'produção'})`);
      return;
    }

    if (!settings.stripePublishableKey.startsWith(publishableKeyPrefix)) {
      toast.error(`Publishable Key deve começar com ${publishableKeyPrefix} (modo ${settings.testMode ? 'teste' : 'produção'})`);
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/payment-settings', {
        stripeSecretKey: settings.stripeSecretKey,
        stripePublishableKey: settings.stripePublishableKey,
        stripeWebhookSecret: settings.stripeWebhookSecret || undefined,
        testMode: settings.testMode,
        isActive: settings.isActive,
      });

      if (response.data.success) {
        setSettings({
          ...response.data.data,
          stripeSecretKey: response.data.data.stripeSecretKey || '',
          stripePublishableKey: response.data.data.stripePublishableKey || '',
          stripeWebhookSecret: response.data.data.stripeWebhookSecret || '',
        });
        toast.success('Configurações de pagamento salvas com sucesso!');
        setTestResult(null);
      }
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);

      if (error.response?.data?.errors) {
        // Erros de validação Zod
        const errors = error.response.data.errors;
        errors.forEach((err: any) => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        toast.error(error.response?.data?.message || 'Erro ao salvar configurações');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PaymentSettings, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpar resultado do teste quando mudar as chaves
    if (field === 'stripeSecretKey') {
      setTestResult(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações de Pagamento</h1>
            <p className="text-gray-600 mt-1">
              Configure suas chaves Stripe para processar pagamentos com cartão
            </p>
          </div>
          <CreditCard className="text-blue-600" size={40} />
        </div>

        {/* Informações importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Informações Importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use chaves de <strong>Test Mode</strong> para desenvolvimento e testes</li>
                <li>Mude para <strong>Live Mode</strong> apenas quando for usar em produção com cartões reais</li>
                <li>Suas chaves são armazenadas de forma segura e nunca são expostas publicamente</li>
                <li>O Webhook Secret é opcional, mas recomendado para segurança adicional</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
          {/* Modo de operação */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modo de Operação</h2>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.testMode}
                  onChange={() => handleChange('testMode', true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Test Mode (Desenvolvimento)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!settings.testMode}
                  onChange={() => handleChange('testMode', false)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Live Mode (Produção)</span>
              </label>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {settings.testMode
                ? 'Usando chaves de teste. Nenhum cartão real será cobrado.'
                : 'Usando chaves de produção. Transações reais serão processadas.'}
            </p>
          </div>

          {/* Chaves Stripe */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Chaves Stripe</h2>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={settings.stripeSecretKey || ''}
                  onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                  placeholder={settings.testMode ? 'sk_test_...' : 'sk_live_...'}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecretKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Chave secreta usada no backend. Nunca compartilhe esta chave.
              </p>
            </div>

            {/* Publishable Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publishable Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPublishableKey ? 'text' : 'password'}
                  value={settings.stripePublishableKey || ''}
                  onChange={(e) => handleChange('stripePublishableKey', e.target.value)}
                  placeholder={settings.testMode ? 'pk_test_...' : 'pk_live_...'}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPublishableKey(!showPublishableKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPublishableKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Chave pública usada no frontend para inicializar Stripe.js.
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret (Opcional)
              </label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={settings.stripeWebhookSecret || ''}
                  onChange={(e) => handleChange('stripeWebhookSecret', e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showWebhookSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Secret usado para validar webhooks do Stripe. Configure no Stripe Dashboard.
              </p>
            </div>
          </div>

          {/* Ativar/Desativar */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">Ativar pagamentos com Stripe</span>
            </label>
            <p className="text-sm text-gray-500 mt-1 ml-6">
              Se desativado, o sistema usará as chaves de ambiente (fallback)
            </p>
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex gap-3">
                {testResult.success ? (
                  <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                ) : (
                  <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                )}
                <div>
                  <p className={`font-semibold ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {testResult.success ? 'Teste bem-sucedido!' : 'Teste falhou'}
                  </p>
                  <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !settings.stripeSecretKey}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <TestTube2 className="w-4 h-4 sm:w-5 sm:h-5" />
              {testing ? 'Testando...' : (
                <>
                  <span className="hidden sm:inline">Testar Conexão</span>
                  <span className="sm:hidden">Testar</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {saving ? 'Salvando...' : (
                <>
                  <span className="hidden sm:inline">Salvar Configurações</span>
                  <span className="sm:hidden">Salvar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Como obter as chaves */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Como obter suas chaves Stripe</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Acesse o <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Dashboard</a></li>
            <li>Faça login ou crie uma conta (é grátis)</li>
            <li>Vá para <strong>Developers → API keys</strong></li>
            <li>Copie a <strong>Publishable key</strong> e a <strong>Secret key</strong></li>
            <li>Para webhooks: vá em <strong>Developers → Webhooks</strong> e crie um endpoint</li>
            <li>Configure o endpoint como: <code className="bg-gray-200 px-2 py-1 rounded">https://seu-dominio.com/api/webhooks/stripe</code></li>
            <li>Copie o <strong>Signing secret</strong> do webhook</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
};
