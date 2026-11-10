// Página inicial: cartões de acesso aos 6 BIs.

(function (Aurora) {
'use strict';

const { montar_rodape, montar_topo } = Aurora.componentes;
const { carregar_config } = Aurora.dados;
const { data, html } = Aurora.formato;
const { PAGINAS } = Aurora.sitio;
const { iniciar_tema } = Aurora.tema;

montar_topo(document.getElementById('topo'), { atual: 'inicio', prefixo_paginas: 'paginas/', prefixo_inicio: '' });
iniciar_tema();

document.getElementById('cartoes').innerHTML = PAGINAS.map((p, i) => `
  <a class="cartao-bi" href="paginas/${p.arquivo}">
    <span class="numero" aria-hidden="true">${i + 1}</span>
    <h2>${html(p.titulo)}</h2>
    <p>${html(p.pergunta)}</p>
    <span class="kpis-lista">${html(p.kpis)}</span>
    <span class="abrir">Abrir BI →</span>
  </a>`).join('');

carregar_config('dados').then((config) => {
  for (const el of document.querySelectorAll('[data-referencia]')) el.textContent = data(config.data_referencia);
  for (const el of document.querySelectorAll('[data-inicio]')) el.textContent = data(config.data_inicio);
  montar_rodape(document.getElementById('rodape'), config.empresa.aviso);
});
})(globalThis.Aurora = globalThis.Aurora || {});
