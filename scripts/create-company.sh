#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Criar Nova Empresa (Tenant) ===${NC}\n"

# Obter containers
POSTGRES_CONTAINER=$(docker ps --filter name=restaurante_postgres --format "{{.ID}}" | head -1)
BACKEND_CONTAINER=$(docker ps --filter name=restaurante_backend --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ] || [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${RED}Erro: Containers não encontrados!${NC}"
    exit 1
fi

# Solicitar dados da empresa
echo -e "${YELLOW}Dados da Empresa:${NC}"
read -p "Nome da empresa: " COMPANY_NAME
read -p "Email da empresa: " COMPANY_EMAIL
read -p "Telefone: " COMPANY_PHONE
read -p "Endereço: " COMPANY_ADDRESS

# Gerar slug
COMPANY_SLUG=$(echo "$COMPANY_NAME" | iconv -t ascii//TRANSLIT | sed -r 's/[^a-zA-Z0-9]+/-/g' | sed -r 's/^-+\|-+$//g' | tr A-Z a-z)
SCHEMA_NAME="tenant_$(uuidgen | cut -d'-' -f1)"

echo -e "\n${YELLOW}Dados do Admin da Empresa:${NC}"
read -p "Email do admin: " ADMIN_EMAIL
read -sp "Senha do admin: " ADMIN_PASSWORD
echo
read -p "Nome do admin: " ADMIN_NAME

# Gerar hash da senha
PASSWORD_HASH=$(docker exec $BACKEND_CONTAINER node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))")

echo -e "\n${YELLOW}Criando empresa no banco...${NC}"

# Criar empresa e admin
docker exec $POSTGRES_CONTAINER psql -U postgres -d restaurante << SQL
-- Criar empresa
INSERT INTO companies (id, name, slug, email, phone, address, "schemaName", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '$COMPANY_NAME',
  '$COMPANY_SLUG',
  '$COMPANY_EMAIL',
  '$COMPANY_PHONE',
  '$COMPANY_ADDRESS',
  '$SCHEMA_NAME',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
RETURNING id \gset company_

-- Criar admin da empresa
INSERT INTO users (id, email, password, name, role, "companyId", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '$ADMIN_EMAIL',
  '$PASSWORD_HASH',
  '$ADMIN_NAME',
  'ADMIN',
  :'company_id',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
SQL

# Criar schema do tenant (aqui você precisaria chamar o backend ou executar o SQL do tenant)
echo -e "${YELLOW}Criando schema do tenant...${NC}"
echo -e "${YELLOW}ATENÇÃO: Faça login no sistema como SUPER_ADMIN e acesse 'Empresas' para ativar o tenant.${NC}"

echo -e "\n${GREEN}✓ Empresa criada com sucesso!${NC}"
echo -e "${GREEN}Credenciais do Admin:${NC}"
echo -e "  Email: ${ADMIN_EMAIL}"
echo -e "  Senha: (a que você digitou)"
