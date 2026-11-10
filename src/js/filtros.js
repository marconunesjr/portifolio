/**
 * Filtros comuns aos BIs: período, unidade, UF/regional e cliente.
 * Funções puras, usadas pelas páginas antes de chamar kpis.js.
 *
 * Estado do filtro: {inicio, fim, unidade, local, cliente}
 *  - inicio, fim: "aaaa-mm-dd" (inclusive);
 *  - unidade: código da unidade ou "" (todas);
 *  - local: "" (todas), "R:<regional>" ou "UF:<uf>";
 *  - cliente: código do cliente ou "" (todos).
 */

import { dias_corridos, somar_dias } from './calendario.js';

/** Conjunto de unidades permitidas pela combinação unidade + UF/regional; null = todas. */
export function unidades_permitidas(estado, dim_unidades) {
  if (!estado.unidade && !estado.local) return null;
  const permitidas = new Set();
  for (const u of dim_unidades) {
    if (estado.unidade && u.unidade_id !== estado.unidade) continue;
    if (estado.local) {
      const [tipo, valor] = [estado.local.slice(0, estado.local.indexOf(':')),
        estado.local.slice(estado.local.indexOf(':') + 1)];
      if (tipo === 'R' && u.regional !== valor) continue;
      if (tipo === 'UF' && u.uf !== valor) continue;
    }
    permitidas.add(u.unidade_id);
  }
  return permitidas;
}

/**
 * Filtra linhas de uma base.
 * @param {object[]} linhas
 * @param {object} estado estado do filtro
 * @param {{data?: string, unidade?: string, cliente?: string}} colunas colunas usadas por esta base
 * @param {object[]} dim_unidades dimensão de unidades
 * @param {{inicio: string, fim: string}|null} [periodo] período a aplicar (padrão: o do estado)
 */
export function filtrar(linhas, estado, colunas, dim_unidades, periodo) {
  const janela = periodo === undefined ? { inicio: estado.inicio, fim: estado.fim } : periodo;
  const unidades = colunas.unidade ? unidades_permitidas(estado, dim_unidades) : null;
  const cliente = colunas.cliente ? estado.cliente : '';
  return linhas.filter((linha) => {
    if (colunas.data && janela) {
      const valor = linha[colunas.data];
      if (valor === null) return false;
      const dia = valor.slice(0, 10);
      if (dia < janela.inicio || dia > janela.fim) return false;
    }
    if (unidades && !unidades.has(linha[colunas.unidade])) return false;
    if (cliente && linha[colunas.cliente] !== cliente) return false;
    return true;
  });
}

/** Quantidade de dias do período, inclusive. */
export function dias_do_periodo({ inicio, fim }) {
  return dias_corridos(inicio, fim) + 1;
}

/**
 * Período imediatamente anterior com o mesmo número de dias.
 * Devolve null se ele não couber inteiro nos dados (início antes de data_inicio).
 */
export function periodo_anterior({ inicio, fim }, data_inicio) {
  const dias = dias_do_periodo({ inicio, fim });
  const anterior = { inicio: somar_dias(inicio, -dias), fim: somar_dias(inicio, -1) };
  return anterior.inicio < data_inicio ? null : anterior;
}

/** Lista de datas entre inicio e fim, inclusive. */
export function datas_do_periodo({ inicio, fim }) {
  const datas = [];
  for (let d = inicio; d <= fim; d = somar_dias(d, 1)) datas.push(d);
  return datas;
}
