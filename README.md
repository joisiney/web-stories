# WordPress Sitemap Web Stories

Automação em TypeScript/Node para gerar Web Stories AMP estáticas a partir de um sitemap WordPress público.

Entrada: URL de sitemap WordPress, como `https://blog.jota.ai/post-sitemap.xml`.

Saída: uma Web Story AMP por post, assets locais rasterizados, índice operacional, sitemap das stories, `robots.txt`, `report.json` e `failures.csv`.

## Garantias Técnicas

- Lê XML de sitemap com suporte ao namespace `image`.
- Enriquece metadados por WordPress REST e usa HTML remoto como fallback.
- Usa imagens do sitemap, REST ou HTML; quando a origem já é uma Web Story AMP, extrai múltiplas imagens em ordem narrativa.
- Aceita vídeo apenas quando for URL direta `mp4` ou `webm` com poster.
- Gera AMP com `amp-story`, `amp-img`, `amp-video` quando aplicável e um `amp-story-animation` controlado no callout editorial.
- Inclui canonical, metadados AMP obrigatórios, OGP, Twitter Card e JSON-LD.
- Rasteriza localmente imagem vertical, imagens secundárias, poster 3:4 e logo 1:1 com `sharp`.
- Compõe 6 páginas por story: capa, ponto central, contexto, detalhe, decisão e CTA.
- Aplica motion editorial AMP-native: Ken Burns na capa, pans por contexto, texto sequenciado e callout de decisão.
- Mantém o CTA final sem autoavanço para preservar o clique no artigo original.
- Gera sitemap XML das stories com `xml-stylesheet`, `lastmod` e XSL visual.
- Mantém falhas por item no relatório sem interromper o lote.
- Trata sitemap inválido como falha estrutural antes de limpar a última saída válida.
- Usa timeout por tentativa e retry/backoff automático para falhas transitórias de rede.
- Não usa credenciais WordPress e não chama LLM em runtime.

## Execução Para Avaliação

```bash
pnpm install
pnpm check
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080 --limit 20
pnpm validate:amp
pnpm serve --dir public --port 8080
docker compose config
```

Acesse `http://localhost:8080` após o `serve`.

Para um smoke test rápido, use `--limit 3`. Para avaliação visual e técnica, prefira `--limit 20`, pois a raiz exibe uma galeria de Web Stories e o sitemap das stories fica mais representativo.

Para a demo editorial com fonte mais rica em Web Stories, use o sitemap do G1 filtrando URLs que já são stories. O filtro é aplicado antes de `--limit`, então a amostra não é consumida por notícias comuns:

```bash
pnpm generate --sitemap https://g1.globo.com/sitemap/g1/2025/05/24_1.xml --include-url-pattern "/stories/" --out public --base-url http://localhost:8080 --limit 2
```

Feeds alternativos úteis para validação visual:

- `https://karnatakahelp.in/web-stories-sitemap.xml`: menor e direto, bom para smoke test controlado.
- `https://www.carehospitals.com/web-stories-sitemap.xml`: mais volume e markup menos regular, bom para validar fallback por `og:image`.

Para processar o sitemap completo, remova `--limit`:

```bash
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080
```

`public/` é saída gerada. O projeto foi desenhado para que o avaliador consiga gerar, validar e servir os artefatos pelos comandos acima sem ler o código-fonte.

## Docker

```bash
docker compose up --build
```

Por padrão, o Docker processa todas as URLs do sitemap. Para smoke test rápido, defina `LIMIT` explicitamente:

```bash
LIMIT=20 docker compose up --build
```

Variáveis suportadas:

