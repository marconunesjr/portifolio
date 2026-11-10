// Página inicial: cartões de acesso aos 5 BIs.
import { montar_rodape, montar_topo } from '../componentes.js';
import { carregar_config } from '../dados.js';
import { data, html } from '../formato.js';
import { PAGINAS } from '../sitio.js';
import { iniciar_tema } from '../tema.js';

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

const config = await carregar_config('dados');
for (const el of document.querySelectorAll('[data-referencia]')) el.textContent = data(config.data_referencia);
for (const el of document.querySelectorAll('[data-inicio]')) el.textContent = data(config.data_inicio);
montar_rodape(document.getElementById('rodape'), config.empresa.aviso);
