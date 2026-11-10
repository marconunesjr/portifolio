// Um teste por KPI (K01 a K23) com resultado conhecido, incluindo casos de borda.
// Casos em tests/dados_referencia/*.json, calculados à mão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Aurora } from './apoio/aurora.mjs';

const { criar_calendario } = Aurora.calendario;
const k = Aurora.kpis;

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf-8'));
const config = ler('../src/dados/config_site.json');
const bi1 = ler('./dados_referencia/bi1.json');
const bi23 = ler('./dados_referencia/bi2_bi3.json');
const bi45 = ler('./dados_referencia/bi4_bi5.json');
const cal = criar_calendario(config.calendario);
const REF = config.data_referencia;
const perto = (atual, esperado, msg) => assert.ok(Math.abs(atual - esperado) < 1e-9, `${msg}: ${atual} != ${esperado}`);

test('dados de referência usam a mesma data de referência de config.yaml', () => {
  assert.equal(REF, '2026-10-31');
  for (const f of [bi1, bi23, bi45]) assert.equal(f.referencia, REF);
});

// ------------------------------------------------------------------ BI 1

test('K01 OTD: aberto vencido e devolvido contam fora; aberto com limite futuro fica fora', () => {
  const r = k.k01_otd(bi1.ctes, REF);
  assert.deepEqual(r, bi1.esperado.k01);
  // borda: denominador zero → sem dados
  assert.equal(k.k01_otd([], REF).valor, null);
  // borda: só CT-e sem realizado e com limite futuro → sem dados
  assert.equal(k.k01_otd(bi1.ctes.filter((c) => c.cte_id === 'J'), REF).valor, null);
  // borda: CT-e sem realizado com limite vencido → 0% (e não "sem dados")
  assert.equal(k.k01_otd(bi1.ctes.filter((c) => c.cte_id === 'E'), REF).valor, 0);
});

test('K02 Lead time: dias úteis entre emissão e realizado, pulando feriado', () => {
  const r = k.k02_lead_time(bi1.ctes, cal);
  perto(r.valor, bi1.esperado.k02.valor, 'lead time');
  assert.equal(r.quantidade, bi1.esperado.k02.quantidade);
  // borda: CT-e C emitido em 06/10 e entregue em 13/10 (12/10 é feriado) → 4 dias úteis
  assert.equal(k.k02_lead_time(bi1.ctes.filter((c) => c.cte_id === 'C'), cal).valor, 4);
  // borda: nenhum CT-e realizado → sem dados
  assert.equal(k.k02_lead_time(bi1.ctes.filter((c) => c.realizado === null), cal).valor, null);
});

test('K03 Aging de atraso: faixas de dias úteis; prazo em feriado; sem realizado usa a referência', () => {
  const r = k.k03_aging_atraso(bi1.ctes, cal, REF, config.faixas.aging_atraso_dias_uteis);
  assert.deepEqual(r, bi1.esperado.k03);
  // borda: prazo que cai em feriado (12/10) entregue em 13/10 → 1 dia útil de atraso
  const c = k.k03_aging_atraso(bi1.ctes.filter((x) => x.cte_id === 'C'), cal, REF, ['1', '2-3', '4-5', '6+']);
  assert.equal(c.faixas[0].quantidade, 1);
  // borda: vencido na sexta e em aberto na referência de sábado → 0 dia útil, entra na primeira faixa
  const sexta = [{ emissao: '2026-10-28', limite_cliente: '2026-10-30', realizado: null, ofensor_pickup: false }];
  assert.equal(k.k03_aging_atraso(sexta, cal, REF, ['1', '2-3', '4-5', '6+']).faixas[0].quantidade, 1);
});

test('K04 % ofensor de pickup: denominador igual ao do K01', () => {
  assert.deepEqual(k.k04_ofensor_pickup(bi1.ctes, REF), bi1.esperado.k04);
  assert.equal(k.k04_ofensor_pickup([], REF).valor, null);
});

