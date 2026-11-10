// BI 3 — Produção do Dia: "A unidade está produzindo o previsto, hora a hora?" (K12 a K14)

(function (Aurora) {
'use strict';

const { cartao_kpi, legenda, tabela } = Aurora.componentes;
const { barras_horizontais, colunas, cores, linha_diaria, mapa_calor } = Aurora.graficos;
const { iniciar_bi } = Aurora.pagina_bi;
const F = Aurora.formato;
const K = Aurora.kpis;

const PRODUCAO = { data: 'data', unidade: 'unidade_id', cliente: 'cliente_id' };
const FORECAST = { data: 'data', unidade: 'unidade_id', cliente: 'cliente_id' };
const OPERADORES = { data: 'data', unidade: 'unidade_id' }; // sem cliente na base (ADR-006)
const nome_curto = (nome) => nome.replace(/^CD /, '');
const vol_hora = (v) => (v === null || v === undefined ? F.SEM_DADOS : `${F.numero(v, 1)} vol/h`);

function desenhar(ctx) {
  const { metas, anterior } = ctx;
  const c = cores();
  const producao = ctx.filtrar('bi3_producao_hora', PRODUCAO);
  const forecast = ctx.filtrar('bi3_forecast', FORECAST);
  const operadores = ctx.filtrar('bi3_produtividade_operador', OPERADORES);
  const ant = anterior ? {
    producao: ctx.filtrar('bi3_producao_hora', PRODUCAO, anterior),
    forecast: ctx.filtrar('bi3_forecast', FORECAST, anterior),
    operadores: ctx.filtrar('bi3_produtividade_operador', OPERADORES, anterior),
  } : null;
  const de_ant = (calcular) => (ant ? calcular(ant) : null);

  const k12 = K.k12_aderencia_forecast(producao, forecast);
  const k13 = K.k13_in_out_hora(producao);
  const k14 = K.k14_produtividade_operador(operadores);
  const sem_producao = !producao.length;

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K12', titulo: 'Aderência ao forecast', principal: true, valor: k12.valor, formato: F.pct,
      meta: metas.K12_aderencia_forecast, sufixo_variacao: 'p.p.',
      anterior: de_ant((a) => K.k12_aderencia_forecast(a.producao, a.forecast).valor),
      detalhe: `${F.inteiro(k12.realizado)} volumes recebidos para ${F.inteiro(k12.previsto)} previstos (acima de 100% é produção acima do previsto)`,
    }),
    cartao_kpi({
      codigo: 'K13', titulo: 'Volumes recebidos (IN)', valor: sem_producao ? null : k13.total_in, formato: F.inteiro,
      sentido: 'neutro', relativa: true, anterior: de_ant((a) => (a.producao.length ? K.k13_in_out_hora(a.producao).total_in : null)),
      detalhe: `Média de ${F.inteiro(k13.media_dia_in)} por dia`,
    }),
    cartao_kpi({
      codigo: 'K13', titulo: 'Volumes expedidos (OUT)', valor: sem_producao ? null : k13.total_out, formato: F.inteiro,
      sentido: 'neutro', relativa: true, anterior: de_ant((a) => (a.producao.length ? K.k13_in_out_hora(a.producao).total_out : null)),
      detalhe: 'Soma de volumes_out no período',
    }),
    cartao_kpi({
      codigo: 'K14', titulo: 'Produtividade média', valor: k14.valor, formato: vol_hora, sentido: 'maior',
      sufixo_variacao: 'vol/h', anterior: de_ant((a) => K.k14_produtividade_operador(a.operadores).valor),
      detalhe: `${F.inteiro(k14.volumes)} volumes em ${F.numero(k14.horas, 1)} horas trabalhadas`,
    }),
  ].join('');

  // Aderência por dia, com a meta.
  const fc_dia = K.agrupar(forecast, 'data');
  const diario = K.por_grupo(producao, 'data', (g) => ({ valor: K.k12_aderencia_forecast(g, fc_dia.get(g[0].data) || []).valor }));
  linha_diaria(document.getElementById('g-aderencia-diaria'), {
    datas: diario.map((d) => d.chave), valores: diario.map((d) => d.valor), nome: 'Aderência',
    formato: F.pct, meta: metas.K12_aderencia_forecast,
  });

  // IN e OUT médios por hora.
  const dias = new Set(producao.map((p) => p.data)).size || 1;
  colunas(document.getElementById('g-in-out'), {
    categorias: k13.por_hora.map((h) => `${h.hora}h`),
    series: [
      { nome: 'IN (recebidos)', valores: k13.por_hora.map((h) => Math.round(h.volumes_in / dias)), cor: c.series[0] },
      { nome: 'OUT (expedidos)', valores: k13.por_hora.map((h) => Math.round(h.volumes_out / dias)), cor: c.series[1] },
    ],
    formato: F.inteiro,
  });
  document.getElementById('l-in-out').innerHTML = legenda([
    { rotulo: 'IN (recebidos)', cor: c.series[0] }, { rotulo: 'OUT (expedidos)', cor: c.series[1] },
  ]);

  // Mapa de calor hora × dia (IN).
  const datas = [...new Set(k13.matriz.map((m) => m.data))];
  const horas = [...new Set(k13.matriz.map((m) => m.hora))].sort((a, b) => a - b);
  const idx_data = new Map(datas.map((d, i) => [d, i]));
  const idx_hora = new Map(horas.map((h, i) => [h, i]));
  mapa_calor(document.getElementById('g-mapa'), {
    dias: datas, horas,
    celulas: k13.matriz.map((m) => [idx_data.get(m.data), idx_hora.get(m.hora), m.volumes_in]),
    formato: F.inteiro,
  });

  // Aderência por unidade.
  const fc_unidade = K.agrupar(forecast, 'unidade_id');
  const por_unidade = K.por_grupo(producao, 'unidade_id', (g) => K.k12_aderencia_forecast(g, fc_unidade.get(g[0].unidade_id) || []))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-aderencia-unidade'), {
    categorias: por_unidade.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: por_unidade.map((g) => g.valor), formato: F.pct, meta: metas.K12_aderencia_forecast,
    minimo: 70, detalhes: por_unidade.map((g) => `${F.inteiro(g.realizado)} de ${F.inteiro(g.previsto)} previstos`),
  });
  document.getElementById('l-aderencia-unidade').innerHTML = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 5 p.p. abaixo', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // Produtividade: operadores abaixo da média da unidade.
  const media_unidade = new Map(k14.por_unidade.map((u) => [u.unidade_id, u.valor]));
  const menores = k14.por_operador.filter((o) => o.valor !== null)
    .map((o) => ({ ...o, media: media_unidade.get(o.unidade_id) }))
    .sort((a, b) => a.valor / a.media - b.valor / b.media).slice(0, 10);
  document.getElementById('t-operadores').innerHTML = tabela([
    { titulo: 'Operador', valor: (o) => o.operador_id },
    { titulo: 'Unidade', valor: (o) => o.unidade_id },
    { titulo: 'Horas', num: true, valor: (o) => F.numero(o.horas, 1) },
    { titulo: 'Vol/h', num: true, valor: (o) => F.numero(o.valor, 1) },
    { titulo: 'Média unid.', num: true, valor: (o) => F.numero(o.media, 1) },
  ], menores);
}

iniciar_bi({
  id: 'bi3',
  bases: ['bi3_producao_hora', 'bi3_forecast', 'bi3_produtividade_operador'],
  aviso: 'O filtro de cliente não altera a produtividade por operador (K14), porque essa base não tem cliente (ADR-006).',
  desenhar,
});
})(globalThis.Aurora = globalThis.Aurora || {});
