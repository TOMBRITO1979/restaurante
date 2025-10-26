# Instruções Completas de Deploy

## ✅ Status do Projeto

O código foi desenvolvido e enviado para o GitHub: https://github.com/TOMBRITO1979/restaurante

## 🚀 Próximos Passos para Deploy

### 1. Acessar o Servidor VPS

```bash
ssh root@SEU_IP_VPS
```

Use suas credenciais de acesso ao servidor.

### 2. Clonar o Repositório

```bash
cd /opt
git clone https://github.com/TOMBRITO1979/restaurante.git
cd restaurante
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```bash
nano .env
```

**Configure as URLs e Senhas:**

```env
# Domains - SUAS URLs REAIS
FRONTEND_DOMAIN=app.seudominio.com
BACKEND_DOMAIN=api.seudominio.com
FRONTEND_URL=https://app.seudominio.com

# Database - Senha forte
POSTGRES_PASSWORD=SuaSenhaSuperSegura123!

# JWT - Chave secreta forte (pode gerar com: openssl rand -base64 32)
JWT_SECRET=sua-chave-jwt-super-secreta-aqui

# Docker Hub Token (fornecido separadamente por segurança)
DOCKER_HUB_TOKEN=seu-token-aqui
```

**URLs de Teste Sugeridas** (você pode mudar depois):
- Frontend: `restaurante-app.seudominio.com`
- Backend: `restaurante-api.seudominio.com`

### 4. Verificar DNS

Antes de fazer o deploy, certifique-se de que os domínios apontam para o IP do servidor:

```bash
# Verificar se DNS está resolvendo
nslookup app.seudominio.com
nslookup api.seudominio.com
```

Ambos devem apontar para o IP do seu servidor VPS.

### 5. Executar Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

Este script irá:
1. Login no Docker Hub
2. Build da imagem do backend
3. Build da imagem do frontend
4. Push das imagens para Docker Hub
5. Criar rede network_public (se não existir)
6. Fazer deploy da stack no Docker Swarm

**Tempo estimado:** 5-10 minutos

### 6. Verificar Status

```bash
# Listar serviços
docker service ls

# Deve mostrar:
# restaurante_backend (1/1)
# restaurante_frontend (1/1)
# restaurante_postgres (1/1)

# Ver logs
docker service logs -f restaurante_backend
docker service logs -f restaurante_frontend
```

### 7. Criar Super Admin

```bash
chmod +x create-super-admin.sh
./create-super-admin.sh
```

Digite:
- **Nome:** Seu Nome
- **Email:** admin@seudominio.com
- **Senha:** SuaSenhaSegura123!

### 8. Acessar o Sistema

Abra o navegador e acesse: `https://app.seudominio.com`

Faça login com as credenciais criadas no passo 7.

### 9. Criar Primeira Empresa

Como Super Admin:
1. Clique em "Empresas" no menu
2. Clique em "Nova Empresa"
3. Preencha:
   - Nome da empresa: "Meu Restaurante"
   - Email: empresa@exemplo.com
   - Nome do Admin: "Admin Restaurante"
   - Email do Admin: admin.restaurante@exemplo.com
   - Senha do Admin: SenhaDele123!
4. Clique em "Criar"

### 10. Login como Admin da Empresa

1. Sair da conta de Super Admin
2. Login com: admin.restaurante@exemplo.com
3. Agora você pode:
   - Criar categorias (Lanches, Bebidas, Sobremesas, etc)
   - Cadastrar produtos
   - Adicionar usuários
   - Gerenciar permissões

---

## 🔧 Configurações Adicionais (Opcional)

### AWS S3 (Para Upload de Imagens)

**IMPORTANTE:** Você mencionou que forneceria as credenciais depois. Quando tiver:

1. Edite o `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_S3_BUCKET=seu-bucket-name
```

2. Recarregue a stack:

```bash
docker stack deploy -c docker-stack.yml restaurante
```

