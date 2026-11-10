/**
 * Gráficos com Apache ECharts 5.6.0 (script clássico carregado do CDN jsDelivr, ver ADR-016).
 * Marcas finas, grade discreta, cores lidas dos tokens CSS (claro e escuro),
 * tooltip em todos os gráficos e nunca dois eixos de valor no mesmo gráfico.
 */

import { semaforo } from './kpis.js';

const observados = new WeakSet();

/** Lê os tokens de cor do tema atual. */
export function cores() {
  const estilo = getComputedStyle(document.documentElement);
  const v = (nome) => estilo.getPropertyValue(nome).trim();
  return {
    superficie: v('--superficie'), superficie2: v('--superficie-2'), texto: v('--texto'),
    texto2: v('--texto-2'), mudo: v('--texto-mudo'), grade: v('--grade'), eixo: v('--eixo'),
    borda: v('--borda-forte'), neutro: v('--neutro'),
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--serie-${i}`)),
    seq: [0, 1, 2, 3, 4].map((i) => v(`--seq-${i}`)),
    verde: v('--ok'), amarelo: v('--alerta'), vermelho: v('--critico'),
  };
}

/** Cor de status para um valor comparado à meta. */
export function cor_semaforo(valor, meta, c = cores()) {
  const estado = semaforo(valor, meta);
  return estado ? c[estado] : c.neutro;
}

/** Cria (ou reaproveita) o gráfico no elemento e aplica as opções. */
export function desenhar(el, opcoes) {
  if (!el) return null;
  // eslint-disable-next-line no-undef
  const grafico = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'svg' });
  grafico.setOption(opcoes, true);
  if (!observados.has(el) && 'ResizeObserver' in window) {
    new ResizeObserver(() => grafico.resize()).observe(el);
    observados.add(el);
  }
  return grafico;
}

/** Opções comuns: texto, grade, tooltip e animação. */
export function base(c = cores()) {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', color: c.texto2 },
    grid: { left: 8, right: 20, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: c.superficie, borderColor: c.borda, borderWidth: 1,
      textStyle: { color: c.texto, fontSize: 12 }, extraCssText: 'border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);',
      confine: true,
    },
    animationDuration: 300,
    animationDurationUpdate: 250,
  };
}

function eixo_categoria(c, dados, extra = {}) {
  return {
    type: 'category', data: dados,
    axisLine: { lineStyle: { color: c.eixo } }, axisTick: { show: false },
    axisLabel: { color: c.mudo, fontSize: 11, hideOverlap: true }, ...extra,
  };
}

function eixo_valor(c, formato, extra = {}) {
  return {
    type: 'value',
    splitLine: { lineStyle: { color: c.grade, width: 1 } },
    axisLabel: { color: c.mudo, fontSize: 11, formatter: formato }, ...extra,
  };
}

function linha_meta(c, valor, rotulo, eixo = 'yAxis') {
  return {
    silent: true, symbol: 'none',
    lineStyle: { color: c.texto2, type: [4, 3], width: 1 },
    // Em barras horizontais a meta é identificada pela legenda, para não colidir com o eixo.
    label: { show: eixo === 'yAxis', formatter: rotulo, color: c.texto2, fontSize: 11, position: 'insideEndTop' },
    data: [{ [eixo]: valor }],
  };
}

/**
 * Evolução diária com linha de meta.
 * @param {{datas: string[], valores: (number|null)[], meta?: object, nome: string, formato: Function, rotulo_meta?: string}} p
 */
export function linha_diaria(el, p) {
  const c = cores();
  const validos = p.valores.filter((v) => v !== null);
  const minimo = Math.min(...validos, p.meta ? p.meta.meta : Infinity);
  const opcoes = {
    ...base(c),
    tooltip: { ...base(c).tooltip, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: c.eixo } },
      valueFormatter: (v) => p.formato(v ?? null) },
    xAxis: eixo_categoria(c, p.datas.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`), { boundaryGap: false }),
    yAxis: eixo_valor(c, (v) => p.formato(v).replace(',0', ''), {
      min: validos.length ? Math.max(0, Math.floor((minimo - 2) / 5) * 5) : 0,
      max: p.maximo ? (v) => Math.min(p.maximo, Math.ceil(Math.max(v.max, p.meta ? p.meta.meta : -Infinity) + 2)) : undefined,
    }),
    series: [{
      name: p.nome, type: 'line', data: p.valores, connectNulls: false, smooth: false,
      symbol: 'circle', symbolSize: 6, showSymbol: p.valores.length <= 31,
      lineStyle: { width: 2, color: c.series[0] }, itemStyle: { color: c.series[0], borderColor: c.superficie, borderWidth: 2 },
      areaStyle: { color: c.series[0], opacity: 0.08 },
      markLine: p.meta ? linha_meta(c, p.meta.meta, p.rotulo_meta || `Meta ${p.formato(p.meta.meta)}`) : undefined,
    }],
  };
  return desenhar(el, opcoes);
}

/**
 * Barras horizontais (ranking), com cor de semáforo quando há meta.
 * @param {{categorias: string[], valores: (number|null)[], formato: Function, meta?: object, cor?: string, detalhes?: string[]}} p
 */
