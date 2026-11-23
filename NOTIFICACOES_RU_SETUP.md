# Configuração do Cardápio do RU e das notificações push

## O que já fica disponível após publicar

- Nova seção **Cardápio do RU**, que consulta a página oficial `https://ru.unb.br/cardapio-refeitorio/` por uma Netlify Function e apresenta os PDFs por unidade e semana.
- Visualização do documento oficial por página/refeição: página 1 (café da manhã), página 2 (almoço) e página 3 (jantar), quando o PDF da unidade tiver essa página. A Fazenda Água Limpa pode ter apenas café da manhã e almoço.
- Central de notificações dentro do painel, com prazos cadastrados e avisos do RU.
- Service Worker com suporte a Web Push.
- Endpoints Netlify para registrar dispositivos e enviar notificações agendadas.

O cardápio é exibido a partir dos PDFs oficiais. O painel não tenta reinterpretar ingredientes ou substituir a fonte. O RU informa que o cardápio pode sofrer alterações sem aviso prévio.

## 1. Atualizar o banco Supabase

Execute o arquivo `supabase/schema.sql` completo no SQL Editor do Supabase. A parte nova é idempotente e cria:

- `push_subscriptions`: inscrições dos dispositivos, protegidas por RLS;
- `push_deliveries`: controle para evitar repetição de notificações.

Não é necessário apagar tabelas nem dados existentes.

## 2. Gerar as chaves VAPID

Na raiz do projeto, com Node.js e npm instalados, execute:

```bash
npm install
npx web-push generate-vapid-keys
```

O comando exibirá uma chave pública e uma chave privada. Não compartilhe a chave privada.

- Copie a **chave pública** para `pushVapidPublicKey` em `site/config.js`.
- Guarde a **chave privada** para a etapa seguinte. Ela nunca deve ser colocada no HTML, em `config.js` ou no GitHub.

## 3. Configurar variáveis no Netlify

No painel do Netlify, abra as configurações do site e adicione estas variáveis de ambiente:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública anon/publishable do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta service_role/secret do Supabase |
| `VAPID_PUBLIC_KEY` | Chave pública gerada no passo 2 |
| `VAPID_PRIVATE_KEY` | Chave privada gerada no passo 2 |
| `VAPID_SUBJECT` | `mailto:SEU_EMAIL_DE_CONTATO` |

A chave `SUPABASE_SERVICE_ROLE_KEY` e a chave privada VAPID são segredos de servidor. Nunca as coloque no repositório ou no navegador.

Depois de salvar as variáveis, faça um novo deploy.

## 4. Ativar no painel

1. Entre no Painel Acadêmico com sua conta Supabase.
2. Abra **Notificações**.
3. Clique em **Ativar notificações no celular** e permita o acesso do navegador.
4. O dispositivo será associado à sua conta.
5. Use **Enviar notificação de teste** para verificar a permissão local.

A inscrição push exige login no Painel, porque a inscrição fica vinculada ao usuário no Supabase. A Central interna continua mostrando os avisos locais mesmo sem login.

## 5. Agendamento e conteúdo dos avisos

A função `push-dispatch` é executada a cada 15 minutos pelo agendador do Netlify. Ela envia:

- avisos de eventos cadastrados no calendário, no dia do prazo e na antecedência selecionada;
- lembretes do RU em horários locais de referência (07:00, 10:30 e 16:30), quando a categoria RU estiver ativada.

O agendamento do Netlify usa UTC internamente; a função converte para `America/Sao_Paulo` antes de decidir os horários.

## Limitações e observações

- Notificações push dependem de HTTPS, permissão do navegador, inscrição ativa e configuração das chaves/variáveis.
- No iPhone/iPad, o site precisa estar adicionado à Tela de Início para receber Web Push. No Android, use o Chrome ou navegador compatível; instalar o PWA é recomendado.
- A notificação de teste é local e não comprova o envio pelo servidor. O envio remoto pode ser conferido nos logs da função `push-dispatch` no Netlify.
- O RU pode alterar o cardápio sem aviso prévio. A função de cardápio consulta a página oficial quando o usuário abre/atualiza a seção; o cache de borda dura até 30 minutos.
- Os avisos institucionais da UnB estão apenas preparados como preferência visual. A coleta de comunicados oficiais será uma etapa posterior, para evitar alertas baseados em fontes não validadas.
- A central atual monta avisos com os eventos que já existem no calendário local. A sincronização dos eventos segue o mecanismo Supabase já existente.
