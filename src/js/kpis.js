/**
 * KPIs K01 a K23 (docs/07_metricas_e_regras.md): implementação única.
 *
 * Todas as funções são puras: recebem linhas já filtradas (período, unidade,
 * UF/regional e cliente, ver filtros.js) e parâmetros, e devolvem números ou
 * objetos simples. Denominador zero devolve valor null, que as páginas mostram
 * como "sem dados". Os valores saem sem arredondar; o arredondamento é feito
 * na exibição (formato.js).
 */

(function (Aurora) {
'use strict';

const { dias_corridos, para_minutos } = Aurora.calendario;

// ------------------------------------------------------------------ utilidades

/** Percentual de numerador sobre denominador; null se o denominador for zero. */
function percentual(numerador, denominador) {
  return denominador > 0 ? (100 * numerador) / denominador : null;
}

/** Média de uma lista de números; null se vazia. */
function media(valores) {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

/** Soma de uma coluna. */
function soma(linhas, coluna) {
  let total = 0;
  for (const linha of linhas) total += linha[coluna] || 0;
  return total;
}

/** Agrupa linhas por uma coluna ou função; devolve Map(chave -> linhas). */
function agrupar(linhas, chave) {
  const obter = typeof chave === 'function' ? chave : (linha) => linha[chave];
  const grupos = new Map();
  for (const linha of linhas) {
    const k = obter(linha);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(linha);
  }
  return grupos;
}

/** Aplica uma função a cada grupo e devolve [{chave, ...resultado}] ordenado pela chave. */
function por_grupo(linhas, chave, calcular) {
  return [...agrupar(linhas, chave)]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, grupo]) => ({ chave: k, ...calcular(grupo) }));
}

/** Converte "1", "2-3", "6+" em [mínimo, máximo]. */
function limites_faixa(faixa) {
  if (faixa.endsWith('+')) return [Number(faixa.slice(0, -1)), Infinity];
  const [minimo, maximo = minimo] = faixa.split('-').map(Number);
  return [minimo, maximo];
}

/**
 * Conta valores por faixa. Valores abaixo da primeira faixa entram nela
 * (ex.: atraso de 0 dia útil quando o vencimento foi na sexta e a referência é sábado).
 */
function contar_por_faixa(valores, faixas) {
  const limites = faixas.map(limites_faixa);
  const contagem = faixas.map(() => 0);
  for (const valor of valores) {
    let indice = limites.findIndex(([mn, mx]) => valor >= mn && valor <= mx);
    if (indice < 0) indice = valor < limites[0][0] ? 0 : faixas.length - 1;
    contagem[indice] += 1;
  }
  return faixas.map((faixa, i) => ({ faixa, quantidade: contagem[i] }));
}

/**
 * Semáforo a partir da meta de config.yaml.
 * Verde atinge a meta; amarelo fica fora em até "tolerancia_amarelo" pontos; vermelho além.
 * @returns {'verde'|'amarelo'|'vermelho'|null}
 */
function semaforo(valor, { meta, sentido, tolerancia_amarelo }) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  const desvio = sentido === 'maior' ? meta - valor : valor - meta;
  const folga = 1e-9;
  if (desvio <= folga) return 'verde';
  if (desvio <= tolerancia_amarelo + folga) return 'amarelo';
  return 'vermelho';
}

/** Variação entre o período atual e o anterior (diferença simples); null se faltar um dos dois. */
function variacao(atual, anterior) {
  if (atual === null || anterior === null || atual === undefined || anterior === undefined) return null;
  return atual - anterior;
}

/** Contagem de linhas por valor de uma coluna, como objeto. */
function contar_por(linhas, coluna) {
  const contagem = {};
  for (const linha of linhas) contagem[linha[coluna]] = (contagem[linha[coluna]] || 0) + 1;
  return contagem;
}

// ------------------------------------------------------------------ BI 1

/** CT-es que entram no denominador do OTD: em aberto com limite futuro ficam de fora. */
function ctes_no_denominador(ctes, referencia) {
  return ctes.filter((c) => c.realizado !== null || c.limite_cliente <= referencia);
}

/** Indica se o CT-e foi entregue no prazo. */
function no_prazo(cte) {
  return cte.realizado !== null && cte.realizado <= cte.limite_cliente;
}

/**
 * K01 — OTD: CT-es realizados até limite_cliente ÷ CT-es com limite no período.
 * Em aberto com limite até a referência e devolvidos contam como fora do prazo.
 */
