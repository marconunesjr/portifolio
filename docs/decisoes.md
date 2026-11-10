# Decisões e pendências

## Decisões (ADR)

### ADR-001 — Dados 100% sintéticos e versionados
- **Contexto:** os BIs de referência usam dados corporativos, que não podem ser publicados.
- **Decisão:** gerar todas as bases por script, com semente fixa, e versionar os JSON.
- **Alternativas:** anonimizar dados reais (risco de reidentificação e de uso indevido); gerar dados no navegador (difícil de testar).
- **Consequências:** o site é reprodutível e publicável; os números não refletem nenhuma operação real.

### ADR-002 — Anonimização total
- **Contexto:** o repositório será público.
- **Decisão:** empresa, clientes, unidades, pessoas, tabelas e consultas de origem não aparecem em nenhum arquivo versionado. A lista de termos proibidos fica em `referencias/`, fora do Git, assim como `_prompts/`.
- **Alternativas:** manter nomes de clientes conhecidos para dar realismo (descartado).
- **Consequências:** a checagem de anonimização passa a ser critério de pronto de toda fase.

### ADR-003 — Site estático sem framework, publicado no GitHub Pages
- **Contexto:** o portfólio precisa de um link público, sem custo e sem servidor.
- **Decisão:** HTML, CSS e JavaScript puros, com ECharts; publicação de `dist/` por GitHub Actions.
- **Alternativas:** framework de front-end com build (mais complexidade sem ganho para 6 páginas); ferramenta de BI publicada (exige licença ou conta).
- **Consequências:** nenhuma dependência de build; o código das páginas fica legível para quem avaliar o portfólio.

### ADR-004 — KPIs calculados no navegador por um único módulo
- **Contexto:** os filtros precisam recalcular os KPIs.
- **Decisão:** todas as fórmulas ficam em `src/js/kpis.js`, como funções puras; as páginas só chamam o módulo. O gerador não grava KPI pronto.
- **Alternativas:** pré-calcular todas as combinações de filtro (explosão de arquivos); repetir fórmulas em cada página (risco de divergência).
- **Consequências:** um teste por KPI garante a fórmula; as bases precisam ser leves o bastante para o navegador.

### ADR-005 — Metas fictícias arbitradas
- **Contexto:** não há metas reais a divulgar.
- **Decisão:** usar OTD ≥ 95%, piso vencido ≤ 5%, aderência ao forecast ≥ 95%, SLA de trânsito ≥ 92%, SLA de expedição ≥ 95%, transferido ≥ 98% e SLA de coleta ≥ 90%, todas em `config/config.yaml`.
- **Alternativas:** não mostrar metas (perde o semáforo e a leitura gerencial).
- **Consequências:** as metas podem ser trocadas sem mexer no código.

### ADR-006 — Filtro de cliente nas bases sem cliente natural
- **Contexto:** os 4 filtros valem para todos os BIs, mas produção por hora e viagens não têm cliente na origem.
- **Decisão:** a produção por hora e o forecast são gerados por cliente; as viagens recebem `cliente_principal_id` e os manifestos, `cliente_id`. A produtividade por operador (K14) não tem cliente e não reage a esse filtro; a página informa isso.
- **Alternativas:** desabilitar o filtro de cliente nesses BIs.
- **Consequências:** `bi3_producao_hora` fica maior e pode precisar de agregação (ver docs/03).

### ADR-007 — Regras de borda dos KPIs propostas na documentação
- **Contexto:** o autor confirmou as fórmulas principais; algumas regras de borda não foram discutidas.
- **Decisão:** adotar, até revisão: (a) K01 conta como fora do prazo o CT-e em aberto com limite até a data de referência e o devolvido; (b) K04 usa como denominador os CT-es com vencimento no período; (c) K15 compara a duração realizada com a prevista, e K16 mede só a pontualidade da saída; (d) K20 exclui canceladas do denominador e conta como fora do prazo a coleta em aberto com prazo vencido; (e) faixas de aging de `config.yaml`.
- **Alternativas:** medir K15 pelo horário de chegada, o que misturaria atraso de saída com atraso de trânsito.
- **Consequências:** se o autor alterar alguma regra, mudam docs/07 e os testes do KPI correspondente.

### ADR-008 — Sem turnos e sem cut-off
- **Contexto:** os BIs de referência leem a produção por hora.
- **Decisão:** não modelar turnos nem cut-off; a produção é lida por hora cheia, das 6h às 21h.
- **Alternativas:** criar turnos fictícios.
- **Consequências:** nenhuma regra de virada de dia operacional é necessária.

