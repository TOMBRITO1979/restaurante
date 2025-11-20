# Plano de Implementação de Segurança
**ChefWell v2.2.0 → v3.0.0 (Production Ready)**

## Estratégia

✅ **Uma mudança por vez**
✅ **Testar após cada mudança**
✅ **Backup antes de cada etapa**
✅ **Rollback disponível**
✅ **Validação completa do sistema**

---

## Etapa 1: Validar Schema Names (SQL Injection) 🔴 CRÍTICO

**Risco:** SQL Injection permite acesso total ao banco
**Tempo:** 30 minutos
**Arquivos:** `backend/src/utils/database.ts`

**Mudanças:**
1. Adicionar função de validação de schema name
2. Validar em `createTenantSchema()`
3. Validar em `getTenantClient()`
4. Adicionar testes

**Testes:**
- ✅ Criar empresa válida
- ✅ Tentar criar empresa com nome malicioso
- ✅ Verificar que schema existe corretamente
- ✅ Testar login e operações básicas

---

## Etapa 2: Implementar Rate Limiting 🔴 CRÍTICO

**Risco:** Brute force em senhas
**Tempo:** 45 minutos
**Arquivos:** `backend/src/middleware/rateLimit.ts`, `backend/src/routes/index.ts`

**Mudanças:**
1. Instalar `express-rate-limit`
2. Criar middleware de rate limiting
3. Aplicar em endpoints críticos (login, reset senha)

**Testes:**
- ✅ Login normal funciona
- ✅ Múltiplas tentativas são bloqueadas
- ✅ Bloqueio expira após tempo configurado
- ✅ Reset de senha tem limite separado

---

## Etapa 3: Fortalecer JWT_SECRET 🔴 CRÍTICO

**Risco:** Bypass de autenticação
**Tempo:** 15 minutos
**Arquivos:** `backend/src/middleware/auth.ts`, `backend/src/controllers/AuthController.ts`

**Mudanças:**
1. Remover fallback inseguro
2. Validar JWT_SECRET no startup
3. Adicionar verificação de segurança

**Testes:**
- ✅ App não inicia sem JWT_SECRET
- ✅ App não inicia com JWT_SECRET fraco
- ✅ Login e autenticação funcionam normalmente
- ✅ Tokens antigos ainda funcionam

---

## Etapa 4: Implementar Proteção CSRF 🔴 CRÍTICO

**Risco:** Ações não autorizadas
**Tempo:** 1 hora
**Arquivos:** `backend/src/middleware/csrf.ts`, `backend/src/routes/index.ts`, `frontend/src/services/api.ts`

**Mudanças:**
1. Instalar `csurf`
2. Criar middleware CSRF
3. Adicionar endpoint para obter token
4. Atualizar frontend para incluir token

**Testes:**
- ✅ GET requests funcionam sem CSRF
- ✅ POST/PUT/DELETE exigem token CSRF
- ✅ Token inválido é rejeitado
- ✅ Frontend obtém e usa token corretamente

---

## Etapa 5: Implementar Logging Seguro 🔴 CRÍTICO

**Risco:** Vazamento de dados sensíveis
**Tempo:** 1 hora
**Arquivos:** `backend/src/utils/logger.ts`, todos os controllers

**Mudanças:**
1. Instalar `winston`
2. Criar logger com sanitização
3. Substituir `console.log` por logger
4. Configurar níveis de log

**Testes:**
- ✅ Logs não contêm senhas
- ✅ Logs não contêm tokens
- ✅ Erros são logados corretamente
- ✅ Logs incluem contexto útil

---

## Etapa 6: Atualizar Dependências Vulneráveis 🟠 ALTA

**Risco:** Exploits conhecidos
**Tempo:** 30 minutos
**Arquivos:** `backend/package.json`, `frontend/package.json`

**Mudanças:**
1. Atualizar nodemailer
2. Atualizar socket.io
3. Atualizar vite
4. Atualizar esbuild

**Testes:**
- ✅ App compila sem erros
- ✅ Emails funcionam (SMTP)
- ✅ Build do frontend funciona
- ✅ npm audit mostra 0 vulnerabilidades críticas/altas

---

## Etapa 7: Implementar Validação com Zod 🟠 ALTA

**Risco:** XSS, injeção de dados
**Tempo:** 2 horas
**Arquivos:** `backend/src/schemas/`, controllers

**Mudanças:**
1. Instalar `zod`
2. Criar schemas de validação
3. Adicionar middleware de validação
4. Aplicar em endpoints críticos

