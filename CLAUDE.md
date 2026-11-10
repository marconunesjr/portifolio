# CLAUDE.md — Portfólio de BIs de Logística

## Projeto
Site de portfólio com página inicial e 5 BIs interativos de logística da empresa fictícia Aurora Log. Área Operacional, tipo BI_HTML, criticidade baixa. Dados 100% sintéticos.

## Meta
Entregar 6 páginas (inicial + 5 BIs) sem erro no console, com 23 KPIs (K01 a K23), filtros de período, unidade, UF/regional e cliente, publicadas no GitHub Pages.

## Fonte da verdade
- `docs/07_metricas_e_regras.md`: fórmulas, metas, calendário. Não alterar por conta própria; divergência vai para `docs/decisoes.md`.
- `docs/06_dicionario_de_dados.md`: contrato das bases sintéticas.
- `docs/08_qualidade_e_validacao.md`: checagens obrigatórias.
- `config/config.yaml`: todos os parâmetros. Nada fixo no código.

## Stack
- Site: HTML, CSS e JavaScript puros, sem framework e sem build obrigatório. ECharts em versão fixada, copiado para `src/assets/vendor/`.
- Dados: Python (pandas, numpy), semente fixa, saída em JSON em `src/dados/`.
- Testes: pytest (dados, calendário, fumaça com Playwright) e `node --test` (KPIs).
- Qualidade: ruff.

## Arquitetura
Gerador (`etl/`) gera JSON (`src/dados/`), que o site (`src/`) lê. `dist/` é a cópia pronta para publicar. Os KPIs são calculados no navegador por um único módulo, `src/js/kpis.js`, com funções puras; as páginas só chamam esse módulo.

## Convenções
- Nomes de arquivos, colunas e funções em snake_case, sem acento. Comentários e docstrings em português.
- Formatos pt-BR: dd/mm/aaaa, vírgula decimal, ponto de milhar.
- Percentuais com 1 casa decimal; dias e horas com 1 casa; contagens inteiras.
- Vermelho sempre significa fora da meta.
- Commits por entrega; CHANGELOG atualizado a cada versão.

## Calendário
Dia útil é segunda a sexta, exceto feriado nacional. A data de referência fica em `config/config.yaml`; nenhum cálculo usa a data do sistema. Implementar uma única vez em Python e uma única vez em JavaScript.

## Anonimização (regra inegociável)
- Nenhum nome real de empresa, cliente, pessoa, tabela ou consulta de origem em arquivo versionado.
- A lista de termos proibidos fica em `referencias/termos_proibidos.txt`, fora do Git. Rodar a checagem de `docs/08` antes de cada commit.
- Pessoas aparecem só por código (operador `OP0001`, courier `CR0001`, motorista `MT0001`). Sem nomes, documentos ou endereços.
- As pastas `_prompts/` e `referencias/` não são versionadas.

## Repositório e publicação
- Remoto `origin`: https://github.com/marconunesjr/portifolio.git (ramo `main`).
- O site será servido em https://marconunesjr.github.io/portifolio/, ou seja, dentro de uma subpasta. Usar somente caminhos relativos em links, scripts, estilos e dados; nunca caminhos iniciados por `/`.
- O push é feito pelo autor, depois da confirmação da pendência P02 de `docs/decisoes.md`.

## Segredos
O projeto não usa credenciais. Se surgir alguma, só em `.env`, nunca no código.

## Comandos
```
python etl/gerar_dados.py      # dados sintéticos + checagens de docs/08
python scripts/montar_dist.py  # copia src/ para dist/ (rodar antes de cada commit que mexe em src/)
python scripts/servidor.py     # serve dist/ em http://127.0.0.1:8000/portifolio/
python -m pytest
node --test tests/
ruff check .
```