test('K05 Emissões: soma de remessas, volumes e peso; sem linhas → sem dados', () => {
  const r = k.k05_emissoes(bi1.emissoes);
  assert.equal(r.remessas, 22);
  assert.equal(r.volumes, 29);
  perto(r.peso_kg, 62.75, 'peso');
  assert.deepEqual(k.k05_emissoes([]), { remessas: null, volumes: null, peso_kg: null });
});

test('K06 % baixas via app: total e por courier; courier sem entregas → sem dados', () => {
  const r = k.k06_baixas_app(bi1.entregas);
  perto(r.valor, bi1.esperado.k06.valor, 'total');
  assert.equal(r.numerador, 95);
  assert.equal(r.denominador, 120);
  const por = Object.fromEntries(r.por_courier.map((c) => [c.courier_id, c.valor]));
  assert.deepEqual(por, bi1.esperado.k06.por_courier);
  assert.equal(k.k06_baixas_app([]).valor, null);
});

// ------------------------------------------------------------------ BI 2

test('K07 % do piso vencido: limite anterior à referência; vence hoje não é vencido', () => {
  assert.deepEqual(k.k07_piso_vencido(bi23.piso, REF), bi23.esperado.k07);
  assert.equal(k.k07_piso_vencido([], REF).valor, null);
});

test('K08 Piso total por unidade e por cliente', () => {
  assert.deepEqual(k.k08_piso_total(bi23.piso), bi23.esperado.k08);
  assert.deepEqual(k.k08_piso_total([]), { total: 0, por_unidade: {}, por_cliente: {} });
});

test('K09 Aging do piso em dias corridos, por faixa', () => {
  assert.deepEqual(k.k09_aging_piso(bi23.piso, REF, config.faixas.aging_piso_dias), bi23.esperado.k09);
});

test('K10 Classificação de vencimento', () => {
  assert.deepEqual(k.k10_classificacao_vencimento(bi23.piso, REF), bi23.esperado.k10);
  assert.equal(k.classe_vencimento(REF, REF), 'vence_hoje');
});

test('K11 Não entrou na unidade: só transferidos sem entrada', () => {
  // P5 tem entrou_unidade falso mas não foi transferido: não conta.
  assert.deepEqual(k.k11_nao_entrou(bi23.piso), bi23.esperado.k11);
});

// ------------------------------------------------------------------ BI 3

test('K12 Aderência ao forecast: aceita valor acima de 100%; forecast zero → sem dados', () => {
  const r = k.k12_aderencia_forecast(bi23.producao, bi23.forecast);
  perto(r.valor, bi23.esperado.k12.valor, 'aderência');
  const cl02 = k.k12_aderencia_forecast(bi23.producao.filter((p) => p.cliente_id === 'CL02'),
    bi23.forecast.filter((f) => f.cliente_id === 'CL02'));
  perto(cl02.valor, bi23.esperado.k12_acima_de_100, 'acima de 100');
  assert.equal(k.semaforo(cl02.valor, config.metas.K12_aderencia_forecast), 'verde');
  assert.equal(k.k12_aderencia_forecast(bi23.producao, []).valor, null);
});

test('K13 Volumes IN e OUT por hora e por dia', () => {
  assert.deepEqual(k.k13_in_out_hora(bi23.producao), bi23.esperado.k13);
  assert.equal(k.k13_in_out_hora([]).media_dia_in, null);
});

test('K14 Produtividade por operador e média da unidade', () => {
  const r = k.k14_produtividade_operador(bi23.produtividade);
  perto(r.valor, bi23.esperado.k14.valor, 'geral');
  const op = Object.fromEntries(r.por_operador.map((o) => [o.operador_id, o.valor]));
  assert.deepEqual(op, bi23.esperado.k14.por_operador);
  const un = Object.fromEntries(r.por_unidade.map((u) => [u.unidade_id, u.valor]));
  perto(un.SPO, bi23.esperado.k14.por_unidade.SPO, 'SPO');
  assert.equal(un.RJO, 100);
  assert.equal(k.k14_produtividade_operador([]).valor, null);
});

// ------------------------------------------------------------------ BI 4