**Testes:**
- ✅ Dados válidos são aceitos
- ✅ Dados inválidos são rejeitados com erro 400
- ✅ XSS é bloqueado
- ✅ SQL injection em inputs é bloqueado

---

## Etapa 8: Aumentar Rounds de Bcrypt 🟠 ALTA

**Risco:** Senhas fracas podem ser quebradas
**Tempo:** 15 minutos
**Arquivos:** `backend/src/controllers/AuthController.ts`, `backend/src/controllers/UserController.ts`

**Mudanças:**
1. Aumentar de 10 para 12 rounds
2. Manter compatibilidade com senhas antigas

**Testes:**
- ✅ Novas senhas usam 12 rounds
- ✅ Senhas antigas ainda funcionam
- ✅ Login não fica lento demais
- ✅ Registro funciona normalmente

---

## Etapa 9: Completar Headers de Segurança 🟠 ALTA

**Risco:** XSS, clickjacking
**Tempo:** 30 minutos
**Arquivos:** `backend/src/app.ts`

**Mudanças:**
1. Configurar Helmet completo
2. Adicionar CSP (Content Security Policy)
3. Configurar HSTS
4. Adicionar headers adicionais

**Testes:**
- ✅ Verificar headers com curl
- ✅ Frontend carrega corretamente
- ✅ Stripe Elements funciona
- ✅ Verificar score em securityheaders.com

---

## Etapa 10: Melhorar Isolamento Multi-Tenant 🟠 ALTA

**Risco:** Vazamento de dados entre restaurantes
**Tempo:** 1.5 horas
**Arquivos:** Todos os controllers

**Mudanças:**
1. Criar helper de validação de recursos
2. Adicionar validação em todos os endpoints
3. Adicionar testes de isolamento

**Testes:**
- ✅ Usuário não acessa dados de outro tenant
- ✅ Admin não acessa dados de outra empresa
- ✅ IDs inválidos retornam 404
- ✅ Tentativa de acesso cross-tenant retorna 403

---

## Etapa 11: Implementar Paginação 🟡 MÉDIA

**Risco:** DoS, timeout
**Tempo:** 1 hora
**Arquivos:** Controllers de listagem

**Mudanças:**
1. Adicionar paginação em produtos
2. Adicionar paginação em vendas
3. Adicionar paginação em despesas
4. Atualizar frontend

**Testes:**
- ✅ Listagens retornam apenas página solicitada
- ✅ Metadata de paginação está correto
- ✅ Frontend pagina corretamente
- ✅ Performance melhora em listas grandes

---

## Etapa 12: Implementar Backup Automatizado 🟡 MÉDIA

**Risco:** Perda de dados
**Tempo:** 1 hora
**Arquivos:** Scripts de backup

**Mudanças:**
1. Criar script de backup
2. Configurar cron
3. Testar recuperação
4. Configurar retenção

**Testes:**
- ✅ Backup é criado corretamente
- ✅ Backup pode ser restaurado
- ✅ Backups antigos são removidos
- ✅ Cron executa no horário correto

---

## Etapa 13: Implementar Monitoramento 🟡 MÉDIA

**Risco:** Downtime não detectado
**Tempo:** 1 hora
**Arquivos:** `backend/src/app.ts`, configuração

**Mudanças:**
1. Adicionar endpoint de health check
2. Configurar Sentry (opcional)
3. Adicionar métricas básicas

**Testes:**
- ✅ Health check responde corretamente
- ✅ Health check detecta problemas no banco
- ✅ Erros são reportados (se Sentry configurado)
- ✅ Métricas são coletadas

---

## Etapa 14: Implementar Audit Trail 🟡 MÉDIA

**Risco:** Sem rastreabilidade
**Tempo:** 2 horas
**Arquivos:** Middleware de auditoria, controllers

**Mudanças:**
1. Criar tabela de auditoria
2. Criar middleware
3. Aplicar em ações críticas
4. Criar endpoint de consulta

**Testes:**
- ✅ Ações são logadas corretamente
- ✅ Logs incluem usuário, IP, timestamp
- ✅ Admin pode visualizar logs
- ✅ Performance não degrada

---

## Etapa 15: Testes Finais e Documentação 🟡 MÉDIA

**Risco:** Regressão não detectada
**Tempo:** 2 horas
**Arquivos:** Documentação, testes

**Mudanças:**
1. Teste completo do sistema
2. Atualizar documentação
3. Criar guia de deploy
4. Criar runbook de incidentes

