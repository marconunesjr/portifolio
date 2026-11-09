# Portfólio de BIs de Logística

Site estático com cinco BIs operacionais de logística da **Aurora Log**, uma transportadora de encomendas fictícia. Todos os dados são sintéticos, gerados por script com semente fixa.

## BIs
| BI | Pergunta que responde |
|---|---|
| Indicadores Operacionais | Estamos entregando no prazo e onde está o desvio? |
| Piso – Vencimento por Cliente | O que está parado no piso e o que vence primeiro? |
| Produção do Dia | A unidade está produzindo o previsto, hora a hora? |
| Transporte e Transferências | As viagens saem e chegam no horário? |
| SLA de Coletas | Estamos coletando dentro do prazo? |

## Situação
Etapa 1 (documentação e estrutura) concluída. O código será escrito na Etapa 2 (Fase 1 do plano em `docs/05_plano_de_implementacao.md`).

## Como rodar (a partir da Fase 1)
```
python etl/gerar_dados.py     # gera os JSON sintéticos em src/dados/
python -m pytest              # qualidade dos dados, calendário e teste de fumaça das páginas
node --test tests/            # um teste por KPI
ruff check .                  # qualidade do código Python
```
Depois, abrir `dist/index.html` no navegador.

## Publicação
O conteúdo de `dist/` é publicado no GitHub Pages por um workflow do GitHub Actions (ver `docs/05_plano_de_implementacao.md`, Fase 2).

## Documentação
A pasta `docs/` traz visão geral, requisitos, bases de dados, arquitetura, plano, dicionário de dados, métricas e qualidade. As decisões e pendências estão em `docs/decisoes.md`.

## Aviso
Empresa, clientes, unidades, pessoas e números são fictícios. Qualquer semelhança com organizações reais é coincidência.
