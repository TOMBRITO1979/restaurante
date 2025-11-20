import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';
import { uploadFile, deleteFile } from '@/utils/storage';
import { parsePaginationParams, calculateOffset, createPaginatedResponse } from '@/utils/pagination';
import { getCache, setCache, invalidateCache, getCacheKey } from '@/utils/redis';

export class ProductController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { categoryId, search, available } = req.query;

      // ✅ SECURITY & PERFORMANCE: Paginação
      const { page, limit } = parsePaginationParams(req.query, {
        defaultLimit: 50,
        maxLimit: 200
      });
      const offset = calculateOffset(page, limit);

      // ✅ CACHE: Gerar chave incluindo query params
      const cacheKey = getCacheKey(
        tenantSchema,
        'products:list',
        `p${page}_l${limit}_c${categoryId || 'all'}_s${search || 'none'}_a${available || 'all'}`
      );

      // ✅ CACHE: Tentar buscar do cache
      const cachedProducts = await getCache<any>(cacheKey);
      if (cachedProducts) {
        console.log(`📦 Cache HIT: Products list (tenant: ${tenantSchema})`);
        res.json(cachedProducts);
        return;
      }

      console.log(`🔍 Cache MISS: Buscando products do banco (tenant: ${tenantSchema})`);

      const whereConditions: string[] = ['1=1'];
      const params: any[] = [];

      if (categoryId) {
        whereConditions.push(`"categoryId" = $${params.length + 1}`);
        params.push(categoryId);
      }

      if (search) {
        whereConditions.push(`("name" ILIKE $${params.length + 1} OR "displayName" ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }

      if (available !== undefined) {
        whereConditions.push(`"isAvailable" = $${params.length + 1}`);
        params.push(available === 'true');
      }

      const whereClause = whereConditions.join(' AND ');

      // Buscar produtos com paginação
      const products = await db.$queryRawUnsafe(`
        SELECT p.*,
          json_build_object('id', c.id, 'name', c.name) as category
        FROM "${tenantSchema}"."products" p
        LEFT JOIN "${tenantSchema}"."categories" c ON p."categoryId" = c.id
        WHERE ${whereClause}
        ORDER BY p.priority DESC, p."createdAt" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, ...params, limit, offset) as any[];

      // Contar total de registros
      const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total
        FROM "${tenantSchema}"."products" p
        WHERE ${whereClause}
      `, ...params) as any[];

      const total = countResult[0]?.total || 0;

      // Resposta paginada
      const response = createPaginatedResponse(products, total, page, limit);

      // ✅ CACHE: Salvar no cache por 5 minutos
      await setCache(cacheKey, response, 300);
      console.log(`💾 Cache SAVED: Products list (tenant: ${tenantSchema}, TTL: 5 min)`);

      res.json(response);
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const products = await db.$queryRawUnsafe(`
        SELECT p.*,
          json_build_object('id', c.id, 'name', c.name) as category,
          (
            SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'value', v.value, 'priceAdjust', v."priceAdjust"))
            FROM "${tenantSchema}"."product_variations" v
            WHERE v."productId" = p.id
          ) as variations,
          (
            SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'price', a.price))
            FROM "${tenantSchema}"."product_additions" a
            WHERE a."productId" = p.id
          ) as additions
        FROM "${tenantSchema}"."products" p
        LEFT JOIN "${tenantSchema}"."categories" c ON p."categoryId" = c.id
        WHERE p.id = $1
      `, id);

      if (!products || (products as any[]).length === 0) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }

      res.json((products as any[])[0]);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const {
        name,
        displayName,
        categoryId,
        description,
        price,
        isAvailable,
        sku,
        prepTime,
        cost,
        stock,
        tags,
        hasPromotion,
        promotionDiscount,
        nutritionalInfo,
        allergens,
        priority,
        availableSchedule,
        variations,
        additions,
      } = req.body;

      let imageUrl: string | undefined;

      // Upload da imagem se fornecida
      if (req.file) {
        imageUrl = await uploadFile(req.file, 'products', tenantSchema);
      }

      const productId = uuidv4();

      // Inserir produto
      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."products" (
          id, name, "displayName", "categoryId", description, price, "imageUrl",
          "isAvailable", sku, "prepTime", cost, stock, tags, "hasPromotion",
          "promotionDiscount", "nutritionalInfo", allergens, priority, "availableSchedule",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
        productId,
        name,
        displayName,
        categoryId,
        description || null,
        price ? parseFloat(price) : 0,
        imageUrl || null,
        isAvailable === 'true' || isAvailable === true,
        sku || null,
        prepTime ? parseInt(prepTime) : null,
        cost ? parseFloat(cost) : null,
        stock ? parseInt(stock) : null,
        Array.isArray(tags) ? tags : (tags ? [tags] : []),
        hasPromotion === 'true' || hasPromotion === true,
        promotionDiscount ? parseFloat(promotionDiscount) : null,
        nutritionalInfo || null,
        allergens || null,
        priority ? parseInt(priority) : 0,
        availableSchedule ? JSON.stringify(availableSchedule) : null
      );

      // Inserir variações se fornecidas
      if (variations && variations.length > 0) {
        for (const variation of variations) {
          await db.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}"."product_variations" (id, "productId", name, value, "priceAdjust")
            VALUES ($1, $2, $3, $4, $5)
          `,
            uuidv4(),
            productId,
            variation.name,
            variation.value,
            variation.priceAdjust ? parseFloat(variation.priceAdjust) : 0
          );
        }
      }

      // Inserir adicionais se fornecidos
      if (additions && additions.length > 0) {
        for (const addition of additions) {
          await db.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}"."product_additions" (id, "productId", name, price)
            VALUES ($1, $2, $3, $4)
          `,
            uuidv4(),
            productId,
            addition.name,
            addition.price ? parseFloat(addition.price) : 0
          );
        }
      }

      // Buscar produto criado
      const products = await db.$queryRawUnsafe(`
        SELECT p.*, json_build_object('id', c.id, 'name', c.name) as category
        FROM "${tenantSchema}"."products" p
        LEFT JOIN "${tenantSchema}"."categories" c ON p."categoryId" = c.id
        WHERE p.id = $1
      `, productId);

      // ✅ CACHE: Invalidar cache de produtos após criar
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de produtos (tenant: ${tenantSchema})`);

      res.status(201).json((products as any[])[0]);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const {
        name,
        displayName,
        categoryId,
        description,
        price,
        isAvailable,
        sku,
        prepTime,
        cost,
        stock,
        tags,
        hasPromotion,
        promotionDiscount,
        nutritionalInfo,
        allergens,
        priority,
        availableSchedule,
        variations,
        additions,
      } = req.body;

      // Verificar se produto existe
      const existingProducts = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."products" WHERE id = $1
      `, id);

      if (!existingProducts || (existingProducts as any[]).length === 0) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }

      const existingProduct = (existingProducts as any[])[0];
      let imageUrl = existingProduct.imageUrl;

      // Upload de nova imagem se fornecida
      if (req.file) {
        // Deletar imagem antiga
        if (imageUrl) {
          try {
            await deleteFile(imageUrl);
          } catch (err) {
            console.error('Erro ao deletar imagem antiga:', err);
          }
        }
        imageUrl = await uploadFile(req.file, 'products', tenantSchema);
      }

      // Atualizar produto
      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."products"
        SET name = $1, "displayName" = $2, "categoryId" = $3, description = $4,
            price = $5, "imageUrl" = $6, "isAvailable" = $7, sku = $8,
            "prepTime" = $9, cost = $10, stock = $11, tags = $12,
            "hasPromotion" = $13, "promotionDiscount" = $14, "nutritionalInfo" = $15,
            allergens = $16, priority = $17, "availableSchedule" = $18,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $19
      `,
        name,
        displayName,
        categoryId,
        description || null,
        price ? parseFloat(price) : 0,
        imageUrl,
        isAvailable === 'true' || isAvailable === true,
        sku || null,
        prepTime ? parseInt(prepTime) : null,
        cost ? parseFloat(cost) : null,
        stock ? parseInt(stock) : null,
        Array.isArray(tags) ? tags : (tags ? [tags] : []),
        hasPromotion === 'true' || hasPromotion === true,
        promotionDiscount ? parseFloat(promotionDiscount) : null,
        nutritionalInfo || null,
        allergens || null,
        priority ? parseInt(priority) : 0,
        availableSchedule ? JSON.stringify(availableSchedule) : null,
        id
      );

      // Atualizar variações
      if (variations) {
        await db.$executeRawUnsafe(`DELETE FROM "${tenantSchema}"."product_variations" WHERE "productId" = $1`, id);
        for (const variation of variations) {
          await db.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}"."product_variations" (id, "productId", name, value, "priceAdjust")
            VALUES ($1, $2, $3, $4, $5)
          `,
            uuidv4(),
            id,
            variation.name,
            variation.value,
            variation.priceAdjust ? parseFloat(variation.priceAdjust) : 0
          );
        }
      }

      // Atualizar adicionais
      if (additions) {
        await db.$executeRawUnsafe(`DELETE FROM "${tenantSchema}"."product_additions" WHERE "productId" = $1`, id);
        for (const addition of additions) {
          await db.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}"."product_additions" (id, "productId", name, price)
            VALUES ($1, $2, $3, $4)
          `,
            uuidv4(),
            id,
            addition.name,
            addition.price ? parseFloat(addition.price) : 0
          );
        }
      }

      // Buscar produto atualizado
      const products = await db.$queryRawUnsafe(`
        SELECT p.*, json_build_object('id', c.id, 'name', c.name) as category
        FROM "${tenantSchema}"."products" p
        LEFT JOIN "${tenantSchema}"."categories" c ON p."categoryId" = c.id
        WHERE p.id = $1
      `, id);

      // ✅ CACHE: Invalidar cache de produtos após atualizar
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de produtos (tenant: ${tenantSchema})`);

      res.json((products as any[])[0]);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const products = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."products" WHERE id = $1
      `, id);

      if (!products || (products as any[]).length === 0) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }

      const product = (products as any[])[0];

      // Deletar imagem se existir
      if (product.imageUrl) {
        try {
          await deleteFile(product.imageUrl);
        } catch (err) {
          console.error('Erro ao deletar imagem:', err);
        }
      }

      // Deletar produto (cascade vai deletar variações e adicionais)
      await db.$executeRawUnsafe(`DELETE FROM "${tenantSchema}"."products" WHERE id = $1`, id);

      // ✅ CACHE: Invalidar cache de produtos após deletar
      await invalidateCache(`${tenantSchema}:products:*`);
      console.log(`🗑️  Cache: Invalidado cache de produtos (tenant: ${tenantSchema})`);

      res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  }
}
