# 05 — Plano de implementação

Prazos: [A DEFINIR] (ver pendência P01 em `docs/decisoes.md`).

## Fase 0 — Documentação e estrutura
- [x] Estrutura de pastas e Git
- [x] Documentação docs/01 a 08 e decisoes.md
- [x] config/config.yaml

## Fase 1 — Site completo (v0.1.0) — concluída em 09/11/2026
- [x] Gerador de dados sintéticos reprodutível, com validação contra docs/06 (RF11)
- [x] Calendário único em Python e em JavaScript
- [x] Módulo `kpis.js` com K01 a K23 e um teste por KPI
- [x] Identidade visual e componentes comuns (cabeçalho, filtros, cartão de KPI, semáforo)
- [x] Página inicial (RF01)
- [x] BI Indicadores Operacionais (RF02)
- [x] BI Piso – Vencimento por Cliente (RF03)
- [x] BI Produção do Dia (RF04)
- [x] BI Transporte e Transferências (RF05)
- [x] BI SLA de Coletas (RF06)
- [x] Filtros e navegação (RF07, RF08)
- [x] Nota metodológica e avisos em cada página (RF09)
- [x] Checagem de anonimização (RF10)
- [x] Workflow do GitHub Pages (RF12)

### Critérios de pronto da Fase 1
1. `python etl/gerar_dados.py` termina com código 0 e é reprodutível (RF11).
2. As 6 páginas abrem de `dist/index.html` sem erro no console (RNF01).
3. Os 23 KPIs conferem com docs/07 e cada um tem teste com resultado conhecido (RF02 a RF06).
4. Os 4 filtros recalculam KPIs e gráficos em cada BI (RF07).
5. `python -m pytest`, `node --test tests/` e `ruff check .` passam (RNF09).
6. Nenhum termo proibido em arquivo versionado (RF10).
7. Layout sem rolagem horizontal de 360 px a 1920 px (RNF04).
8. CHANGELOG com a v0.1.0 e resultados registrados em docs/08.

## Fase 1b — BI 6 Contencioso e Indenizações (v0.2.0) — concluída em 09/11/2026
- [x] KPIs K24 a K30 aprovados pelo autor e registrados em docs/07
- [x] Base sintética bi6_processos, com checagens L15, L16, P07 e P08
- [x] Funções K24 a K30 em `kpis.js` e um teste por KPI
- [x] Página do BI 6 e navegação atualizada (7 páginas)

## Fase 2 — Publicação e validação
- [ ] Confirmar com o empregador que a publicação é permitida
- [ ] Fazer o push do ramo `main` para https://github.com/marconunesjr/portifolio.git (remoto `origin` já configurado)
- [ ] Ativar o GitHub Pages (fonte: GitHub Actions) e conferir o site em https://marconunesjr.github.io/portifolio/
- [ ] Revisão do autor: números plausíveis, textos e layout em computador e celular
- [ ] Divulgar o link no LinkedIn e no currículo

## Fases futuras (ideias)
- Outros BIs da lista original (torre de controle, mapa de calor de entregas, backlog das unidades).
- Página "sobre" com o processo de construção.