**Testes:**
- ✅ Fluxo completo de registro e login
- ✅ Criação de produtos e vendas
- ✅ Pagamentos funcionam
- ✅ Relatórios são gerados
- ✅ Exports funcionam
- ✅ Permissões respeitadas

---

## Cronograma Estimado

| Etapa | Duração | Tipo | Acumulado |
|-------|---------|------|-----------|
| 1 | 30 min | 🔴 Crítico | 30 min |
| 2 | 45 min | 🔴 Crítico | 1h 15min |
| 3 | 15 min | 🔴 Crítico | 1h 30min |
| 4 | 1 hora | 🔴 Crítico | 2h 30min |
| 5 | 1 hora | 🔴 Crítico | 3h 30min |
| 6 | 30 min | 🟠 Alta | 4h |
| 7 | 2 horas | 🟠 Alta | 6h |
| 8 | 15 min | 🟠 Alta | 6h 15min |
| 9 | 30 min | 🟠 Alta | 6h 45min |
| 10 | 1.5 horas | 🟠 Alta | 8h 15min |
| 11 | 1 hora | 🟡 Média | 9h 15min |
| 12 | 1 hora | 🟡 Média | 10h 15min |
| 13 | 1 hora | 🟡 Média | 11h 15min |
| 14 | 2 horas | 🟡 Média | 13h 15min |
| 15 | 2 horas | 🟡 Média | 15h 15min |

**Total:** ~15 horas (2 dias de trabalho focado)

---

## Procedimento de Cada Etapa

### Antes de Iniciar Etapa
1. ✅ Criar backup do banco de dados
2. ✅ Criar branch Git para a etapa
3. ✅ Documentar estado atual

### Durante a Etapa
1. ✅ Implementar mudanças
2. ✅ Testar localmente
3. ✅ Verificar logs de erro
4. ✅ Fazer commit

### Após a Etapa
1. ✅ Build Docker (backend e frontend)
2. ✅ Deploy em staging/produção
3. ✅ Testar funcionalidades críticas
4. ✅ Verificar logs do sistema
5. ✅ Se OK: merge para main
6. ✅ Se ERRO: rollback imediato

---

## Critérios de Sucesso

### Após Etapa 5 (Críticas)
- ✅ npm audit: 0 vulnerabilidades críticas
- ✅ Sistema funcional completo
- ✅ Autenticação segura
- ✅ Sem SQL injection possível

### Após Etapa 10 (Altas)
- ✅ npm audit: 0 vulnerabilidades altas
- ✅ Validação completa de dados
- ✅ Isolamento multi-tenant garantido
- ✅ Headers de segurança A+ rating

### Após Etapa 15 (Completo)
- ✅ Sistema pronto para produção
- ✅ Backup automatizado funcionando
- ✅ Monitoramento ativo
- ✅ Documentação completa
- ✅ Auditoria de ações implementada

---

## Rollback Plan

Se qualquer etapa falhar:

1. **Parar serviços:**
   ```bash
   docker service scale chefwell_backend=0
   docker service scale chefwell_frontend=0
   ```

2. **Restaurar banco:**
   ```bash
   docker exec -i chefwell_postgres psql -U postgres -d restaurante < /root/backups/backup_before_stepX.dump
   ```

3. **Reverter código:**
   ```bash
   git reset --hard <commit-anterior>
   docker build...
   ```

4. **Reiniciar serviços:**
   ```bash
   docker service scale chefwell_backend=1
   docker service scale chefwell_frontend=2
   ```

---

## Comandos Úteis

### Backup Antes de Cada Etapa
```bash
docker exec chefwell_postgres pg_dump -U postgres -d restaurante > \
  /root/backups/backup_before_step{N}_$(date +%Y%m%d_%H%M%S).dump
```

### Verificar Logs
```bash
docker service logs -f chefwell_backend --tail 100
docker service logs -f chefwell_frontend --tail 100
```

### Testar Endpoints
```bash
# Login
curl -X POST https://api.chefwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chefwell.pro","password":"admin123"}'

# Health Check
curl https://api.chefwell.pro/api/health
```

---

## Checklist de Teste Pós-Deploy

Após cada etapa, executar:

- [ ] Login funciona
- [ ] Criar produto funciona
- [ ] Criar venda funciona
- [ ] Pagamento Stripe funciona
- [ ] Relatórios são gerados
- [ ] Exports (PDF/CSV) funcionam
- [ ] Permissões são respeitadas
- [ ] Logs não mostram erros
- [ ] Performance está OK (< 2s por request)

---

**Pronto para começar!** 🚀

Vamos executar Etapa 1 agora?
