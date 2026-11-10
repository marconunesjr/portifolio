// Testes do calendário (JavaScript), dos filtros e da leitura do JSON colunar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Aurora } from './apoio/aurora.mjs';

const { criar_calendario, dia_semana, para_minutos, somar_dias } = Aurora.calendario;
const { decodificar } = Aurora.dados;
const { datas_do_periodo, dias_do_periodo, filtrar, periodo_anterior, unidades_permitidas } = Aurora.filtros;

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf-8'));
const config = ler('../src/dados/config_site.json');
const cal = criar_calendario(config.calendario);
const dim_unidades = decodificar(ler('../src/dados/dim_unidades.json'));

test('calendário: dia útil, feriado e fim de semana', () => {
  assert.equal(dia_semana('2026-10-31'), 6); // sábado
  assert.equal(dia_semana('2026-08-03'), 1); // segunda
  assert.equal(cal.eh_feriado('2026-10-12'), true);
  assert.equal(cal.eh_dia_util('2026-10-12'), false);
  assert.equal(cal.eh_dia_util('2026-10-13'), true);
  assert.equal(cal.eh_dia_util('2026-10-31'), false);
});

test('calendário: dias úteis entre datas (depois da inicial até a final, inclusive)', () => {
  assert.equal(cal.dias_uteis_entre('2026-10-05', '2026-10-05'), 0);
  assert.equal(cal.dias_uteis_entre('2026-10-05', '2026-10-06'), 1);
  assert.equal(cal.dias_uteis_entre('2026-10-09', '2026-10-13'), 1); // fim de semana + feriado
  assert.equal(cal.dias_uteis_entre('2026-10-30', '2026-10-31'), 0); // sexta → sábado
  assert.equal(cal.dias_uteis_entre('2026-10-13', '2026-10-09'), -1);
  assert.equal(cal.dias_uteis_entre('2026-09-04', '2026-09-08'), 1); // 07/09 feriado
});

test('calendário: concorda com a implementação Python na janela inteira', () => {
  const calendario = decodificar(ler('../src/dados/dim_calendario.json'));
  for (const dia of calendario) {
    assert.equal(cal.eh_dia_util(dia.data), dia.dia_util, dia.data);
    assert.equal(cal.eh_feriado(dia.data), dia.feriado, dia.data);
    assert.equal(dia_semana(dia.data), dia.dia_semana, dia.data);
  }
});

test('calendário: utilidades de data e hora', () => {
  assert.equal(somar_dias('2026-10-31', 1), '2026-11-01');
  assert.equal(para_minutos('2026-10-02T06:00') - para_minutos('2026-10-01T22:00'), 480);
});

test('filtros: período anterior com o mesmo número de dias, só se couber nos dados', () => {
  assert.equal(dias_do_periodo({ inicio: '2026-10-02', fim: '2026-10-31' }), 30);
  assert.deepEqual(periodo_anterior({ inicio: '2026-10-02', fim: '2026-10-31' }, '2026-08-03'),
    { inicio: '2026-09-02', fim: '2026-10-01' });
  assert.equal(periodo_anterior({ inicio: '2026-08-03', fim: '2026-10-31' }, '2026-08-03'), null);
  assert.equal(datas_do_periodo({ inicio: '2026-10-30', fim: '2026-11-01' }).length, 3);
});

test('filtros: unidade, UF/regional e cliente combinados', () => {
  assert.equal(unidades_permitidas({ unidade: '', local: '' }, dim_unidades), null);
  assert.deepEqual([...unidades_permitidas({ unidade: '', local: 'R:Sul' }, dim_unidades)].sort(), ['CWB', 'FLN', 'POA']);
  assert.deepEqual([...unidades_permitidas({ unidade: '', local: 'UF:SP' }, dim_unidades)].sort(), ['CPQ', 'SPO']);
  assert.equal(unidades_permitidas({ unidade: 'SPO', local: 'R:Sul' }, dim_unidades).size, 0);

  const linhas = [
    { d: '2026-10-01', u: 'SPO', c: 'CL01' },
    { d: '2026-10-15T10:00', u: 'CWB', c: 'CL02' },
    { d: '2026-11-01', u: 'CWB', c: 'CL01' },
    { d: null, u: 'CWB', c: 'CL01' },
  ];
  const colunas = { data: 'd', unidade: 'u', cliente: 'c' };
  const estado = { inicio: '2026-10-01', fim: '2026-10-31', unidade: '', local: '', cliente: '' };
  assert.equal(filtrar(linhas, estado, colunas, dim_unidades).length, 2);
  assert.equal(filtrar(linhas, { ...estado, local: 'R:Sul' }, colunas, dim_unidades).length, 1);
  assert.equal(filtrar(linhas, { ...estado, cliente: 'CL01' }, colunas, dim_unidades).length, 1);
  assert.equal(filtrar(linhas, estado, colunas, dim_unidades, null).length, 4); // sem período
  // base sem coluna de cliente ignora o filtro de cliente (K14, ADR-006)
  assert.equal(filtrar(linhas, { ...estado, cliente: 'CL09' }, { data: 'd', unidade: 'u' }, dim_unidades).length, 2);
});

test('dados: decodifica colunas com domínio e nulos', () => {
  const objeto = {
    linhas: 3,
    colunas: [{ nome: 'a', tipo: 'texto' }, { nome: 'b', tipo: 'inteiro' }],
    dados: { a: { dominio: ['x', 'y'], indices: [1, null, 0] }, b: [1, 2, 3] },
  };
  assert.deepEqual(decodificar(objeto), [{ a: 'y', b: 1 }, { a: null, b: 2 }, { a: 'x', b: 3 }]);
});
