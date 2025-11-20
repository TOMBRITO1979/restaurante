"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const CompanyController_1 = require("../controllers/CompanyController");
const UserController_1 = require("../controllers/UserController");
const CategoryController_1 = require("../controllers/CategoryController");
const ProductController_1 = require("../controllers/ProductController");
const SalesController_1 = require("../controllers/SalesController");
const TabsController_1 = require("../controllers/TabsController");
const DashboardController_1 = require("../controllers/DashboardController");
const ExpenseCategoriesController_1 = require("../controllers/ExpenseCategoriesController");
const ExpensesController_1 = require("../controllers/ExpensesController");
const ReportsController_1 = require("../controllers/ReportsController");
const SettingsController_1 = require("../controllers/SettingsController");
const CustomersController_1 = require("../controllers/CustomersController");
const HealthController_1 = require("../controllers/HealthController");
const PaymentsController_1 = require("../controllers/PaymentsController");
const WebhooksController_1 = require("../controllers/WebhooksController");
const PaymentSettingsController_1 = require("../controllers/PaymentSettingsController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const csrfProtection_1 = require("../middleware/csrfProtection");
const tenantIsolation_1 = require("../middleware/tenantIsolation");
const auth_validator_1 = require("../validators/auth.validator");
const user_validator_1 = require("../validators/user.validator");
const company_validator_1 = require("../validators/company.validator");
const router = (0, express_1.Router)();
// Instanciar controllers
const authController = new AuthController_1.AuthController();
const companyController = new CompanyController_1.CompanyController();
const userController = new UserController_1.UserController();
const categoryController = new CategoryController_1.CategoryController();
const productController = new ProductController_1.ProductController();
const salesController = new SalesController_1.SalesController();
const tabsController = new TabsController_1.TabsController();
const dashboardController = new DashboardController_1.DashboardController();
const expenseCategoriesController = new ExpenseCategoriesController_1.ExpenseCategoriesController();
const expensesController = new ExpensesController_1.ExpensesController();
const reportsController = new ReportsController_1.ReportsController();
const settingsController = new SettingsController_1.SettingsController();
const customersController = new CustomersController_1.CustomersController();
const healthController = new HealthController_1.HealthController();
// ✅ MONITORING: Rotas de health check (públicas, sem rate limit e CSRF)
router.get('/health', healthController.check.bind(healthController));
router.get('/health/detailed', healthController.detailed.bind(healthController));
router.get('/health/live', healthController.liveness.bind(healthController));
router.get('/health/ready', healthController.readiness.bind(healthController));
router.get('/health/metrics', healthController.metrics.bind(healthController));
// ✅ SECURITY: Aplicar rate limiting, CSRF e tenant isolation em todas as rotas (exceto health)
router.use(rateLimit_1.generalLimiter);
router.use(csrfProtection_1.csrfProtection); // CSRF com whitelist de rotas isentas
// ✅ SECURITY: Rotas públicas com validação Zod
router.post('/auth/register', rateLimit_1.loginLimiter, (0, validate_1.validate)(auth_validator_1.registerSchema), authController.register.bind(authController));
router.post('/auth/login', rateLimit_1.loginLimiter, (0, validate_1.validate)(auth_validator_1.loginSchema), authController.login.bind(authController));
router.post('/auth/forgot-password', rateLimit_1.passwordResetLimiter, (0, validate_1.validate)(auth_validator_1.forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/auth/reset-password', rateLimit_1.passwordResetLimiter, (0, validate_1.validate)(auth_validator_1.resetPasswordSchema), authController.resetPassword.bind(authController));
router.post('/auth/verify-email', (0, validate_1.validate)(auth_validator_1.verifyEmailSchema), authController.verifyEmail.bind(authController));
// Webhook routes (PUBLIC - No authentication, Stripe validates via signature)
router.post('/webhooks/stripe', WebhooksController_1.webhooksController.handleStripeWebhook.bind(WebhooksController_1.webhooksController));
// Rotas autenticadas
router.get('/auth/me', auth_1.authenticate, authController.me.bind(authController));
// ✅ SECURITY: Rotas de empresas (Super Admin) com validação
router.get('/companies', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), companyController.list.bind(companyController));
router.post('/companies', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), (0, validate_1.validate)(company_validator_1.createCompanySchema), companyController.create.bind(companyController));
router.put('/companies/:id', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), (0, validate_1.validate)(company_validator_1.updateCompanySchema), companyController.update.bind(companyController));
router.delete('/companies/:id', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), companyController.delete.bind(companyController));
router.patch('/companies/:id/toggle-active', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), companyController.toggleActive.bind(companyController));
// ✅ SECURITY: Rotas de usuários (Admin e SUPER_ADMIN) com validação
router.get('/users', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), userController.list.bind(userController));
router.get('/users/all', auth_1.authenticate, (0, auth_1.requireRole)('SUPER_ADMIN'), userController.listAll.bind(userController));
router.post('/users', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), (0, validate_1.validate)(user_validator_1.createUserSchema), userController.create.bind(userController));
router.put('/users/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), (0, validate_1.validate)(user_validator_1.updateUserSchema), userController.update.bind(userController));
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), userController.delete.bind(userController));
router.patch('/users/:id/toggle-active', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), userController.toggleActive.bind(userController));
router.patch('/users/:id/activate', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), userController.activate.bind(userController));
router.patch('/users/:id/suspend', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SUPER_ADMIN'), userController.suspend.bind(userController));
// ✅ SECURITY: Rotas de categorias (tenant-isolated)
router.get('/categories', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, categoryController.list.bind(categoryController));
router.post('/categories', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('categories.edit'), categoryController.create.bind(categoryController));
router.put('/categories/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('categories.edit'), (0, tenantIsolation_1.preventCrossTenantAccess)('category'), categoryController.update.bind(categoryController));
router.delete('/categories/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('categories.delete'), (0, tenantIsolation_1.preventCrossTenantAccess)('category'), categoryController.delete.bind(categoryController));
// ✅ SECURITY: Rotas de produtos (tenant-isolated)
router.get('/products', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, productController.list.bind(productController));
router.get('/products/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, tenantIsolation_1.preventCrossTenantAccess)('product'), productController.getById.bind(productController));
router.post('/products', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('products.edit'), upload_1.upload.single('image'), productController.create.bind(productController));
router.put('/products/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('products.edit'), (0, tenantIsolation_1.preventCrossTenantAccess)('product'), upload_1.upload.single('image'), productController.update.bind(productController));
router.delete('/products/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('products.delete'), (0, tenantIsolation_1.preventCrossTenantAccess)('product'), productController.delete.bind(productController));
// ✅ SECURITY: Rotas de clientes (tenant-isolated)
router.get('/customers', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('customers.view'), customersController.list.bind(customersController));
router.get('/customers/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('customers.view'), (0, tenantIsolation_1.preventCrossTenantAccess)('customer'), customersController.getById.bind(customersController));
router.post('/customers', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('customers.edit'), customersController.create.bind(customersController));
router.put('/customers/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('customers.edit'), (0, tenantIsolation_1.preventCrossTenantAccess)('customer'), customersController.update.bind(customersController));
router.delete('/customers/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, auth_1.checkPermission)('customers.delete'), (0, tenantIsolation_1.preventCrossTenantAccess)('customer'), customersController.delete.bind(customersController));
// ✅ SECURITY: Rotas de vendas/histórico (tenant-isolated)
router.get('/sales/stats', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, salesController.getStats.bind(salesController));
router.get('/sales/export/pdf', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, salesController.exportPDF.bind(salesController));
router.get('/sales/export/csv', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, salesController.exportCSV.bind(salesController));
router.get('/sales', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, salesController.list.bind(salesController));
router.get('/sales/:id', auth_1.authenticate, tenantIsolation_1.validateTenantIsolation, (0, tenantIsolation_1.preventCrossTenantAccess)('sale'), salesController.getById.bind(salesController));
// Rotas de comandas/tabs (Admin e User com permissão)
router.get('/tabs', auth_1.authenticate, tabsController.listOpen.bind(tabsController));
router.post('/tabs', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), tabsController.findOrCreate.bind(tabsController));
router.post('/tabs/:tabId/orders', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), tabsController.addOrder.bind(tabsController));
router.patch('/tabs/orders/:orderId/delivered', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), tabsController.markOrderDelivered.bind(tabsController));
router.post('/tabs/:tabId/close', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), tabsController.closeTab.bind(tabsController));
// Rotas de dashboard (Admin e User)
router.get('/dashboard/stats', auth_1.authenticate, dashboardController.getStats.bind(dashboardController));
// Rotas de categorias de despesas (Admin apenas)
router.get('/expense-categories', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expenseCategoriesController.list.bind(expenseCategoriesController));
router.post('/expense-categories', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expenseCategoriesController.create.bind(expenseCategoriesController));
router.put('/expense-categories/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expenseCategoriesController.update.bind(expenseCategoriesController));
router.delete('/expense-categories/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expenseCategoriesController.delete.bind(expenseCategoriesController));
// Rotas de despesas (Admin apenas)
router.get('/expenses/stats', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.getStats.bind(expensesController));
router.get('/expenses/export/pdf', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.exportPDF.bind(expensesController));
router.get('/expenses/export/csv', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.exportCSV.bind(expensesController));
router.get('/expenses', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.list.bind(expensesController));
router.get('/expenses/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.getById.bind(expensesController));
router.post('/expenses', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.create.bind(expensesController));
router.put('/expenses/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.update.bind(expensesController));
router.delete('/expenses/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), expensesController.delete.bind(expensesController));
// Rotas de relatórios (Admin apenas)
router.get('/reports/profit', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), reportsController.getProfitReport.bind(reportsController));
router.get('/reports/revenue', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), reportsController.getRevenueReport.bind(reportsController));
router.get('/reports/delivery-time', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), reportsController.getDeliveryTimeReport.bind(reportsController));
router.get('/reports/consolidated', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), reportsController.getConsolidatedReport.bind(reportsController));
// Rotas de configurações (Admin apenas)
router.get('/settings', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), settingsController.get.bind(settingsController));
router.put('/settings', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), settingsController.update.bind(settingsController));
// Rotas de configurações de pagamento (Admin apenas)
router.get('/payment-settings', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentSettingsController_1.paymentSettingsController.get.bind(PaymentSettingsController_1.paymentSettingsController));
router.put('/payment-settings', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentSettingsController_1.paymentSettingsController.update.bind(PaymentSettingsController_1.paymentSettingsController));
router.delete('/payment-settings', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentSettingsController_1.paymentSettingsController.delete.bind(PaymentSettingsController_1.paymentSettingsController));
router.post('/payment-settings/test', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentSettingsController_1.paymentSettingsController.testConnection.bind(PaymentSettingsController_1.paymentSettingsController));
// Rotas de pagamentos Stripe (Public config, authenticated for operations)
router.get('/payments/config', PaymentsController_1.paymentsController.getConfig.bind(PaymentsController_1.paymentsController)); // Public - get publishable key
router.post('/payments/create-intent', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), PaymentsController_1.paymentsController.createPaymentIntent.bind(PaymentsController_1.paymentsController));
router.post('/payments/complete', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), PaymentsController_1.paymentsController.completePayment.bind(PaymentsController_1.paymentsController)); // Close tab after payment
router.get('/payments/:paymentIntentId', auth_1.authenticate, PaymentsController_1.paymentsController.getPaymentIntent.bind(PaymentsController_1.paymentsController));
router.post('/payments/confirm', auth_1.authenticate, (0, auth_1.checkPermission)('sales.edit'), PaymentsController_1.paymentsController.confirmPayment.bind(PaymentsController_1.paymentsController));
router.post('/payments/:paymentIntentId/cancel', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentsController_1.paymentsController.cancelPayment.bind(PaymentsController_1.paymentsController));
router.post('/payments/:paymentIntentId/refund', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), PaymentsController_1.paymentsController.createRefund.bind(PaymentsController_1.paymentsController));
// Sales receipt
router.get('/sales/:id/receipt', auth_1.authenticate, salesController.printReceipt.bind(salesController));
exports.default = router;
//# sourceMappingURL=index.js.map