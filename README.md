# 🎓 Painel Acadêmico UnB

Um painel web pessoal para organizar a vida acadêmica na **Universidade
de Brasília (UnB)**, acompanhar disciplinas e avaliações e manter os
dados sincronizados entre dispositivos por meio do **Supabase**.

O projeto é publicado pelo **Netlify**, versionado no **GitHub** e
inclui um workflow do **GitHub Actions** para realizar uma consulta
periódica ao Supabase.

> **Status do projeto:** a estrutura e o SQL foram preparados e testados
> localmente em PostgreSQL 16, com simulação da API do Supabase. A
> integração de produção com um projeto Supabase, um repositório GitHub
> e um site Netlify reais ainda precisa ser validada seguindo os passos
> deste documento.

------------------------------------------------------------------------

## ✨ Visão geral

O Painel Acadêmico UnB reúne em um único lugar recursos para acompanhar
informações acadêmicas. Os dados são mantidos no próprio painel e podem
ser sincronizados com uma conta para acesso em outros dispositivos.

### Principais recursos

-   **Organização de disciplinas:** cadastro e acompanhamento das
    matérias.
-   **Categorias de notas:** organização dos diferentes componentes de
    avaliação.
-   **Avaliações:** registro de avaliações vinculadas à organização
    acadêmica.
-   **Eventos:** registro de compromissos e datas importantes.
-   **Conta e sincronização:** criação de conta e autenticação por
    e-mail e senha ou link enviado por e-mail.
-   **Sincronização entre dispositivos:** envio e recuperação dos dados
    vinculados à conta.
-   **Importação e exportação:** ferramentas para transferir dados e
    criar backups em JSON.
-   **Experiência instalável:** estrutura de aplicação web progressiva
    (PWA), com manifesto, ícones e service worker.

> Os recursos disponíveis na interface são definidos pelo arquivo
> `site/index.html`. Consulte-o para conferir os detalhes e
> comportamentos implementados na versão publicada.

------------------------------------------------------------------------

## 🧱 Tecnologias e serviços

  -----------------------------------------------------------------------
  Tecnologia                          Responsabilidade
  ----------------------------------- -----------------------------------
  HTML, CSS e JavaScript              Interface e funcionamento do painel

  Supabase                            Autenticação, banco de dados e
                                      sincronização

  PostgreSQL                          Armazenamento relacional dos dados

  Row Level Security (RLS)            Isolamento dos dados por usuário

  GitHub                              Versionamento e armazenamento do
                                      código

  GitHub Actions                      Execução programada do workflow de
                                      keep-alive

  Netlify                             Hospedagem do site e publicação
                                      automática

  PWA (Manifest e Service Worker)     Recursos de instalação e
                                      funcionamento da aplicação web
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 📁 Estrutura do repositório

A estrutura esperada na raiz do repositório é:

``` text
painel-unb/
├── .github/
│   └── workflows/
│       └── keep-alive.yml
├── site/
│   ├── index.html
│   ├── config.js
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── logo.svg
│   ├── icon-192.png
│   └── icon-512.png
├── supabase/
│   └── schema.sql
├── netlify.toml
└── README.md
```

### O que cada arquivo faz

-   `site/index.html`: aplicação principal.
-   `site/config.js`: URL do projeto Supabase e chave pública usada pelo
    navegador.
-   `site/manifest.webmanifest`: metadados para instalação como PWA.
-   `site/sw.js`: service worker da aplicação.
-   `site/logo.svg`, `site/icon-192.png` e `site/icon-512.png`:
    identidade visual e ícones.
-   `supabase/schema.sql`: criação das tabelas, políticas de segurança e
    funções necessárias à sincronização.
-   `.github/workflows/keep-alive.yml`: workflow que consulta
    periodicamente a tabela `keepalive`.
-   `netlify.toml`: configuração de publicação do diretório `site/`.

**Importante:** mantenha a pasta `.github` no repositório. Ela pode
ficar oculta no explorador de arquivos do sistema operacional.

