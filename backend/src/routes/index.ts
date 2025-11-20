import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { CompanyController } from '@/controllers/CompanyController';
import { UserController } from '@/controllers/UserController';
import { CategoryController } from '@/controllers/CategoryController';
import { ProductController } from '@/controllers/ProductController';
import { SalesController } from '@/controllers/SalesController';
import { TabsController } from '@/controllers/TabsController';
import { DashboardController } from '@/controllers/DashboardController';
import { ExpenseCategoriesController } from '@/controllers/ExpenseCategoriesController';
import { ExpensesController } from '@/controllers/ExpensesController';
import { ReportsController } from '@/controllers/ReportsController';
import { SettingsController } from '@/controllers/SettingsController';
import { CustomersController } from '@/controllers/CustomersController';
import { HealthController } from '@/controllers/HealthController';
import { paymentsController } from '@/controllers/PaymentsController';
import { webhooksController } from '@/controllers/WebhooksController';
import { paymentSettingsController } from '@/controllers/PaymentSettingsController';
import { authenticate, requireRole, checkPermission } from '@/middleware/auth';
import { upload } from '@/middleware/upload';
import { loginLimiter, passwordResetLimiter, generalLimiter } from '@/middleware/rateLimit';
import { validate } from '@/middleware/validate';
import { csrfProtection } from '@/middleware/csrfProtection';
import {
  validateTenantIsolation,
  preventCrossTenantAccess,
  validateCompanyId
} from '@/middleware/tenantIsolation';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/validators/auth.validator';
import { createUserSchema, updateUserSchema } from '@/validators/user.validator';
import { createCompanySchema, updateCompanySchema } from '@/validators/company.validator';

const router = Router();

// Instanciar controllers
const authController = new AuthController();
const companyController = new CompanyController();
const userController = new UserController();
const categoryController = new CategoryController();
const productController = new ProductController();
const salesController = new SalesController();
const tabsController = new TabsController();
const dashboardController = new DashboardController();
const expenseCategoriesController = new ExpenseCategoriesController();
const expensesController = new ExpensesController();
const reportsController = new ReportsController();
const settingsController = new SettingsController();
const customersController = new CustomersController();
const healthController = new HealthController();

// ✅ MONITORING: Rotas de health check (públicas, sem rate limit e CSRF)
router.get('/health', healthController.check.bind(healthController));
router.get('/health/detailed', healthController.detailed.bind(healthController));
router.get('/health/live', healthController.liveness.bind(healthController));
router.get('/health/ready', healthController.readiness.bind(healthController));
router.get('/health/metrics', healthController.metrics.bind(healthController));

// ✅ SECURITY: Aplicar rate limiting, CSRF e tenant isolation em todas as rotas (exceto health)
router.use(generalLimiter);
router.use(csrfProtection); // CSRF com whitelist de rotas isentas

