# Alugue Houses — Backups automáticos e restauração testada (Etapa 19)

> Status: **aprovado**.

O plano gratuito do Supabase não oferece backups para baixar. Por isso o
próprio projeto faz o backup, todos os dias, e prova que ele restaura.

## Como funciona

```
GitHub Actions (03:47, Brasília)
  ├─ dados do banco (login, imóveis, reservas, avaliações, mensagens…)
  ├─ estrutura do banco (referência)
  ├─ fotos do Storage (com assinatura sha256 de cada arquivo)
  └─ manifesto: linhas e assinatura (md5) de cada tabela
        → pacote .tar.gz criptografado com age (chave PÚBLICA)
        → Cloudflare R2, pasta diarios/ — 30 dias de histórico
```

- **Criptografia**: só a chave **privada** abre o backup. O GitHub guarda
  apenas a pública; um vazamento do R2 não expõe dados.
- **Fica de fora**: sessões, tokens e logs de autenticação (transitórios) e
  os códigos antispam. Quem estava conectado precisa entrar de novo depois de
  uma restauração.
- **Ordem do dia**: a limpeza LGPD roda às 03:17 e o backup às 03:47, então
  dados vencidos não voltam em backups novos. Backups antigos somem em 30
  dias.

## Restauração (passo a passo)

1. Ter um projeto Supabase com as migrations aplicadas (`supabase db push`),
   vazio ou não — **os dados das tabelas do backup são substituídos**.
2. Baixar o backup do R2 (painel da Cloudflare ou
   `scripts/backup/r2.sh baixar-ultimo ./restauracao`).
3. Rodar, com a chave privada em um arquivo:

```bash
DB_URL="postgresql://…"              # conexão do projeto de DESTINO
SUPABASE_URL="https://….supabase.co"
SUPABASE_SERVICE_ROLE_KEY="…"
BACKUP_AGE_IDENTITY_FILE=./chave-privada-age.txt
CONFIRM_RESTORE=sim scripts/backup/restore.sh ./restauracao/alugue-houses-AAAAMMDDTHHMMSSZ.tar.gz.age
```

O script descriptografa, carrega o banco numa única transação (sem disparar
gatilhos), reenvia as fotos e **confere**: cada tabela precisa ter o mesmo
número de linhas e a mesma assinatura do manifesto, e cada foto o mesmo
sha256. Se algo divergir, ele termina com erro e lista o que não bateu.

## Testes

- **A cada push (CI, job "Backup e restauração")**:
  `scripts/backup/roundtrip-test.sh` cria dados de exemplo (hóspede, imóvel
  com foto real, reserva aprovada, bloqueio, avaliação, favorito, mensagem),
  faz o backup, confirma que o arquivo é ilegível sem a chave, **zera o
  banco**, restaura, compara com o estado anterior e, por fim, altera um
  registro para provar que a conferência acusa diferença.
- **Toda segunda-feira (workflow "Simulado de restauração")**: baixa o
  backup real mais recente do R2, restaura num Supabase temporário dentro do
  GitHub Actions e confere. Exige o segredo `BACKUP_AGE_IDENTITY`.
- Nesta sessão: ida e volta local aprovada (16 tabelas, 3.660 linhas e 20
  fotos conferidas) e a página de um imóvel restaurado abrindo com a foto.

## Configuração (você faz uma vez, antes do lançamento)

Nenhuma chave foi criada ou versionada. Enquanto `BACKUP_ENABLED` não for
`true`, os dois workflows ficam parados.

1. **Par de chaves age** (no seu computador): `age-keygen -o chave-privada-age.txt`.
   A linha `# public key: age1…` é a chave pública. Guarde o arquivo da chave
   privada num gerenciador de senhas **e** em outro lugar seguro — sem ela os
   backups não abrem.
2. **Cloudflare R2**: criar o bucket (ex.: `alugue-houses-backups`, privado) e
   um token de API do R2 com permissão de leitura e escrita **só nesse
   bucket**.
3. **Supabase (produção)**: copiar a string de conexão do **Session pooler**
   (os servidores do GitHub não acessam a conexão direta, que é só IPv6).
4. **GitHub → Settings → Secrets and variables → Actions**:

| Tipo               | Nome                                        | Valor                                                 |
| ------------------ | ------------------------------------------- | ----------------------------------------------------- |
| Segredo            | `SUPABASE_DB_URL`                           | string do Session pooler (com a senha do banco)       |
| Segredo            | `SUPABASE_URL`                              | URL da API do projeto                                 |
| Segredo            | `SUPABASE_SERVICE_ROLE_KEY`                 | chave service_role                                    |
| Segredo            | `R2_ACCOUNT_ID`                             | ID da conta Cloudflare                                |
| Segredo            | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | token do R2                                           |
| Segredo (opcional) | `BACKUP_AGE_IDENTITY`                       | conteúdo da chave privada, só para o simulado semanal |
| Variável           | `BACKUP_AGE_RECIPIENT`                      | chave pública `age1…`                                 |
| Variável           | `R2_BUCKET`                                 | nome do bucket                                        |
| Variável           | `BACKUP_RETENTION_DAYS`                     | opcional, padrão 30                                   |
| Variável           | `BACKUP_ENABLED`                            | `true` para ligar                                     |

5. Rodar **Actions → Backup diário → Run workflow** uma vez e conferir o
   arquivo no R2; depois **Simulado de restauração → Run workflow**.

Sobre o simulado: guardar a chave privada no GitHub permite o teste semanal
automático, mas quem tiver acesso de administrador ao repositório poderia
abrir os backups. Alternativa mais restrita: não cadastrar
`BACKUP_AGE_IDENTITY` e fazer o simulado manualmente, uma vez por mês, com o
passo a passo acima.

**Custo**: R2 gratuito até 10 GB armazenados; GitHub Actions gratuito para o
uso previsto. Mantém o orçamento de até R$ 100/mês.

## Arquivos

| Arquivo                                              | Função                                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| `scripts/backup/backup.sh`                           | Gera o backup criptografado                    |
| `scripts/backup/restore.sh`                          | Restaura e confere                             |
| `scripts/backup/manifest.sql`                        | Linhas e assinatura de cada tabela             |
| `scripts/backup/storage.mjs`                         | Baixa, envia e confere as fotos                |
| `scripts/backup/verify.mjs`                          | Compara manifestos                             |
| `scripts/backup/r2.sh`                               | Envia, baixa o último e apaga os antigos no R2 |
| `scripts/backup/roundtrip-test.sh` e `seed-test.mjs` | Teste de ida e volta                           |
| `.github/workflows/backup.yml`                       | Backup diário                                  |
| `.github/workflows/restore-drill.yml`                | Simulado semanal                               |
