// Carrega no Node os scripts clássicos de src/js (os mesmos que o navegador executa)
// e devolve o namespace global Aurora. Usado por todos os testes JavaScript.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const MODULOS = ['calendario', 'formato', 'kpis', 'filtros', 'dados'];

for (const modulo of MODULOS) {
  const url = new URL(`../../src/js/${modulo}.js`, import.meta.url);
  vm.runInThisContext(readFileSync(url, 'utf-8'), { filename: fileURLToPath(url) });
}

export const Aurora = globalThis.Aurora;
