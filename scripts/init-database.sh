#!/bin/bash
set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Inicialização do Banco de Dados ===${NC}\n"

# Obter container ID do PostgreSQL
POSTGRES_CONTAINER=$(docker ps --filter name=restaurante_postgres --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}Erro: Container do PostgreSQL não encontrado!${NC}"
    echo "Verifique se os serviços estão rodando: docker service ls"
    exit 1
fi

echo -e "${YELLOW}Criando schema do banco de dados...${NC}"

# Criar schema
docker exec $POSTGRES_CONTAINER psql -U postgres -d restaurante << 'SQL'
-- Create enum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE,
  "phone" TEXT,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "plan" TEXT NOT NULL DEFAULT 'FREE',
  "maxUsers" INTEGER NOT NULL DEFAULT 5,
  "schemaName" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "companyId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "permissions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resetToken" TEXT,
  "resetTokenExpiry" TIMESTAMP(3),
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "companies_slug_idx" ON "companies"("slug");
SQL

echo -e "${GREEN}✓ Schema criado com sucesso!${NC}\n"

# Solicitar dados do super admin
echo -e "${YELLOW}Criar usuário SUPER_ADMIN:${NC}"
read -p "Email (ex: admin@seudominio.com): " ADMIN_EMAIL
read -sp "Senha: " ADMIN_PASSWORD
echo
read -p "Nome completo: " ADMIN_NAME

# Gerar hash da senha usando bcrypt
echo -e "\n${YELLOW}Gerando hash da senha...${NC}"
PASSWORD_HASH=$(docker exec $(docker ps --filter name=restaurante_backend --format "{{.ID}}" | head -1) \
  node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))")

# Criar super admin
echo -e "${YELLOW}Criando usuário SUPER_ADMIN...${NC}"
docker exec $POSTGRES_CONTAINER psql -U postgres -d restaurante -c "
INSERT INTO users (id, email, password, name, role, \"isActive\", \"createdAt\", \"updatedAt\")
VALUES (
  gen_random_uuid(),
  '$ADMIN_EMAIL',
  '$PASSWORD_HASH',
  '$ADMIN_NAME',
  'SUPER_ADMIN',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Usuário SUPER_ADMIN criado com sucesso!${NC}\n"
    echo -e "${GREEN}Credenciais de acesso:${NC}"
    echo -e "  Email: ${ADMIN_EMAIL}"
    echo -e "  Senha: (a que você digitou)"
    echo -e "\n${YELLOW}IMPORTANTE: Guarde essas credenciais em local seguro!${NC}"
else
    echo -e "${RED}Erro ao criar usuário. Verifique se já existe.${NC}"
    exit 1
fi