export function barras_horizontais(el, p) {
  const c = cores();
  const opcoes = {
    ...base(c),
    grid: { ...base(c).grid, right: 56 },
    tooltip: { ...base(c).tooltip, trigger: 'item',
      formatter: (i) => `<b>${p.categorias[i.dataIndex]}</b><br>${p.formato(p.valores[i.dataIndex])}${p.detalhes ? `<br><span style="opacity:.75">${p.detalhes[i.dataIndex]}</span>` : ''}` },
    xAxis: eixo_valor(c, (v) => p.formato(v).replace(',0', ''), { min: p.minimo ?? 0, max: p.maximo }),
    yAxis: eixo_categoria(c, p.categorias, { inverse: true, axisLabel: { color: c.texto2, fontSize: 12 } }),
    series: [{
      type: 'bar', barMaxWidth: 16, barCategoryGap: '35%',
      data: p.valores.map((v) => ({
        value: v,
        itemStyle: { color: p.meta ? cor_semaforo(v, p.meta, c) : (p.cor || c.series[0]), borderRadius: [0, 4, 4, 0] },
      })),
      label: { show: true, position: 'right', color: c.texto2, fontSize: 11, formatter: (i) => p.formato(i.value) },
      markLine: p.meta ? linha_meta(c, p.meta.meta, `Meta ${p.formato(p.meta.meta)}`, 'xAxis') : undefined,
    }],
  };
  return desenhar(el, opcoes);
}

/**
 * Colunas (uma ou mais séries; empilhadas se pedido).
 * @param {{categorias: string[], series: {nome: string, valores: number[], cor: string}[], formato: Function,
 *          empilhado?: boolean, rotulos?: (i: number, v: number) => string, horizontal?: boolean}} p
 */
export function colunas(el, p) {
  const c = cores();
  const horizontal = Boolean(p.horizontal);
  const ultimo = p.series.length - 1;
  const raio = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
  const categorias = eixo_categoria(c, p.categorias, horizontal ? { inverse: true, axisLabel: { color: c.texto2, fontSize: 12 } } : {});
  // Barras horizontais com rótulo direto dispensam os números do eixo (evita sobreposição).
  const valores = eixo_valor(c, (v) => p.formato(v), horizontal && p.rotulos ? { axisLabel: { show: false } } : {});
  const opcoes = {
    ...base(c),
    grid: { ...base(c).grid, right: horizontal ? (p.margem_direita || 48) : 20 },
    tooltip: { ...base(c).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: c.grade, opacity: 0.35 } },
      valueFormatter: (v) => p.formato(v) },
    xAxis: horizontal ? valores : categorias,
    yAxis: horizontal ? categorias : valores,
    series: p.series.map((s, indice) => ({
      name: s.nome, type: 'bar', stack: p.empilhado ? 'total' : undefined,
      barMaxWidth: p.empilhado ? 22 : 18, barGap: '20%',
      data: s.valores,
      itemStyle: {
        color: s.cor,
        borderRadius: !p.empilhado || indice === ultimo ? raio : 0,
        borderColor: p.empilhado ? c.superficie : undefined, borderWidth: p.empilhado ? 1 : 0,
      },
      label: p.rotulos && indice === ultimo ? {
        show: true, position: horizontal ? 'right' : 'top', color: c.texto2, fontSize: 11,
        formatter: (i) => p.rotulos(i.dataIndex, i.value),
      } : undefined,
    })),
  };
  return desenhar(el, opcoes);
}

/**
 * Mapa de calor hora × dia (sequencial, uma cor do claro ao escuro).
 * @param {{dias: string[], horas: number[], celulas: [number, number, number][], formato: Function}} p
 */
export function mapa_calor(el, p) {
  const c = cores();
  const maximo = Math.max(1, ...p.celulas.map((x) => x[2]));
  const opcoes = {
    ...base(c),
    grid: { left: 8, right: 12, top: 8, bottom: 56, containLabel: true },
    tooltip: { ...base(c).tooltip, trigger: 'item',
      formatter: (i) => `${p.dias[i.value[0]].split('-').reverse().join('/')} · ${p.horas[i.value[1]]}h<br><b>${p.formato(i.value[2])}</b> volumes recebidos` },
    xAxis: eixo_categoria(c, p.dias.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`), { splitArea: { show: false } }),
    yAxis: eixo_categoria(c, p.horas.map((h) => `${h}h`), { inverse: true }),
    visualMap: {
      min: 0, max: maximo, calculable: false, orient: 'horizontal', left: 'center', bottom: 4,
      itemWidth: 12, itemHeight: 160, textStyle: { color: c.mudo, fontSize: 11 },
      inRange: { color: c.seq }, text: ['mais volumes', 'menos'],
    },
    series: [{
      type: 'heatmap', data: p.celulas, progressive: 0,
      itemStyle: { borderColor: c.superficie, borderWidth: 1, borderRadius: 2 },
      emphasis: { itemStyle: { borderColor: c.texto, borderWidth: 1 } },
    }],
  };
  return desenhar(el, opcoes);
}
