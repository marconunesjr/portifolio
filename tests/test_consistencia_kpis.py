"""Compara os KPIs gerais calculados por src/js/kpis.js (no Node) com os recálculos de etl/qualidade.py.

Garante que as checagens de plausibilidade (P01, P04, P06 etc.) medem o mesmo que o site mostra.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from qualidade import k12_geral, percentuais_por_grupo

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="Node.js não encontrado")


@pytest.fixture(scope="module")
def kpis_js(raiz: Path) -> dict:
    """KPIs gerais calculados pelo módulo JavaScript sobre os JSON de src/dados/."""
    execucao = subprocess.run(["node", str(raiz / "tests" / "apoio" / "kpis_gerais.mjs")], cwd=raiz,
                              capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(execucao.stdout)


def test_otd_k01(kpis_js: dict, bases: dict, config: dict) -> None:
    ref = config["geracao"]["data_referencia"]
    python = float(percentuais_por_grupo(bases, ref)["K01_geral"].iloc[0])
    assert kpis_js["K01"] == pytest.approx(python, abs=1e-9)


def test_aderencia_k12(kpis_js: dict, bases: dict) -> None:
    assert kpis_js["K12"] == pytest.approx(k12_geral(bases), abs=1e-9)


def test_sla_transito_k15(kpis_js: dict, bases: dict, config: dict) -> None:
    ref = config["geracao"]["data_referencia"]
    python = float(percentuais_por_grupo(bases, ref)["K15_geral"].iloc[0])
    assert kpis_js["K15"] == pytest.approx(python, abs=1e-9)


def test_sla_coleta_k20(kpis_js: dict, bases: dict, config: dict) -> None:
    ref = config["geracao"]["data_referencia"]
    python = float(percentuais_por_grupo(bases, ref)["K20_geral"].iloc[0])
    assert kpis_js["K20"] == pytest.approx(python, abs=1e-9)


def test_k07_por_unidade(kpis_js: dict, bases: dict, config: dict) -> None:
    ref = config["geracao"]["data_referencia"]
    python = percentuais_por_grupo(bases, ref)["K07"].to_dict()
    assert kpis_js["K07_por_unidade"] == pytest.approx(python, abs=1e-9)
