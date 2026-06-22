# WordPress Sitemap Web Stories

Automação em TypeScript/Node para ler um sitemap WordPress, enriquecer metadados por REST/HTML e gerar Web Stories AMP estáticas com imagem ou vídeo direto.

## O Que A Solução Entrega

- Lê sitemap XML com suporte a namespace `image`.
- Gera uma Web Story AMP por post.
- Suporta imagem, vídeo direto `mp4`/`webm` com poster e fallback por metadados HTML.
- Normaliza imagem vertical, poster 3:4 e logo 1:1 com `sharp`.
- Gera canonical, OGP, Twitter Card, JSON-LD, índice local, sitemap das stories, `robots.txt` e relatórios.
- Mantém falhas isoladas no relatório sem derrubar o lote inteiro.
- Não exige credenciais, publicação no WordPress ou LLM em runtime.

## Uso Local

```bash
pnpm install
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080 --limit 10
pnpm serve --dir public --port 8080
```

Acesse `http://localhost:8080`. Para processar o sitemap inteiro, remova `--limit`.

## Docker

```bash
docker compose up --build
```

Variáveis úteis:

```bash
SITEMAP_URL=https://blog.jota.ai/post-sitemap.xml
PUBLIC_BASE_URL=http://localhost:8080
LIMIT=10
CONCURRENCY=6
PORT=8080
```

## Qualidade

```bash
pnpm check
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080 --limit 3
pnpm validate:amp
docker compose config
```

`pnpm validate:amp` valida os HTMLs gerados em `public/stories` com `amphtml-validator`.

## Saída Gerada

- `public/stories/<slug>/index.html`: Web Story AMP.
- `public/assets/<slug>/poster-portrait.jpg`: poster 3:4.
- `public/assets/<slug>/story-image.jpg`: imagem vertical local usada nas páginas da story.
- `public/assets/shared/publisher-logo.png`: logo raster 1:1.
- `public/index.html`: índice local.
- `public/sitemap.xml`: sitemap das stories.
- `public/robots.txt`: referência ao sitemap das stories.
- `public/reports/report.json`: resumo de lote, sucessos, warnings e falhas.
- `public/reports/failures.csv`: falhas por URL.

## Documentação Técnica

- `docs/prds/web-stories-sitemap-wordpress.md`: escopo e critérios de aceite.
- `docs/architecture.md`: desenho da vertical slice.
- `docs/testing-strategy.md`: estratégia de testes por comportamento.
- `docs/web-stories-rules.md`: regras Google/AMP e matriz de cenários.
- `AGENTS.md`: regras locais para manutenção por agentes.

## Transparência Sobre Uso De IA

IA foi usada como apoio de produtividade em planejamento, revisão, documentação e validação de qualidade. A geração das Web Stories em runtime é determinística: o CLI não chama LLM, não depende de prompt e não envia conteúdo para modelos externos.

Os artefatos relacionados a agentes ficam em `AGENTS.md` e `.impeccable.md`. A responsabilidade da entrega é verificada pelos gates objetivos em `pnpm check`, `pnpm generate`, `pnpm validate:amp` e `docker compose config`.