test('K15 SLA de trânsito: só finalizadas; viagem não finalizada e cancelada ficam fora', () => {
  assert.deepEqual(k.k15_sla_transito(bi45.viagens), bi45.esperado.k15);
  const nao_finalizadas = bi45.viagens.filter((v) => v.status !== 'finalizada');
  assert.equal(k.k15_sla_transito(nao_finalizadas).valor, null);
});

test('K16 SLA de expedição: viagens com saída real, inclusive em viagem', () => {
  assert.deepEqual(k.k16_sla_expedicao(bi45.viagens), bi45.esperado.k16);
  assert.equal(k.k16_sla_expedicao([]).valor, null);
});

test('K17 Tempo médio de atraso em horas', () => {
  assert.deepEqual(k.k17_tempo_atraso(bi45.viagens), bi45.esperado.k17);
  assert.equal(k.k17_tempo_atraso(bi45.viagens.filter((v) => v.viagem_id === 'V1')).valor, null);
});

test('K18 Ocorrências em Pareto: exclui "sem ocorrência" e canceladas', () => {
  const r = k.k18_ocorrencias(bi45.viagens);
  assert.equal(r.total, 3);
  assert.equal(r.pareto.length, 2);
  r.pareto.forEach((linha, i) => {
    assert.equal(linha.ocorrencia, bi45.esperado.k18.pareto[i].ocorrencia);
    assert.equal(linha.viagens, bi45.esperado.k18.pareto[i].viagens);
    perto(linha.pct_acumulado, bi45.esperado.k18.pareto[i].pct_acumulado, 'acumulado');
  });
});

test('K19 % transferido', () => {
  assert.deepEqual(k.k19_transferido(bi45.manifestos), bi45.esperado.k19);
  assert.equal(k.k19_transferido([]).valor, null);
});

// ------------------------------------------------------------------ BI 5

test('K20 SLA de coleta: exclui canceladas e abertas com prazo futuro; aberta vencida conta fora', () => {
  assert.deepEqual(k.k20_sla_coleta(bi45.coletas, REF), bi45.esperado.k20);
  const canceladas = bi45.coletas.filter((c) => c.status === 'cancelada');
  assert.equal(k.k20_sla_coleta(canceladas, REF).valor, null);
});

test('K21 Aging da coleta em dias úteis, pulando feriado', () => {
  const r = k.k21_aging_coleta(bi45.coletas, cal);
  perto(r.valor, bi45.esperado.k21.valor, 'aging');
  assert.equal(r.quantidade, 3);
  // borda: depósito na sexta 09/10 e retirada na terça 13/10 (12/10 feriado) → 1 dia útil
  assert.equal(k.k21_aging_coleta(bi45.coletas.filter((c) => c.coleta_id === 'C2'), cal).valor, 1);
});

test('K22 % cancelamento, total e por motivo', () => {
  const r = k.k22_cancelamento(bi45.coletas);
  perto(r.valor, bi45.esperado.k22.valor, 'total');
  assert.equal(r.numerador, 2);
  assert.equal(r.denominador, 7);
  assert.deepEqual(r.por_motivo.map((m) => m.motivo), ['outros', 'remetente ausente']);
  perto(r.por_motivo[0].valor, 14.285714285714286, 'motivo');
  assert.equal(k.k22_cancelamento([]).valor, null);
});

test('K23 Coletas por status e por unidade', () => {
  const r = k.k23_status_unidade(bi45.coletas, ['solicitada', 'depositada', 'coletada', 'cancelada']);
  assert.deepEqual(r, bi45.esperado.k23);
});

// ------------------------------------------------------------------ apoio

test('semáforo lê meta, sentido e tolerância de config.yaml', () => {
  const otd = config.metas.K01_otd; // maior, meta 95, tolerância 3
  assert.equal(k.semaforo(95, otd), 'verde');
  assert.equal(k.semaforo(93, otd), 'amarelo');
  assert.equal(k.semaforo(92, otd), 'amarelo');
  assert.equal(k.semaforo(91.9, otd), 'vermelho');
  const piso = config.metas.K07_piso_vencido; // menor, meta 5, tolerância 3
  assert.equal(k.semaforo(4, piso), 'verde');
  assert.equal(k.semaforo(7.9, piso), 'amarelo');
  assert.equal(k.semaforo(8.1, piso), 'vermelho');
  assert.equal(k.semaforo(null, piso), null);
});

