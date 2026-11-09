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

## Pendências
| ID | Pendência | Bloqueia a Fase 1? |
|---|---|---|
| P01 | Prazo da primeira versão e da publicação: [A DEFINIR] | Não |
| P02 | Confirmar com o empregador se a publicação de BIs inspirados nos internos é permitida: [A DEFINIR] | Não bloqueia o código; bloqueia a publicação |
| P03 | Revisão do autor das regras de borda do ADR-007 e das decisões do ADR-006 | Não |