function k01_otd(ctes, referencia) {
  const base = ctes_no_denominador(ctes, referencia);
  const numerador = base.filter(no_prazo).length;
  return { valor: percentual(numerador, base.length), numerador, denominador: base.length };
}

/** K02 — Lead time: média de dias úteis entre emissao e realizado, só realizados. */
function k02_lead_time(ctes, calendario) {
  const dias = ctes.filter((c) => c.realizado !== null)
    .map((c) => calendario.dias_uteis_entre(c.emissao, c.realizado));
  return { valor: media(dias), quantidade: dias.length };
}

/**
 * K03 — Aging de atraso: para CT-es fora do prazo, dias úteis entre limite_cliente
 * e realizado (ou a referência, se não realizado), contados por faixa.
 */
function k03_aging_atraso(ctes, calendario, referencia, faixas) {
  const atrasados = ctes_no_denominador(ctes, referencia).filter((c) => !no_prazo(c));
  const dias = atrasados.map((c) => calendario.dias_uteis_entre(c.limite_cliente, c.realizado ?? referencia));
  return { faixas: contar_por_faixa(dias, faixas), total: atrasados.length };
}

/** K04 — % ofensor de pickup: CT-es com ofensor_pickup ÷ CT-es com limite no período. */
function k04_ofensor_pickup(ctes, referencia) {
  const base = ctes_no_denominador(ctes, referencia);
  const numerador = base.filter((c) => c.ofensor_pickup).length;
  return { valor: percentual(numerador, base.length), numerador, denominador: base.length };
}

/** K05 — Emissões: soma de remessas, volumes e peso_kg; null se não houver linhas. */
function k05_emissoes(emissoes) {
  if (!emissoes.length) return { remessas: null, volumes: null, peso_kg: null };
  return {
    remessas: soma(emissoes, 'remessas'),
    volumes: soma(emissoes, 'volumes'),
    peso_kg: soma(emissoes, 'peso_kg'),
  };
}

/** K06 — % baixas via app: soma de baixas_app ÷ soma de entregas, total e por courier. */
function k06_baixas_app(entregas) {
  const calcular = (linhas) => {
    const numerador = soma(linhas, 'baixas_app');
    const denominador = soma(linhas, 'entregas');
    return { valor: percentual(numerador, denominador), numerador, denominador };
  };
  const por_courier = por_grupo(entregas, 'courier_id', (linhas) => ({
    unidade_id: linhas[0].unidade_id, ...calcular(linhas),
  })).map(({ chave, ...resto }) => ({ courier_id: chave, ...resto }));
  return { ...calcular(entregas), por_courier };
}

// ------------------------------------------------------------------ BI 2

/** K07 — % do piso vencido: limite_cliente anterior à referência ÷ CT-es no piso. */
function k07_piso_vencido(piso, referencia) {
  const numerador = piso.filter((p) => p.limite_cliente < referencia).length;
  return { valor: percentual(numerador, piso.length), numerador, denominador: piso.length };
}

/** K08 — Piso total: contagem de CT-es, por unidade atual e por cliente. */
function k08_piso_total(piso) {
  return {
    total: piso.length,
    por_unidade: contar_por(piso, 'unidade_atual_id'),
    por_cliente: contar_por(piso, 'cliente_id'),
  };
}

/** K09 — Aging do piso: dias corridos entre data_evento e a referência, por faixa. */
function k09_aging_piso(piso, referencia, faixas) {
  const dias = piso.map((p) => dias_corridos(p.data_evento, referencia));
  return { faixas: contar_por_faixa(dias, faixas), total: piso.length };
}

/** Classe de vencimento de um CT-e no piso. */
function classe_vencimento(limite, referencia) {
  if (limite < referencia) return 'vencido';
  return limite === referencia ? 'vence_hoje' : 'a_vencer';
}

/** K10 — Classificação de vencimento: vencido, vence hoje e a vencer. */
function k10_classificacao_vencimento(piso, referencia) {
  const contagem = { vencido: 0, vence_hoje: 0, a_vencer: 0 };
  for (const p of piso) contagem[classe_vencimento(p.limite_cliente, referencia)] += 1;
  return contagem;
}

/** K11 — Não entrou na unidade: transferido_em preenchido e entrou_unidade falso. */
function k11_nao_entrou(piso) {
  const linhas = piso.filter((p) => p.transferido_em !== null && !p.entrou_unidade);
  return { total: linhas.length, por_unidade: contar_por(linhas, 'unidade_atual_id') };
}

