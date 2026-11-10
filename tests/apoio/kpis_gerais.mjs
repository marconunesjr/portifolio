// Calcula KPIs gerais com src/js/kpis.js sobre os JSON de src/dados/ e imprime em JSON.
// Usado por tests/test_consistencia_kpis.py.
import { readFileSync } from 'node:fs';

import { Aurora } from './aurora.mjs';

const { decodificar } = Aurora.dados;
const K = Aurora.kpis;

const ler = (nome) => decodificar(JSON.parse(readFileSync(new URL(`../../src/dados/${nome}.json`, import.meta.url), 'utf-8')));
const config = JSON.parse(readFileSync(new URL('../../src/dados/config_site.json', import.meta.url), 'utf-8'));
const ref = config.data_referencia;

const piso = ler('bi2_piso');
const resultado = {
  K01: K.k01_otd(ler('bi1_ctes'), ref).valor,
  K12: K.k12_aderencia_forecast(ler('bi3_producao_hora'), ler('bi3_forecast')).valor,
  K15: K.k15_sla_transito(ler('bi4_viagens')).valor,
  K20: K.k20_sla_coleta(ler('bi5_coletas'), ref).valor,
  K07_por_unidade: Object.fromEntries(K.por_grupo(piso, 'unidade_atual_id', (g) => K.k07_piso_vencido(g, ref))
    .map((g) => [g.chave, g.valor])),
};
process.stdout.write(JSON.stringify(resultado));