test('faixas e variação', () => {
  assert.deepEqual(k.limites_faixa('2-3'), [2, 3]);
  assert.deepEqual(k.limites_faixa('6+'), [6, Infinity]);
  assert.deepEqual(k.limites_faixa('1'), [1, 1]);
  assert.equal(k.variacao(90, 85), 5);
  assert.equal(k.variacao(90, null), null);
});

// ------------------------------------------------------------------ BI 6

const bi6 = ler('./dados_referencia/bi6.json');
const no_periodo = (coluna) => bi6.processos.filter((p) => p[coluna] !== null
  && p[coluna] >= bi6.periodo.inicio && p[coluna] <= bi6.periodo.fim);
const novos6 = no_periodo('data_abertura');
const encerrados6 = no_periodo('data_encerramento');

test('BI 6: o período seleciona novos pela abertura e encerrados pelo encerramento', () => {
  assert.deepEqual(novos6.map((p) => p.processo_id), bi6.esperado.novos_no_periodo);
  assert.deepEqual(encerrados6.map((p) => p.processo_id).sort(), [...bi6.esperado.encerrados_no_periodo].sort());
});

test('K24 Litigiosidade: processos novos por 10 mil remessas; sem remessas → sem dados', () => {
  assert.deepEqual(k.k24_litigiosidade(novos6, bi6.emissoes), bi6.esperado.k24);
  assert.equal(k.k24_litigiosidade(novos6, []).valor, null);
});

test('K25 Estoque: em andamento na data de corte; encerrado no próprio dia de corte sai do estoque', () => {
  assert.deepEqual(k.k25_estoque(bi6.processos, REF, config.faixas.idade_processo_dias), bi6.esperado.k25);
  // borda: corte anterior exclui processos abertos depois dele e inclui os encerrados depois dele
  assert.equal(k.k25_estoque(bi6.processos, '2026-10-01', config.faixas.idade_processo_dias).total,
    bi6.esperado.k25_corte_01_10);
});

test('K26 Taxa de êxito: acordos ficam fora; só acordos → sem dados', () => {
  assert.deepEqual(k.k26_taxa_exito(encerrados6), bi6.esperado.k26);
  assert.equal(k.k26_taxa_exito(encerrados6.filter((p) => p.situacao === 'acordo')).valor, null);
  assert.equal(k.semaforo(96, config.metas.K26_taxa_exito), 'amarelo');
  assert.equal(k.semaforo(97, config.metas.K26_taxa_exito), 'verde');
});

test('K27 Valor pago e % sobre o pedido; sem encerrados → sem dados', () => {
  const r = k.k27_valor_pago(encerrados6);
  assert.equal(r.valor, bi6.esperado.k27.valor);
  assert.equal(r.pedido, bi6.esperado.k27.pedido);
  perto(r.pct_pedido, bi6.esperado.k27.pct_pedido, '% do pedido');
  assert.equal(k.k27_valor_pago([]).valor, null);
});

test('K28 Provisão: só em andamento com risco provável (perdido provável não conta)', () => {
  assert.deepEqual(k.k28_provisao(bi6.processos), bi6.esperado.k28);
});

test('K29 Tempo até o encerramento em dias corridos; sem encerrados → sem dados', () => {
  assert.deepEqual(k.k29_tempo_encerramento(encerrados6), bi6.esperado.k29);
  assert.equal(k.k29_tempo_encerramento([]).valor, null);
});

test('K30 % de acordos entre os encerrados; sem encerrados → sem dados', () => {
  assert.deepEqual(k.k30_acordos(encerrados6), bi6.esperado.k30);
  assert.equal(k.k30_acordos([]).valor, null);
});
