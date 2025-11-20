import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';
import { getCache, setCache, invalidateCache, getCacheKey } from '@/utils/redis';

export class CategoryController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      // ✅ CACHE: Tentar buscar do cache
      const cacheKey = getCacheKey(tenantSchema, 'categories:list');
      const cachedCategories = await getCache<any>(cacheKey);
      if (cachedCategories) {
        console.log(`📦 Cache HIT: Categories list (tenant: ${tenantSchema})`);
        res.json(cachedCategories);
        return;
      }

      console.log(`🔍 Cache MISS: Buscando categories do banco (tenant: ${tenantSchema})`);

      const categories = await db.$queryRawUnsafe(`
        SELECT c.*,
          (SELECT COUNT(*) FROM "${tenantSchema}"."products" p WHERE p."categoryId" = c.id) as "productCount"
        FROM "${tenantSchema}"."categories" c
        ORDER BY c.priority DESC, c.name ASC
      `);

      // Converter BigInt para Number
      const categoriesWithCount = (categories as any[]).map(cat => ({
        ...cat,
        productCount: Number(cat.productCount)
      }));

      // ✅ CACHE: Salvar no cache por 5 minutos
      await setCache(cacheKey, categoriesWithCount, 300);
      console.log(`💾 Cache SAVED: Categories list (tenant: ${tenantSchema}, TTL: 5 min)`);

      res.json(categoriesWithCount);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ error: 'Erro ao listar categorias' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, priority } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const categoryId = uuidv4();

      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."categories" (id, name, description, priority, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        categoryId,
        name,
        description || null,
        priority || 0
      );

      const categories = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."categories" WHERE id = $1
      `, categoryId);

      // ✅ CACHE: Invalidar cache de categorias e produtos (product count mudou)
      await invalidateCache(`${tenantSchema}:categories:*`);
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de categorias e produtos (tenant: ${tenantSchema})`);

      res.status(201).json((categories as any[])[0]);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, priority } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."categories"
        SET name = $1, description = $2, priority = $3, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
        name,
        description || null,
        priority || 0,
        id
      );

      const categories = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."categories" WHERE id = $1
      `, id);

      if (!categories || (categories as any[]).length === 0) {
        res.status(404).json({ error: 'Categoria não encontrada' });
        return;
      }

      // ✅ CACHE: Invalidar cache de categorias e produtos
      await invalidateCache(`${tenantSchema}:categories:*`);
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de categorias e produtos (tenant: ${tenantSchema})`);

      res.json((categories as any[])[0]);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      // Verificar se há produtos nesta categoria
      const products = await db.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."products" WHERE "categoryId" = $1
      `, id);

      if ((products as any[])[0].count > 0) {
        res.status(400).json({ error: 'Não é possível deletar categoria com produtos' });
        return;
      }

      await db.$executeRawUnsafe(`DELETE FROM "${tenantSchema}"."categories" WHERE id = $1`, id);

      // ✅ CACHE: Invalidar cache de categorias e produtos
      await invalidateCache(`${tenantSchema}:categories:*`);
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de categorias e produtos (tenant: ${tenantSchema})`);

      res.json({ message: 'Categoria deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
}
