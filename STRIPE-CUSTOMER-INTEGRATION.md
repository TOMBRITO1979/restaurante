# Stripe Customer Integration - ChefWell

**Data:** 15 de Novembro de 2025
**Versão:** 2.2.0

---

## Resumo da Feature

Implementada integração completa com **Stripe Customers API** para criar e associar clientes do sistema ChefWell aos pagamentos Stripe. Agora, quando um cliente preenche o campo "Nome do Cliente" no PDV (Ponto de Venda), esse nome é automaticamente enviado ao Stripe e um **Customer object** é criado, permitindo melhor rastreamento e gestão de clientes.

---

## Benefícios

✅ **Rastreamento de Clientes**: Todos os pagamentos ficam associados a um cliente no Stripe
✅ **Histórico Consolidado**: Ver todo histórico de pagamentos por cliente no Stripe Dashboard
✅ **Email Opcional**: Sistema funciona apenas com nome, sem necessidade de email
✅ **Deduplicação**: Se cliente com mesmo email já existe, reutiliza o registro
✅ **Multi-Tenant**: Cada empresa tem seus próprios clientes no Stripe

---

## Arquitetura Técnica

### Fluxo Completo

```
1. Cliente preenche "Nome do Cliente" no PDV
   ↓
2. Frontend envia pedido com customerName
   ↓
3. Backend cria/busca Customer no Stripe
   ↓
4. Payment Intent é associado ao Customer
   ↓
5. Cliente no Stripe Dashboard fica vinculado ao pagamento
```

### Componentes Modificados

#### 1. Frontend: `/frontend/src/pages/Checkout.tsx`

**Modificação (Linha 199):**
```typescript
const paymentResponse = await api.post('/payments/create-intent', {
  amount: totalAmount,
  tabId: tabId,
  tableNumber: tab.tableNumber,
  phoneNumber: tab.phoneNumber,
  customerName: tab.customerName || undefined,  // NOVO: Envia nome do cliente
  description: `Pagamento - Mesa ${tab.tableNumber || tab.phoneNumber}`,
});
```

**O que faz:**
- Captura `customerName` do tab (comanda)
- Envia para backend junto com dados de pagamento
- Se campo vazio, envia `undefined`

---

#### 2. Backend: `/backend/src/services/stripeService.ts`

**Modificação 1: Customer Creation Logic (Linhas 32-37)**
```typescript
// Create or retrieve customer if email or name provided
let stripeCustomerId = customerId;
if (!customerId && (customerEmail || metadata.customerName)) {
  const customer = await this.findOrCreateCustomer(
    stripeClient,
    customerEmail,
    metadata.customerName  // Passa nome para criação
  );
  stripeCustomerId = customer.id;
}
```

**Modificação 2: findOrCreateCustomer Method (Linhas 162-193)**
```typescript
/**
 * Find or create a Stripe customer by email or name
 * @param stripeClient Stripe client instance
 * @param email Customer email (optional)
 * @param name Customer name (optional)
 * @returns Stripe Customer
 */
private async findOrCreateCustomer(
  stripeClient: Stripe,
  email?: string,
  name?: string
): Promise<Stripe.Customer> {
  try {
    // Search for existing customer by email if provided
    if (email) {
      const existingCustomers = await stripeClient.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }
    }

    // Create new customer with available info
    const customerData: Stripe.CustomerCreateParams = {};
    if (email) customerData.email = email;
    if (name) customerData.name = name;

    return await stripeClient.customers.create(customerData);
  } catch (error: any) {
    console.error('Error finding/creating customer:', error);
    throw new Error(`Failed to find or create customer: ${error.message}`);
  }
}
```

**O que mudou:**
- Método agora aceita `email` e `name` como **opcionais**
- Se apenas `name` fornecido, cria customer sem email
- Se `email` fornecido, busca customer existente antes de criar novo
- Mantém backward compatibility com código anterior

---

#### 3. Backend: `/backend/src/controllers/PaymentsController.ts`

**Validação Schema (Linhas 8-17):**
```typescript
const createPaymentIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  tabId: z.string().optional(),
  orderId: z.string().optional(),
  description: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),  // JÁ EXISTIA - sem mudanças
  tableNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
});
```

**Status:** Nenhuma mudança necessária - validação já suportava `customerName`.

---

## Stripe Dashboard

### Visualização de Clientes

Após implementação, todos os pagamentos aparecerão no Stripe Dashboard vinculados a clientes:

1. **Dashboard → Customers**
   - Lista de todos os clientes criados
   - Nome, email (quando disponível), total gasto
   - Histórico de pagamentos por cliente

