# 08 — Qualidade e validação

## Perfil dos dados
Não há amostra a perfilar: as bases são sintéticas. O contrato esperado está em `docs/06_dicionario_de_dados.md`. O gerador registra, a cada execução, as linhas geradas por base e o resultado das checagens abaixo.

## Checagens gerais
| ID | Checagem | Limite |
|---|---|---|
| Q01 | Colunas e tipos iguais ao dicionário | 0 divergências |
| Q02 | Nulos em colunas obrigatórias | 0 |
| Q03 | Duplicidade na chave de cada base | 0 |
| Q04 | Chaves estrangeiras sem correspondência nas dimensões | 0 |
| Q05 | Datas fora da janela de cada base | 0 |
| Q06 | Categorias fora da lista do dicionário | 0 |
| Q07 | Volume de linhas por base | dentro de ±10% do previsto em docs/03 |
| Q08 | Reprodutibilidade | duas execuções com a mesma semente geram arquivos idênticos |
| Q09 | Peso dos arquivos | soma até 15 MB; nenhum acima de 5 MB |

## Checagens logísticas
| ID | Checagem | Limite |
|---|---|---|
| L01 | Eventos de entrega fora de ordem (emissao, chegada, tentativa_1, realizado) | 0 |
| L02 | Lead time negativo ou acima de 30 dias úteis | 0 |
| L03 | CT-e com status entregue sem realizado, ou com realizado e status diferente de entregue | 0 |
| L04 | baixas_app maior que entregas | 0 |
| L05 | Piso: data_evento ou transferido_em depois da data de referência | 0 |
| L06 | Produção: volumes negativos; horas_trabalhadas igual a 0 ou acima de 10 | 0 |
| L07 | Produtividade acima de 600 volumes por hora | 0 |
| L08 | Viagem: termino_real antes de saida_real; duração acima de 96 horas | 0 |
| L09 | Viagem finalizada sem termino_real, ou não finalizada com termino_real | 0 |
| L10 | Viagem com origem igual ao destino | 0 |
| L11 | Manifesto com ctes_transferidos maior que ctes_total | 0 |
| L12 | Coleta: retirada antes do depósito, ou depósito antes da solicitação | 0 |
| L13 | Coleta cancelada sem motivo, ou não cancelada com motivo | 0 |
| L14 | Percentuais calculados acima de 100% (exceto K12) | 0 |

## Checagens de plausibilidade
Garantem que os dados contam uma história e não parecem aleatórios.

| ID | Checagem | Limite |
|---|---|---|
| P01 | OTD geral (K01) | entre 88% e 97% |
| P02 | Unidades com OTD abaixo de 90% | pelo menos 2 |
| P03 | Volume médio de sábado e domingo | abaixo de 60% do volume médio de dia útil |
| P04 | Aderência ao forecast (K12) geral | entre 85% e 110% |
| P05 | Fornecedor com SLA de trânsito pelo menos 10 pontos abaixo da média | pelo menos 1 |
| P06 | SLA de coleta (K20) geral | entre 80% e 95% |

## Reconciliação
Não se aplica: não existe número oficial de referência. No lugar, cada KPI tem um teste com resultado conhecido em `tests/dados_referencia/`.

## Checagem de anonimização
- A lista de termos proibidos fica em `referencias/termos_proibidos.txt`, uma expressão por linha. O arquivo não é versionado e este documento não reproduz os termos, para que eles não entrem no repositório público.
- A busca ignora maiúsculas e minúsculas e cobre `src/`, `dist/`, `etl/`, `tests/`, `docs/`, `config/`, `README.md`, `CLAUDE.md` e `CHANGELOG.md`.
- Limite: 0 ocorrências.
- Pessoas aparecem só por código (OP, CR, MT). Não há nome, documento, telefone ou endereço em nenhuma base.
- Antes de publicar, conferir manualmente que os nomes fictícios de clientes em `config/config.yaml` não coincidem com marcas conhecidas.

## Resultados
| Data | Etapa | Resultado |
|---|---|---|
| 09/11/2026 | Etapa 1 (documentação) | Busca de marcadores pendentes e de termos proibidos na documentação: 0 ocorrências |

Os resultados das checagens Q, L e P serão registrados aqui ao final da Fase 1.
