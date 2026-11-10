/**
 * Leitura das bases de src/dados/ (JSON colunar gravado por etl/dados_io.py).
 * Todos os caminhos são relativos à página, para funcionar dentro de subpasta.
 */

/** Converte o JSON colunar em lista de objetos (uma linha por objeto). */
export function decodificar(objeto) {
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

/** Busca um JSON relativo à pasta de dados. */
async function buscar(pasta, nome) {
  const resposta = await fetch(`${pasta}/${nome}.json`);
  if (!resposta.ok) throw new Error(`Não foi possível carregar ${nome}.json (${resposta.status})`);
  return resposta.json();
}

/** Carrega config_site.json. */
export function carregar_config(pasta) {
  return buscar(pasta, 'config_site');
}

/** Carrega e decodifica várias bases em paralelo; devolve {nome: linhas}. */
export async function carregar_bases(pasta, nomes) {
  const objetos = await Promise.all(nomes.map((nome) => buscar(pasta, nome)));
  return Object.fromEntries(nomes.map((nome, i) => [nome, decodificar(objetos[i])]));
}
