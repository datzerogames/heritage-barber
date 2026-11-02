# Heritage Barber — app Android

Dois apps gerados do mesmo código:

| Arquivo | Nome no celular | Para quê |
|---|---|---|
| `APKs/Heritage-Barber-DEMO.apk` | **Heritage Demo** | Mostrar o sistema. Já vem com clientes e agendamentos de exemplo, funciona sem internet e sem servidor. Entrada com um toque: "Barbeiro" ou "Cliente". |
| `APKs/Heritage-Barber.apk` | **Heritage Barber** | Uso real. Começa vazio e os dados ficam online (Supabase): o que o cliente agenda no celular dele aparece na hora para o barbeiro. |

Os dois podem ficar instalados ao mesmo tempo no mesmo celular.

---

## 1. Instalar no celular (Android)

1. Copie o `.apk` para o celular (cabo USB, Google Drive, WhatsApp para você mesmo…).
2. Toque no arquivo no celular.
3. Se aparecer "instalação bloqueada", toque em **Configurações** e ative **Permitir desta fonte**.
4. Toque em **Instalar**.

> Esses APKs são de teste (assinados com chave de desenvolvimento). Para a Play Store veja o item 4.

---

## 2. Ligar a versão completa ao servidor (Supabase) — uma vez só

A versão completa só funciona depois disso. Sem configurar, ela abre mostrando um aviso.

1. Entre em **https://supabase.com** → **Start your project** → crie a conta (GitHub ou email).
2. **New project** → nome `heritage-barber`, crie uma senha do banco (guarde), região **South America (São Paulo)** → **Create**. Espere uns 2 minutos.
3. No menu da esquerda, **SQL Editor** → **New query** → abra o arquivo `supabase/schema.sql` deste projeto, copie tudo, cole e clique **Run**. Deve aparecer "Success".
4. Menu **Authentication** → **Sign In / Providers** → **Email**: desligue **Confirm email** (assim o cliente entra direto depois de criar a conta) → **Save**.
   *Se preferir manter a confirmação por email, o app avisa o cliente para confirmar antes de entrar.*
5. Menu **Project Settings** → **API** (ou **Data API**/**API Keys**). Copie:
   - **Project URL** (ex.: `https://abcdxyz.supabase.co`)
   - a chave **anon public** (NUNCA use a `service_role`)
6. Abra `www/config.js` e cole os dois valores no lugar de `COLE_AQUI...`.
7. Gere os APKs de novo (item 3).
8. Instale o **Heritage Barber**, toque em **Não tenho conta — criar agora** e crie **a sua** conta.
9. Volte ao **SQL Editor** do Supabase e rode (com o seu email):
   ```sql
   update public.perfis set tipo = 'admin' where email = 'seu@email.com';
   ```
10. Saia e entre de novo no app: agora você vê Painel, Agenda, Clientes, Caixa e Equipe.
11. Na aba **Equipe**, adicione os barbeiros com o email de cada um. O barbeiro instala o app, toca em **Não tenho conta — criar agora**, usa **o mesmo email** e cria a própria senha: a conta já nasce como barbeiro e abre direto na agenda dele.

### Papéis no app
| Quem | O que vê |
|---|---|
| **Dono** | Painel, Agenda de todos, Clientes, Caixa e Equipe (adiciona e remove barbeiros) |
| **Barbeiro** | "Meu dia" e a própria agenda: marca, edita e conclui os atendimentos dele. Não vê Caixa, Clientes nem a agenda dos outros |
| **Cliente** | Calendário para marcar horário e o histórico dos próprios agendamentos |

Sem o Supabase configurado, a versão final funciona só no aparelho onde está instalada: a primeira conta criada vira o dono, e os barbeiros adicionados na Equipe entram nesse mesmo aparelho com o email e a senha que o dono definiu.

Os clientes só precisam baixar o app e criar a conta: eles veem o calendário com os dias livres, marcam o horário e acompanham os próprios agendamentos. Eles **não** veem nomes de outros clientes.

---

## 3. Gerar os APKs de novo (depois de qualquer mudança)

Na pasta `heritage-app`, clique com o botão direito em **gerar-apks.ps1** → **Executar com o PowerShell**
(ou no terminal: `powershell -ExecutionPolicy Bypass -File .\gerar-apks.ps1`).

Os APKs novos aparecem em `APKs\`.

### O que dá para mudar sem mexer no código — `www/config.js`
- nome da barbearia
- barbeiros
- serviços e preços
- horários de atendimento, horário de fechamento
- comissão dos barbeiros
- quantos meses à frente o cliente pode agendar

### Testar no computador
Abra `www/index.html?demo=1` no navegador (Chrome) para usar a versão demo.

---

## 4. Publicar na Play Store (quando quiser)

1. Crie a conta de desenvolvedor no **Google Play Console** (taxa única de US$ 25).
2. Abra a pasta `android` no **Android Studio** (já instalado) → **Build → Generate Signed App Bundle / APK** → **Android App Bundle** → crie uma **chave de assinatura** (guarde o arquivo `.jks` e a senha em lugar seguro: sem ela não dá para atualizar o app depois) → escolha o flavor **fullRelease** (e **demoRelease**, se quiser publicar a demo também).
3. No Play Console, crie o app, envie o `.aab`, preencha a ficha (descrição, prints, política de privacidade) e envie para revisão.

A versão completa e a demo podem ser dois apps separados na loja (IDs `com.heritagebarber.app` e `com.heritagebarber.app.demo`).

---

## Estrutura do projeto

```
heritage-app/
  www/                  ← o app (HTML, CSS, JavaScript)
    config.js           ← configurações da barbearia + chaves do Supabase
    mode.js             ← "full" (a demo troca este arquivo)
    app.js              ← lógica: agenda, clientes, caixa, login
  supabase/schema.sql   ← banco de dados e regras de segurança
  android/              ← projeto Android (Capacitor)
  android-overrides/    ← arquivos que só a versão demo usa (nome e modo)
  assets/               ← imagens do ícone e da tela de abertura
  scripts/icones.js     ← gera o ícone
  gerar-apks.ps1        ← gera os dois APKs
  APKs/                 ← os APKs prontos
```
