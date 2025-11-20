import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';
import { parsePaginationParams, calculateOffset, createPaginatedResponse } from '@/utils/pagination';

export class CustomersController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { search } = req.query;

      // ✅ SECURITY & PERFORMANCE: Paginação
      const { page, limit } = parsePaginationParams(req.query, {
        defaultLimit: 50,
        maxLimit: 200
      });
      const offset = calculateOffset(page, limit);

      const params: any[] = [];
      let whereClause = '';

      if (search) {
        whereClause = ` WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
        params.push(`%${search}%`);
      }

      // Buscar clientes com paginação
      const customers = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."customers"
        ${whereClause}
        ORDER BY "createdAt" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, ...params, limit, offset) as any[];

      // Contar total de registros
      const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total
        FROM "${tenantSchema}"."customers"
        ${whereClause}
      `, ...params) as any[];

      const total = countResult[0]?.total || 0;

      res.json(createPaginatedResponse(customers, total, page, limit));
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ error: 'Erro ao listar clientes' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const customers = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."customers" WHERE id = $1
      `, id);

      if (!customers || (customers as any[]).length === 0) {
        res.status(404).json({ error: 'Cliente não encontrado' });
        return;
      }

      res.json((customers as any[])[0]);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, email, phone, street, number, complement, neighborhood, city, state, zipCode, tag, birthDate } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      if (!name) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
      }

      const customerId = uuidv4();

      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."customers"
        (id, name, email, phone, street, number, complement, neighborhood, city, state, "zipCode", tag, "birthDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        customerId,
        name,
        email || null,
        phone || null,
        street || null,
        number || null,
        complement || null,
        neighborhood || null,
        city || null,
        state || null,
        zipCode || null,
        tag || null,
        birthDate || null
      );

      const customers = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."customers" WHERE id = $1
      `, customerId);

      res.status(201).json((customers as any[])[0]);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, phone, street, number, complement, neighborhood, city, state, zipCode, tag, birthDate } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      if (!name) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
      }

      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."customers"
        SET name = $1, email = $2, phone = $3, street = $4, number = $5, complement = $6,
            neighborhood = $7, city = $8, state = $9, "zipCode" = $10, tag = $11, "birthDate" = $12, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $13
      `,
        name,
        email || null,
        phone || null,
        street || null,
        number || null,
        complement || null,
        neighborhood || null,
        city || null,
        state || null,
        zipCode || null,
        tag || null,
        birthDate || null,
        id
      );

      const customers = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."customers" WHERE id = $1
      `, id);

      if (!customers || (customers as any[]).length === 0) {
        res.status(404).json({ error: 'Cliente não encontrado' });
        return;
      }

      res.json((customers as any[])[0]);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}"."customers" WHERE id = $1
      `, id);

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }
}
