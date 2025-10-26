#!/bin/bash

# Script para criar o primeiro Super Admin
# Execute após o deploy inicial

set -e

echo "========================================="
echo "Criar Super Admin"
echo "========================================="
echo ""

read -p "Nome: " NAME
read -p "Email: " EMAIL
read -sp "Senha: " PASSWORD
echo ""

# Gerar hash da senha usando Node.js (bcrypt)
HASH=$(docker run --rm -i node:20-alpine node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('${PASSWORD}', 10);
console.log(hash);
")

# Gerar UUID
UUID=$(cat /proc/sys/kernel/random/uuid)

# Inserir no banco
docker exec -i $(docker ps -q -f name=restaurante_postgres) psql -U postgres restaurante <<EOF
INSERT INTO users (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  '${UUID}',
  '${EMAIL}',
  '${HASH}',
  '${NAME}',
  'SUPER_ADMIN',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
EOF

echo ""
echo "========================================="
echo "Super Admin criado com sucesso!"
echo "========================================="
echo ""
echo "Credenciais:"
echo "  Email: ${EMAIL}"
echo "  Senha: (a que você digitou)"
echo ""
echo "Você pode fazer login no sistema agora."
echo ""