// ------------------------------------------------------------------ BI 3

/** K12 — Aderência ao forecast: soma de volumes_in ÷ soma de volumes_previstos (pode passar de 100%). */
function k12_aderencia_forecast(producao, forecast) {
  const realizado = soma(producao, 'volumes_in');
  const previsto = soma(forecast, 'volumes_previstos');
  return { valor: percentual(realizado, previsto), realizado, previsto };
}

/**
 * K13 — Volumes IN e OUT por hora e por dia (matriz do mapa de calor),
 * com a média diária do período como referência.
 */
function k13_in_out_hora(producao) {
  const horas = new Map();
  const celulas = new Map();
  const dias = new Map();
  for (const p of producao) {
    const h = horas.get(p.hora) || { hora: p.hora, volumes_in: 0, volumes_out: 0 };
    h.volumes_in += p.volumes_in;
    h.volumes_out += p.volumes_out;
    horas.set(p.hora, h);
    const chave = `${p.data}|${p.hora}`;
    const c = celulas.get(chave) || { data: p.data, hora: p.hora, volumes_in: 0, volumes_out: 0 };
    c.volumes_in += p.volumes_in;
    c.volumes_out += p.volumes_out;
    celulas.set(chave, c);
    dias.set(p.data, (dias.get(p.data) || 0) + p.volumes_in);
  }
  const ordenar = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.hora - b.hora);
  return {
    por_hora: [...horas.values()].sort((a, b) => a.hora - b.hora),
    matriz: [...celulas.values()].sort(ordenar),
    media_dia_in: media([...dias.values()]),
    total_in: soma(producao, 'volumes_in'),
    total_out: soma(producao, 'volumes_out'),
  };
}

/** K14 — Produtividade: soma de volumes ÷ soma de horas_trabalhadas, por operador e média da unidade. */
function k14_produtividade_operador(produtividade) {
  const taxa = (linhas) => {
    const volumes = soma(linhas, 'volumes');
    const horas = soma(linhas, 'horas_trabalhadas');
    return { valor: horas > 0 ? volumes / horas : null, volumes, horas };
  };
  const por_operador = por_grupo(produtividade, 'operador_id', (linhas) => ({
    unidade_id: linhas[0].unidade_id, ...taxa(linhas),
  })).map(({ chave, ...resto }) => ({ operador_id: chave, ...resto }));
  const por_unidade = por_grupo(produtividade, 'unidade_id', taxa)
    .map(({ chave, ...resto }) => ({ unidade_id: chave, ...resto }));
  return { ...taxa(produtividade), por_operador, por_unidade };
}

// ------------------------------------------------------------------ BI 4

/** Viagens que entram nos KPIs do BI 4 (canceladas ficam fora). */
function viagens_validas(viagens) {
  return viagens.filter((v) => v.status !== 'cancelada');
}

/** Indica se a viagem finalizada cumpriu a duração prevista. */
function viagem_no_transito(v) {
  return para_minutos(v.termino_real) - para_minutos(v.saida_real)
    <= para_minutos(v.termino_previsto) - para_minutos(v.saida_prevista);
}

/** K15 — SLA de trânsito: finalizadas com duração real ≤ prevista ÷ finalizadas. */
function k15_sla_transito(viagens) {
  const finalizadas = viagens_validas(viagens).filter((v) => v.status === 'finalizada');
  const numerador = finalizadas.filter(viagem_no_transito).length;
  return { valor: percentual(numerador, finalizadas.length), numerador, denominador: finalizadas.length };
}

/** K16 — SLA de expedição: saida_real até saida_prevista ÷ viagens com saida_real. */
function k16_sla_expedicao(viagens) {
  const sairam = viagens_validas(viagens).filter((v) => v.saida_real !== null);
  const numerador = sairam.filter((v) => para_minutos(v.saida_real) <= para_minutos(v.saida_prevista)).length;
  return { valor: percentual(numerador, sairam.length), numerador, denominador: sairam.length };
}

/** K17 — Tempo médio de atraso (horas) das finalizadas que terminaram depois do previsto. */
function k17_tempo_atraso(viagens) {
  const atrasos = viagens_validas(viagens)
    .filter((v) => v.status === 'finalizada' && v.termino_real !== null)
    .map((v) => (para_minutos(v.termino_real) - para_minutos(v.termino_previsto)) / 60)
    .filter((horas) => horas > 0);
  return { valor: media(atrasos), quantidade: atrasos.length };
}

