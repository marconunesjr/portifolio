// BI 4 — Transporte e Transferências: "As viagens saem e chegam no horário?" (K15 a K19)
import { cartao_kpi, legenda, tabela } from '../componentes.js';
import * as F from '../formato.js';
import { barras_horizontais, cores, linha_diaria, colunas } from '../graficos.js';
import * as K from '../kpis.js';
import { iniciar_bi } from '../pagina_bi.js';

// Período pela data da saída prevista (K19: data da transferência); unidade de origem;
// cliente principal nas viagens e cliente do manifesto.
const VIAGENS = { data: 'saida_prevista', unidade: 'unidade_origem_id', cliente: 'cliente_principal_id' };
const MANIFESTOS = { data: 'data_transferencia', unidade: 'unidade_origem_id', cliente: 'cliente_id' };
const nome_curto = (nome) => nome.replace(/^CD /, '');

function desenhar(ctx) {
  const { metas, anterior } = ctx;
  const c = cores();
  const viagens = ctx.filtrar('bi4_viagens', VIAGENS);
  const manifestos = ctx.filtrar('bi4_manifestos', MANIFESTOS);
  const ant = anterior ? {
    viagens: ctx.filtrar('bi4_viagens', VIAGENS, anterior),
    manifestos: ctx.filtrar('bi4_manifestos', MANIFESTOS, anterior),
  } : null;
  const de_ant = (calcular) => (ant ? calcular(ant) : null);

  const k15 = K.k15_sla_transito(viagens);
  const k16 = K.k16_sla_expedicao(viagens);
  const k17 = K.k17_tempo_atraso(viagens);
  const k18 = K.k18_ocorrencias(viagens);
  const k19 = K.k19_transferido(manifestos);

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K15', titulo: 'SLA de trânsito', principal: true, valor: k15.valor, formato: F.pct,
      meta: metas.K15_sla_transito, sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k15_sla_transito(a.viagens).valor),
      detalhe: `${F.inteiro(k15.numerador)} de ${F.inteiro(k15.denominador)} viagens finalizadas dentro da duração prevista`,
    }),
    cartao_kpi({
      codigo: 'K16', titulo: 'SLA de expedição', valor: k16.valor, formato: F.pct, meta: metas.K16_sla_expedicao,
      sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k16_sla_expedicao(a.viagens).valor),
      detalhe: `${F.inteiro(k16.numerador)} de ${F.inteiro(k16.denominador)} saídas no horário`,
    }),
    cartao_kpi({
      codigo: 'K19', titulo: '% transferido', valor: k19.valor, formato: F.pct, meta: metas.K19_pct_transferido,
      sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k19_transferido(a.manifestos).valor),
      detalhe: `${F.inteiro(k19.numerador)} de ${F.inteiro(k19.denominador)} CT-es dos manifestos`,
    }),
    cartao_kpi({
      codigo: 'K17', titulo: 'Atraso médio na chegada', valor: k17.valor, formato: F.horas, sentido: 'menor',
      sufixo_variacao: 'h', anterior: de_ant((a) => K.k17_tempo_atraso(a.viagens).valor),
      detalhe: `${F.inteiro(k17.quantidade)} viagens chegaram depois do previsto`,
    }),
  ].join('');

  const leg_meta = (tolerancia) => legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: `Até ${F.numero(tolerancia, 0)} p.p. abaixo`, cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // SLA de trânsito por dia da saída prevista.
  const diario = K.por_grupo(viagens, (v) => v.saida_prevista.slice(0, 10), (g) => K.k15_sla_transito(g));
  linha_diaria(document.getElementById('g-transito-diario'), {
    datas: diario.map((d) => d.chave), valores: diario.map((d) => d.valor), nome: 'SLA de trânsito',
    formato: F.pct, meta: metas.K15_sla_transito, maximo: 100,
  });

  // Pareto de ocorrências (K18): contagem e % acumulado no rótulo (sem segundo eixo).
  colunas(document.getElementById('g-pareto'), {
    categorias: k18.pareto.map((p) => p.ocorrencia),
    series: [{ nome: 'Viagens', valores: k18.pareto.map((p) => p.viagens), cor: c.series[1] }],
    formato: F.inteiro, horizontal: true, margem_direita: 112,
    rotulos: (i, v) => `${F.inteiro(v)} · acum. ${F.pct(k18.pareto[i].pct_acumulado, 0)}`,
  });
  document.getElementById('t-pareto').textContent = `${F.inteiro(k18.total)} viagens com ocorrência, da mais frequente para a menos frequente`;

  // SLA de trânsito por fornecedor.
  const por_fornecedor = K.por_grupo(viagens, 'fornecedor_id', (g) => K.k15_sla_transito(g))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-fornecedor'), {
    categorias: por_fornecedor.map((g) => `Fornecedor ${g.chave}`), valores: por_fornecedor.map((g) => g.valor),
    formato: F.pct, meta: metas.K15_sla_transito, minimo: 50, maximo: 100,
    detalhes: por_fornecedor.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} no prazo`),
  });
  document.getElementById('l-fornecedor').innerHTML = leg_meta(metas.K15_sla_transito.tolerancia_amarelo);

  // SLA de expedição por unidade de origem.
  const expedicao = K.por_grupo(viagens, 'unidade_origem_id', (g) => K.k16_sla_expedicao(g))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-expedicao'), {
    categorias: expedicao.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: expedicao.map((g) => g.valor), formato: F.pct, meta: metas.K16_sla_expedicao, minimo: 70, maximo: 100,
    detalhes: expedicao.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} no horário`),
  });
  document.getElementById('l-expedicao').innerHTML = leg_meta(metas.K16_sla_expedicao.tolerancia_amarelo);

  // % transferido por unidade de origem.
  const transferido = K.por_grupo(manifestos, 'unidade_origem_id', (g) => K.k19_transferido(g))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-transferido'), {
    categorias: transferido.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: transferido.map((g) => g.valor), formato: F.pct, meta: metas.K19_pct_transferido, minimo: 90, maximo: 100,
    detalhes: transferido.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} CT-es`),
  });
  document.getElementById('l-transferido').innerHTML = leg_meta(metas.K19_pct_transferido.tolerancia_amarelo);

  // Rotas com mais atraso médio na chegada.
  const rotas = K.por_grupo(viagens, 'rota', (g) => ({ ...K.k17_tempo_atraso(g), sla: K.k15_sla_transito(g) }))
    .filter((r) => r.valor !== null && r.sla.denominador >= 5)
    .sort((a, b) => b.valor * b.quantidade - a.valor * a.quantidade).slice(0, 10);
  document.getElementById('t-rotas').innerHTML = tabela([
    { titulo: 'Rota', valor: (r) => r.chave },
    { titulo: 'Finalizadas', num: true, valor: (r) => F.inteiro(r.sla.denominador) },
    { titulo: 'SLA trânsito', num: true, valor: (r) => F.pct(r.sla.valor) },
    { titulo: 'Atrasadas', num: true, valor: (r) => F.inteiro(r.quantidade) },
    { titulo: 'Atraso médio', num: true, valor: (r) => F.horas(r.valor) },
  ], rotas);
}

iniciar_bi({
  id: 'bi4',
  bases: ['bi4_viagens', 'bi4_manifestos'],
  aviso: 'Unidade = unidade de origem. Cliente = cliente principal da viagem e cliente do manifesto. Viagens canceladas ficam fora de todos os KPIs.',
  desenhar,
});
