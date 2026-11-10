/**
 * Calendário de dias úteis: implementação única em JavaScript.
 *
 * Regras de docs/07:
 * - dia útil é segunda a sexta (lista em config.yaml), exceto feriado nacional;
 * - dias úteis entre duas datas = dias úteis depois da data inicial até a final,
 *   inclusive; datas iguais resultam em 0; final anterior à inicial dá valor negativo;
 * - a data de referência (config.yaml) faz o papel de "hoje"; nada usa a data do sistema.
 *
 * Datas são textos ISO "aaaa-mm-dd"; data e hora, "aaaa-mm-ddThh:mm".
 */

const MS_DIA = 86400000;
const NOMES_DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

/** Converte "aaaa-mm-dd" em número de dias desde 01/01/1970 (UTC). */
export function para_dia(data) {
  return Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10)) / MS_DIA;
}

/** Converte número de dias desde 01/01/1970 em "aaaa-mm-dd". */
export function de_dia(numero) {
  return new Date(numero * MS_DIA).toISOString().slice(0, 10);
}

/** Converte "aaaa-mm-ddThh:mm" em minutos desde 01/01/1970 (UTC). */
export function para_minutos(data_hora) {
  const hora = +data_hora.slice(11, 13) || 0;
  const minuto = +data_hora.slice(14, 16) || 0;
  return para_dia(data_hora) * 1440 + hora * 60 + minuto;
}

/** Soma dias corridos a uma data. */
export function somar_dias(data, dias) {
  return de_dia(para_dia(data) + dias);
}

/** Dias corridos entre duas datas (fim − início). */
export function dias_corridos(inicio, fim) {
  return para_dia(fim) - para_dia(inicio);
}

/** Dia da semana: 1 = segunda ... 7 = domingo. */
export function dia_semana(data) {
  return (((para_dia(data) + 3) % 7) + 7) % 7 + 1; // 01/01/1970 foi uma quinta-feira
}

/**
 * Cria o calendário a partir de config_site.json (chave "calendario").
 * @param {{dias_uteis: string[], feriados_nacionais: string[]}} parametros
 */
export function criar_calendario({ dias_uteis, feriados_nacionais }) {
  const semana_util = new Set(dias_uteis.map((nome) => NOMES_DIAS.indexOf(nome) + 1));
  const feriados = new Set(feriados_nacionais.map(para_dia));
  const cache = new Map();

  const util_numero = (n) => semana_util.has(((((n + 3) % 7) + 7) % 7) + 1) && !feriados.has(n);

  /** Indica se a data é feriado nacional. */
  const eh_feriado = (data) => feriados.has(para_dia(data));

  /** Indica se a data é dia útil. */
  const eh_dia_util = (data) => util_numero(para_dia(data));

  /** Dias úteis em (inicio, fim]; negativo se fim for anterior a inicio. */
  function dias_uteis_entre(inicio, fim) {
    const chave = inicio + fim;
    if (cache.has(chave)) return cache.get(chave);
    const a = para_dia(inicio);
    const b = para_dia(fim);
    const [menor, maior, sinal] = a <= b ? [a, b, 1] : [b, a, -1];
    let total = 0;
    for (let n = menor + 1; n <= maior; n += 1) if (util_numero(n)) total += 1;
    const resultado = total === 0 ? 0 : sinal * total;
    cache.set(chave, resultado);
    return resultado;
  }

  return { eh_feriado, eh_dia_util, dias_uteis_entre };
}
