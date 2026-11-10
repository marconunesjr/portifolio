/**
 * Leitura das bases de src/dados/ (formato colunar gravado por etl/dados_io.py).
 *
 * O site lê os arquivos .js de src/dados/, que registram o mesmo conteúdo dos .json
 * em globalThis.AURORA_DADOS. Carregar por <script> funciona também abrindo o arquivo
 * direto do disco (file://), onde o navegador bloqueia fetch e módulos JavaScript.
 * Todos os caminhos são relativos à página, para funcionar dentro de subpasta.
 */

(function (Aurora) {
'use strict';

/** Converte o JSON colunar em lista de objetos (uma linha por objeto). */
function decodificar(objeto) {
  const colunas = objeto.colunas.map((c) => c.nome);
  const valores = colunas.map((nome) => {
    const bruto = objeto.dados[nome];
    if (Array.isArray(bruto)) return bruto;
    return bruto.indices.map((i) => (i === null ? null : bruto.dominio[i]));
  });
  const linhas = new Array(objeto.linhas);
  for (let i = 0; i < objeto.linhas; i += 1) {
    const linha = {};
    for (let j = 0; j < colunas.length; j += 1) linha[colunas[j]] = valores[j][i];
    linhas[i] = linha;
  }
  return linhas;
}

/** Carrega um arquivo .js de dados por <script> e devolve o objeto registrado. */
function buscar(pasta, nome) {
  const registro = (globalThis.AURORA_DADOS = globalThis.AURORA_DADOS || {});
  if (registro[nome]) return Promise.resolve(registro[nome]);
  return new Promise((resolver, rejeitar) => {
    const script = document.createElement('script');
    script.src = `${pasta}/${nome}.js`;
    script.async = true;
    script.onload = () => (registro[nome] ? resolver(registro[nome])
      : rejeitar(new Error(`${nome}.js não registrou dados`)));
    script.onerror = () => rejeitar(new Error(`Não foi possível carregar ${nome}.js`));
    document.head.appendChild(script);
  });
}

/** Carrega os parâmetros do site (config_site). */
function carregar_config(pasta) {
  return buscar(pasta, 'config_site');
}

/** Carrega e decodifica várias bases em paralelo; devolve {nome: linhas}. */
async function carregar_bases(pasta, nomes) {
  const objetos = await Promise.all(nomes.map((nome) => buscar(pasta, nome)));
  return Object.fromEntries(nomes.map((nome, i) => [nome, decodificar(objetos[i])]));
}

Aurora.dados = { decodificar, carregar_config, carregar_bases };
})(globalThis.Aurora = globalThis.Aurora || {});
