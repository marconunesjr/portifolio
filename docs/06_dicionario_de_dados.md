# 06 — Dicionário de dados

Todas as bases são sintéticas e gravadas em JSON em `src/dados/`. Datas no formato ISO (`aaaa-mm-dd`); data e hora em `aaaa-mm-ddThh:mm`. Bases grandes podem ser gravadas em formato colunar para reduzir o tamanho. PK = chave primária; FK = chave estrangeira.

## dim_unidades (uma linha por unidade)
| Coluna | Tipo | Significado | Valores |
|---|---|---|---|
| unidade_id | texto, PK | Código da unidade | 12 códigos de 3 letras (SPO, CPQ, RJO, BHZ, CWB, POA, FLN, SSA, REC, FOR, BSB, GYN) |
| nome | texto | Nome de exibição | "CD São Paulo" etc. |
| uf | texto | UF da unidade | SP, RJ, MG, PR, RS, SC, BA, PE, CE, DF, GO |
| regional | texto | Regional | São Paulo, Sudeste, Sul, Nordeste, Centro-Oeste |

## dim_clientes (uma linha por cliente)
| Coluna | Tipo | Significado | Valores |
|---|---|---|---|
| cliente_id | texto, PK | Código do cliente | CL01 a CL15 |
| nome | texto | Nome fictício | lista de config.yaml |
| segmento | texto | Segmento | moda, eletrônicos, casa, saúde e beleza, outros |

## dim_calendario (uma linha por dia)
| Coluna | Tipo | Significado | Valores |
|---|---|---|---|
| data | data, PK | Dia | 03/08/2026 a 02/11/2026 |
| dia_semana | inteiro | 1 = segunda … 7 = domingo | 1 a 7 |
| dia_util | booleano | Segunda a sexta e não feriado | verdadeiro ou falso |
| feriado | booleano | Feriado nacional | verdadeiro ou falso |

## bi1_ctes (uma linha por CT-e com vencimento no período)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| cte_id | texto, PK | Identificador do documento de transporte | único |
| emissao | data | Data de emissão | até 15 dias antes do limite |
| unidade_origem_id | texto, FK | Unidade que emitiu | dim_unidades |
| unidade_destino_id | texto, FK | Unidade de entrega | dim_unidades |
| uf_destino | texto | UF de entrega | UF da unidade de destino |
| cliente_id | texto, FK | Cliente embarcador | dim_clientes |
| limite_cliente | data | Prazo prometido ao cliente | dentro dos 90 dias |
| chegada | data, pode ser nulo | Chegada na unidade de destino | entre emissão e realizado |
| tentativa_1 | data, pode ser nulo | Primeira tentativa de entrega | a partir da chegada |
| realizado | data, pode ser nulo | Entrega concluída | a partir da tentativa; nulo se em aberto |
| status | texto | Situação na data de referência | entregue, em rota, na unidade, em transferência, devolvido |
| ofensor_pickup | booleano | Atraso atribuído à coleta | cerca de 3% das linhas |

## bi1_emissoes_dia (dia × unidade de origem × cliente)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| data | data | Dia da emissão | 90 dias |
| unidade_origem_id | texto, FK | Unidade emissora | dim_unidades |
| cliente_id | texto, FK | Cliente | dim_clientes |
| remessas | inteiro | CT-es emitidos | 0 a 2.000 |
| volumes | inteiro | Volumes emitidos | maior ou igual a remessas |
| peso_kg | decimal | Peso total | kg, maior que 0 |

Chave: data + unidade_origem_id + cliente_id.

## bi1_entregas_courier (dia × unidade × courier)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| data | data | Dia | 90 dias |
| unidade_id | texto, FK | Unidade do courier | dim_unidades |
| courier_id | texto | Código do entregador | CR0001 em diante |
| entregas | inteiro | Entregas baixadas no dia | 0 a 150 |
| baixas_app | inteiro | Entregas baixadas pelo aplicativo | 0 a entregas |

Chave: data + courier_id.

## bi2_piso (uma linha por CT-e parado no piso na data de referência)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| cte_id | texto, PK | Identificador | único |
| unidade_atual_id | texto, FK | Unidade onde a carga está | dim_unidades |
| unidade_destino_id | texto, FK | Unidade de entrega | dim_unidades |
| cliente_id | texto, FK | Cliente | dim_clientes |
| status | texto | Situação no piso | entrada, em custódia, aguardando transferência, aguardando rota |
| data_evento | data | Data do último evento | até a data de referência |
| limite_cliente | data | Prazo prometido | de 20 dias antes a 10 dias depois da referência |
| peso_kg | decimal | Peso | kg, 0,1 a 60 |
| transferido_em | data, pode ser nulo | Data da última transferência para a unidade de destino | até a referência |
| entrou_unidade | booleano | Houve registro de entrada na unidade de destino | falso em cerca de 4% dos transferidos |

