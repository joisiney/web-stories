# Estratégia De Testes

Os testes validam regras públicas observáveis. Um refactor interno que preserve o comportamento deve continuar passando.

## Testes Atuais

- `sitemap.test.ts`: falha se o parser deixar de extrair `loc`, `lastmod` ou imagens com namespace `image`; também falha se XML fora do formato de sitemap for aceito.
- `metadata.test.ts`: falha se a precedência de imagem sitemap > REST > HTML mudar; também falha se o fallback HTML deixar de extrair vídeo direto, poster, favicon ou imagens narrativas de `<amp-story>`.
- `story-variant.test.ts`: falha se vídeo direto com imagem não virar variante mista, se embed externo for aceito como vídeo válido, se múltiplas imagens não virarem `multi-image-summary`, se conteúdo text-heavy for renderizado ou se a story deixar de ter 6 páginas narrativas.
- `motion.test.ts`: falha se as intenções editoriais de motion deixarem de gerar atributos AMP com duração, delay, easing e escala/pan esperados.
- `amp-renderer.test.ts`: falha se HTML AMP perder metadados obrigatórios, canonical, JSON-LD, escape de conteúdo, autoavanço, uso de componentes AMP, `amp-story-animation` do callout ou CSS dentro do orçamento seguro.
- `amp-video-renderer.test.ts`: falha se uma página de vídeo deixar de usar `amp-video`, poster, `source` direto, autoavanço por `id` do vídeo e atributos de motion válidos.
- `media.test.ts`: falha se poster, imagens locais e logo deixarem de ser rasterizados nas dimensões esperadas, ou se fallback de imagem secundária quebrada perder warning.
- `network.test.ts`: falha se rede não retentar erro transitório, se retentar erro definitivo ou se timeout final não informar o total de tentativas.
- `output-writer.test.ts`: falha se galeria, sitemap XML com XSL, `robots.txt` ou relatórios deixarem de mostrar resumo de lote, warnings, artefatos e falhas categorizadas.
- `generate-web-stories.test.ts`: falha se o lote parar por erro isolado, se falhas por item perderem `code` e `stage`, se vídeo direto com poster não gerar uma story, se `--include-url-pattern` não filtrar antes de `--limit`, se sitemap inválido apagar saída anterior ou se download estrutural ignorar timeout.
- `cli-options.test.ts`: falha se defaults operacionais ou validações de flags, incluindo timeout de rede e regex de filtro, mudarem.

## O Que Não Testar

- Ordem interna de chamadas entre funções.
- Detalhes de implementação de bibliotecas externas.
- Layout visual pixel a pixel.
- Easing por preferência subjetiva sem mudança de contrato observável.
- Rede real em teste unitário.
- Conteúdo específico de um site real.

## Gates

```bash
pnpm check
pnpm generate --sitemap https://g1.globo.com/sitemap/g1/2025/05/24_1.xml --include-url-pattern "/stories/" --out public --base-url http://localhost:8080 --limit 2
pnpm validate:amp
docker compose config
```

Use `--limit 3` apenas como smoke test rápido local. A avaliação visual recomendada usa `--limit 20`.

`docker compose up --build` deve ser executado quando o Docker daemon estiver ativo.
