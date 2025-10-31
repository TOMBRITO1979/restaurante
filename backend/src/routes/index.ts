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
import { authenticate, requireRole, checkPermission } from '@/middleware/auth';
import { upload } from '@/middleware/upload';

const router = Router();

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

// Rotas públicas
router.post('/auth/register', authController.register.bind(authController));
router.post('/auth/login', authController.login.bind(authController));
router.post('/auth/forgot-password', authController.forgotPassword.bind(authController));
router.post('/auth/reset-password', authController.resetPassword.bind(authController));

// Rotas autenticadas
router.get('/auth/me', authenticate, authController.me.bind(authController));

// Rotas de empresas (Super Admin)
router.get('/companies', authenticate, requireRole('SUPER_ADMIN'), companyController.list.bind(companyController));
router.post('/companies', authenticate, requireRole('SUPER_ADMIN'), companyController.create.bind(companyController));
router.put('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), companyController.update.bind(companyController));
router.delete('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), companyController.delete.bind(companyController));
router.patch('/companies/:id/toggle-active', authenticate, requireRole('SUPER_ADMIN'), companyController.toggleActive.bind(companyController));

// Rotas de usuários (Admin)
router.get('/users', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), userController.list.bind(userController));
router.post('/users', authenticate, requireRole('ADMIN'), userController.create.bind(userController));
router.put('/users/:id', authenticate, requireRole('ADMIN'), userController.update.bind(userController));
router.delete('/users/:id', authenticate, requireRole('ADMIN'), userController.delete.bind(userController));

// Rotas de categorias (Admin e User com permissão)
router.get('/categories', authenticate, categoryController.list.bind(categoryController));
router.post('/categories', authenticate, checkPermission('categories.create'), categoryController.create.bind(categoryController));
router.put('/categories/:id', authenticate, checkPermission('categories.edit'), categoryController.update.bind(categoryController));
router.delete('/categories/:id', authenticate, checkPermission('categories.delete'), categoryController.delete.bind(categoryController));

// Rotas de produtos (Admin e User com permissão)
router.get('/products', authenticate, productController.list.bind(productController));
router.get('/products/:id', authenticate, productController.getById.bind(productController));
router.post('/products', authenticate, checkPermission('products.create'), upload.single('image'), productController.create.bind(productController));
router.put('/products/:id', authenticate, checkPermission('products.edit'), upload.single('image'), productController.update.bind(productController));
router.delete('/products/:id', authenticate, checkPermission('products.delete'), productController.delete.bind(productController));

// Rotas de vendas/histórico (Admin e User com permissão)
router.get('/sales/stats', authenticate, salesController.getStats.bind(salesController));
router.get('/sales', authenticate, salesController.list.bind(salesController));
router.get('/sales/:id', authenticate, salesController.getById.bind(salesController));

// Rotas de comandas/tabs (Admin e User com permissão)
router.get('/tabs', authenticate, tabsController.listOpen.bind(tabsController));
router.post('/tabs', authenticate, checkPermission('sales.create'), tabsController.findOrCreate.bind(tabsController));
router.post('/tabs/:tabId/orders', authenticate, checkPermission('sales.create'), tabsController.addOrder.bind(tabsController));
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

export default router;
