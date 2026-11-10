# Portfólio de BIs de Logística

Site estático com cinco BIs operacionais de logística da **Aurora Log**, uma transportadora de encomendas fictícia. Todos os dados são sintéticos, gerados por script com semente fixa.

## BIs
| BI | Pergunta que responde | KPIs |
|---|---|---|
| Indicadores Operacionais | Estamos entregando no prazo e onde está o desvio? | K01 a K06 |
| Piso – Vencimento por Cliente | O que está parado no piso e o que vence primeiro? | K07 a K11 |
| Produção do Dia | A unidade está produzindo o previsto, hora a hora? | K12 a K14 |
| Transporte e Transferências | As viagens saem e chegam no horário? | K15 a K19 |
| SLA de Coletas | Estamos coletando dentro do prazo? | K20 a K23 |

Cada BI tem filtros de período, unidade, UF/regional e cliente; o KPI principal mostra meta, comparação com o período anterior e semáforo. Fórmulas em `docs/07_metricas_e_regras.md`.

## Situação
Fase 1 (v0.1.0) concluída: gerador de dados, 6 páginas, 23 KPIs e testes. A publicação aguarda as pendências P02 e P04 de `docs/decisoes.md`.

## Requisitos
- Python 3.12 ou mais novo
- Node.js 20 ou mais novo (para `node --test`)

```
python -m venv .venv
.venv\Scripts\activate            # Windows (no Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python -m playwright install chromium
```

## Como rodar
```
python etl/gerar_dados.py         # gera os JSON sintéticos em src/dados/ e roda as checagens de docs/08
python scripts/montar_dist.py     # copia src/ para dist/
python scripts/servidor.py        # abre dist/ em http://127.0.0.1:8000/portifolio/
```
O site precisa ser aberto por um servidor HTTP (o navegador bloqueia a leitura dos JSON a partir de `file://`). Use `scripts/servidor.py` em vez de `python -m http.server`: no Windows, este último pode entregar `.js` com o tipo errado. Para desenvolver direto em `src/`: `python scripts/servidor.py --pasta src`.

## Como testar
```
python -m pytest                  # calendário, qualidade dos dados, reprodutibilidade, anonimização e fumaça das 6 páginas
node --test tests/                # um teste por KPI, com casos de borda
ruff check .                      # qualidade do código Python
```
O teste de anonimização lê `referencias/termos_proibidos.txt`, que fica fora do Git; sem o arquivo ele é pulado. Depois de mudar qualquer arquivo de `src/`, rode `python scripts/montar_dist.py` antes de fazer commit: o workflow confere que `dist/` é cópia fiel de `src/`.

## Estrutura
```
config/config.yaml     parâmetros (datas, semente, metas, faixas, cenário dos dados)
etl/                   gerador, calendário, dicionário de dados e checagens de qualidade
src/                   site: index.html, paginas/, css/, js/ (kpis.js, calendario.js, filtros.js...), dados/
dist/                  cópia de src/ publicada no GitHub Pages
scripts/               montagem de dist/ e servidor local
tests/                 pytest, node --test e dados de referência dos KPIs
docs/                  documentação de negócio e técnica; decisões em docs/decisoes.md
```

## Publicação no GitHub Pages
Repositório: https://github.com/marconunesjr/portifolio. Endereço previsto: https://marconunesjr.github.io/portifolio/.

1. Resolver as pendências P02 (autorização do empregador) e P04 (nomes de clientes) de `docs/decisoes.md`.
2. Juntar o trabalho ao ramo `main` e fazer o push: `git push origin main`.
3. No GitHub, em Settings → Pages, escolher **GitHub Actions** como fonte.
4. O workflow `.github/workflows/pages.yml` roda os testes dos KPIs, confere `dist/` e publica a pasta. Acompanhe na aba Actions e abra o endereço acima.

Todos os caminhos do site são relativos, por isso ele funciona dentro da subpasta `/portifolio/`.

## Documentação
A pasta `docs/` traz visão geral, requisitos, bases de dados, arquitetura, plano, dicionário de dados, métricas e qualidade. As decisões e pendências estão em `docs/decisoes.md`; o histórico de versões, em `CHANGELOG.md`.

## Aviso
Empresa, clientes, unidades, pessoas e números são fictícios. Qualquer semelhança com organizações reais é coincidência.