**Até configurar o S3:**
- O sistema funciona normalmente
- Ao tentar fazer upload de imagem, vai dar erro
- Você pode cadastrar produtos sem imagem

### SMTP (Para Recuperação de Senha)

**IMPORTANTE:** Você mencionou que forneceria as credenciais depois. Quando tiver:

1. Edite o `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@seudominio.com
```

**Para Gmail:**
- Ativar verificação em 2 etapas
- Gerar senha de app em: https://myaccount.google.com/apppasswords
- Usar essa senha no `SMTP_PASS`

2. Recarregue a stack:

```bash
docker stack deploy -c docker-stack.yml restaurante
```

**Até configurar SMTP:**
- Login e registro funcionam normalmente
- Recuperação de senha não vai funcionar

---

## 📋 Checklist Pós-Deploy

- [ ] Servidor VPS acessível via SSH
- [ ] DNS configurado e resolvendo
- [ ] Deploy executado com sucesso
- [ ] Todos os 3 serviços rodando (backend, frontend, postgres)
- [ ] Super Admin criado
- [ ] Acesso ao frontend funcionando (https)
- [ ] Login funcionando
- [ ] Primeira empresa criada
- [ ] Categorias criadas
- [ ] Primeiro produto cadastrado (sem imagem ok)

---

## 🔍 Troubleshooting

### Erro: "network_public not found"

```bash
docker network create --driver overlay network_public
./deploy.sh
```

### Serviços não iniciam

```bash
docker service ps restaurante_backend --no-trunc
docker service logs restaurante_backend --tail 50
```

### Traefik não gera certificados SSL

Verifique:
1. DNS está resolvendo?
2. Portas 80 e 443 abertas?
3. Traefik está rodando?

```bash
docker service ls | grep traefik
```

### Resetar tudo e começar de novo

```bash
docker stack rm restaurante
docker volume rm restaurante_postgres_data
sleep 10
./deploy.sh
```

---

## 📝 Notas Importantes

1. **Senhas:** Não use senhas de exemplo em produção
2. **Backup:** Configure backup automático do PostgreSQL
3. **URLs:** Você pode mudar as URLs depois editando o `.env` e fazendo redeploy
4. **S3 e SMTP:** Não são obrigatórios para testar o sistema
5. **Dados:** Cada empresa tem seus dados isolados (multitenancy)

---

## 📞 Informações de Acesso

**VPS:**
- Informações fornecidas separadamente

**Docker Hub:**
- Informações fornecidas separadamente

**GitHub:**
- Repo: https://github.com/TOMBRITO1979/restaurante

**Portainer:**
- Informações fornecidas separadamente

---

## ✨ Funcionalidades Implementadas

### Sistema de Usuários
- ✅ Super Admin (gerencia empresas)
- ✅ Admin (gerencia sua empresa)
- ✅ User (usa conforme permissões)

### Gestão de Produtos
- ✅ Nome e nome de exibição
- ✅ Categoria
- ✅ Descrição
- ✅ Preço e custo
- ✅ Upload de imagem (AWS S3)
- ✅ Disponibilidade
- ✅ SKU/Código
- ✅ Tempo de preparo
- ✅ Controle de estoque
- ✅ Tags
- ✅ Promoção/desconto
- ✅ Info nutricionais
- ✅ Alergênicos
- ✅ Prioridade
- ✅ Horários específicos
- ✅ Variações (tamanhos, tipos)
- ✅ Adicionais (extras)

### Infraestrutura
- ✅ Docker Swarm
- ✅ Traefik com SSL automático
- ✅ PostgreSQL com multitenancy
- ✅ 1 réplica backend
- ✅ 1 réplica frontend
- ✅ Rede network_public

---

Qualquer dúvida, consulte os arquivos:
- `README.md` - Documentação completa
- `QUICK_START.md` - Guia rápido
- `docker-stack.yml` - Configuração da stack

**Bom deploy! 🚀**
