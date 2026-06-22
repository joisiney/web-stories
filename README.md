# WordPress Sitemap Web Stories

Automação em TypeScript/Node para gerar Web Stories AMP estáticas a partir de um sitemap WordPress público.

Entrada: URL de sitemap WordPress, como `https://blog.jota.ai/post-sitemap.xml`.

Saída: uma Web Story AMP por post, assets locais rasterizados, índice operacional, sitemap das stories, `robots.txt`, `report.json` e `failures.csv`.

## Garantias Técnicas

- Lê XML de sitemap com suporte ao namespace `image`.
- Enriquece metadados por WordPress REST e usa HTML remoto como fallback.
- Usa a imagem principal do sitemap, REST ou `og:image`.
- Aceita vídeo apenas quando for URL direta `mp4` ou `webm` com poster.
- Gera AMP com `amp-story`, `amp-img` e `amp-video` quando aplicável.
- Inclui canonical, metadados AMP obrigatórios, OGP, Twitter Card e JSON-LD.
- Rasteriza localmente imagem vertical, poster 3:4 e logo 1:1 com `sharp`.
- Aplica animação AMP-native moderada: zoom, pan e fade por intenção narrativa.
- Mantém falhas por item no relatório sem interromper o lote.
- Trata sitemap inválido como falha estrutural antes de limpar a última saída válida.
- Usa timeout por tentativa e retry/backoff automático para falhas transitórias de rede.
- Não usa credenciais WordPress e não chama LLM em runtime.

## Execução Para Avaliação

```bash
pnpm install
pnpm check
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080 --limit 3
pnpm validate:amp
pnpm serve --dir public --port 8080
docker compose config
```

Acesse `http://localhost:8080` após o `serve`.

Para processar o sitemap completo, remova `--limit`:

```bash
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080
```

`public/` é saída gerada. O projeto foi desenhado para que o avaliador consiga gerar, validar e servir os artefatos pelos comandos acima sem ler o código-fonte.

## Docker

```bash
docker compose up --build
```

Variáveis suportadas:

```bash
SITEMAP_URL=https://blog.jota.ai/post-sitemap.xml
PUBLIC_BASE_URL=http://localhost:8080
LIMIT=10
CONCURRENCY=6
NETWORK_TIMEOUT_MS=30000
PORT=8080
PUBLISHER=Jota
PUBLISHER_LOGO=https://example.com/logo.png
```

## Arquitetura

A fonte de verdade do produto fica em `src/generate-web-stories`, em uma vertical slice única. Entry points (`src/cli.ts`, `src/server.ts` e `src/validate-amp.ts`) permanecem finos.

Principais módulos:

- `sitemap.ts`: valida e transforma XML em entradas de post.
- `metadata.ts`: resolve título, descrição, publisher, imagem e vídeo por REST/HTML.
- `story.ts`: aplica regras de mídia, texto curto e composição das páginas.
- `motion.ts`: centraliza presets de animação AMP por intenção narrativa.
- `media.ts`: baixa e rasteriza assets locais.
- `story-generator.ts`: gera uma story individual e classifica falhas do item.
- `generate-web-stories.ts`: orquestra lote, limite, concorrência, limpeza e relatório.
- `amp.ts`: renderiza HTML AMP sem buscar rede.
- `output.ts`: escreve índice, sitemap, `robots.txt` e relatórios.
- `network.ts`: centraliza `fetch` com timeout, retry e backoff.

Essa divisão mantém interfaces pequenas e implementação localizada: funções que buscam rede não renderizam HTML nem escrevem arquivos, renderers não buscam rede, resolvers não escrevem arquivos.

## Saída Gerada

- `public/stories/<slug>/index.html`: Web Story AMP.
- `public/assets/<slug>/poster-portrait.jpg`: poster 3:4.
- `public/assets/<slug>/story-image.jpg`: imagem vertical 9:16.
- `public/assets/shared/publisher-logo.png`: logo raster 1:1.
- `public/index.html`: índice operacional.
- `public/sitemap.xml`: sitemap das Web Stories.
- `public/robots.txt`: referência ao sitemap das Web Stories.
- `public/reports/report.json`: relatório estruturado.
- `public/reports/failures.csv`: falhas por item.

`report.json` mantém o seguinte formato operacional:

```json
{
  "sitemapUrls": 3,
  "processed": 3,
  "succeeded": 2,
  "failed": 1,
  "stories": [
    {
      "sourceUrl": "https://blog.example.com/post/",
      "storyUrl": "http://localhost:8080/stories/post/",
      "title": "Título",
      "variant": "image-summary",
      "warnings": []
    }
  ],
  "failures": [
    {
      "url": "https://blog.example.com/falha/",
      "code": "asset-failed",
      "stage": "assets",
      "reason": "GET https://cdn.example.com/image.webp failed with HTTP 500"
    }
  ]
}
```

`failures.csv` usa o schema:

```csv
url,code,stage,reason
```

Códigos de falha por item:

- `missing-supported-media`: post sem imagem suportada ou vídeo direto com poster.
- `metadata-failed`: falha ao resolver metadados do post.
- `asset-failed`: falha ao baixar ou rasterizar imagem, poster ou logo.
- `render-failed`: falha ao compor ou escrever a Web Story.
- `unknown`: falha inesperada fora das categorias anteriores.

## Decisões De Engenharia

- TypeScript/Node com `strict` habilitado.
- Vertical slice única para manter regras, IO e testes próximos.
- Geração determinística: o runtime não depende de prompt, LLM ou credenciais.
- Retry/backoff fica na fronteira de rede, sem contaminar renderers ou resolvers.
- Testes validam comportamento público observável, não ordem interna de chamadas.
- Sitemap inválido aborta a execução; falhas de posts individuais entram no relatório.

## Documentação Técnica Consultada

- Google Web Stories: `https://developers.google.com/search/docs/appearance/enable-web-stories`
- Boas práticas de Web Stories: `https://developers.google.com/search/docs/appearance/web-stories-creation-best-practices`
- AMP story: `https://amp.dev/documentation/components/amp-story/`
- AMP video: `https://amp.dev/documentation/components/amp-video/`
- Validação AMP: `https://amp.dev/documentation/guides-and-tutorials/learn/validation-workflow/validate_amp/`
- Sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Image sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps`
