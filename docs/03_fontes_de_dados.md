# 03 — Fontes de dados

## Declaração
Não há fonte real. Todas as bases são sintéticas, geradas por `etl/gerar_dados.py` a partir de `config/config.yaml`, com semente fixa. Não há dado pessoal: operadores, couriers e motoristas existem só como códigos inventados. Classificação LGPD: não se aplica.

## Período
De 03/08/2026 a 31/10/2026 (90 dias). A data de referência é 31/10/2026.

## Bases
| Base | BI | Entidade (uma linha é) | Linhas aproximadas | Período |
|---|---|---|---|---|
| dim_unidades | todos | Uma unidade | 12 | fixo |
| dim_clientes | todos | Um cliente | 15 | fixo |
| dim_calendario | todos | Um dia | 92 | 90 dias + 2 dias seguintes |
| bi1_ctes | Indicadores Operacionais | Um CT-e com vencimento no período | 30.000 | vencimento nos 90 dias |
| bi1_emissoes_dia | Indicadores Operacionais | Dia × unidade de origem × cliente | 16.000 | 90 dias |
| bi1_entregas_courier | Indicadores Operacionais | Dia × unidade × courier | 12.000 | 90 dias |
| bi2_piso | Piso | Um CT-e parado no piso na data de referência | 8.000 | foto na data de referência |
| bi3_producao_hora | Produção do Dia | Dia × hora × unidade × cliente | 120.000 agregadas | 90 dias |
| bi3_produtividade_operador | Produção do Dia | Dia × unidade × operador | 9.000 | 90 dias |
| bi3_forecast | Produção do Dia | Dia × unidade × cliente | 8.600 | 90 dias |
| bi4_viagens | Transporte | Uma viagem | 6.000 | 90 dias |
| bi4_manifestos | Transporte | Um manifesto de transferência | 9.000 | 90 dias |
| bi5_coletas | SLA de Coletas | Uma solicitação de coleta | 15.000 | 90 dias |

Se `bi3_producao_hora` passar do limite de peso do RNF03, agregar por dia da semana × hora nos dias anteriores aos últimos 14 e registrar em `docs/decisoes.md`.

## Atualização
Sob demanda: os dados só mudam quando o gerador é executado de novo. Os JSON são versionados no repositório.

## Contrato
As colunas e os tipos de cada base estão em `docs/06_dicionario_de_dados.md`. O gerador valida o que produz contra esse dicionário e para com erro claro se houver divergência.

## Realismo exigido dos dados
- Sazonalidade por dia da semana (menos volume no fim de semana) e por hora (picos no início da manhã e no fim da tarde).
- Diferenças plausíveis entre unidades e entre clientes.
- Alguns ofensores claros, para que as análises contem uma história: pelo menos 2 unidades e 2 clientes com OTD bem abaixo da meta, 1 fornecedor de transporte com atraso recorrente e 1 regional com coleta fora do prazo.
