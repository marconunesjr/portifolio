// BI 5 — SLA de Coletas: "Estamos coletando dentro do prazo?" (K20 a K23)
import { cartao_kpi, legenda } from '../componentes.js';
import * as F from '../formato.js';
import { barras_horizontais, colunas, cores, linha_diaria } from '../graficos.js';
import * as K from '../kpis.js';
import { iniciar_bi } from '../pagina_bi.js';

const COLETAS = { data: 'solicitacao', unidade: 'unidade_id', cliente: 'cliente_id' };
const STATUS = ['coletada', 'depositada', 'solicitada', 'cancelada'];
const ROTULO_STATUS = { coletada: 'Coletada', depositada: 'Depositada', solicitada: 'Solicitada', cancelada: 'Cancelada' };
const nome_curto = (nome) => nome.replace(/^CD /, '');

function desenhar(ctx) {
  const { ref, metas, cal, anterior } = ctx;
  const c = cores();
  const coletas = ctx.filtrar('bi5_coletas', COLETAS);
  const ant = anterior ? ctx.filtrar('bi5_coletas', COLETAS, anterior) : null;
  const de_ant = (calcular) => (ant ? calcular(ant) : null);

  const k20 = K.k20_sla_coleta(coletas, ref);
  const k21 = K.k21_aging_coleta(coletas, cal);
  const k22 = K.k22_cancelamento(coletas);
  const k23 = K.k23_status_unidade(coletas, STATUS);

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K20', titulo: 'SLA de coleta', principal: true, valor: k20.valor, formato: F.pct,
      meta: metas.K20_sla_coleta, sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k20_sla_coleta(a, ref).valor),
      detalhe: `${F.inteiro(k20.numerador)} de ${F.inteiro(k20.denominador)} coletas retiradas até o prazo (exceto canceladas)`,
    }),
    cartao_kpi({
      codigo: 'K21', titulo: 'Aging da coleta', valor: k21.valor, formato: F.dias_uteis, sentido: 'menor',
      sufixo_variacao: 'd.u.', anterior: de_ant((a) => K.k21_aging_coleta(a, cal).valor),
      detalhe: `Do depósito no ponto à retirada, ${F.inteiro(k21.quantidade)} coletas`,
    }),
    cartao_kpi({
      codigo: 'K22', titulo: '% cancelamento', valor: k22.valor, formato: F.pct, sentido: 'menor',
      sufixo_variacao: 'p.p.', anterior: de_ant((a) => K.k22_cancelamento(a).valor),
      detalhe: `${F.inteiro(k22.numerador)} de ${F.inteiro(k22.denominador)} solicitações`,
    }),
    cartao_kpi({
      codigo: 'K23', titulo: 'Coletas solicitadas', valor: coletas.length ? k23.total : null, formato: F.inteiro,
      sentido: 'neutro', relativa: true, anterior: de_ant((a) => (a.length ? a.length : null)),
      detalhe: STATUS.map((s) => `${F.inteiro(k23.por_status[s])} ${ROTULO_STATUS[s].toLowerCase()}s`).join(' · '),
    }),
  ].join('');

  const leg_meta = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 4 p.p. abaixo', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);

  // SLA por dia de solicitação.
  const diario = K.por_grupo(coletas, 'solicitacao', (g) => K.k20_sla_coleta(g, ref));
  linha_diaria(document.getElementById('g-sla-diario'), {
    datas: diario.map((d) => d.chave), valores: diario.map((d) => d.valor), nome: 'SLA de coleta',
    formato: F.pct, meta: metas.K20_sla_coleta, maximo: 100,
  });

  // Cancelamento por motivo.
  colunas(document.getElementById('g-motivos'), {
    categorias: k22.por_motivo.map((m) => m.motivo),
    series: [{ nome: '% das solicitações', valores: k22.por_motivo.map((m) => m.valor), cor: c.series[1] }],
    formato: (v) => F.pct(v), horizontal: true, rotulos: (_, v) => F.pct(v),
  });

  // SLA por regional e por unidade.
  const por_regional = K.por_grupo(coletas, (x) => ctx.regional_unidade.get(x.unidade_id), (g) => K.k20_sla_coleta(g, ref))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-regional'), {
    categorias: por_regional.map((g) => g.chave), valores: por_regional.map((g) => g.valor),
    formato: F.pct, meta: metas.K20_sla_coleta, minimo: 50, maximo: 100,
    detalhes: por_regional.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} no prazo`),
  });
  document.getElementById('l-regional').innerHTML = leg_meta;
  const por_unidade = K.por_grupo(coletas, 'unidade_id', (g) => K.k20_sla_coleta(g, ref))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor);
  barras_horizontais(document.getElementById('g-unidade'), {
    categorias: por_unidade.map((g) => `${g.chave} · ${nome_curto(ctx.nome_unidade.get(g.chave))}`),
    valores: por_unidade.map((g) => g.valor), formato: F.pct, meta: metas.K20_sla_coleta, minimo: 50, maximo: 100,
    detalhes: por_unidade.map((g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} no prazo`),
  });
  document.getElementById('l-unidade').innerHTML = leg_meta;

  // K23: status por unidade (empilhado).
  const cor_status = { coletada: c.series[0], depositada: c.series[2], solicitada: c.series[3], cancelada: c.neutro };
  const unidades = [...k23.por_unidade].sort((a, b) => b.total - a.total);
  colunas(document.getElementById('g-status'), {
    categorias: unidades.map((u) => u.unidade_id),
    series: STATUS.map((s) => ({ nome: ROTULO_STATUS[s], valores: unidades.map((u) => u[s]), cor: cor_status[s] })),
    formato: F.inteiro, empilhado: true, rotulos: (i) => F.inteiro(unidades[i].total),
  });
  document.getElementById('l-status').innerHTML = legenda(STATUS.map((s) => ({ rotulo: ROTULO_STATUS[s], cor: cor_status[s] })));
}

iniciar_bi({
  id: 'bi5',
  bases: ['bi5_coletas'],
  aviso: 'O período filtra a data da solicitação. Coleta em aberto com prazo vencido conta como fora do prazo; com prazo futuro fica fora do SLA.',
  desenhar,
});
