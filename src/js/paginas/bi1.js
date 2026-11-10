// BI 1 — Indicadores Operacionais: "Estamos entregando no prazo e onde está o desvio?" (K01 a K06)
import { cartao_kpi, legenda, tabela } from '../componentes.js';
import * as F from '../formato.js';
import { barras_horizontais, colunas, cores, linha_diaria } from '../graficos.js';
import * as K from '../kpis.js';
import { iniciar_bi } from '../pagina_bi.js';

// Colunas usadas pelos filtros em cada base (período, unidade, cliente).
const CTES = { data: 'limite_cliente', unidade: 'unidade_destino_id', cliente: 'cliente_id' };
const EMISSOES = { data: 'data', unidade: 'unidade_origem_id', cliente: 'cliente_id' };
const ENTREGAS = { data: 'data', unidade: 'unidade_id' }; // sem cliente na base (ver decisoes.md)

const nome_curto = (nome) => nome.replace(/^CD /, '');

function desenhar(ctx) {
  const { ref, metas, cal, anterior } = ctx;
  const c = cores();
  const ctes = ctx.filtrar('bi1_ctes', CTES);
  const emissoes = ctx.filtrar('bi1_emissoes_dia', EMISSOES);
  const entregas = ctx.filtrar('bi1_entregas_courier', ENTREGAS);
  const ant = anterior ? {
    ctes: ctx.filtrar('bi1_ctes', CTES, anterior),
    emissoes: ctx.filtrar('bi1_emissoes_dia', EMISSOES, anterior),
    entregas: ctx.filtrar('bi1_entregas_courier', ENTREGAS, anterior),
  } : null;

  const k01 = K.k01_otd(ctes, ref);
  const k02 = K.k02_lead_time(ctes, cal);
  const k03 = K.k03_aging_atraso(ctes, cal, ref, ctx.faixas.aging_atraso_dias_uteis);
  const k04 = K.k04_ofensor_pickup(ctes, ref);
  const k05 = K.k05_emissoes(emissoes);
  const k06 = K.k06_baixas_app(entregas);
  const anterior_de = (calcular) => (ant ? calcular(ant) : null);

  document.getElementById('kpis').innerHTML = [
    cartao_kpi({
      codigo: 'K01', titulo: 'OTD — entregas no prazo', principal: true, valor: k01.valor, formato: F.pct,
      meta: metas.K01_otd, anterior: anterior_de((a) => K.k01_otd(a.ctes, ref).valor), sufixo_variacao: 'p.p.',
      detalhe: `${F.inteiro(k01.numerador)} de ${F.inteiro(k01.denominador)} CT-es com vencimento no período`,
    }),
    cartao_kpi({
      codigo: 'K02', titulo: 'Lead time médio', valor: k02.valor, formato: F.dias_uteis, sentido: 'menor',
      anterior: anterior_de((a) => K.k02_lead_time(a.ctes, cal).valor), sufixo_variacao: 'd.u.',
      detalhe: `Emissão até a entrega, ${F.inteiro(k02.quantidade)} CT-es realizados`,
    }),
    cartao_kpi({
      codigo: 'K04', titulo: 'Ofensor de pickup', valor: k04.valor, formato: F.pct, sentido: 'menor',
      anterior: anterior_de((a) => K.k04_ofensor_pickup(a.ctes, ref).valor), sufixo_variacao: 'p.p.',
      detalhe: `${F.inteiro(k04.numerador)} CT-es com atraso atribuído à coleta`,
    }),
    cartao_kpi({
      codigo: 'K06', titulo: 'Baixas via app', valor: k06.valor, formato: F.pct, sentido: 'maior',
      anterior: anterior_de((a) => K.k06_baixas_app(a.entregas).valor), sufixo_variacao: 'p.p.',
      detalhe: `${F.inteiro(k06.numerador)} de ${F.inteiro(k06.denominador)} entregas baixadas pelo aplicativo`,
    }),
    cartao_kpi({
      codigo: 'K05', titulo: 'Emissões (remessas)', valor: k05.remessas, formato: F.inteiro, sentido: 'neutro',
      anterior: anterior_de((a) => K.k05_emissoes(a.emissoes).remessas), relativa: true,
      detalhe: `${F.inteiro(k05.volumes)} volumes · ${F.kg(k05.peso_kg)}`,
    }),
  ].join('');

  // Evolução diária do OTD com a meta.
  const diario = K.por_grupo(ctes, 'limite_cliente', (g) => K.k01_otd(g, ref));
  linha_diaria(document.getElementById('g-otd-diario'), {
    datas: diario.map((d) => d.chave), valores: diario.map((d) => d.valor), nome: 'OTD',
    formato: F.pct, meta: metas.K01_otd, maximo: 100,
  });

  // Aging de atraso por faixa.
  colunas(document.getElementById('g-aging'), {
    categorias: k03.faixas.map((f) => `${f.faixa} d.u.`),
    series: [{ nome: 'CT-es fora do prazo', valores: k03.faixas.map((f) => f.quantidade), cor: c.series[1] }],
    formato: F.inteiro, rotulos: (_, v) => F.inteiro(v),
  });
  document.getElementById('t-aging').textContent = `${F.inteiro(k03.total)} CT-es fora do prazo no período`;

  // OTD por unidade de destino e por cliente (pior primeiro).
  const ranking = (coluna, nomes) => K.por_grupo(ctes, coluna, (g) => K.k01_otd(g, ref))
    .filter((g) => g.valor !== null).sort((a, b) => a.valor - b.valor)
    .map((g) => ({ ...g, nome: nomes(g.chave) }));
  const por_unidade = ranking('unidade_destino_id', (u) => `${u} · ${nome_curto(ctx.nome_unidade.get(u))}`);
  const por_cliente = ranking('cliente_id', (cl) => ctx.nome_cliente.get(cl));
  const detalhe = (g) => `${F.inteiro(g.numerador)} de ${F.inteiro(g.denominador)} no prazo`;
  barras_horizontais(document.getElementById('g-otd-unidade'), {
    categorias: por_unidade.map((g) => g.nome), valores: por_unidade.map((g) => g.valor),
    detalhes: por_unidade.map(detalhe), formato: F.pct, meta: metas.K01_otd, minimo: 60, maximo: 100,
  });
  barras_horizontais(document.getElementById('g-otd-cliente'), {
    categorias: por_cliente.map((g) => g.nome), valores: por_cliente.map((g) => g.valor),
    detalhes: por_cliente.map(detalhe), formato: F.pct, meta: metas.K01_otd, minimo: 60, maximo: 100,
  });
  const leg = legenda([
    { rotulo: 'Na meta', cor: c.verde }, { rotulo: 'Até 3 p.p. abaixo', cor: c.amarelo },
    { rotulo: 'Fora da meta', cor: c.vermelho }, { rotulo: 'Meta', cor: c.texto2, linha: true },
  ]);
  document.getElementById('l-otd-unidade').innerHTML = leg;
  document.getElementById('l-otd-cliente').innerHTML = leg;

  // Emissões por dia.
  const emissao_dia = K.por_grupo(emissoes, 'data', (g) => K.k05_emissoes(g));
  colunas(document.getElementById('g-emissoes'), {
    categorias: emissao_dia.map((d) => F.data_curta(d.chave)),
    series: [{ nome: 'Remessas', valores: emissao_dia.map((d) => d.remessas), cor: c.series[0] }],
    formato: F.inteiro,
  });

  // Couriers com menor % de baixas via app.
  const piores = k06.por_courier.filter((x) => x.valor !== null).sort((a, b) => a.valor - b.valor).slice(0, 8);
  document.getElementById('t-couriers').innerHTML = tabela([
    { titulo: 'Courier', valor: (x) => x.courier_id },
    { titulo: 'Unidade', valor: (x) => x.unidade_id },
    { titulo: 'Entregas', num: true, valor: (x) => F.inteiro(x.denominador) },
    { titulo: 'Via app', num: true, valor: (x) => F.pct(x.valor) },
  ], piores);
}

iniciar_bi({
  id: 'bi1',
  bases: ['bi1_ctes', 'bi1_emissoes_dia', 'bi1_entregas_courier'],
  aviso: 'Unidade e UF/regional usam a unidade de destino do CT-e (nas emissões, a unidade de origem). '
    + 'O filtro de cliente não altera K06, porque a base de entregas por courier não tem cliente.',
  desenhar,
});
