# Changelog

Formato baseado em versionamento semântico.

## [0.2.0] — 09/11/2026
### Adicionado
- BI 6 Contencioso e Indenizações (`paginas/bi6_contencioso.html`): litigiosidade, estoque de processos, taxa de êxito (meta 97%), valor pago, provisão de risco provável, tempo até o encerramento e acordos (K24 a K30), com os 4 filtros.
- Base sintética `bi6_processos` (4.000 processos) e checagens L15, L16, P07 e P08 de docs/08.
- Testes de K24 a K30 com casos de borda e o BI 6 no teste de fumaça.
- ADR-018 em `docs/decisoes.md`. Meta do K24: ≤ 13,0 processos por 10 mil remessas (75% do nível atual, decisão do autor).

### Alterado
- Site com 7 páginas e 30 KPIs; navegação, página inicial, README, CLAUDE.md e docs 01, 02, 03, 05, 06, 07 e 08 atualizados.

## [0.1.0] — 09/11/2026
Fase 1: site completo, ainda não publicado (ver pendências P02 e P04 em `docs/decisoes.md`).

### Adicionado
- Gerador de dados sintéticos (`etl/gerar_dados.py`) com semente fixa: 13 bases de docs/06 em JSON colunar, validação contra o dicionário e as checagens Q01–Q09, L01–L14 e P01–P06 de docs/08; para com código 1 e não grava nada se alguma falhar.
- Calendário de dias úteis com feriados nacionais, uma vez em Python (`etl/calendario.py`) e uma vez em JavaScript (`src/js/calendario.js`).
- Módulo `src/js/kpis.js` com os 23 KPIs (K01 a K23) em funções puras, filtros comuns (`filtros.js`) e semáforo lido de `config.yaml`.
- Página inicial e 5 BIs: Indicadores Operacionais, Piso – Vencimento por Cliente, Produção do Dia (com mapa de calor hora × dia), Transporte e Transferências (com Pareto de ocorrências) e SLA de Coletas.
- Filtros de período, unidade, UF/regional e cliente; meta, comparação com o período anterior e semáforo nos KPIs principais; nota metodológica, data de referência e aviso de dados fictícios em todas as páginas.
- Identidade visual própria com temas claro e escuro, layout de 360 px a 1920 px.
- Testes: um por KPI com casos de borda (`node --test tests/`); calendário, qualidade dos dados, reprodutibilidade, consistência Python × JavaScript, anonimização e fumaça das 6 páginas com Playwright servindo `dist/` na subpasta `/portifolio/` (`python -m pytest`).
- `scripts/montar_dist.py` (cópia de `src/` para `dist/`), `scripts/servidor.py` (servidor local com tipos MIME corretos) e workflow `.github/workflows/pages.yml` para o GitHub Pages.
- Decisões ADR-009 a ADR-017 e pendências P04 e P05 (resolvida) em `docs/decisoes.md`.

### Corrigido
- As páginas abrem direto do disco (duplo clique em `dist/index.html`), sem servidor: scripts clássicos no lugar de módulos e dados também em `.js` (ADR-017). Filtros sem texto cortado nos campos.
- Botão de tema funciona antes de os dados carregarem; sem o CDN do ECharts, os KPIs continuam e os gráficos mostram um aviso; selo de semáforo sem anúncio repetido em leitor de tela.

### Alterado
- Clientes CL04 e CL06 renomeados para "Eletro Seriema" e "Moda Seriguela", porque os nomes antigos lembravam marcas reais (pendência P04).
- `config/config.yaml`: novas seções `segmentos_clientes` e `cenario` (ofensores e sazonalidade dos dados sintéticos); regional "São Paulo" com acento. Metas e fórmulas não mudaram.
- ECharts 5.6.0 passou a ser carregado por CDN (jsDelivr) com `integrity` SHA-384, no lugar da cópia em `src/assets/vendor/` (ADR-016).