/** K18 — Ocorrências por tipo (exceto "sem ocorrência"), em Pareto com % acumulado. */
function k18_ocorrencias(viagens) {
  const com_ocorrencia = viagens_validas(viagens)
    .filter((v) => v.ocorrencia !== null && v.ocorrencia !== 'sem ocorrência');
  const contagem = Object.entries(contar_por(com_ocorrencia, 'ocorrencia'))
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1));
  let acumulado = 0;
  const pareto = contagem.map(([ocorrencia, quantidade]) => {
    acumulado += quantidade;
    return { ocorrencia, viagens: quantidade, pct_acumulado: percentual(acumulado, com_ocorrencia.length) };
  });
  return { pareto, total: com_ocorrencia.length };
}

/** K19 — % transferido: soma de ctes_transferidos ÷ soma de ctes_total. */
function k19_transferido(manifestos) {
  const numerador = soma(manifestos, 'ctes_transferidos');
  const denominador = soma(manifestos, 'ctes_total');
  return { valor: percentual(numerador, denominador), numerador, denominador };
}

// ------------------------------------------------------------------ BI 5

/**
 * K20 — SLA de coleta: retiradas até o prazo ÷ solicitadas, exceto canceladas.
 * Em aberto com prazo até a referência conta como fora; com prazo futuro fica fora do denominador.
 */
function k20_sla_coleta(coletas, referencia) {
  const base = coletas.filter((c) => c.status !== 'cancelada'
    && (c.retirada_motorista !== null || c.prazo <= referencia));
  const numerador = base.filter((c) => c.retirada_motorista !== null && c.retirada_motorista <= c.prazo).length;
  return { valor: percentual(numerador, base.length), numerador, denominador: base.length };
}

/** K21 — Aging da coleta: média de dias úteis entre deposito_ponto e retirada_motorista. */
function k21_aging_coleta(coletas, calendario) {
  const dias = coletas.filter((c) => c.retirada_motorista !== null && c.deposito_ponto !== null)
    .map((c) => calendario.dias_uteis_entre(c.deposito_ponto, c.retirada_motorista));
  return { valor: media(dias), quantidade: dias.length };
}

/** K22 — % cancelamento: canceladas ÷ solicitadas, total e por motivo. */
function k22_cancelamento(coletas) {
  const canceladas = coletas.filter((c) => c.status === 'cancelada');
  const por_motivo = Object.entries(contar_por(canceladas, 'motivo_cancelamento'))
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
    .map(([motivo, quantidade]) => ({ motivo, quantidade, valor: percentual(quantidade, coletas.length) }));
  return {
    valor: percentual(canceladas.length, coletas.length),
    numerador: canceladas.length,
    denominador: coletas.length,
    por_motivo,
  };
}

/** K23 — Coletas por status e por unidade. */
function k23_status_unidade(coletas, status_possiveis) {
  const por_status = Object.fromEntries(status_possiveis.map((s) => [s, 0]));
  for (const c of coletas) por_status[c.status] = (por_status[c.status] || 0) + 1;
  const por_unidade = por_grupo(coletas, 'unidade_id', (linhas) => {
    const contagem = Object.fromEntries(status_possiveis.map((s) => [s, 0]));
    for (const c of linhas) contagem[c.status] += 1;
    return { ...contagem, total: linhas.length };
  }).map(({ chave, ...resto }) => ({ unidade_id: chave, ...resto }));
  return { por_status, por_unidade, total: coletas.length };
}

Aurora.kpis = { percentual, media, soma, agrupar, por_grupo, limites_faixa, contar_por_faixa, semaforo, variacao, k01_otd, k02_lead_time, k03_aging_atraso, k04_ofensor_pickup, k05_emissoes, k06_baixas_app, k07_piso_vencido, k08_piso_total, k09_aging_piso, classe_vencimento, k10_classificacao_vencimento, k11_nao_entrou, k12_aderencia_forecast, k13_in_out_hora, k14_produtividade_operador, viagem_no_transito, k15_sla_transito, k16_sla_expedicao, k17_tempo_atraso, k18_ocorrencias, k19_transferido, k20_sla_coleta, k21_aging_coleta, k22_cancelamento, k23_status_unidade };
})(globalThis.Aurora = globalThis.Aurora || {});