------------------------------------------------------------------------

## 🚀 Instalação e publicação

A ordem recomendada é:

1.  Preparar o projeto Supabase.
2.  Executar o schema SQL.
3.  Configurar a autenticação.
4.  Preencher `site/config.js`.
5.  Enviar os arquivos ao GitHub.
6.  Configurar os segredos do GitHub Actions.
7.  Publicar pelo Netlify.
8.  Cadastrar a URL do site no Supabase.
9.  Validar login, sincronização e acesso em outro dispositivo.

### 1. Criar o projeto no Supabase

1.  Acesse [supabase.com](https://supabase.com/) e entre na sua conta.
2.  Crie um projeto em **New project**.
3.  Defina um nome, uma senha forte para o banco e a região desejada.
4.  Aguarde a conclusão da criação.

Guarde a senha do banco em um gerenciador seguro. Ela não é a chave que
deve ser colocada no arquivo `config.js`.

### 2. Criar as tabelas e configurar o banco

1.  No painel do Supabase, abra **SQL Editor**.

2.  Crie uma nova consulta.

3.  Abra `supabase/schema.sql` neste repositório.

4.  Copie todo o conteúdo, cole no SQL Editor e execute em **Run**.

5.  Confira no **Table Editor** se foram criadas as tabelas:

    -   `profiles`
    -   `courses`
    -   `grade_categories`
    -   `assessments`
    -   `events`
    -   `keepalive`

O schema também configura políticas de segurança por linha (RLS) e as
funções utilizadas pela sincronização.

> Execute o arquivo completo. Se precisar reaplicar a configuração, o
> script foi preparado para poder ser executado novamente.

### 3. Ativar a autenticação por e-mail

1.  No Supabase, acesse **Authentication → Sign In / Providers →
    Email**.
2.  Verifique se o provedor de e-mail está ativado.
3.  Defina se a confirmação de e-mail será obrigatória.

Para uma configuração pessoal e inicial, pode ser conveniente desativar
**Confirm email**, permitindo criar a conta e entrar diretamente. Se
mantiver a confirmação ativa, será necessário confirmar o endereço antes
do primeiro acesso.

A configuração de confirmação é uma escolha de segurança e conveniência.
Se optar por mantê-la ativa, configure também o envio de e-mails de
autenticação conforme as necessidades do projeto.

### 4. Configurar a conexão em `site/config.js`

No Supabase, abra **Project Settings → API** ou **API Keys** e copie:

-   **Project URL**
-   Chave pública **anon** ou **publishable**

Edite `site/config.js`:

``` javascript
window.PAINEL_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_CHAVE_PUBLICA"
};
```

Substitua os valores de exemplo pelos dados do seu projeto e salve o
arquivo.

#### Segurança das chaves

-   A chave `anon`/`publishable` é destinada ao uso público no
    navegador.
-   A proteção dos registros depende das políticas RLS e das permissões
    configuradas no banco.
-   **Nunca** coloque a chave `service_role` ou uma chave `secret` no
    `config.js`, no HTML ou em qualquer arquivo enviado ao navegador.
-   Não publique senhas do banco, tokens privados ou outros segredos no
    repositório.

### 5. Criar o repositório no GitHub

1.  Acesse [github.com](https://github.com/) e crie um novo repositório.
2.  Sugestão de nome: `painel-academico-unb`.
3.  Escolha **Private** se quiser manter o código acessível apenas a
    pessoas autorizadas.
4.  Crie o repositório sem adicionar README, `.gitignore` ou licença
    automaticamente, caso já esteja enviando a estrutura pronta.
5.  Envie o conteúdo da pasta do projeto para a raiz do repositório.

A raiz do GitHub deve conter `site/`, `supabase/`, `.github/`,
`netlify.toml` e este `README.md`.

#### Atenção à pasta `.github`

Em alguns sistemas, pastas iniciadas por ponto são ocultadas. Confira se
o arquivo abaixo foi enviado:

``` text
.github/workflows/keep-alive.yml
```

Se não aparecer, habilite a visualização de arquivos ocultos ou crie o
arquivo diretamente pelo GitHub, preservando exatamente o caminho.

### 6. Configurar os segredos do GitHub Actions

O workflow usa dois segredos para consultar o Supabase sem expor a chave
no arquivo YAML.

No repositório, acesse:

**Settings → Secrets and variables → Actions → New repository secret**

Crie os seguintes segredos:

  Nome do segredo       Valor
  --------------------- --------------------------------
  `SUPABASE_URL`        Project URL do Supabase
  `SUPABASE_ANON_KEY`   Chave pública anon/publishable

Use os mesmos valores públicos configurados em `site/config.js`. Não
cadastre a chave `service_role` ou `secret`.

#### Testar o workflow

1.  Abra a aba **Actions** do repositório.
2.  Selecione **Despertador do Supabase**.
3.  Clique em **Run workflow**.
4.  Abra a execução e confira os logs.

Uma execução bem-sucedida deve apresentar `HTTP 200`.

O workflow está programado para consultar a tabela `keepalive` a cada
três dias. O agendamento é uma tentativa de manter atividade no projeto;
não constitui garantia de disponibilidade nem substitui as regras e
condições do plano Supabase.

### 7. Publicar o site no Netlify

1.  Acesse [app.netlify.com](https://app.netlify.com/).
2.  Escolha **Add new site → Import an existing project**.
3.  Conecte sua conta do GitHub, se ainda não estiver conectada.
4.  Selecione o repositório `painel-academico-unb`.
5.  Confira as configurações de build.

O arquivo `netlify.toml` já define a pasta de publicação como `site/`.
Para esta aplicação estática, não é necessário executar um comando de
build.

6.  Inicie o deploy.
7.  Aguarde a publicação e copie o endereço gerado pelo Netlify.

A partir daí, novos commits enviados ao GitHub devem iniciar uma nova
publicação automática no Netlify.

### 8. Cadastrar o endereço do Netlify no Supabase

Para que os links de autenticação e os redirecionamentos funcionem
corretamente:

1.  Volte ao painel do Supabase.
2.  Acesse **Authentication → URL Configuration**.
3.  Informe o endereço principal do Netlify em **Site URL**.
4.  Adicione o mesmo endereço em **Redirect URLs**.
5.  Salve as alterações.

Se utilizar outros domínios ou endereços de deploy, inclua somente os
endereços necessários e confiáveis na lista de redirecionamento.

------------------------------------------------------------------------

## 🔄 Primeiro acesso e sincronização

1.  Abra o endereço publicado no Netlify.
2.  Entre em **Importar / exportar → Conta e sincronização**.
3.  Crie uma conta com seu e-mail e uma senha de pelo menos 8
    caracteres, conforme a validação da aplicação.
4.  Entre na conta. Se a confirmação de e-mail estiver ativa, confirme o
    endereço antes.
5.  Aguarde a sincronização inicial.

### Comportamento esperado

  -----------------------------------------------------------------------
  Situação                            Comportamento
  ----------------------------------- -----------------------------------
  Nuvem vazia e aparelho com dados    O painel envia os dados locais para
                                      a nuvem.

  Aparelho novo e nuvem com dados     O painel baixa os dados da conta.

  Dados diferentes nos dois lados     O painel pergunta antes de
                                      substituir os dados locais pelo
                                      conteúdo da nuvem.

  Sincronização automática ativada    Alterações são enviadas
                                      automaticamente após alguns
                                      segundos.
  -----------------------------------------------------------------------

Se você já utiliza uma versão anterior do painel em outro endereço, faça
primeiro um **Baixar backup JSON** nessa versão e importe o arquivo no
novo painel antes de iniciar a sincronização.

------------------------------------------------------------------------

## 📲 Instalação em outros dispositivos

O projeto inclui manifesto PWA, ícones e service worker. Em navegadores
compatíveis, é possível adicionar o painel à tela inicial ou instalá-lo
como aplicação.

Para usar os mesmos dados em mais de um dispositivo:

1.  Abra o endereço do Netlify no novo dispositivo.
2.  Entre com a mesma conta.
3.  Aguarde a recuperação dos dados da nuvem.

A instalação PWA e a sincronização são recursos distintos: instalar o
painel não cria uma conta nem substitui o login.

------------------------------------------------------------------------

## 🧪 Checklist de validação

Depois da publicação, percorra os testes abaixo:

-   [ ] O endereço do Netlify abre sem erro.
-   [ ] O painel carrega corretamente.
-   [ ] A conta pode ser criada.
-   [ ] O login funciona.
-   [ ] A conta aparece em **Supabase → Authentication → Users**.
-   [ ] Uma disciplina criada aparece em **Table Editor → courses**.
-   [ ] Os registros aparecem associados ao `user_id` da conta.
-   [ ] Uma alteração é sincronizada.
-   [ ] O mesmo usuário consegue entrar em outro dispositivo e recuperar
    os dados.
-   [ ] O workflow **Despertador do Supabase** executa manualmente e
    termina com `HTTP 200`.
-   [ ] Uma alteração enviada ao GitHub dispara uma nova publicação no
    Netlify.

### Verificação de segurança

Se possível, teste também com uma segunda conta. Os registros de uma
conta não devem ficar visíveis ou editáveis pela outra. Essa separação é
garantida pelas políticas RLS e pelas funções do banco, e deve ser
validada no ambiente real.

------------------------------------------------------------------------

## 🛠️ Problemas comuns

  ---------------------------------------------------------------------------------
  Erro ou sintoma                              Possível causa e solução
  -------------------------------------------- ------------------------------------
  `Invalid API key`                            Confira a Project URL e a chave
                                               pública em `site/config.js`.

  `permission denied for function sync_push`   Execute novamente o arquivo
                                               `supabase/schema.sql` completo no
                                               SQL Editor.

  `Invalid login credentials`                  Verifique o e-mail, a senha e se a
                                               conta já foi confirmada, caso a
                                               confirmação esteja ativa.

  A sessão expirou                             Entre novamente na sua conta.

  E-mail de confirmação não chega              Confira spam e a configuração de
                                               e-mail do Supabase. Se preferir,
                                               avalie desativar `Confirm email`.

  O site continua mostrando a versão antiga    Atualize a página. Se estiver usando
                                               a versão instalada, feche e reabra o
                                               app; se necessário, remova e instale
                                               novamente.

  Projeto Supabase pausado                     Acesse o painel Supabase e use
                                               **Resume project**, se essa opção
                                               estiver disponível.

  Workflow do GitHub falha com HTTP 401 ou 403 Confira os segredos `SUPABASE_URL` e
                                               `SUPABASE_ANON_KEY` e as permissões
                                               de acesso.

  Workflow falha com HTTP 404                  Verifique se o schema foi executado
                                               e se a tabela `keepalive` existe.

  Workflow não aparece na aba Actions          Confira se
                                               `.github/workflows/keep-alive.yml`
                                               foi enviado para o caminho correto e
                                               se Actions está habilitado no
                                               repositório.

  Login por link não redireciona corretamente  Confira **Site URL** e **Redirect
                                               URLs** em Authentication → URL
                                               Configuration.

  Netlify publica uma página não encontrada    Confira se o repositório contém
                                               `netlify.toml` na raiz e se a pasta
                                               `site/` contém `index.html`.
  ---------------------------------------------------------------------------------

Ao investigar um problema, consulte os logs da execução no GitHub
Actions, o console do navegador e os registros de autenticação do
Supabase. Não compartilhe senhas, tokens ou chaves secretas ao pedir
ajuda.

------------------------------------------------------------------------

## 🔐 Segurança, privacidade e backups

-   O banco utiliza **Row Level Security (RLS)** para restringir os
    registros ao usuário autenticado.
-   A chave pública do Supabase pode estar no frontend, mas não
    substitui as políticas de segurança do banco.
-   Nunca publique a chave `service_role`, chaves `secret`, senha do
    banco ou credenciais privadas.
-   Prefira manter o repositório privado se não houver motivo para
    disponibilizar o código publicamente.
-   O plano gratuito do Supabase não deve ser tratado como uma solução
    de backup automático.
-   Utilize periodicamente a opção **Baixar backup JSON** do painel e
    guarde o arquivo em local seguro.
-   O painel apresenta um lembrete de backup a cada 14 dias.
-   Para excluir a conta e os dados associados, consulte **Supabase →
    Authentication → Users** e utilize a opção de exclusão do usuário. A
    exclusão em cascata depende das relações definidas no schema.

### Sobre o workflow de keep-alive

O workflow executa uma leitura simples na tabela `keepalive` a cada três
dias. Ele depende de:

-   GitHub Actions habilitado;
-   arquivo YAML no caminho correto;
-   segredos do repositório configurados;
-   projeto Supabase ativo;
-   tabela `keepalive` existente e acessível pela chave pública.

Em repositórios públicos, o GitHub pode desativar workflows agendados
após períodos prolongados sem atividade no repositório. Verifique a aba
**Actions** e os avisos enviados pelo GitHub. O keep-alive não garante
que o Supabase nunca será pausado.

------------------------------------------------------------------------

## 🧰 Desenvolvimento e atualização

Para atualizar o painel:

1.  Faça uma cópia de segurança dos dados importantes.
2.  Edite os arquivos necessários na pasta do projeto.
3.  Preserve a configuração correta de `site/config.js`.
4.  Envie as alterações para o GitHub.
5.  Aguarde o Netlify concluir o novo deploy.
6.  Abra o site e valide as mudanças.

O Netlify publica o conteúdo de `site/`, enquanto os arquivos
`supabase/` e `.github/` permanecem no repositório para administração do
banco e automações.

### Recomendações

-   Faça alterações pequenas e teste cada publicação.
-   Não substitua o `schema.sql` no banco de produção sem entender o
    impacto da mudança.
-   Antes de alterações estruturais no banco, faça um backup dos dados.
-   Mantenha o README atualizado quando novos recursos, tabelas ou
    procedimentos forem adicionados.

------------------------------------------------------------------------

## 📌 Testes realizados e limitações conhecidas

Na preparação deste pacote:

-   O SQL foi testado em PostgreSQL 16 local, simulando o ambiente do
    Supabase.
-   Foram testados envio e recuperação dos dados do painel, remoção de
    disciplinas, isolamento entre usuários, bloqueio de acesso anônimo e
    exclusão em cascata.
-   O login e a sincronização da interface foram testados contra uma API
    simulada.

Ainda é necessário validar a implantação com serviços reais:

-   projeto Supabase real;
-   autenticação e sincronização no Supabase real;
-   repositório e GitHub Actions reais;
-   publicação e deploy automático no Netlify;
-   acesso e instalação em navegadores e dispositivos reais.

Por isso, conclua o checklist de validação antes de considerar a
implantação em produção totalmente verificada.

------------------------------------------------------------------------

## 🔗 Links úteis

-   [Supabase](https://supabase.com/)
-   [Documentação do Supabase](https://supabase.com/docs)
-   [GitHub](https://github.com/)
-   [GitHub Actions](https://docs.github.com/actions)
-   [Netlify](https://www.netlify.com/)
-   [Documentação do Netlify](https://docs.netlify.com/)

------------------------------------------------------------------------

## 📄 Licença

Nenhuma licença de distribuição foi definida neste pacote. Caso o
projeto seja disponibilizado publicamente, escolha e adicione uma
licença adequada antes de permitir reutilização, modificação ou
redistribuição por terceiros.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
Feito para facilitar a organização da vida acadêmica na UnB. 🎓
```{=html}
</p>
```