## bi3_producao_hora (dia × hora × unidade × cliente)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| data | data | Dia | 90 dias |
| hora | inteiro | Hora cheia do registro | 6 a 21 |
| unidade_id | texto, FK | Unidade | dim_unidades |
| cliente_id | texto, FK | Cliente | dim_clientes |
| volumes_in | inteiro | Volumes recebidos na hora | 0 ou mais |
| volumes_out | inteiro | Volumes expedidos na hora | 0 ou mais |

Chave: data + hora + unidade_id + cliente_id. Volumes produzidos = volumes_in.

## bi3_produtividade_operador (dia × unidade × operador)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| data | data | Dia | 90 dias |
| unidade_id | texto, FK | Unidade | dim_unidades |
| operador_id | texto | Código do operador | OP0001 em diante |
| volumes | inteiro | Volumes processados | 0 ou mais |
| horas_trabalhadas | decimal | Horas trabalhadas no dia | horas, maior que 0 e até 10 |

Chave: data + operador_id. Esta base não tem cliente; o filtro de cliente não altera K14 (ver ADR-006).

## bi3_forecast (dia × unidade × cliente)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| data | data | Dia | 90 dias |
| unidade_id | texto, FK | Unidade | dim_unidades |
| cliente_id | texto, FK | Cliente | dim_clientes |
| volumes_previstos | inteiro | Volumes previstos para o dia | maior que 0 |

## bi4_viagens (uma linha por viagem)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| viagem_id | texto, PK | Identificador da viagem | único |
| rota | texto | Origem e destino | "SPO-RJO" etc. |
| tipo_rota | texto | Tipo | transferência, coleta |
| unidade_origem_id | texto, FK | Origem | dim_unidades |
| unidade_destino_id | texto, FK | Destino | dim_unidades, diferente da origem |
| cliente_principal_id | texto, FK | Cliente com mais volume na carga | dim_clientes |
| fornecedor_id | texto | Transportador contratado | FN01 a FN08 |
| tipo_veiculo | texto | Veículo | carreta, truck, toco, van |
| motorista_id | texto | Código do motorista | MT0001 em diante |
| saida_prevista | data e hora | Horário da malha | 90 dias |
| saida_real | data e hora, pode ser nulo | Saída efetiva | nulo se não iniciada |
| termino_previsto | data e hora | Chegada prevista | depois da saída prevista |
| termino_real | data e hora, pode ser nulo | Chegada efetiva | nulo se não finalizada |
| status | texto | Situação | programada, em viagem, finalizada, cancelada |
| ocorrencia | texto, pode ser nulo | Tipo de ocorrência | quebra mecânica, trânsito, posto fiscal, atraso no carregamento, clima, sem ocorrência |

## bi4_manifestos (uma linha por manifesto de transferência)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| manifesto_id | texto, PK | Identificador | único |
| viagem_id | texto, FK | Viagem que levou o manifesto | bi4_viagens |
| data_transferencia | data | Data da transferência | 90 dias |
| unidade_origem_id | texto, FK | Origem | dim_unidades |
| unidade_destino_id | texto, FK | Destino | dim_unidades |
| cliente_id | texto, FK | Cliente da carga | dim_clientes |
| ctes_total | inteiro | CT-es do manifesto | 1 a 400 |
| ctes_transferidos | inteiro | CT-es confirmados na transferência | 0 a ctes_total |
| peso_kg | decimal | Peso total | kg, maior que 0 |

## bi5_coletas (uma linha por solicitação de coleta)
| Coluna | Tipo | Significado | Unidade / faixa |
|---|---|---|---|
| coleta_id | texto, PK | Identificador | único |
| solicitacao | data | Data da solicitação | 90 dias |
| deposito_ponto | data, pode ser nulo | Depósito no ponto de coleta | a partir da solicitação |
| retirada_motorista | data, pode ser nulo | Retirada pelo motorista | a partir do depósito |
| prazo | data | Data limite da coleta | a partir da solicitação |
| status | texto | Situação | solicitada, depositada, coletada, cancelada |
| unidade_id | texto, FK | Unidade responsável | dim_unidades |
| cliente_id | texto, FK | Cliente | dim_clientes |
| motivo_cancelamento | texto, pode ser nulo | Motivo, só para canceladas | remetente ausente, endereço não localizado, desistência do cliente, carga fora do padrão, outros |
