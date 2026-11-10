/**
 * Componentes comuns: topo com navegação, rodapé, barra de filtros, cartão de KPI,
 * semáforo, legenda e tabela. Geram HTML a partir de dados já calculados.
 */

(function (Aurora) {
'use strict';

const { somar_dias } = Aurora.calendario;
const { data, data_curta, diferenca, html } = Aurora.formato;
const { semaforo, variacao } = Aurora.kpis;
const { PAGINAS } = Aurora.sitio;

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <defs><linearGradient id="aurora-g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#14a874"/><stop offset=".55" stop-color="#2a78d6"/><stop offset="1" stop-color="#6250d6"/>
  </linearGradient></defs>
  <rect width="32" height="32" rx="9" fill="url(#aurora-g)"/>
  <path d="M7 22c3-7 6-11 9-11s6 4 9 11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="16" cy="11" r="2.2" fill="#fff"/>
</svg>`;

const ICONE_SOL = '<svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICONE_LUA = '<svg class="lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

/**
 * Monta o topo com a marca, a navegação entre BIs e o botão de tema.
 * @param {HTMLElement} el
 * @param {{atual: string, prefixo_paginas: string, prefixo_inicio: string}} opcoes
 */
function montar_topo(el, { atual, prefixo_paginas, prefixo_inicio }) {
  const itens = [
    `<li><a href="${prefixo_inicio}index.html"${atual === 'inicio' ? ' aria-current="page"' : ''}>Início</a></li>`,
    ...PAGINAS.map((p) => `<li><a href="${prefixo_paginas}${p.arquivo}"${p.id === atual ? ' aria-current="page"' : ''}>${html(p.curto)}</a></li>`),
  ];
  el.innerHTML = `<div class="topo-linha">
    <a class="marca" href="${prefixo_inicio}index.html">${LOGO}<span><span class="marca-nome">Aurora Log</span><span class="marca-sub">Portfólio de BIs de logística</span></span></a>
    <nav class="nav-bis" aria-label="BIs"><ul>${itens.join('')}</ul></nav>
    <button class="botao-tema" type="button" aria-label="Alternar tema">${ICONE_SOL}${ICONE_LUA}</button>
  </div>`;
}

/** Monta o rodapé com o aviso de dados fictícios. */
function montar_rodape(el, aviso) {
  el.innerHTML = `<span>Aurora Log é uma empresa fictícia. ${html(aviso)}</span>
    <span>HTML, CSS e JavaScript puros · gráficos com Apache ECharts</span>`;
}

// ------------------------------------------------------------------ filtros

function opcoes_periodo(modo, dominio, ref) {
  if (modo === 'foto') {
    return [
      ['tudo', 'Todos os vencimentos', dominio.inicio, dominio.fim],
      ['vencidos', 'Só vencidos', dominio.inicio, somar_dias(ref, -1)],
      ['hoje', 'Vence hoje', ref, ref],
      ['prox7', 'Próximos 7 dias', somar_dias(ref, 1), somar_dias(ref, 7)],
    ];
  }
  const relativo = (dias, rotulo) => [`u${dias}`, rotulo, somar_dias(ref, -(dias - 1)), ref];
  const meses = [];
  for (let mes = ref.slice(0, 7); mes >= dominio.inicio.slice(0, 7);) {
    const inicio = `${mes}-01` < dominio.inicio ? dominio.inicio : `${mes}-01`;
    const fim_mes = somar_dias(`${somar_dias(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
    const fim = fim_mes > ref ? ref : fim_mes;
    const nome = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    meses.push([`m${mes}`, nome.charAt(0).toUpperCase() + nome.slice(1), inicio, fim]);
    mes = somar_dias(`${mes}-01`, -1).slice(0, 7);
  }
  return [relativo(7, 'Últimos 7 dias'), relativo(14, 'Últimos 14 dias'), relativo(30, 'Últimos 30 dias'),
    relativo(45, 'Últimos 45 dias'), ['tudo', 'Todo o histórico (90 dias)', dominio.inicio, ref], ...meses];
}

/**
 * Monta a barra de filtros (período, unidade, UF/regional, cliente).
 * @returns {{estado: () => object, resumo: (texto: string) => void}}
 */
function montar_filtros(el, { dim_unidades, dim_clientes, regionais, modo, dominio, ref, padrao, aviso, ao_mudar }) {
  const periodos = opcoes_periodo(modo, dominio, ref);
  const ufs = [...new Set(dim_unidades.map((u) => u.uf))].sort();
  el.innerHTML = `
    <div class="campo"><label for="f-periodo">${modo === 'foto' ? 'Vencimento' : 'Período'}</label>
      <select id="f-periodo">${periodos.map(([v, r]) => `<option value="${v}">${html(r)}</option>`).join('')}
        <option value="pers">Personalizado…</option></select></div>
    <div class="campo campo-datas" id="f-datas">
      <div class="campo"><label for="f-inicio">De</label><input type="date" id="f-inicio" min="${dominio.inicio}" max="${dominio.fim}"></div>
      <div class="campo"><label for="f-fim">Até</label><input type="date" id="f-fim" min="${dominio.inicio}" max="${dominio.fim}"></div>
    </div>
    <div class="campo"><label for="f-local">UF / regional</label>
      <select id="f-local"><option value="">Todas</option>
        <optgroup label="Regionais">${Object.keys(regionais).map((r) => `<option value="R:${html(r)}">${html(r)}</option>`).join('')}</optgroup>
        <optgroup label="UF">${ufs.map((uf) => `<option value="UF:${uf}">${uf}</option>`).join('')}</optgroup>
      </select></div>
    <div class="campo"><label for="f-unidade">Unidade</label><select id="f-unidade"></select></div>
    <div class="campo"><label for="f-cliente">Cliente</label>
      <select id="f-cliente"><option value="">Todos os clientes</option>
        ${dim_clientes.map((c) => `<option value="${c.cliente_id}">${html(c.nome)}</option>`).join('')}</select></div>
    <div class="campo"><button type="button" class="botao-limpar" id="f-limpar">Limpar filtros</button></div>
    <p class="aviso-filtro" id="f-resumo" aria-live="polite"></p>
    ${aviso ? `<p class="aviso-filtro">${html(aviso)}</p>` : ''}`;

  const $ = (id) => el.querySelector(`#${id}`);
  const campos = { periodo: $('f-periodo'), inicio: $('f-inicio'), fim: $('f-fim'), local: $('f-local'),
    unidade: $('f-unidade'), cliente: $('f-cliente') };

  function preencher_unidades() {
    const local = campos.local.value;
    const atual = campos.unidade.value;
    const validas = dim_unidades.filter((u) => !local
      || (local.startsWith('R:') ? u.regional === local.slice(2) : u.uf === local.slice(3)));
    campos.unidade.innerHTML = `<option value="">Todas as unidades</option>${validas
      .map((u) => `<option value="${u.unidade_id}">${u.unidade_id} · ${html(u.nome)}</option>`).join('')}`;
    campos.unidade.value = validas.some((u) => u.unidade_id === atual) ? atual : '';
  }

  function aplicar_periodo() {
    const escolhido = periodos.find(([v]) => v === campos.periodo.value);
    $('f-datas').classList.toggle('visivel', campos.periodo.value === 'pers');
    if (escolhido) { campos.inicio.value = escolhido[2]; campos.fim.value = escolhido[3]; }
  }

  function limpar() {
    campos.periodo.value = padrao;
    campos.local.value = '';
    campos.cliente.value = '';
    preencher_unidades();
    campos.unidade.value = '';
    aplicar_periodo();
  }

  campos.periodo.addEventListener('change', () => { aplicar_periodo(); ao_mudar(); });
  for (const campo of [campos.inicio, campos.fim]) {
    campo.addEventListener('change', () => {
      if (campos.inicio.value && campos.fim.value && campos.inicio.value > campos.fim.value) {
        [campos.inicio.value, campos.fim.value] = [campos.fim.value, campos.inicio.value];
      }
      ao_mudar();
    });
  }
  campos.local.addEventListener('change', () => { preencher_unidades(); ao_mudar(); });
  campos.unidade.addEventListener('change', ao_mudar);
  campos.cliente.addEventListener('change', ao_mudar);
  $('f-limpar').addEventListener('click', () => { limpar(); ao_mudar(); });
  limpar();

  return {
    estado: () => ({
      inicio: campos.inicio.value || dominio.inicio,
      fim: campos.fim.value || dominio.fim,
      unidade: campos.unidade.value,
      local: campos.local.value,
      cliente: campos.cliente.value,
    }),
    resumo: (texto) => { $('f-resumo').textContent = texto; },
  };
}

/** Texto do período e da comparação, para a linha de resumo dos filtros. */
function texto_periodo(estado, anterior, modo) {
  if (modo === 'foto') {
    return `Vencimentos de ${data(estado.inicio)} a ${data(estado.fim)} · foto do dia, sem comparação com período anterior.`;
  }
  const comparacao = anterior
    ? `comparado com ${data_curta(anterior.inicio)} a ${data(anterior.fim)}`
    : 'sem período anterior completo nos dados, a comparação não é mostrada';
  return `Período: ${data(estado.inicio)} a ${data(estado.fim)} · ${comparacao}.`;
}

// ------------------------------------------------------------------ KPI

const TEXTO_SEMAFORO = { verde: '✓ Na meta', amarelo: '! Atenção', vermelho: '✕ Fora da meta' };

/** Selo do semáforo (cor + ícone + texto). */
function selo_semaforo(estado) {
  if (!estado) return '';
  return `<span class="semaforo semaforo-${estado}">${TEXTO_SEMAFORO[estado]}</span>`;
}

/**
 * Cartão de KPI.
 * @param {object} p
 * @param {string} p.codigo  ex.: "K01"
 * @param {string} p.titulo
 * @param {number|null} p.valor
 * @param {(v: number|null) => string} p.formato
 * @param {number|null} [p.anterior] valor do período anterior (undefined = não se aplica)
 * @param {'maior'|'menor'|'neutro'} [p.sentido] qual direção é melhor
 * @param {string} [p.sufixo_variacao] ex.: "p.p.", "d.u.", "h", "%"
 * @param {boolean} [p.relativa] variação em % do anterior (contagens)
 * @param {{meta:number, sentido:string, tolerancia_amarelo:number}} [p.meta]
 * @param {string} [p.detalhe]
 * @param {boolean} [p.principal]
 */
function cartao_kpi(p) {
  const sem = p.valor === null || p.valor === undefined;
  const partes = [];
  if (p.meta) {
    partes.push(`<span>Meta ${p.meta.sentido === 'maior' ? '≥' : '≤'} ${p.formato(p.meta.meta)}</span>`);
    partes.push(selo_semaforo(semaforo(p.valor, p.meta)));
  }
  if (p.anterior !== undefined) {
    const sentido = p.sentido || p.meta?.sentido || 'neutro';
    let dif = variacao(p.valor, p.anterior);
    if (dif !== null && p.relativa) dif = p.anterior ? (100 * dif) / p.anterior : null;
    if (dif === null) {
      partes.push('<span class="variacao neutra">sem comparação</span>');
    } else {
      const zero = Number(dif.toFixed(1)) === 0; // variação que some no arredondamento é neutra
      const classe = sentido === 'neutro' || zero ? 'neutra'
        : (dif > 0) === (sentido === 'maior') ? 'melhor' : 'pior';
      const seta = zero ? '•' : dif > 0 ? '▲' : '▼';
      partes.push(`<span class="variacao ${classe}" title="Diferença para o período anterior">${seta} ${diferenca(dif, p.relativa ? '%' : p.sufixo_variacao)} vs anterior</span>`);
    }
  }
  return `<article class="kpi${p.principal ? ' kpi-principal' : ''}" data-kpi="${p.codigo}">
    <div class="kpi-topo"><span class="kpi-titulo">${html(p.titulo)}</span><span class="kpi-codigo">${p.codigo}</span></div>
    <div class="kpi-valor${sem ? ' sem-dados' : ''}">${p.formato(p.valor)}</div>
    ${partes.length ? `<div class="kpi-linha">${partes.join('')}</div>` : ''}
    ${p.detalhe ? `<div class="kpi-detalhe">${p.detalhe}</div>` : ''}
  </article>`;
}

/** Legenda HTML: [{rotulo, cor, linha?}]. */
function legenda(itens) {
  return `<div class="legenda">${itens.map((i) => `<span><i class="${i.linha ? 'linha' : ''}" style="background:${i.cor}"></i>${html(i.rotulo)}</span>`).join('')}</div>`;
}

/**
 * Tabela simples.
 * @param {{titulo: string, num?: boolean, valor: (linha) => string}[]} colunas
 * @param {object[]} linhas
 */
function tabela(colunas, linhas, vazio = 'Nenhum registro para os filtros escolhidos.') {
  if (!linhas.length) return `<p class="sub">${vazio}</p>`;
  const cab = colunas.map((c) => `<th scope="col"${c.num ? ' class="num"' : ''}>${html(c.titulo)}</th>`).join('');
  const corpo = linhas.map((l) => `<tr>${colunas.map((c) => `<td${c.num ? ' class="num"' : ''}>${c.valor(l)}</td>`).join('')}</tr>`).join('');
  return `<div class="tabela-rolavel"><table><thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table></div>`;
}

Aurora.componentes = { montar_topo, montar_rodape, montar_filtros, texto_periodo, selo_semaforo, cartao_kpi, legenda, tabela };
})(globalThis.Aurora = globalThis.Aurora || {});
