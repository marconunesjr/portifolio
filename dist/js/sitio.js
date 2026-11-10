/** Mapa do site: os 6 BIs, na ordem de navegação. */

(function (Aurora) {
'use strict';

const PAGINAS = [
  {
    id: 'bi1', arquivo: 'bi1_indicadores_operacionais.html', titulo: 'Indicadores Operacionais',
    curto: 'Indicadores', pergunta: 'Estamos entregando no prazo e onde está o desvio?',
    kpis: 'K01 a K06 · OTD, lead time, aging de atraso, pickup, emissões, baixas via app',
  },
  {
    id: 'bi2', arquivo: 'bi2_piso_vencimento.html', titulo: 'Piso – Vencimento por Cliente',
    curto: 'Piso', pergunta: 'O que está parado no piso e o que vence primeiro?',
    kpis: 'K07 a K11 · piso vencido, piso total, aging, classificação, sem entrada',
  },
  {
    id: 'bi3', arquivo: 'bi3_producao_do_dia.html', titulo: 'Produção do Dia',
    curto: 'Produção', pergunta: 'A unidade está produzindo o previsto, hora a hora?',
    kpis: 'K12 a K14 · aderência ao forecast, IN e OUT por hora, produtividade',
  },
  {
    id: 'bi4', arquivo: 'bi4_transporte_transferencias.html', titulo: 'Transporte e Transferências',
    curto: 'Transporte', pergunta: 'As viagens saem e chegam no horário?',
    kpis: 'K15 a K19 · SLA de trânsito e de expedição, atraso, ocorrências, transferido',
  },
  {
    id: 'bi5', arquivo: 'bi5_sla_coletas.html', titulo: 'SLA de Coletas',
    curto: 'Coletas', pergunta: 'Estamos coletando dentro do prazo?',
    kpis: 'K20 a K23 · SLA de coleta, aging, cancelamento, status por unidade',
  },
  {
    id: 'bi6', arquivo: 'bi6_contencioso.html', titulo: 'Contencioso e Indenizações',
    curto: 'Contencioso', pergunta: 'Quanto estamos perdendo com processos e indenizações, e por quê?',
    kpis: 'K24 a K30 · litigiosidade, estoque, taxa de êxito, valor pago, provisão, tempo, acordos',
  },
];

Aurora.sitio = { PAGINAS };
})(globalThis.Aurora = globalThis.Aurora || {});
