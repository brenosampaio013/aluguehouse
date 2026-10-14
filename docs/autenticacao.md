# Alugue Houses — Login e acesso ao painel (Etapa 5)

> Status: **aguardando aprovação**.

## Como funciona

| Quem    | Como entra                                                                                | O que acessa                             |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| Hóspede | `/entrar`: recebe um link por e-mail, sem senha                                           | Favoritos e avaliações (próximas etapas) |
| Admin   | `/admin/entrar`: e-mail e senha, depois código do aplicativo autenticador em `/admin/mfa` | Painel `/admin`                          |

- O painel só abre com **papel admin + MFA concluído**. Admin só com senha
  fica preso em `/admin/mfa`. O banco aplica a mesma regra (Etapa 4).
- Quem não é admin e tenta `/admin/entrar` recebe a mesma mensagem de senha
  errada ("E-mail ou senha incorretos."), sem revelar se a conta existe.
- O link do e-mail aponta para `/auth/callback`, que só redireciona para
  caminhos internos do site (proteção contra redirecionamento aberto).
- `src/proxy.ts` renova a sessão a cada requisição e faz uma verificação
  rápida em `/admin`. A autorização definitiva está no layout do painel
  (`src/app/admin/(painel)/layout.tsx`) e nas políticas RLS.

## Verificação

| Teste                                               | Resultado                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Testes de ponta a ponta (desktop, tablet e celular) | 44 passando, 1 ignorado (teclado no celular)                                      |
| Testes de login repetidos 3 vezes (estabilidade)    | 81 de 81                                                                          |
| Testes unitários                                    | 18 de 18 (inclui proteção contra redirecionamento externo)                        |
| Build Cloudflare + runtime local do Workers         | `/admin` redireciona, `/entrar` e `/admin/entrar` carregam, link inválido tratado |

Cenários cobertos: visitante e hóspede não acessam `/admin`; usuário comum
não entra pelo painel; senha errada; admin sem MFA fica em `/admin/mfa`;
cadastro do autenticador com código errado e certo; novo login pedindo só o
código; login do hóspede pelo e-mail real (Mailpit); link inválido; e-mail
inválido; acessibilidade WCAG 2.1 AA das telas de login.

## Risco registrado

O adaptador do Cloudflare (`@opennextjs/cloudflare` 1.20.11) avisa que o
suporte ao `proxy.ts` do Next.js 16, que roda em Node.js, é **experimental**.
Funcionou no runtime local do Workers. Se der problema em produção, o plano B
é voltar para `middleware.ts` no runtime edge (convenção antiga, ainda aceita).
Como o proxy não é a barreira de segurança, uma falha nele não abre o painel.

## Para colocar em produção

Feito por você no painel do Supabase, depois de criar o projeto:

1. **Authentication → URL Configuration**: Site URL com o domínio do site e
   `https://SEU-DOMINIO/**` nas Redirect URLs.
2. **Authentication → Email Templates**: em "Magic Link" e "Confirm signup",
   use o conteúdo de `supabase/templates/magic-link.html`.
3. **Authentication → SMTP**: configure o envio pelo Resend (exige o domínio
   verificado). O envio padrão do Supabase tem limite muito baixo.
4. **Authentication → Multi-Factor**: TOTP habilitado.
5. **Authentication → Passwords**: mínimo de 12 caracteres, com letras
   maiúsculas, minúsculas e números.
6. **Criar o admin**: em Authentication → Users, "Add user" com seu e-mail
   e uma senha forte. Depois, no SQL Editor:

   ```sql
   update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
    where email = 'SEU-EMAIL';
   ```

   No primeiro acesso a `/admin/entrar`, o site pede para cadastrar o
   aplicativo autenticador. **Guarde a chave mostrada na tela em local
   seguro**: ela permite recuperar o acesso se o celular for perdido.

## Desenvolvimento local

```bash
pnpm db:start                 # sobe o Supabase local com Mailpit
pnpm exec supabase status -o env   # mostra as chaves locais para o .env.local
```

E-mails enviados localmente aparecem em http://127.0.0.1:54324.
