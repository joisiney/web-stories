# Instruções Locais Para Agentes

Este projeto segue o PRD técnico em `docs/prds/web-stories-sitemap-wordpress.md`.

## Regras De Arquitetura

- A fonte de verdade do produto fica em `src/generate-web-stories`.
- Entry points em `src/cli.ts`, `src/server.ts` e `src/validate-amp.ts` devem permanecer finos.
- Não criar `core`, `shared`, `contracts` ou abstrações globais sem segundo consumidor real.
- SOLID é critério de diagnóstico, não motivo para criar camadas antecipadas.
- Nenhum arquivo de produto deve passar de 180 linhas sem justificativa no próprio PR.
- Funções que buscam rede não devem renderizar HTML nem escrever arquivos.
- Renderers não devem buscar rede.
- Resolvers não devem escrever arquivos.

## Regras De Produto

- O fluxo principal não usa credenciais WordPress.
- O padrão é processar todas as URLs; `--limit` serve para validação rápida.
- Falhas por item entram no relatório e não interrompem o lote.
- Sitemap inválido é falha estrutural e deve abortar a execução.
- Vídeo só é aceito quando for URL direta `mp4` ou `webm` com poster.
- Embeds externos de vídeo ficam fora do escopo.
- Toda story deve ter canonical, metadados AMP obrigatórios, OGP, Twitter Card e JSON-LD.
- Poster e logo devem ser rasterizados localmente para cumprir o mínimo de Web Stories.

## Sinais Públicos Do Avaliador Aplicáveis Ao Projeto

- Tratar esta entrega como automação de integração pronta para uso: README, CLI, Docker e scripts devem permitir gerar, validar e servir a saída sem ler código-fonte.
- Valorizar saídas operacionais e consumíveis por máquina: índice, sitemap, `robots.txt`, `report.json` e `failures.csv` devem manter schema estável, campos úteis para diagnóstico e mensagens acionáveis.
- Integrações externas devem ser defensivas: sitemap, WordPress REST, HTML remoto, imagens, vídeos e AMP validator precisam de timeout, validação de formato, fallback explícito e erro categorizado.
- SEO e marketing são parte central do produto: canonical, metadados sociais, JSON-LD, sitemap e assets rasterizados locais não devem ser tratados como acabamento opcional.
- Toda nova flag ou comportamento de geração deve ter exemplo de uso em documentação e cobertura que prove o efeito observável no relatório ou HTML gerado.
- Evitar soluções dependentes de credencial, painel ou fluxo manual quando uma saída estática e reproduzível resolver o critério de aceite.

## Testes

- Testar regras públicas observáveis, não ordem interna de chamadas.
- Mocks só devem existir em fronteiras externas: rede, filesystem pesado e processamento de imagem.
- Testes devem ficar perto da vertical slice em `src/generate-web-stories/_tests`.
- Cada teste deve continuar válido após refactor que preserve o comportamento público.

## Gates

```bash
pnpm check
pnpm generate --sitemap https://blog.jota.ai/post-sitemap.xml --out public --base-url http://localhost:8080 --limit 3
pnpm validate:amp
docker compose config
```

Quando o Docker daemon estiver ativo, validar também:

```bash
docker compose up --build
```
