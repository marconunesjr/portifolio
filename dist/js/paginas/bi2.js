// BI 2 — Piso – Vencimento por Cliente: "O que está parado no piso e o que vence primeiro?" (K07 a K11)

(function (Aurora) {
'use strict';

const { cartao_kpi, legenda, tabela } = Aurora.componentes;
const { dias_corridos } = Aurora.calendario;
const { barras_horizontais, colunas, cores } = Aurora.graficos;
const { iniciar_bi } = Aurora.pagina_bi;
const F = Aurora.formato;
const K = Aurora.kpis;

// Foto do piso: o período filtra limite_cliente; a unidade é a unidade atual.
const PISO = { data: 'limite_cliente', unidade: 'unidade_atual_id', cliente: 'cliente_id' };
const CLASSES = [
  ['vencido', 'Vencido'], ['vence_hoje', 'Vence hoje'], ['a_vencer', 'A vencer'],
];
const nome_curto = (nome) => nome.replace(/^CD /, '');

/** Contagem por classe de vencimento dentro de cada grupo. */
function classes_por(piso, coluna, ref) {
  return K.por_grupo(piso, coluna, (g) => ({ ...K.k10_classificacao_vencimento(g, ref), total: g.length }));
}

function desenhar(ctx) {
  const { ref, metas } = ctx;
  const c = cores();
  const piso = ctx.filtrar('bi2_piso', PISO);
  const k07 = K.k07_piso_vencido(piso, ref);
  const k08 = K.k08_piso_total(piso);
  const k09 = K.k09_aging_piso(piso, ref, ctx.faixas.aging_piso_dias);
  const k10 = K.k10_classificacao_vencimento(piso, ref);
  const k11 = K.k11_nao_entrou(piso);
  const peso = K.soma(piso, 'peso_kg');

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K07', titulo: '% do piso vencido', principal: true, valor: k07.valor, formato: F.pct,
      meta: metas.K07_piso_vencido,
      detalhe: `${F.inteiro(k07.numerador)} de ${F.inteiro(k07.denominador)} CT-es com limite anterior a ${F.data(ref)} · foto do dia, sem comparação`,
    }),
    cartao_kpi({
      codigo: 'K08', titulo: 'Piso total', valor: k08.total, formato: F.inteiro,
      detalhe: `${F.kg(peso)} parados nas unidades`,
    }),
    cartao_kpi({
      codigo: 'K10', titulo: 'Vence hoje', valor: piso.length ? k10.vence_hoje : null, formato: F.inteiro,
      detalhe: `${F.inteiro(k10.vencido)} vencidos · ${F.inteiro(k10.a_vencer)} a vencer`,
    }),
    cartao_kpi({
      codigo: 'K11', titulo: 'Transferidos sem entrada', valor: piso.length ? k11.total : null, formato: F.inteiro,
      detalhe: 'CT-es transferidos para o destino sem registro de entrada na unidade',
    }),
  ].join('');

  const cor_classe = { vencido: c.vermelho, vence_hoje: c.amarelo, a_vencer: c.series[0] };
  const series_classes = (grupos) => CLASSES.map(([chave, rotulo]) => ({
    nome: rotulo, valores: grupos.map((g) => g[chave]), cor: cor_classe[chave],
  }));
  const leg_classes = legenda(CLASSES.map(([chave, rotulo]) => ({ rotulo, cor: cor_classe[chave] })));

  // Piso por unidade atual (empilhado por classe), maior piso primeiro.
  const por_unidade = classes_por(piso, 'unidade_atual_id', ref).sort((a, b) => b.total - a.total);
  colunas(document.getElementById('g-piso-unidade'), {
    categorias: por_unidade.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    series: series_classes(por_unidade), formato: F.inteiro, empilhado: true, horizontal: true,
    rotulos: (i) => F.inteiro(por_unidade[i].total),
  });
  document.getElementById('l-piso-unidade').innerHTML = leg_classes;

  // % vencido por unidade (K07), pior primeiro.
  const vencido_unidade = K.por_grupo(piso, 'unidade_atual_id', (g) => K.k07_piso_vencido(g, ref))
    .sort((a, b) => b.valor - a.valor);
  barras_horizontais(document.getElementById('g-vencido-unidade'), {
    categorias: vencido_unidade.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: vencido_unidade.map((g) => g.valor), formato: F.pct, meta: metas.K07_piso_vencido,
    detalhes: vencido_unidade.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} vencidos`),
  });
  document.getElementById('l-vencido-unidade').innerHTML = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 3 p.p. acima', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // Aging do piso (K09).
  colunas(document.getElementById('g-aging'), {
    categorias: k09.faixas.map((f) => `${f.faixa} dias`),
    series: [{ nome: 'CT-es no piso', valores: k09.faixas.map((f) => f.quantidade), cor: c.series[0] }],
    formato: F.inteiro, rotulos: (_, v) => F.inteiro(v),
  });

  // Piso por cliente (empilhado por classe).
  const por_cliente = classes_por(piso, 'cliente_id', ref).sort((a, b) => b.total - a.total);
  colunas(document.getElementById('g-piso-cliente'), {
    categorias: por_cliente.map((g) => ctx.nome_cliente.get(g.chave)),
    series: series_classes(por_cliente), formato: F.inteiro, empilhado: true, horizontal: true,
    rotulos: (i) => F.inteiro(por_cliente[i].total),
  });
  document.getElementById('l-piso-cliente').innerHTML = leg_classes;

  // K11 por unidade.
  const k11_unidade = Object.entries(k11.por_unidade).sort((a, b) => b[1] - a[1]);
  colunas(document.getElementById('g-sem-entrada'), {
    categorias: k11_unidade.map(([u]) => u),
    series: [{ nome: 'Sem entrada', valores: k11_unidade.map(([, n]) => n), cor: c.series[1] }],
    formato: F.inteiro, horizontal: true, rotulos: (_, v) => F.inteiro(v),
  });

  // Fila: o que vence primeiro (vencidos mais antigos no topo).
  const fila = [...piso].sort((a, b) => (a.limite_cliente < b.limite_cliente ? -1
    : a.limite_cliente > b.limite_cliente ? 1 : a.data_evento < b.data_evento ? -1 : 1)).slice(0, 12);
  const rotulo_classe = Object.fromEntries(CLASSES);
  document.getElementById('t-fila').innerHTML = tabela([
    { titulo: 'CT-e', valor: (p) => p.cte_id },
    { titulo: 'Limite', valor: (p) => F.data(p.limite_cliente) },
    { titulo: 'Situação', valor: (p) => { const k = K.classe_vencimento(p.limite_cliente, ref); return `<span class="pilula ${k}">${rotulo_classe[k]}</span>`; } },
    { titulo: 'Unidade', valor: (p) => p.unidade_atual_id },
    { titulo: 'Destino', valor: (p) => p.unidade_destino_id },
    { titulo: 'Cliente', valor: (p) => F.html(ctx.nome_cliente.get(p.cliente_id)) },
    { titulo: 'Status', valor: (p) => F.html(p.status) },
    { titulo: 'Parado há', num: true, valor: (p) => `${F.inteiro(dias_corridos(p.data_evento, ref))} d` },
    { titulo: 'Peso', num: true, valor: (p) => F.kg(p.peso_kg) },
  ], fila);
}

iniciar_bi({
  id: 'bi2',
  bases: ['bi2_piso'],
  modo: 'foto',
  dominio: (ctx) => {
    const limites = ctx.dados.bi2_piso.map((p) => p.limite_cliente).sort();
    return { inicio: limites[0], fim: limites[limites.length - 1] };
  },
  aviso: 'Foto do piso na data de referência: o filtro de período atua sobre o limite do cliente e a unidade é a unidade onde a carga está.',
  desenhar,
});
})(globalThis.Aurora = globalThis.Aurora || {});
