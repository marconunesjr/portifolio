# 01 — Visão geral

## Objetivo
Montar um portfólio pessoal de um analista de dados sênior de logística: um site com cinco BIs operacionais interativos, em HTML, com dados fictícios.

## Público
Recrutadores e potenciais clientes, que vão abrir o link a partir do LinkedIn ou do currículo, em computador ou celular.

## Partes interessadas
O autor é patrocinador, usuário e validador. Não há dono de fonte, porque não há fonte real.

## Área e classificação
- Área: Operacional. Subárea principal: nível de serviço e torre de controle, com armazenagem e transporte.
- Tipo: BI em HTML (site único com página inicial e 6 BIs).
- Criticidade: baixa (uso pessoal, dados fictícios).

## Decisão apoiada
Cada BI simula a decisão operacional que apoiaria numa transportadora de encomendas:

| BI | Decisão simulada |
|---|---|
| Indicadores Operacionais | Onde agir para recuperar a entrega no prazo |
| Piso – Vencimento por Cliente | Que carga priorizar hoje em cada unidade |
| Produção do Dia | Se a equipe do turno dá conta do volume previsto |
| Transporte e Transferências | Que rotas e fornecedores cobrar por atraso |
| SLA de Coletas | Que unidades e clientes estão com coleta fora do prazo |
| Contencioso e Indenizações | Onde agir para reduzir processos e perdas com indenização |

## Situação atual
Não existe portfólio publicado. Os BIs de referência são internos e não podem ser mostrados; por isso são recriados com layout autoral e dados sintéticos.

## Meta SMART
| Letra | Resposta |
|---|---|
| S | Site estático com página inicial e 6 BIs interativos da empresa fictícia Aurora Log |
| M | 6 páginas sem erro no console, 23 KPIs, 4 filtros por BI, testes passando |
| A | HTML, CSS e JavaScript puros com ECharts; dados sintéticos gerados em Python |
| R | Peça de portfólio para LinkedIn e currículo |
| T | [A DEFINIR] |

## Escopo
- Página inicial com cartões de acesso aos 6 BIs.
- 6 BIs com KPIs, metas, comparação com o período anterior, semáforo e filtros.
- Gerador de dados sintéticos reprodutível.
- Publicação no GitHub Pages.

## Fora de escopo
- Conexão com qualquer fonte de dados real.
- Atualização automática dos dados.
- Controle de acesso por usuário.
- Runbook, registro detalhado de riscos e manual do usuário (criticidade baixa).

## Riscos
1. Os layouts são autorais, porque a documentação de origem descreve dados, e não páginas.
2. É preciso confirmar com o empregador se a publicação de BIs inspirados nos internos é permitida, mesmo anonimizados.