2. **Dashboard → Payments**
   - Cada payment intent mostra "Customer: [nome]"
   - Clique no customer para ver histórico completo

### Exemplo de Customer Object

```json
{
  "id": "cus_xxxxxxxxxxxxx",
  "object": "customer",
  "email": null,
  "name": "João Silva",
  "created": 1699999999,
  "metadata": {
    "tenantSchema": "tenant_chefwell_demo"
  }
}
```

---

## Testes Realizados

### Teste 1: Cliente com Nome Apenas

**Input:**
```json
{
  "amount": 50.00,
  "customerName": "Maria Oliveira",
  "tabId": "abc123"
}
```

**Resultado:**
```
✅ Customer criado no Stripe: cus_xxxxx
✅ Payment Intent associado ao customer
✅ Nome aparece no Stripe Dashboard
```

### Teste 2: Cliente com Email e Nome

**Input:**
```json
{
  "amount": 75.00,
  "customerName": "Carlos Santos",
  "customerEmail": "carlos@example.com",
  "tabId": "def456"
}
```

**Resultado:**
```
✅ Customer criado com email e nome
✅ Próximo pagamento do mesmo email reutiliza customer
```

### Teste 3: Cliente Sem Nome (Opcional)

**Input:**
```json
{
  "amount": 30.00,
  "tabId": "ghi789"
}
```

**Resultado:**
```
✅ Payment Intent criado SEM customer
✅ Sistema funciona normalmente (backward compatible)
```

---

## Deploy

### Backend

```bash
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .
docker service update --image r.chatwell.pro/restaurante-backend:latest --force chefwell_backend
```

**Status:** ✅ Deployed em produção (15/11/2025)

### Frontend

```bash
cd /root/restaurante/frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://api.chefwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
docker service update --image r.chatwell.pro/restaurante-frontend:latest --force chefwell_frontend
```

**Status:** ✅ Deployed em produção (15/11/2025)

---

## Arquivos Modificados

| Arquivo | Linhas Alteradas | Descrição |
|---------|-----------------|-----------|
| `/frontend/src/pages/Checkout.tsx` | 199 | Envia `customerName` para API |
| `/backend/src/services/stripeService.ts` | 32-37, 162-193 | Cria customer com nome opcional |
| `/backend/src/controllers/PaymentsController.ts` | - | Sem mudanças (validação já existia) |

---

## Compatibilidade

✅ **Backward Compatible**: Sistema continua funcionando mesmo sem nome de cliente
✅ **Multi-Tenant**: Cada empresa tem seus próprios customers isolados
✅ **Stripe API Version**: 2025-02-24.acacia
✅ **Testes Stripe**: Continua funcionando com cartões de teste

---

## Próximos Passos Sugeridos

### Curto Prazo

1. **Email Collection**: Adicionar campo de email opcional no PDV para melhor tracking
2. **Customer Metadata**: Incluir mais dados (telefone, mesa, tipo de entrega) em `metadata`
3. **Customer Search**: Implementar busca de clientes no frontend para vendas recorrentes

### Médio Prazo

4. **Loyalty Program**: Usar histórico de customers para programa de fidelidade
5. **Customer Portal**: Portal Stripe para clientes gerenciarem pagamentos
6. **Saved Payment Methods**: Permitir salvar cartões para próximas compras

### Longo Prazo

7. **Subscriptions**: Implementar assinaturas mensais usando Stripe Customers
8. **Marketing Campaigns**: Segmentar customers por comportamento de compra
9. **Analytics**: Dashboard de análise de customers (LTV, frequência, etc)

---

## Referências

- **Stripe Customers API**: https://stripe.com/docs/api/customers
- **Payment Intents with Customers**: https://stripe.com/docs/payments/save-during-payment
- **Multi-Tenant Setup**: `/root/restaurante/STRIPE-MULTITENANT-COMPLETE.md`
- **Testing Guide**: `/root/restaurante/TESTE-STRIPE.md`

---

## Conclusão

A integração com Stripe Customers foi implementada com sucesso, permitindo rastreamento completo de clientes através do Stripe Dashboard. O sistema continua funcionando com ou sem nome de cliente, garantindo backward compatibility e flexibilidade.

**Status Atual:** ✅ **100% OPERACIONAL EM PRODUÇÃO**
**Versão:** 2.2.0
**Deploy:** 15 de Novembro de 2025

---

**Última Atualização:** 15 de Novembro de 2025
**Responsável:** Claude Code (Anthropic)
**Documento:** STRIPE-CUSTOMER-INTEGRATION.md
