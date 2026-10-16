@AGENTS.md

## Regra obrigatória do Supabase

Toda alteração que envolva dados, autenticação, Storage, funções, triggers, views, RLS ou estrutura do banco deve incluir a migration correspondente, atualizar os tipos necessários e manter o código sincronizado com o Supabase. Nunca considerar uma tarefa concluída sem validar código, migration e banco. Alterações destrutivas exigem confirmação explícita.

### Como isso se aplica neste projeto

- Migrations: arquivos novos em `supabase/migrations/` (nunca editar uma migration já aplicada em produção).
- Nome da migration: o timestamp precisa ser maior que o da última migration existente (o `supabase db push` do deploy recusa as anteriores). Se o relógio estiver atrás da última, use o timestamp dela + 1. O CI confere em PRs (`scripts/check-migration-order.sh`).
- Tipos: `pnpm db:types` regenera `src/types/database.ts` a partir do banco local.
- Validação local: `pnpm db:reset` (aplica todas as migrations do zero), `pnpm db:test`, `pnpm db:lint` e `pnpm check`.
- Produção: a migration chega ao Supabase pelo workflow "Banco de dados (migrations)" (`.github/workflows/migrations.yml`) depois do merge na `main`. A tarefa só termina com esse workflow verde.
- Destrutivas (apagar tabela, coluna ou dados, trocar tipo de coluna, remover política ou bucket): parar e pedir confirmação antes de escrever a migration.
