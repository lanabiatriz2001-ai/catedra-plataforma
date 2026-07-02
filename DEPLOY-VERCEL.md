# Publicar a Cátedra na Vercel com IA (Claude) de verdade

Hoje a IA (Mentor IA e correção de redação) só funciona **dentro do visualizador
do Claude**, porque lá existe um `window.claude.complete`. Em produção esse objeto
não existe — então o app cai no plano B (heurística local). Este pacote liga a
plataforma ao **Claude de verdade** através de uma função serverless na Vercel,
**sem alterar o `Catedra.dc.html`** (ele continua intacto para o visualizador).

## Como funciona

```
App (index.html, gerado no build)
  → window.claude.complete(prompt)         (shim injetado pelo build)
     → POST /api/complete                  (função serverless — guarda a chave)
        → API da Anthropic (Claude)         ← ANTHROPIC_API_KEY vive AQUI
```

A chave **nunca** vai para o navegador do aluno: fica só na variável de ambiente
da Vercel e é usada apenas no servidor.

## Arquivos deste pacote

| Arquivo | Para quê |
|---|---|
| `api/complete.js` | Função serverless: recebe o prompt e chama o Claude (sem dependências). |
| `scripts/build.mjs` | Gera `public/index.html` a partir do `Catedra.dc.html` + injeta o shim e o PWA. |
| `vercel.json` | Diz à Vercel para rodar o build, servir `public/` e expor a função. |
| `package.json` | Script de build (`npm run build`). |
| `.env.example` | Modelo da variável `ANTHROPIC_API_KEY`. |

> O `Catedra.dc.html` permanece **pristino**. O `index.html` de produção é gerado
> a cada deploy pelo build — quando você atualizar o `.dc.html`, basta um novo deploy.

## Passo a passo

1. **Obtenha uma chave** em https://console.anthropic.com → API Keys (`sk-ant-...`).
2. **Suba o projeto** (esta pasta) para um repositório no GitHub/GitLab — ou use a CLI:
   ```bash
   npm i -g vercel
   vercel            # primeiro deploy (preview)
   ```
3. Na **Vercel** → Project → **Settings → Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-...` (marque Production e Preview).
4. **Deploy de produção:**
   ```bash
   vercel --prod
   ```
   (ou conecte o repositório no painel da Vercel — o deploy roda sozinho a cada push.)
5. Abra a URL gerada. Em **Mentor IA** e na **Redação**, as respostas agora vêm do Claude.

## Testar localmente (opcional)

```bash
cp .env.example .env      # e preencha ANTHROPIC_API_KEY
npm i -g vercel
vercel dev                # sobe app + função em http://localhost:3000
```

## Trocar de modelo / provedor

- **Modelo Claude:** edite `model` em `api/complete.js` (padrão `claude-opus-4-8`).
- **Outro provedor (OpenAI/Gemini):** basta reescrever `api/complete.js` para chamar
  o outro endpoint e devolver `{ completion: "<texto>" }`. O resto não muda.

## Observação sobre custos

Cada uso do Mentor/redação é uma chamada paga à API da Anthropic. Defina limites
de uso/orçamento no console da Anthropic se for abrir para muitos alunos.
