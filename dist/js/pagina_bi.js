/**
 * Controlador comum dos BIs: carrega config e bases, monta topo, filtros e rodapé,
 * e chama a função de desenho da página a cada mudança de filtro ou de tema.
 */

import { criar_calendario } from './calendario.js';
import { montar_filtros, montar_rodape, montar_topo, texto_periodo } from './componentes.js';
import { carregar_bases, carregar_config } from './dados.js';
import { filtrar, periodo_anterior } from './filtros.js';
import { data, html } from './formato.js';
import { iniciar_tema } from './tema.js';

const PASTA_DADOS = '../dados';

/**
 * Inicia uma página de BI.
 * @param {object} p
 * @param {string} p.id identificador da página (bi1 ... bi5)
 * @param {string[]} p.bases bases de src/dados/ usadas pela página
 * @param {'historico'|'foto'} [p.modo] histórico (com comparação) ou foto na data de referência
 * @param {(ctx) => {inicio: string, fim: string}} [p.dominio] intervalo de datas do filtro de período
 * @param {string} [p.aviso] observação exibida abaixo dos filtros
 * @param {(ctx) => void} p.desenhar desenha KPIs e gráficos para o estado atual
 */
export async function iniciar_bi({ id, bases, modo = 'historico', dominio, aviso, desenhar }) {
  montar_topo(document.getElementById('topo'), { atual: id, prefixo_paginas: '', prefixo_inicio: '../' });
  const area = document.getElementById('area-bi');
  const carregando = document.getElementById('carregando');
  let redesenhar_atual = () => {};
  iniciar_tema(() => redesenhar_atual()); // o botão de tema funciona mesmo antes dos dados chegarem
  try {
    const config = await carregar_config(PASTA_DADOS);
    montar_rodape(document.getElementById('rodape'), config.empresa.aviso);
    for (const el of document.querySelectorAll('[data-referencia]')) el.textContent = data(config.data_referencia);
    const dados = await carregar_bases(PASTA_DADOS, ['dim_unidades', 'dim_clientes', ...bases]);
    const ctx = {
      config,
      dados,
      cal: criar_calendario(config.calendario),
      ref: config.data_referencia,
      metas: config.metas,
      faixas: config.faixas,
      nome_unidade: new Map(dados.dim_unidades.map((u) => [u.unidade_id, u.nome])),
      nome_cliente: new Map(dados.dim_clientes.map((c) => [c.cliente_id, c.nome])),
      regional_unidade: new Map(dados.dim_unidades.map((u) => [u.unidade_id, u.regional])),
    };
    const janela = dominio ? dominio(ctx) : { inicio: config.data_inicio, fim: config.data_referencia };
    const filtros = montar_filtros(document.getElementById('filtros'), {
      dim_unidades: dados.dim_unidades, dim_clientes: dados.dim_clientes, regionais: config.regionais,
      modo, dominio: janela, ref: config.data_referencia, padrao: modo === 'foto' ? 'tudo' : 'u30',
      aviso, ao_mudar: redesenhar,
    });

    function redesenhar() {
      const estado = filtros.estado();
      const anterior = modo === 'historico' ? periodo_anterior(estado, config.data_inicio) : null;
      filtros.resumo(texto_periodo(estado, anterior, modo));
      desenhar({
        ...ctx,
        estado,
        anterior,
        /** Filtra uma base pelo estado atual (ou por outro período, ex.: o anterior). */
        filtrar: (base, colunas, periodo) => filtrar(dados[base], estado, colunas, dados.dim_unidades, periodo),
      });
    }

    redesenhar_atual = redesenhar;
    carregando.remove();
    area.hidden = false;
    redesenhar();
  } catch (erro) {
    carregando.innerHTML = `<p class="erro">Não foi possível carregar os dados: ${html(erro.message)}. `
      + 'Abra o site por um servidor HTTP (por exemplo, <code>python scripts/servidor.py</code>).</p>';
    throw erro;
  }
}
