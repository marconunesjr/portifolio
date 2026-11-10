"""Teste de fumaça das 6 páginas com Playwright, servindo dist/ dentro da subpasta /portifolio/.

Para cada página: abre sem erro no console nem requisição com falha, mostra a pergunta, a data
de referência, o aviso de dados fictícios e a nota metodológica; não tem rolagem horizontal
em 360 px e em 1920 px; e mudar os filtros recalcula os KPIs. Também confere a navegação nos
dois sentidos entre a página inicial e os BIs.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

import montar_dist
import servidor

playwright_api = pytest.importorskip("playwright.sync_api")

PAGINAS = {
    "inicio": "index.html",
    "bi1": "paginas/bi1_indicadores_operacionais.html",
    "bi2": "paginas/bi2_piso_vencimento.html",
    "bi3": "paginas/bi3_producao_do_dia.html",
    "bi4": "paginas/bi4_transporte_transferencias.html",
    "bi5": "paginas/bi5_sla_coletas.html",
}
BIS = [p for p in PAGINAS if p != "inicio"]
PRINCIPAL = {"bi1": "K01", "bi2": "K07", "bi3": "K12", "bi4": "K15", "bi5": "K20"}


@pytest.fixture(scope="module")
def url_base(raiz: Path) -> Iterator[str]:
    """Monta dist/ e serve em http://127.0.0.1:<porta>/portifolio/."""
    montar_dist.montar()
    srv, url = servidor.iniciar_em_segundo_plano(raiz / "dist", "portifolio")
    yield url
    srv.shutdown()


@pytest.fixture(scope="module")
def navegador() -> Iterator[object]:
    """Chromium sem interface."""
    with playwright_api.sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()


class Monitor:
    """Coleta erros de console, de página e requisições com falha."""

    def __init__(self, pagina: object) -> None:
        self.erros: list[str] = []
        pagina.on("console", lambda m: self.erros.append(f"console: {m.text}") if m.type == "error" else None)
        pagina.on("pageerror", lambda e: self.erros.append(f"pageerror: {e}"))
        pagina.on("requestfailed", lambda r: self.erros.append(f"falha: {r.url}"))
        pagina.on("response", lambda r: self.erros.append(f"HTTP {r.status}: {r.url}") if r.status >= 400 else None)


def abrir(navegador: object, url: str, largura: int = 1366) -> tuple[object, Monitor]:
    """Abre a página e espera os KPIs (ou os cartões da inicial) aparecerem."""
    contexto = navegador.new_context(viewport={"width": largura, "height": 900})
    pagina = contexto.new_page()
    monitor = Monitor(pagina)
    pagina.goto(url, wait_until="networkidle")
    if "index.html" in url:
        pagina.wait_for_selector(".cartao-bi")
    else:
        pagina.wait_for_selector(".kpi", timeout=15000)
        pagina.wait_for_selector(".grafico svg", timeout=15000)
    return pagina, monitor


@pytest.mark.parametrize("pagina_id", list(PAGINAS))
@pytest.mark.parametrize("largura", [360, 1920])
def test_pagina_abre_sem_erros_e_sem_rolagem_horizontal(navegador: object, url_base: str, pagina_id: str,
                                                        largura: int) -> None:
    pagina, monitor = abrir(navegador, url_base + PAGINAS[pagina_id], largura)
    pagina.wait_for_timeout(400)
    largura_doc = pagina.evaluate("document.documentElement.scrollWidth")
    assert largura_doc <= largura, f"rolagem horizontal: {largura_doc}px > {largura}px"
    texto = pagina.inner_text("body")
    assert "Dados fictícios" in texto
    assert "31/10/2026" in texto
    if pagina_id != "inicio":
        assert pagina.locator(".pergunta").inner_text().endswith("?")
        assert pagina.locator("details.nota").count() == 1
        assert pagina.locator(f'[data-kpi="{PRINCIPAL[pagina_id]}"] .semaforo').count() == 1
    assert not monitor.erros, "\n".join(monitor.erros)
    pagina.context.close()


