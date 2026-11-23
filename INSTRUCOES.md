# Painel Acadêmico UnB — Supabase + GitHub Actions + Netlify

O que está nesta pasta:

| Caminho | Para que serve |
|---|---|
| `site/` | O painel (index.html), `config.js` (você preenche), manifest, sw.js e ícones |
| `supabase/schema.sql` | Tabelas, segurança por usuário e as funções de sincronização |
| `.github/workflows/keep-alive.yml` | "Despertador" que impede o Supabase gratuito de pausar |
| `netlify.toml` | Diz ao Netlify para publicar a pasta `site/` |

Ordem recomendada: Supabase → config.js → GitHub → Netlify → ajuste final no Supabase → primeiro uso. Os nomes dos menus dos sites podem mudar um pouco com o tempo.

---

## 1. Criar o projeto no Supabase
1. Entre em **supabase.com**, crie a conta e clique em **New project**.
2. Escolha um nome (ex.: `painel-unb`), uma senha forte para o banco (guarde-a) e a região mais próxima (América do Sul, se aparecer).
3. Espere o projeto terminar de ser criado.

## 2. Criar as tabelas
1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Abra o arquivo `supabase/schema.sql`, copie **tudo**, cole no editor e clique em **Run**.
3. Deve aparecer "Success". Confira em **Table Editor**: `profiles`, `courses`, `grade_categories`, `assessments`, `events` e `keepalive`.
4. Se rodar de novo, não tem problema: o arquivo pode ser executado várias vezes.

## 3. Ligar o login por e-mail
1. **Authentication → Sign In / Providers → Email** deve estar ativado.
2. Para criar a conta e entrar direto, desligue **Confirm email**. Se deixar ligado, cada conta nova precisa confirmar por e-mail antes (o envio gratuito do Supabase tem limite baixo).
3. Depois do passo 7 (quando você tiver o endereço do site), volte em **Authentication → URL Configuration** e coloque o endereço do Netlify em **Site URL** e em **Redirect URLs**. Isso é necessário para o botão "Entrar por link no e-mail".

## 4. Pegar a URL e a chave pública
1. Abra **Project Settings → API** (ou **API Keys**).
2. Copie a **Project URL** (ex.: `https://abcdefgh.supabase.co`).
3. Copie a chave **anon public** ou **Publishable key**.
4. Nunca use a `service_role` / `secret` no painel. Elas dão acesso total ao banco.

## 5. Preencher o `site/config.js`
Abra o arquivo, coloque a URL e a chave entre as aspas e salve. Com isso, todos os aparelhos já abrem o painel ligado ao seu Supabase, sem digitar nada. (A chave anon pode ficar no código: quem protege seus dados é a segurança por usuário do banco.)

## 6. GitHub (e o despertador)
1. Crie um repositório em **github.com → New repository**.
2. Suba o conteúdo desta pasta (**Add file → Upload files**, arrastando tudo). A pasta `.github` é oculta em alguns sistemas: se ela não subir, use **Add file → Create new file**, digite o nome `.github/workflows/keep-alive.yml` e cole o conteúdo do arquivo.
3. Cadastre os segredos em **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_URL` = a Project URL
   - `SUPABASE_ANON_KEY` = a chave anon/publishable
4. Teste: aba **Actions → Despertador do Supabase → Run workflow**. Deve terminar verde, com "HTTP 200" no log.
5. Depois disso ele roda sozinho a cada 3 dias.
6. Atenção: em repositório público, o GitHub pode desativar workflows agendados depois de 60 dias sem nenhuma atividade no repositório. Se isso acontecer, ele avisa por e-mail: abra **Actions** e reative. Mexer no repositório de vez em quando também evita.

## 7. Publicar no Netlify
1. **app.netlify.com → Add new site → Import an existing project → GitHub** e escolha o repositório.
2. Não precisa de comando de build. O `netlify.toml` já manda publicar a pasta `site/`.
3. Clique em **Deploy**. Copie o endereço que o Netlify gerar e volte ao passo 3.3 (Supabase → URL Configuration).
4. A cada alteração no GitHub, o Netlify publica de novo sozinho.

## 8. Primeiro uso
1. Abra o site → **Importar / exportar** → **Conta e sincronização**.
2. Digite e-mail e senha (mínimo 8 caracteres) e clique em **Criar conta**. Se a confirmação por e-mail estiver ligada, confirme e depois use **Entrar**.
3. Ao entrar, o painel decide sozinho:
   - nuvem vazia e dados neste aparelho: envia tudo;
   - aparelho novo (sem dados) e nuvem com dados: baixa tudo;
   - dados diferentes nos dois lados: pergunta se deve carregar o da nuvem.
4. Com "Sincronizar automaticamente" marcado, cada alteração é enviada em poucos segundos.
5. Se você já usa o painel em outro endereço, antes de tudo faça **Baixar backup JSON** lá e **Importar** no novo.

## 9. Como conferir que está funcionando
- Marque uma matéria no site e, no Supabase, abra **Table Editor → courses**: as linhas aparecem com o seu `user_id`.
- Abra o site no celular, entre com o mesmo e-mail: os dados chegam.
- No Supabase, **Authentication → Users** mostra sua conta.

## 10. Segurança
- Cada tabela tem segurança por linha (RLS): um usuário só vê e altera as próprias linhas.
- Para apagar todos os seus dados: **Authentication → Users → ⋯ → Delete user** (as tabelas são limpas junto).
- O plano gratuito não faz backup automático. Use **Baixar backup JSON** (o painel avisa a cada 14 dias).

## 11. Problemas comuns
| Mensagem / sintoma | O que fazer |
|---|---|
| `Invalid API key` | URL ou chave copiada errada. Refaça o passo 4 e o 5 |
| `permission denied for function sync_push` | Rode o `schema.sql` inteiro de novo |
| `Invalid login credentials` | E-mail ou senha errados, ou conta ainda não confirmada |
| `A sessão expirou` | Clique em Entrar de novo |
| E-mail de confirmação não chega | Desligue **Confirm email** (passo 3.2) |
| O site mostra a versão antiga | Recarregue 2 vezes; no app instalado, desinstale e instale de novo |
| Projeto pausado | No painel do Supabase, **Resume project** (os dados ficam guardados por até um ano) |
| Despertador vermelho | Abra o log em Actions: se der 401/403, confira os segredos; se der 404, o `schema.sql` não foi rodado |

## 12. O que foi testado (e o que não foi)
- O SQL foi testado num PostgreSQL 16 local, simulando o Supabase: envio e volta dos dados reais do painel, remoção de matérias, isolamento entre usuários, bloqueio de acesso anônimo e exclusão em cascata.
- O login e a sincronização do painel foram testados contra uma API simulada.
- **Não** foi testado contra um Supabase, GitHub e Netlify reais. Siga a seção 9 para conferir cada etapa e me mande a mensagem de erro, se aparecer alguma.