### ADR-009 — Formato dos JSON e parâmetros exportados (Fase 1)
- **Contexto:** a produção por hora tem 120 mil linhas e o limite é de 5 MB por arquivo (RNF03).
- **Decisão:** gravar todas as bases em JSON colunar; colunas de texto e data com poucos valores distintos viram domínio + índices (`etl/dados_io.py` grava, `src/js/dados.js` lê). O gerador exporta `src/dados/config_site.json` com datas, calendário, metas, faixas e regionais. Os parâmetros do cenário sintético (ofensores, porte das unidades, sazonalidade, clientes por unidade, segmentos) ficam numa nova seção `cenario` e em `segmentos_clientes` de `config.yaml`.
- **Alternativas:** um JSON de objetos por linha (cerca de 3 vezes maior); agregar a produção dos dias antigos (perderia o detalhe hora × dia nos 90 dias).
- **Consequências:** 5,7 MB no total, maior arquivo com 1,7 MB; nenhuma agregação foi necessária em `bi3_producao_hora`.

### ADR-010 — Horário de produção por tipo de dia
- **Contexto:** docs/03 prevê cerca de 120 mil linhas em `bi3_producao_hora` e docs/07 lê a produção das 6h às 21h.
- **Decisão:** cada unidade atende 8 clientes (`cenario.clientes_por_unidade`); a produção existe das 6h às 21h em dia útil, das 6h às 15h no sábado e das 8h às 15h em domingo e feriado. Fora desses horários não há linha.
- **Consequências:** exatamente 120.000 linhas e 8.640 linhas de forecast; o mapa de calor mostra a operação menor no fim de semana.

### ADR-011 — Colunas de filtro nas bases do BI 1 e K06 sem cliente
- **Contexto:** docs/07 não diz qual unidade dos CT-es o filtro usa, e `bi1_entregas_courier` não tem cliente.
- **Decisão:** nos CT-es, unidade e UF/regional usam a unidade de destino (quem entrega); nas emissões, a unidade de origem; nas entregas por courier, a unidade do courier. O filtro de cliente não altera o K06, e a página informa isso (mesma solução do ADR-006 para o K14).
- **Alternativas:** filtrar CT-es pela origem (misturaria o desvio de quem emite com o de quem entrega).
- **Consequências:** "onde está o desvio" aponta a unidade de entrega.

### ADR-012 — Complementos às regras de borda do ADR-007
- **Contexto:** dois casos não estão escritos em docs/07.
- **Decisão:** (a) no K01, K03 e K04, CT-e em aberto com `limite_cliente` depois da data de referência ainda não venceu e fica fora do denominador, por analogia com a regra do K20 (nos dados atuais não há esse caso, pois todo limite está dentro dos 90 dias); (b) no K03, atraso de 0 dia útil (por exemplo, vencido na sexta e em aberto na referência, que é um sábado) entra na primeira faixa ("1"). As fórmulas e metas de docs/07 não foram alteradas.
- **Consequências:** os dois casos têm teste em `tests/kpis.test.js`. Entram na revisão da pendência P03.

### ADR-013 — Recálculo em Python só para validar os dados
- **Contexto:** docs/08 pede que o gerador falhe se L14 ou P01–P06 não passarem, o que exige calcular percentuais no Python; o ADR-004 pede uma única implementação de cada KPI.
- **Decisão:** a implementação oficial continua sendo `src/js/kpis.js`. `etl/qualidade.py` recalcula apenas os percentuais gerais e por grupo usados nas checagens, e `tests/test_consistencia_kpis.py` compara esses números com os de `kpis.js` rodando no Node.
- **Consequências:** se uma fórmula mudar em `kpis.js` sem mudar a checagem, o teste de consistência falha.

### ADR-014 — Visual: Pareto sem segundo eixo e cores de status reservadas
- **Contexto:** o Pareto clássico usa um segundo eixo para o % acumulado; gráficos com dois eixos de valor confundem a leitura.
- **Decisão:** o Pareto de ocorrências (K18) mostra as barras ordenadas e o % acumulado no rótulo de cada barra. Verde, amarelo e vermelho só aparecem como semáforo (sempre com ícone e texto) ou na classificação de vencimento; vermelho sempre significa fora da meta. As séries usam uma paleta categórica testada para daltonismo, em versões próprias para o tema claro e o escuro.
- **Consequências:** nenhum gráfico tem dois eixos de valor.