// ✅ SECURITY: Rotas públicas com validação Zod
router.post('/auth/register', loginLimiter, validate(registerSchema), authController.register.bind(authController));
router.post('/auth/login', loginLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/auth/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/auth/reset-password', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword.bind(authController));
router.post('/auth/verify-email', validate(verifyEmailSchema), authController.verifyEmail.bind(authController));

// Webhook routes (PUBLIC - No authentication, Stripe validates via signature)
router.post('/webhooks/stripe', webhooksController.handleStripeWebhook.bind(webhooksController));

// Rotas autenticadas
router.get('/auth/me', authenticate, authController.me.bind(authController));

// ✅ SECURITY: Rotas de empresas (Super Admin) com validação
router.get('/companies', authenticate, requireRole('SUPER_ADMIN'), companyController.list.bind(companyController));
router.post('/companies', authenticate, requireRole('SUPER_ADMIN'), validate(createCompanySchema), companyController.create.bind(companyController));
router.put('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), validate(updateCompanySchema), companyController.update.bind(companyController));
router.delete('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), companyController.delete.bind(companyController));
router.patch('/companies/:id/toggle-active', authenticate, requireRole('SUPER_ADMIN'), companyController.toggleActive.bind(companyController));

// ✅ SECURITY: Rotas de usuários (Admin e SUPER_ADMIN) com validação
router.get('/users', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.list.bind(userController));
router.get('/users/all', authenticate, requireRole('SUPER_ADMIN'), userController.listAll.bind(userController));
router.post('/users', authenticate, requireRole('ADMIN'), validate(createUserSchema), userController.create.bind(userController));
router.put('/users/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), validate(updateUserSchema), userController.update.bind(userController));
router.delete('/users/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.delete.bind(userController));
router.patch('/users/:id/toggle-active', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.toggleActive.bind(userController));
router.patch('/users/:id/activate', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.activate.bind(userController));
router.patch('/users/:id/suspend', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.suspend.bind(userController));

// ✅ SECURITY: Rotas de categorias (tenant-isolated)
router.get('/categories', authenticate, validateTenantIsolation, categoryController.list.bind(categoryController));
router.post('/categories', authenticate, validateTenantIsolation, checkPermission('categories.edit'), categoryController.create.bind(categoryController));
router.put('/categories/:id', authenticate, validateTenantIsolation, checkPermission('categories.edit'), preventCrossTenantAccess('category'), categoryController.update.bind(categoryController));
router.delete('/categories/:id', authenticate, validateTenantIsolation, checkPermission('categories.delete'), preventCrossTenantAccess('category'), categoryController.delete.bind(categoryController));

// ✅ SECURITY: Rotas de produtos (tenant-isolated)
router.get('/products', authenticate, validateTenantIsolation, productController.list.bind(productController));
router.get('/products/:id', authenticate, validateTenantIsolation, preventCrossTenantAccess('product'), productController.getById.bind(productController));
router.post('/products', authenticate, validateTenantIsolation, checkPermission('products.edit'), upload.single('image'), productController.create.bind(productController));
router.put('/products/:id', authenticate, validateTenantIsolation, checkPermission('products.edit'), preventCrossTenantAccess('product'), upload.single('image'), productController.update.bind(productController));
router.delete('/products/:id', authenticate, validateTenantIsolation, checkPermission('products.delete'), preventCrossTenantAccess('product'), productController.delete.bind(productController));

// ✅ SECURITY: Rotas de clientes (tenant-isolated)
router.get('/customers', authenticate, validateTenantIsolation, checkPermission('customers.view'), customersController.list.bind(customersController));
router.get('/customers/:id', authenticate, validateTenantIsolation, checkPermission('customers.view'), preventCrossTenantAccess('customer'), customersController.getById.bind(customersController));
router.post('/customers', authenticate, validateTenantIsolation, checkPermission('customers.edit'), customersController.create.bind(customersController));
router.put('/customers/:id', authenticate, validateTenantIsolation, checkPermission('customers.edit'), preventCrossTenantAccess('customer'), customersController.update.bind(customersController));
router.delete('/customers/:id', authenticate, validateTenantIsolation, checkPermission('customers.delete'), preventCrossTenantAccess('customer'), customersController.delete.bind(customersController));

// ✅ SECURITY: Rotas de vendas/histórico (tenant-isolated)
router.get('/sales/stats', authenticate, validateTenantIsolation, salesController.getStats.bind(salesController));
router.get('/sales/export/pdf', authenticate, validateTenantIsolation, salesController.exportPDF.bind(salesController));
router.get('/sales/export/csv', authenticate, validateTenantIsolation, salesController.exportCSV.bind(salesController));
router.get('/sales', authenticate, validateTenantIsolation, salesController.list.bind(salesController));
router.get('/sales/:id', authenticate, validateTenantIsolation, preventCrossTenantAccess('sale'), salesController.getById.bind(salesController));

// Rotas de comandas/tabs (Admin e User com permissão)
router.get('/tabs', authenticate, tabsController.listOpen.bind(tabsController));
router.post('/tabs', authenticate, checkPermission('sales.edit'), tabsController.findOrCreate.bind(tabsController));
router.post('/tabs/:tabId/orders', authenticate, checkPermission('sales.edit'), tabsController.addOrder.bind(tabsController));
router.patch('/tabs/orders/:orderId/delivered', authenticate, checkPermission('sales.edit'), tabsController.markOrderDelivered.bind(tabsController));
router.post('/tabs/:tabId/close', authenticate, checkPermission('sales.edit'), tabsController.closeTab.bind(tabsController));

// Rotas de dashboard (Admin e User)
router.get('/dashboard/stats', authenticate, dashboardController.getStats.bind(dashboardController));

// Rotas de categorias de despesas (Admin apenas)
router.get('/expense-categories', authenticate, requireRole('ADMIN'), expenseCategoriesController.list.bind(expenseCategoriesController));
router.post('/expense-categories', authenticate, requireRole('ADMIN'), expenseCategoriesController.create.bind(expenseCategoriesController));
router.put('/expense-categories/:id', authenticate, requireRole('ADMIN'), expenseCategoriesController.update.bind(expenseCategoriesController));
router.delete('/expense-categories/:id', authenticate, requireRole('ADMIN'), expenseCategoriesController.delete.bind(expenseCategoriesController));

// Rotas de despesas (Admin apenas)
router.get('/expenses/stats', authenticate, requireRole('ADMIN'), expensesController.getStats.bind(expensesController));
router.get('/expenses/export/pdf', authenticate, requireRole('ADMIN'), expensesController.exportPDF.bind(expensesController));
router.get('/expenses/export/csv', authenticate, requireRole('ADMIN'), expensesController.exportCSV.bind(expensesController));
router.get('/expenses', authenticate, requireRole('ADMIN'), expensesController.list.bind(expensesController));
router.get('/expenses/:id', authenticate, requireRole('ADMIN'), expensesController.getById.bind(expensesController));
router.post('/expenses', authenticate, requireRole('ADMIN'), expensesController.create.bind(expensesController));
router.put('/expenses/:id', authenticate, requireRole('ADMIN'), expensesController.update.bind(expensesController));
router.delete('/expenses/:id', authenticate, requireRole('ADMIN'), expensesController.delete.bind(expensesController));

// Rotas de relatórios (Admin apenas)
router.get('/reports/profit', authenticate, requireRole('ADMIN'), reportsController.getProfitReport.bind(reportsController));
router.get('/reports/revenue', authenticate, requireRole('ADMIN'), reportsController.getRevenueReport.bind(reportsController));
router.get('/reports/delivery-time', authenticate, requireRole('ADMIN'), reportsController.getDeliveryTimeReport.bind(reportsController));
router.get('/reports/consolidated', authenticate, requireRole('ADMIN'), reportsController.getConsolidatedReport.bind(reportsController));

// Rotas de configurações (Admin apenas)
router.get('/settings', authenticate, requireRole('ADMIN'), settingsController.get.bind(settingsController));
router.put('/settings', authenticate, requireRole('ADMIN'), settingsController.update.bind(settingsController));

// Rotas de configurações de pagamento (Admin apenas)
router.get('/payment-settings', authenticate, requireRole('ADMIN'), paymentSettingsController.get.bind(paymentSettingsController));
router.put('/payment-settings', authenticate, requireRole('ADMIN'), paymentSettingsController.update.bind(paymentSettingsController));
router.delete('/payment-settings', authenticate, requireRole('ADMIN'), paymentSettingsController.delete.bind(paymentSettingsController));
router.post('/payment-settings/test', authenticate, requireRole('ADMIN'), paymentSettingsController.testConnection.bind(paymentSettingsController));

// Rotas de pagamentos Stripe (Public config, authenticated for operations)
router.get('/payments/config', paymentsController.getConfig.bind(paymentsController)); // Public - get publishable key
router.post('/payments/create-intent', authenticate, checkPermission('sales.edit'), paymentsController.createPaymentIntent.bind(paymentsController));
router.post('/payments/complete', authenticate, checkPermission('sales.edit'), paymentsController.completePayment.bind(paymentsController)); // Close tab after payment
router.get('/payments/:paymentIntentId', authenticate, paymentsController.getPaymentIntent.bind(paymentsController));
router.post('/payments/confirm', authenticate, checkPermission('sales.edit'), paymentsController.confirmPayment.bind(paymentsController));
router.post('/payments/:paymentIntentId/cancel', authenticate, requireRole('ADMIN'), paymentsController.cancelPayment.bind(paymentsController));
router.post('/payments/:paymentIntentId/refund', authenticate, requireRole('ADMIN'), paymentsController.createRefund.bind(paymentsController));

// Sales receipt
router.get('/sales/:id/receipt', authenticate, salesController.printReceipt.bind(salesController));

export default router;
