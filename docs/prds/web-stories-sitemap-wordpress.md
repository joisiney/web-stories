# PRD: Web Stories A Partir De Sitemap WordPress

## Problema

Sites WordPress com grande volume de posts precisam gerar Web Stories AMP de forma repetível, validável e resiliente. O processo manual não escala e costuma falhar em metadados, assets, sitemap e tratamento de erro por conteúdo.

## Objetivo

Construir uma automação que receba um sitemap WordPress, gere uma Web Story AMP por post e publique uma saída estática com índice, sitemap, `robots.txt` e relatório de execução.

## Fluxo Principal

1. Receber `--sitemap`, `--out`, `--base-url`, `--limit`, `--concurrency`, `--network-timeout-ms`, `--publisher` e `--publisher-logo`.
2. Ler XML do sitemap e extrair `loc`, `lastmod` e imagens de `image:image`.
3. Resolver metadados por WordPress REST.
4. Usar HTML da página como fallback para título, descrição, `og:image`, `og:video`, poster de vídeo, site name e favicon.
5. Classificar mídia em imagem, vídeo direto suportado ou falha.
6. Gerar poster 3:4 e logo 1:1.
7. Compor a story com páginas curtas, animação moderada e CTA para o artigo.
8. Renderizar AMP HTML válido.
9. Escrever stories, índice, sitemap, `robots.txt` e relatórios.

## Escopo

- Sitemap WordPress público.
- Imagens de sitemap, REST ou HTML.
- Vídeo direto `mp4`/`webm` com poster.
- Geração determinística, sem LLM em runtime.
- Falha isolada por URL sem interromper o lote.
- Validação AMP por CLI.
- Docker Compose para geração e servidor local.

## Fora De Escopo

- Publicar stories de volta no WordPress.
- Autenticação WordPress.
- Embeds externos de vídeo.
- Geração ou edição de vídeo.
- Painel administrativo.
- Cache incremental persistente entre execuções.

## Critérios De Aceite

- `pnpm check` passa.
- Uma amostra real gera stories em `public/stories`.
- `pnpm validate:amp` passa para os HTMLs gerados.
- `docker compose config` passa.
- Cada item com erro aparece em `public/reports/report.json` e `public/reports/failures.csv`.
- O código permanece concentrado em uma vertical slice e sem abstrações sem consumidor real.

## Decisões De Engenharia

- TypeScript/Node com `pnpm`.
- `src/generate-web-stories` como única vertical slice do produto.
- Entry points finos para CLI, servidor estático e validador AMP.
- Testes por comportamento observável, próximos da slice.
- Mínimo de dependências: XML, HTML, imagem e validação AMP.
- KISS/YAGNI para escopo; SOLID usado para separar responsabilidades reais.

## Fontes Técnicas

- Google Search Central: `https://developers.google.com/search/docs/appearance/enable-web-stories`
- Google Web Stories best practices: `https://developers.google.com/search/docs/appearance/web-stories-creation-best-practices`
- Google Web Story content policies: `https://developers.google.com/search/docs/appearance/web-stories-content-policy`
- AMP story: `https://amp.dev/documentation/components/amp-story/`
- AMP video: `https://amp.dev/documentation/components/amp-video/`
- AMP validation: `https://amp.dev/documentation/guides-and-tutorials/learn/validation-workflow/validate_amp/`
- Google sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Google image sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps`