@pytest.mark.parametrize("pagina_id", BIS)
def test_filtros_recalculam_kpis(navegador: object, url_base: str, pagina_id: str) -> None:
    pagina, monitor = abrir(navegador, url_base + PAGINAS[pagina_id])
    kpis = lambda: pagina.inner_text("#kpis")  # noqa: E731
    inicial = kpis()
    graficos_iniciais = pagina.inner_html("#area-bi .paineis")
    mudancas = [
        ("#f-local", "R:Nordeste"),
        ("#f-unidade", "SSA"),
        ("#f-cliente", "CL04"),
        ("#f-periodo", "tudo" if pagina_id != "bi2" else "vencidos"),
    ]
    anterior = inicial
    for seletor, valor in mudancas:
        pagina.select_option(seletor, valor)
        pagina.wait_for_timeout(250)
        atual = kpis()
        assert atual != anterior, f"{seletor}={valor} não alterou os KPIs"
        anterior = atual
    assert pagina.inner_html("#area-bi .paineis") != graficos_iniciais
    pagina.click("#f-limpar")
    pagina.wait_for_timeout(250)
    assert kpis() == inicial
    assert not monitor.erros, "\n".join(monitor.erros)
    pagina.context.close()


def test_navegacao_nos_dois_sentidos(navegador: object, url_base: str) -> None:
    pagina, monitor = abrir(navegador, url_base + "index.html")
    for pagina_id in BIS:
        pagina.click(f'a.cartao-bi[href="{PAGINAS[pagina_id]}"]')
        pagina.wait_for_selector(".kpi")
        assert pagina.url.endswith(PAGINAS[pagina_id])
        pagina.click(".nav-bis a:has-text('Início')")
        pagina.wait_for_selector(".cartao-bi")
        assert pagina.url.endswith("/portifolio/index.html")
    # de um BI para outro com 1 clique
    pagina.click(".nav-bis a:has-text('Transporte')")
    pagina.wait_for_selector(".kpi")
    pagina.click(".nav-bis a:has-text('Coletas')")
    pagina.wait_for_selector(".kpi")
    assert pagina.url.endswith(PAGINAS["bi5"])
    assert not monitor.erros, "\n".join(monitor.erros)
    pagina.context.close()


def test_tema_escuro_alterna(navegador: object, url_base: str) -> None:
    pagina, monitor = abrir(navegador, url_base + PAGINAS["bi1"])
    antes = pagina.evaluate("document.documentElement.dataset.temaEfetivo")
    pagina.click(".botao-tema")
    pagina.wait_for_timeout(200)
    depois = pagina.evaluate("document.documentElement.dataset.temaEfetivo")
    assert {antes, depois} == {"light", "dark"}
    assert not monitor.erros, "\n".join(monitor.erros)
    pagina.context.close()


def test_sem_cdn_os_kpis_continuam(navegador: object, url_base: str) -> None:
    """Se o CDN do ECharts falhar, a página mostra os KPIs e avisa nos gráficos (ADR-016)."""
    contexto = navegador.new_context(viewport={"width": 1366, "height": 900})
    contexto.route("**/cdn.jsdelivr.net/**", lambda rota: rota.abort())
    pagina = contexto.new_page()
    erros_js: list[str] = []
    pagina.on("pageerror", lambda e: erros_js.append(str(e)))
    pagina.goto(url_base + PAGINAS["bi1"], wait_until="networkidle")
    pagina.wait_for_selector('[data-kpi="K01"]')
    assert "Gráfico indisponível" in pagina.inner_text("#area-bi")
    assert pagina.locator(".erro").count() == 0
    assert not erros_js, "\n".join(erros_js)
    contexto.close()


@pytest.mark.parametrize("pasta", ["dist", "src"])
@pytest.mark.parametrize("pagina_id", list(PAGINAS))
def test_abre_direto_do_disco_rapido_e_sem_erros(navegador: object, raiz: Path, pasta: str, pagina_id: str) -> None:
    """Abrir o arquivo com duplo clique (file://) funciona e mostra os KPIs em até 3 s (RNF02)."""
    montar_dist.montar()
    url = (raiz / pasta / PAGINAS[pagina_id]).as_uri()
    contexto = navegador.new_context(viewport={"width": 1366, "height": 900})
    pagina = contexto.new_page()
    monitor = Monitor(pagina)
    pagina.goto(url)
    seletor = ".cartao-bi" if pagina_id == "inicio" else ".kpi"
    pagina.wait_for_selector(seletor, timeout=3000)
    if pagina_id != "inicio":
        pagina.wait_for_selector(".grafico svg", timeout=5000)
        assert pagina.locator("#carregando").count() == 0
    else:
        pagina.wait_for_function("document.querySelector('[data-referencia]').textContent === '31/10/2026'")
    assert not monitor.erros, "\n".join(monitor.erros)
    contexto.close()