```bash
SITEMAP_URL=https://blog.jota.ai/post-sitemap.xml
PUBLIC_BASE_URL=http://localhost:8080
LIMIT=
INCLUDE_URL_PATTERN=
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
- `metadata.ts`: resolve título, descrição, publisher, imagens e vídeo por REST/HTML.
- `metadata-html.ts`: extrai metadados HTML e imagens narrativas de páginas com `<amp-story>`.
- `story.ts`: aplica regras de mídia, texto curto e composição das páginas.
- `motion.ts`: centraliza presets de animação AMP por intenção narrativa.
- `media.ts`: baixa e rasteriza assets locais.
- `story-generator.ts`: gera uma story individual e classifica falhas do item.
- `generate-web-stories.ts`: orquestra lote, limite, concorrência, limpeza e relatório.
- `amp.ts`: renderiza HTML AMP sem buscar rede.
- `amp-css.ts`: concentra CSS AMP customizado dentro do orçamento permitido.
- `output.ts`: escreve índice, sitemap, XSL, `robots.txt` e relatórios.
- `output-index.ts`: renderiza a galeria operacional da raiz.
- `output-sitemap.ts`: renderiza `sitemap.xml` e `sitemap.xsl`.
- `network.ts`: centraliza `fetch` com timeout, retry e backoff.

Essa divisão mantém interfaces pequenas e implementação localizada: funções que buscam rede não renderizam HTML nem escrevem arquivos, renderers não buscam rede, resolvers não escrevem arquivos.

## Saída Gerada

- `public/stories/<slug>/index.html`: Web Story AMP.
- `public/assets/<slug>/poster-portrait.jpg`: poster 3:4.
- `public/assets/<slug>/story-image.jpg`: imagem vertical 9:16.
- `public/assets/<slug>/story-image-2.jpg`, `story-image-3.jpg` etc.: imagens secundárias 9:16 quando disponíveis.
- `public/assets/<slug>/video-poster.jpg`: poster local 3:4 para vídeo direto quando disponível.
- `public/assets/shared/publisher-logo.png`: logo raster 1:1.
- `public/index.html`: galeria operacional com métricas, cards e links técnicos.
- `public/sitemap.xml`: sitemap XML das Web Stories com stylesheet XSL.
- `public/sitemap.xsl`: apresentação visual do sitemap no navegador.
- `public/robots.txt`: referência ao sitemap das Web Stories.
- `public/reports/report.json`: relatório estruturado.
- `public/reports/failures.csv`: falhas por item.

`report.json` mantém o seguinte formato operacional:

```json
{
  "startedAt": "2026-06-22T17:41:20.345Z",
  "finishedAt": "2026-06-22T17:41:31.070Z",
  "durationMs": 10725,
  "sitemapUrls": 3,
  "processed": 2,
  "limit": 2,
  "limitApplied": false,
  "includeUrlPattern": "/stories/",
  "filteredOut": 1,
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "outputDir": "/absolute/path/to/public",
  "stories": [
    {
      "sourceUrl": "https://blog.example.com/post/",
      "storyUrl": "http://localhost:8080/stories/post/",
      "outputPath": "/absolute/path/to/public/stories/post/index.html",
      "title": "Título",
      "posterPortraitSrc": "http://localhost:8080/assets/post/poster-portrait.jpg",
      "modifiedAt": "2026-06-22T05:09:25-03:00",
      "variant": "multi-image-summary",
      "mediaCount": 3,
      "warnings": []
    }
  ],
  "failures": []
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
- Uso de IA, quando houver no desenvolvimento, deve ser tratado como assistência revisada por humano; a rastreabilidade técnica fica nos testes, gates e documentação, e nenhuma chamada a LLM ocorre em runtime.
- Retry/backoff fica na fronteira de rede, sem contaminar renderers ou resolvers.
- Testes validam comportamento público observável, não ordem interna de chamadas.
- Sitemap inválido aborta a execução; falhas de posts individuais entram no relatório.
- `--include-url-pattern` filtra o sitemap antes de `--limit` e registra `filteredOut` no relatório para manter rastreabilidade.
- `amp-story-animation` é usado só no callout da página de decisão, com `transform` e `opacity`, porque o restante do motion é resolvido por presets AMP-native mais previsíveis.
- A raiz (`/`) é uma galeria de avaliação; `/sitemap.xml` é o sitemap XML rastreável e visualmente estilizado via XSL.

## Documentação Técnica Consultada

- Google Web Stories: `https://developers.google.com/search/docs/appearance/enable-web-stories`
- Boas práticas de Web Stories: `https://developers.google.com/search/docs/appearance/web-stories-creation-best-practices`
- AMP Web Story technical details: `https://amp.dev/documentation/guides-and-tutorials/learn/webstory_technical_details/`
- AMP story: `https://amp.dev/documentation/components/amp-story/`
- AMP story animations: `https://amp.dev/documentation/examples/visual-effects/amp_story_animations/`
- AMP story animation: `https://amp.dev/documentation/components/amp-story-animation/`
- AMP video: `https://amp.dev/documentation/components/amp-video/`
- Validação AMP: `https://amp.dev/documentation/guides-and-tutorials/learn/validation-workflow/validate_amp/`
- Sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Image sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps`
- XML Stylesheet: `https://www.w3.org/TR/xml-stylesheet/`
