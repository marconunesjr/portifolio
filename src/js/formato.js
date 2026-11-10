/**
 * Formatos pt-BR: dd/mm/aaaa, vírgula decimal, ponto de milhar.
 * Percentuais com 1 casa; dias e horas com 1 casa; contagens inteiras.
 */

(function (Aurora) {
'use strict';

const SEM_DADOS = 'sem dados';

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
function numero(valor, casas = 0) {
  return vazio(valor) ? SEM_DADOS : nf(casas).format(valor);
}

/** Percentual com 1 casa: "91,4%". */
function pct(valor, casas = 1) {
  return vazio(valor) ? SEM_DADOS : `${nf(casas).format(valor)}%`;
}

/** Contagem inteira: "30.000". */
function inteiro(valor) {
  return numero(valor, 0);
}

/** Dias úteis com 1 casa. */
function dias_uteis(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(1).format(valor)} d.u.`;
}

/** Horas com 1 casa. */
function horas(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(1).format(valor)} h`;
}

/** Peso em kg (inteiro, com milhar). */
function kg(valor) {
  return vazio(valor) ? SEM_DADOS : `${nf(0).format(valor)} kg`;
}

/** Valor em reais, inteiro: "R$ 146.116". */
function moeda(valor) {
  return vazio(valor) ? SEM_DADOS : `R$ ${nf(0).format(valor)}`;
}

/** Valor em reais abreviado: "R$ 903,6 mil", "R$ 1,2 mi". */
function moeda_curta(valor) {
  if (vazio(valor)) return SEM_DADOS;
  if (Math.abs(valor) >= 1e6) return `R$ ${nf(1).format(valor / 1e6)} mi`;
  if (Math.abs(valor) >= 1e3) return `R$ ${nf(1).format(valor / 1e3)} mil`;
  return moeda(valor);
}

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
function data(iso) {
  if (!iso) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** "aaaa-mm-dd" → "dd/mm". */
function data_curta(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
}

/** Diferença com sinal: "+1,2 p.p.", "−0,3 d.u.". */
function diferenca(valor, sufixo, casas = 1) {
  if (vazio(valor)) return '';
  const arredondado = Number(valor.toFixed(casas));
  const sinal = arredondado > 0 ? '+' : arredondado < 0 ? '−' : '±';
  const espaco = sufixo && sufixo !== '%' ? ' ' : '';
  return `${sinal}${nf(casas).format(Math.abs(arredondado))}${sufixo ? `${espaco}${sufixo}` : ''}`;
}

/** Escapa texto para uso em HTML. */
function html(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

Aurora.formato = { SEM_DADOS, numero, pct, inteiro, dias_uteis, horas, kg, moeda, moeda_curta, data, data_curta, diferenca, html };
})(globalThis.Aurora = globalThis.Aurora || {});
