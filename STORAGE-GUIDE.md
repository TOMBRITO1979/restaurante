# Guia de Armazenamento de Imagens

Este guia explica como configurar diferentes opções de armazenamento de imagens para o sistema de restaurante.

## Visão Geral

O sistema suporta **três provedores de armazenamento**:

1. **Local Storage** (Desenvolvimento/Teste) - Armazena no filesystem do servidor
2. **MinIO** (Auto-hospedado) - Servidor S3-compatível self-hosted
3. **AWS S3** (Produção) - Amazon S3 gerenciado

## Comparação dos Provedores

| Característica | Local | MinIO | AWS S3 |
|----------------|-------|-------|--------|
| Custo | Grátis | Grátis (self-hosted) | Pago (~$0.023/GB) |
| Escalabilidade | Limitada | Boa | Excelente |
| Backup | Manual | Manual | Automático |
| CDN | Não | Sim (com nginx) | Sim (CloudFront) |
| Melhor para | Dev/Teste | Pequenas empresas | Produção/Escala |

## 1. Local Storage (Padrão)

### Quando usar
- Desenvolvimento local
- Testes
- Pequenas instalações single-server

### Configuração

```bash
# .env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_BASE_URL=https://rapi.chatwell.pro/uploads
```

### Características
- ✅ Configuração zero
- ✅ Grátis
- ✅ Rápido para dev/teste
- ❌ Não escalável
- ❌ Sem backup automático
- ❌ Perde arquivos ao recriar container (use volumes!)

### Deploy com Local Storage

```bash
# docker-stack.yml já está configurado
docker stack deploy -c docker-stack.yml restaurante
```

As imagens ficarão em `/app/uploads` dentro do container e serão servidas via `/uploads`.

## 2. MinIO (Recomendado para Auto-Hospedagem)

### Quando usar
- Auto-hospedagem com controle total
- Evitar custos de cloud
- Compatibilidade S3 sem AWS
- Pequenas/médias empresas

### Vantagens
- ✅ S3-compatível
- ✅ Interface web (console)
- ✅ Grátis (self-hosted)
- ✅ Fácil backup/replicação
- ✅ Pode usar CDN na frente

### Instalação

#### Passo 1: Configurar .env

```bash
# .env
STORAGE_PROVIDER=minio

# MinIO Configuration
S3_ENDPOINT=https://minio-api.rapi.chatwell.pro
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=CHANGE-ME-STRONG-PASSWORD
S3_BUCKET=restaurante-uploads
S3_FORCE_PATH_STYLE=true
```

#### Passo 2: Deploy com MinIO

```bash
# Usar stack com MinIO incluído
docker stack deploy -c docker-stack-with-minio.yml restaurante
```

#### Passo 3: Criar Bucket

1. Acesse o console MinIO: `https://minio.rapi.chatwell.pro`
2. Login com `minioadmin / CHANGE-ME-STRONG-PASSWORD`
3. Crie bucket chamado `restaurante-uploads`
4. Configure como **public** (ou configure bucket policy)

#### Passo 4: DNS

Configure DNS para:
- `minio-api.rapi.chatwell.pro` → IP do servidor (API MinIO)
- `minio.rapi.chatwell.pro` → IP do servidor (Console web)

### Bucket Policy (Public Read)

