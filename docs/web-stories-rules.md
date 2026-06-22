# Regras De Web Stories

## Regras Técnicas

- A story precisa ser AMP válida.
- `amp-story` exige `title`, `publisher`, `publisher-logo-src` e `poster-portrait-src`.
- Cada story deve ter canonical para si mesma.
- A descoberta deve ser facilitada por links internos, sitemap e `robots.txt`.
- Textos devem ser curtos; stories text-heavy podem perder elegibilidade.
- Vídeos devem ser diretos quando renderizados com `amp-video`.
- Embeds externos ficam fora do escopo desta versão.
- Assets não podem ficar pixelados ou distorcidos.
- A story precisa ter narrativa mínima e não depender do clique externo para o entendimento essencial.
- A story gerada deve ter 6 páginas para a demo: capa, ponto central, contexto, detalhe prático, decisão e CTA.
- Páginas narrativas devem usar `auto-advance-after`; o CTA final deve permanecer parado para preservar a ação de clique.
- Animações devem usar recursos AMP-native: `animate-in`, `animate-in-duration`, `animate-in-delay` e `animate-in-timing-function`.
- `amp-story-animation` deve ser usado de forma pontual, apenas quando houver ganho narrativo observável e validação AMP correspondente.
- CSS customizado deve permanecer abaixo de 75 KB e não deve animar propriedades de layout.

## Padrões Observados Em Produtos De Stories

- Instagram e formatos sociais similares: consumo vertical, toque para avançar, texto mínimo e mídia dominante.
- G1 e portais editoriais similares: capa forte, contexto curto por tela e CTA para matéria completa.
- Yahoo e feeds personalizados similares: cards curtos, título direto e imagem reconhecível.
- Produtos jornalísticos em geral: sequência com começo, desenvolvimento e fechamento.
- Web Stories profissionais: mídia full-bleed, entrada de texto em sequência curta, Ken Burns discreto em imagem, fade limpo em vídeo e avanço automático quando a narrativa pede ritmo contínuo.

As regras implementadas vêm de Google/AMP. Os padrões de produto acima servem apenas para orientar fixtures e variantes.

## Padrão De Motion

- `cover`: Ken Burns em `zoom-out`, com mídia começando ampliada e título entrando depois.
- `point`: `pan-right` na imagem, enquanto a headline entra em direção oposta ao movimento principal.
- `context`: `pan-up` suave para dar sensação de profundidade e continuidade editorial.
- `detail`: `pan-left` com bloco de texto destacado por linha editorial.
- `decision`: `zoom-in` controlado e callout com linha animada via `amp-story-animation`.
- `video`: fade curto para não competir com o movimento do próprio vídeo.
- `cta`: mídia estabilizada e botão com microentrada única, preservando leitura e clique.
- Páginas de imagem usam `auto-advance-after="7s"`.
- Páginas de vídeo direto usam `auto-advance-after` apontando para o `id` do `amp-video`, sem `loop`.
- Coreografia customizada com `amp-story-animation` só deve entrar quando houver ganho narrativo claro e teste AMP correspondente.

## Matriz De Cenários

| # | Cenário | Resultado Esperado |
|---|---|---|
| 1 | Imagem vinda do sitemap | Gera story `image-summary`. |
| 2 | Imagem vinda do REST | Gera story quando o sitemap não tiver imagem. |
| 3 | Imagem vinda de `og:image` | Gera story quando sitemap e REST não tiverem imagem. |
| 4 | Vídeo direto com poster | Gera story `video-first` usando `amp-video`. |
| 5 | Imagem + vídeo direto | Gera story `mixed-media`. |
| 6 | Múltiplas imagens no sitemap | Mantém `story-image.jpg` como principal e usa imagens locais secundárias nas páginas narrativas. |
| 7 | Texto longo | Trunca textos de página e rejeita conteúdo text-heavy. |
| 8 | Logo SVG | Converte para PNG 1:1. |
| 9 | Sitemap grande | Processa com concorrência controlada. |
| 10 | REST fora do ar | Usa fallback HTML. |
| 11 | Sem imagem e sem vídeo válido | Registra falha daquela URL. |
| 12 | Vídeo inválido com imagem | Ignora vídeo, gera story de imagem e registra warning. |
| 13 | XML inválido | Aborta como falha estrutural. |
| 14 | Download de asset quebrado | Registra falha daquela URL. |
| 15 | Embed externo de vídeo | Fica fora do escopo e cai para imagem quando existir. |
| 16 | Motion editorial | Gera atributos AMP válidos com easing, delay e duração por intenção narrativa. |
| 17 | Autoavanço narrativo | Gera `auto-advance-after` nas páginas não finais e mantém CTA final sem autoavanço. |
| 18 | Sitemap visual | Gera XML rastreável com `xml-stylesheet`, `lastmod` e XSL visual para inspeção no navegador. |
| 19 | Filtro de URL | Aplica `--include-url-pattern` antes de `--limit` e registra `filteredOut` no relatório. |
| 20 | Origem Web Story AMP | Extrai imagens de `<amp-story>` em ordem narrativa e gera variante `multi-image-summary` quando houver múltiplas imagens sem vídeo. |

## Feeds Recomendados Para Demo

- Principal: `https://g1.globo.com/sitemap/g1/2025/05/24_1.xml` com `--include-url-pattern "/stories/"`.
- Alternativo controlado: `https://karnatakahelp.in/web-stories-sitemap.xml`.
- Alternativo de robustez: `https://www.carehospitals.com/web-stories-sitemap.xml`.

## Fontes

- Google Web Stories: `https://developers.google.com/search/docs/appearance/enable-web-stories`
- Boas práticas de criação: `https://developers.google.com/search/docs/appearance/web-stories-creation-best-practices`
- Políticas de conteúdo: `https://developers.google.com/search/docs/appearance/web-stories-content-policy`
- AMP story: `https://amp.dev/documentation/components/amp-story/`
- AMP Web Story technical details: `https://amp.dev/documentation/guides-and-tutorials/learn/webstory_technical_details/`
- AMP story animations: `https://amp.dev/documentation/examples/visual-effects/amp_story_animations/`
- AMP story animation: `https://amp.dev/documentation/components/amp-story-animation/`
- AMP style and layout: `https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/`
- AMP video: `https://amp.dev/documentation/components/amp-video/`
- Validação AMP: `https://amp.dev/documentation/guides-and-tutorials/learn/validation-workflow/validate_amp/`
- Sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Image sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps`
- XML Stylesheet: `https://www.w3.org/TR/xml-stylesheet/`
