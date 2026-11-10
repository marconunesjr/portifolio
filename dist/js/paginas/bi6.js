// BI 6 — Contencioso e Indenizações: "Quanto estamos perdendo com processos e indenizações, e por quê?" (K24 a K30)

(function (Aurora) {
'use strict';

const { cartao_kpi, legenda, tabela } = Aurora.componentes;
const { barras_horizontais, colunas, cores } = Aurora.graficos;
const { iniciar_bi } = Aurora.pagina_bi;
const { datas_do_periodo } = Aurora.filtros;
const { dias_corridos } = Aurora.calendario;
const F = Aurora.formato;
const K = Aurora.kpis;

// O período filtra a abertura (novos, K24), o encerramento (K26, K27, K29, K30)
// ou não se aplica (estoque K25 na data de corte; provisão K28 na data de referência).
const ABERTOS = { data: 'data_abertura', unidade: 'unidade_id', cliente: 'cliente_id' };
const ENCERRADOS = { data: 'data_encerramento', unidade: 'unidade_id', cliente: 'cliente_id' };
const TODOS = { unidade: 'unidade_id', cliente: 'cliente_id' };
const EMISSOES = { data: 'data', unidade: 'unidade_origem_id', cliente: 'cliente_id' };
const TIPOS = [['avaria', 'Avaria'], ['extravio', 'Extravio'], ['atraso', 'Atraso']];
const nome_curto = (nome) => nome.replace(/^CD /, '');
const por_10mil = (v) => (v === null || v === undefined ? F.SEM_DADOS : `${F.numero(v, 1)} por 10 mil`);
const dias = (v) => (v === null || v === undefined ? F.SEM_DADOS : `${F.numero(v, 1)} dias`);

function desenhar(ctx) {
  const { metas, faixas, estado, anterior } = ctx;
  const c = cores();
  const novos = ctx.filtrar('bi6_processos', ABERTOS);
  const encerrados = ctx.filtrar('bi6_processos', ENCERRADOS);
  const todos = ctx.filtrar('bi6_processos', TODOS, null);
  const emissoes = ctx.filtrar('bi1_emissoes_dia', EMISSOES);
  const ant = anterior ? {
    novos: ctx.filtrar('bi6_processos', ABERTOS, anterior),
    encerrados: ctx.filtrar('bi6_processos', ENCERRADOS, anterior),
    emissoes: ctx.filtrar('bi1_emissoes_dia', EMISSOES, anterior),
  } : null;
  const de_ant = (calcular) => (ant ? calcular(ant) : null);

  const k24 = K.k24_litigiosidade(novos, emissoes);
  const k25 = K.k25_estoque(todos, estado.fim, faixas.idade_processo_dias);
  const k26 = K.k26_taxa_exito(encerrados);
  const k27 = K.k27_valor_pago(encerrados);
  const k28 = K.k28_provisao(todos);
  const k29 = K.k29_tempo_encerramento(encerrados);
  const k30 = K.k30_acordos(encerrados);

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K26', titulo: 'Taxa de êxito', principal: true, valor: k26.valor, formato: F.pct,
      meta: metas.K26_taxa_exito, sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k26_taxa_exito(a.encerrados).valor),
      detalhe: `${F.inteiro(k26.numerador)} ganhos em ${F.inteiro(k26.denominador)} processos decididos no período (acordos à parte)`,
    }),
    cartao_kpi({
      codigo: 'K24', titulo: 'Litigiosidade (por 10 mil remessas)', valor: k24.valor, formato: (v) => F.numero(v, 1),
      meta: metas.K24_litigiosidade, sufixo_variacao: '', anterior: de_ant((a) => K.k24_litigiosidade(a.novos, a.emissoes).valor),
      detalhe: `${F.inteiro(k24.numerador)} processos novos para ${F.inteiro(k24.denominador)} remessas emitidas`,
    }),
    cartao_kpi({
      codigo: 'K27', titulo: 'Valor pago', valor: k27.valor, formato: F.moeda_curta, sentido: 'menor', relativa: true,
      anterior: de_ant((a) => K.k27_valor_pago(a.encerrados).valor),
      detalhe: `Condenações e acordos · ${F.pct(k27.pct_pedido)} do valor pedido`,
    }),
    cartao_kpi({
      codigo: 'K25', titulo: 'Estoque de processos', valor: k25.total, formato: F.inteiro, sentido: 'menor', relativa: true,
      anterior: anterior ? K.k25_estoque(todos, anterior.fim, faixas.idade_processo_dias).total : null,
      detalhe: `Em andamento em ${F.data(estado.fim)} · ${F.moeda_curta(k25.valor_pedido)} pedidos`,
    }),
    cartao_kpi({
      codigo: 'K28', titulo: 'Provisão (risco provável)', valor: k28.valor, formato: F.moeda_curta,
      detalhe: `${F.inteiro(k28.quantidade)} processos · foto na data de referência`,
    }),
    cartao_kpi({
      codigo: 'K29', titulo: 'Tempo até o encerramento', valor: k29.valor, formato: dias, sentido: 'menor',
      sufixo_variacao: 'dias', anterior: de_ant((a) => K.k29_tempo_encerramento(a.encerrados).valor),
      detalhe: `Média de ${F.inteiro(k29.quantidade)} processos encerrados`,
    }),
    cartao_kpi({
      codigo: 'K30', titulo: '% de acordos', valor: k30.valor, formato: F.pct, sentido: 'neutro',
      sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k30_acordos(a.encerrados).valor),
      detalhe: `${F.inteiro(k30.numerador)} de ${F.inteiro(k30.denominador)} encerrados`,
    }),
  ].join('');

  // Processos novos por dia de abertura, empilhados por tipo.
  const cor_tipo = { avaria: c.series[0], extravio: c.series[1], atraso: c.series[2] };
  const datas = datas_do_periodo(estado);
  const por_dia = K.agrupar(novos, 'data_abertura');
  colunas(document.getElementById('g-novos'), {
    categorias: datas.map(F.data_curta),
    series: TIPOS.map(([tipo, rotulo]) => ({
      nome: rotulo, cor: cor_tipo[tipo],
      valores: datas.map((d) => (por_dia.get(d) || []).filter((p) => p.tipo === tipo).length),
    })),
    formato: F.inteiro, empilhado: true,
  });
  document.getElementById('l-novos').innerHTML = legenda(TIPOS.map(([tipo, rotulo]) => ({ rotulo, cor: cor_tipo[tipo] })));

  // Valor pago por tipo.
  const pago_tipo = TIPOS.map(([tipo, rotulo]) => ({ rotulo, valor: K.soma(encerrados.filter((p) => p.tipo === tipo), 'valor_pago') }))
    .sort((a, b) => b.valor - a.valor);
  colunas(document.getElementById('g-pago-tipo'), {
    categorias: pago_tipo.map((t) => t.rotulo),
    series: [{ nome: 'Valor pago', valores: pago_tipo.map((t) => t.valor), cor: c.series[1] }],
    formato: F.moeda_curta, horizontal: true, margem_direita: 84, rotulos: (_, v) => F.moeda_curta(v),
  });

  // Taxa de êxito por unidade (pior primeiro).
  const exito = K.por_grupo(encerrados, 'unidade_id', (g) => K.k26_taxa_exito(g))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-exito-unidade'), {
    categorias: exito.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: exito.map((g) => g.valor), formato: F.pct, meta: metas.K26_taxa_exito, minimo: 50, maximo: 100,
    detalhes: exito.map((g) => `${F.inteiro(g.numerador)} ganhos em ${F.inteiro(g.denominador)} decididos`),
  });
  document.getElementById('l-exito-unidade').innerHTML = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 3 p.p. abaixo', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // Litigiosidade por unidade (maior primeiro).
  const emissoes_unidade = K.agrupar(emissoes, 'unidade_origem_id');
  const litig = K.por_grupo(novos, 'unidade_id', (g) => K.k24_litigiosidade(g, emissoes_unidade.get(g[0].unidade_id) || []))
    .filter((g) => g.valor !== null).sort((a, b) => b.valor - a.valor);
  barras_horizontais(document.getElementById('g-litig-unidade'), {
    categorias: litig.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: litig.map((g) => g.valor), formato: (v) => F.numero(v, 1), meta: metas.K24_litigiosidade,
    detalhes: litig.map((g) => `${F.inteiro(g.numerador)} processos para ${F.inteiro(g.denominador)} remessas`),
  });
  document.getElementById('t-litig').textContent = `Pior unidade primeiro. Média do recorte: ${por_10mil(k24.valor)}; meta ≤ ${F.numero(metas.K24_litigiosidade.meta, 1)}.`;
  document.getElementById('l-litig-unidade').innerHTML = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 2,0 acima', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // Estoque por idade (K25).
  colunas(document.getElementById('g-estoque'), {
    categorias: k25.faixas.map((f) => `${f.faixa} dias`),
    series: [{ nome: 'Processos em andamento', valores: k25.faixas.map((f) => f.quantidade), cor: c.series[6] }],
    formato: F.inteiro, rotulos: (_, v) => F.inteiro(v),
  });

  // Maiores processos em andamento na data de corte.
  const maiores = todos.filter((p) => K.em_andamento_em(p, estado.fim))
    .sort((a, b) => b.valor_pedido - a.valor_pedido).slice(0, 10);
  document.getElementById('t-maiores').innerHTML = tabela([
    { titulo: 'Processo', valor: (p) => p.processo_id },
    { titulo: 'Aberto em', valor: (p) => F.data(p.data_abertura) },
    { titulo: 'Idade', num: true, valor: (p) => `${F.inteiro(dias_corridos(p.data_abertura, estado.fim))} d` },
    { titulo: 'Tipo', valor: (p) => F.html(p.tipo) },
    { titulo: 'Unidade', valor: (p) => p.unidade_id },
    { titulo: 'Cliente', valor: (p) => F.html(ctx.nome_cliente.get(p.cliente_id)) },
    { titulo: 'Risco', valor: (p) => F.html(p.risco) },
    { titulo: 'Pedido', num: true, valor: (p) => F.moeda(p.valor_pedido) },
  ], maiores);
}

iniciar_bi({
  id: 'bi6',
  bases: ['bi6_processos', 'bi1_emissoes_dia'],
  aviso: 'O período filtra a abertura (processos novos) ou o encerramento (êxito, valor pago, tempo e acordos). '
    + 'O estoque é contado no último dia do período; a provisão é uma foto na data de referência. Unidade = unidade responsável pelo processo.',
  desenhar,
});
})(globalThis.Aurora = globalThis.Aurora || {});