No console MinIO, configure a policy do bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::restaurante-uploads/*"]
    }
  ]
}
```

## 3. AWS S3 (Produção)

### Quando usar
- Aplicação em produção
- Alta disponibilidade necessária
- Múltiplas regiões
- Grande escala

### Vantagens
- ✅ Altamente escalável
- ✅ 99.999999999% durabilidade
- ✅ Backup automático
- ✅ Integração com CloudFront (CDN)
- ✅ Versionamento de arquivos
- ❌ Custo mensal

### Instalação

#### Passo 1: Criar Bucket na AWS

1. Acesse [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Clique em "Create bucket"
3. Nome: `restaurante-empresa-uploads`
4. Região: `us-east-1` (ou sua preferência)
5. Desmarque "Block all public access"
6. Crie o bucket

#### Passo 2: Configurar Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::restaurante-empresa-uploads/*"
    }
  ]
}
```

#### Passo 3: Criar IAM User

1. Acesse [IAM Console](https://console.aws.amazon.com/iam/)
2. Crie usuário: `restaurante-s3-user`
3. Anexe policy: `AmazonS3FullAccess` (ou crie policy customizada)
4. Gere Access Key e Secret

#### Passo 4: Configurar .env

```bash
# .env
STORAGE_PROVIDER=s3

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=restaurante-empresa-uploads
```

#### Passo 5: Deploy

```bash
docker stack deploy -c docker-stack.yml restaurante
```

### Com CloudFront CDN (Opcional)

Para melhor performance:

1. Crie distribuição CloudFront apontando para bucket S3
2. Atualize código para usar URL do CloudFront

## Migração Entre Provedores

### De Local para MinIO/S3

```bash
# 1. Configurar novo provider no .env
# 2. Redesenhar aplicação
# 3. Fazer upload manual dos arquivos existentes para MinIO/S3
# 4. Atualizar URLs no banco de dados (se necessário)
```

### Script de Migração (Exemplo)

```bash
#!/bin/bash
# migrate-to-minio.sh

# Upload todos arquivos locais para MinIO
for file in ./uploads/products/*; do
  mc cp "$file" minio/restaurante-uploads/products/
done
```

## Troubleshooting

### Imagens não aparecem

**Local Storage:**
- Verificar se volume está montado: `docker volume ls`
- Verificar permissões: container deve poder ler/escrever em `./uploads`
- Verificar logs: `docker service logs restaurante_backend`

**MinIO:**
- Testar conectividade: `curl https://minio-api.rapi.chatwell.pro`
- Verificar bucket existe e é público
- Verificar credenciais no .env
- Verificar endpoint está correto

**AWS S3:**
- Verificar IAM credentials
- Verificar bucket policy (deve permitir public read)
- Verificar CORS configuration
- Verificar região está correta

### Upload falha

Verificar logs do backend:
```bash
docker service logs -f restaurante_backend
```

Procurar por:
- `Error uploading file`
- `Access Denied`
- `Bucket does not exist`

## Requisitos de Formato

O sistema aceita os seguintes formatos de imagem:

- **Formatos**: JPG, JPEG, PNG, WebP, GIF
- **Tamanho máximo**: 5MB (configurável em `backend/src/middleware/upload.ts`)
- **Dimensões**: Qualquer (recomendado: 800x600 para web)

## Performance

### Local Storage
- Latência: ~1-5ms (mesmo servidor)
- Throughput: Limitado pelo disco

### MinIO
- Latência: ~10-50ms (rede interna)
- Throughput: ~1-10 Gbps (dependendo da rede)

### AWS S3
- Latência: ~50-200ms (depende da região)
- Throughput: Virtualmente ilimitado
- Com CloudFront: ~10-50ms

## Custos Mensais Estimados

### Local Storage
- **Armazenamento**: Grátis (usa espaço do servidor)
- **Tráfego**: Grátis (usa banda do servidor)
- **Total**: R$ 0

### MinIO
- **Servidor**: R$ 50-200/mês (dependendo do VPS)
- **Armazenamento**: Incluso no servidor
- **Tráfego**: Incluso ou ~R$ 0.10/GB
- **Total**: R$ 50-200/mês

### AWS S3
- **Armazenamento**: R$ 0.12/GB/mês
- **Requisições GET**: R$ 0.002/1000 requests
- **Tráfego**: R$ 0.60/GB
- **Total para 10GB, 10k requests/mês**: ~R$ 8/mês
- **Com CloudFront**: +R$ 0.45/GB = ~R$ 12/mês

## Recomendações

**Desenvolvimento:**
```
STORAGE_PROVIDER=local
```

**Pequena empresa (< 1000 produtos):**
```
STORAGE_PROVIDER=minio
```

**Empresa média/grande:**
```
STORAGE_PROVIDER=s3
```

**Multi-região/Alta escala:**
```
STORAGE_PROVIDER=s3
+ CloudFront CDN
```
