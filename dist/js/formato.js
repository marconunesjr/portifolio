/**
 * Formatos pt-BR: dd/mm/aaaa, vírgula decimal, ponto de milhar.
 * Percentuais com 1 casa; dias e horas com 1 casa; contagens inteiras.
 */

export const SEM_DADOS = 'sem dados';

/** Formatador pt-BR com casas fixas: ponto de milhar e vírgula decimal. */
function nf(casas) {
  return {
    format(valor) {
      const [inteira, decimal] = Math.abs(valor).toFixed(casas).split('.');
      const milhar = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const sinal = valor < 0 && Number(Math.abs(valor).toFixed(casas)) !== 0 ? '-' : '';
      return `${sinal}${milhar}${decimal ? `,${decimal}` : ''}`;
    },
  };
}

const vazio = (v) => v === null || v === undefined || Number.isNaN(v);

/** Número com casas decimais fixas. */
export function numero(valor, casas = 0) {
  return vazio(valor) ? SEM_DADOS : nf(casas).format(valor);
}

/** Percentual com 1 casa: "91,4%". */
export function pct(valor, casas = 1) {
  return vazio(valor) ? SEM_DADOS : `${nf(casas).format(valor)}%`;
}

/** Contagem inteira: "30.000". */
export function inteiro(valor) {
  return numero(valor, 0);
}

/** Dias úteis com 1 casa. */
export function dias_uteis(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(1).format(valor)} d.u.`;
}

/** Horas com 1 casa. */
export function horas(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(1).format(valor)} h`;
}

/** Peso em kg (inteiro, com milhar). */
export function kg(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(0).format(valor)} kg`;
}

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
export function data(iso) {
  if (!iso) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** "aaaa-mm-dd" → "dd/mm". */
export function data_curta(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
}

/** Diferença com sinal: "+1,2 p.p.", "−0,3 d.u.". */
export function diferenca(valor, sufixo, casas = 1) {
  if (vazio(valor)) return '';
  const arredondado = Number(valor.toFixed(casas));
  const sinal = arredondado > 0 ? '+' : arredondado < 0 ? '−' : '±';
  const espaco = sufixo && sufixo !== '%' ? ' ' : '';
  return `${sinal}${nf(casas).format(Math.abs(arredondado))}${sufixo ? `${espaco}${sufixo}` : ''}`;
}

/** Escapa texto para uso em HTML. */
export function html(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
