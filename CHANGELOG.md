# Changelog

Formato baseado em versionamento semântico.

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
- Decisões ADR-009 a ADR-016 e pendências P04 e P05 (resolvida) em `docs/decisoes.md`.

### Corrigido
- Botão de tema funciona antes de os dados carregarem; sem o CDN do ECharts, os KPIs continuam e os gráficos mostram um aviso; selo de semáforo sem anúncio repetido em leitor de tela.

### Alterado
- Clientes CL04 e CL06 renomeados para "Eletro Seriema" e "Moda Seriguela", porque os nomes antigos lembravam marcas reais (pendência P04).
- `config/config.yaml`: novas seções `segmentos_clientes` e `cenario` (ofensores e sazonalidade dos dados sintéticos); regional "São Paulo" com acento. Metas e fórmulas não mudaram.
- ECharts 5.6.0 passou a ser carregado por CDN (jsDelivr) com `integrity` SHA-384, no lugar da cópia em `src/assets/vendor/` (ADR-016).