### ADR-015 — Ferramentas e servidor local
- **Contexto:** o ECharts precisa de versão fixada; no Windows, `python -m http.server` pode entregar `.js` como `text/plain`, e o navegador recusa módulos JavaScript assim. O site também precisa funcionar dentro de uma subpasta.
- **Decisão:** ECharts 5.6.0 com versão fixada (inicialmente copiado para `src/assets/vendor/`; depois carregado por CDN, ver ADR-016). `scripts/servidor.py` serve uma pasta com tipos MIME corretos sob `/portifolio/`, como no GitHub Pages; o teste de fumaça usa o mesmo servidor. `dist/` é versionada e o workflow confere que ela é cópia fiel de `src/` antes de publicar. `node --test` exige Node 20 ou mais novo.
- **Consequências:** `python scripts/servidor.py` substitui `python -m http.server` nas instruções.

### ADR-016 — ECharts carregado por CDN com versão fixada
- **Contexto:** a busca de termos proibidos ignora maiúsculas e minúsculas e procura trechos de palavra. Um dos termos curtos aparece dentro do nome em inglês do componente "linha do tempo", que faz parte do núcleo de qualquer build do ECharts 5.6.0 (completa ou "common"). Com a biblioteca copiada em `src/assets/vendor/`, a checagem de docs/08 encontrava esse falso positivo em `src/` e `dist/`.
- **Decisão (autor, 09/11/2026):** remover a cópia local e carregar o ECharts de `https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js`, com versão fixada e verificação de integridade (atributo `integrity` SHA-384, igual ao do arquivo antes versionado). Isso substitui, para o ECharts, a regra do CLAUDE.md de copiar a biblioteca para `src/assets/vendor/`.
- **Alternativas:** manter a cópia local e excluir `vendor/` da checagem (descartada pelo autor); alterar o arquivo minificado da biblioteca (frágil).
- **Consequências:** 0 ocorrências de termos proibidos em todos os arquivos versionados, sem exceção. As páginas de BI e o teste de fumaça precisam de acesso à internet para carregar os gráficos; se o CDN estiver fora do ar, os gráficos não aparecem. A integridade impede que uma versão alterada seja executada.

## Pendências
| ID | Pendência | Bloqueia a Fase 1? |
|---|---|---|
| P01 | Prazo da primeira versão e da publicação: [A DEFINIR] | Não |
| P02 | Confirmar com o empregador se a publicação de BIs inspirados nos internos é permitida: [A DEFINIR] | Não bloqueia o código; bloqueia a publicação |
| P03 | Revisão do autor das regras de borda do ADR-007 e das decisões do ADR-006, ADR-011 e ADR-012 | Não |
| P04 | Conferir manualmente que os nomes fictícios de clientes de `config/config.yaml` não coincidem com marcas conhecidas (docs/08). Busca na web feita em 09/11/2026 (resultado abaixo); falta a decisão do autor sobre CL04 e CL06 | Não bloqueia o código; bloqueia a publicação |
| P05 | ~~Falso positivo de anonimização no ECharts local~~ — resolvida em 09/11/2026: ECharts por CDN (ADR-016) | Não |

### Resultado da busca da P04 (09/11/2026)
Busca na web por cada nome entre aspas. Nenhum dos 15 nomes aparece como empresa com o nome exato. As marcas reais semelhantes não são citadas aqui, para não entrarem no repositório.

| Cliente | Achado | Risco |
|---|---|---|
| CL04 Eletro Âmbar | Parte do nome coincide com uma grande empresa real do setor de energia, citada em notícias junto com uma estatal de eletricidade | Alto: é ofensor de OTD nos dados (ADR-007 e `cenario`). Recomenda-se trocar |
| CL06 Moda Girassol | Existe uma marca real de roupas com a palavra do nome, do mesmo segmento (moda) | Médio: também é ofensor de OTD. Recomenda-se trocar |
| CL03 Loja Tucano | Existe uma marca real de bolsas e acessórios com a palavra principal do nome | Baixo |
| CL05 Botica Serena | "Botica" também é nome de linha de uma marca real de cosméticos | Baixo |
| Demais 11 | Só coincidências genéricas (palavras comuns, lugares, produtos) | Baixo |

Trocar um nome muda apenas `config/config.yaml` e `dim_clientes`; os códigos CL01 a CL15, o cenário e os demais dados continuam iguais.

