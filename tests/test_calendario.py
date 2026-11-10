"""Calendário em Python: dia útil, feriados e dias úteis entre datas (docs/07)."""

from __future__ import annotations

import numpy as np
import pytest

from calendario import Calendario


@pytest.fixture(scope="module")
def cal(config: dict) -> Calendario:
    """Calendário lido de config.yaml."""
    return Calendario.de_config(config)


def test_referencia_vem_de_config(cal: Calendario, config: dict) -> None:
    assert str(cal.referencia) == config["geracao"]["data_referencia"]


def test_dia_semana(cal: Calendario) -> None:
    assert cal.dia_semana("2026-08-03") == 1  # segunda
    assert cal.dia_semana("2026-10-31") == 6  # sábado
    assert cal.dia_semana("2026-11-01") == 7  # domingo


@pytest.mark.parametrize("data", ["2026-09-07", "2026-10-12", "2026-11-02"])
def test_feriados_nao_sao_dia_util(cal: Calendario, data: str) -> None:
    assert cal.eh_feriado(data)
    assert not cal.eh_dia_util(data)


def test_fim_de_semana_nao_e_dia_util(cal: Calendario) -> None:
    assert not cal.eh_dia_util("2026-10-31")
    assert cal.eh_dia_util("2026-10-30")


@pytest.mark.parametrize(
    ("inicio", "fim", "esperado"),
    [
        ("2026-10-05", "2026-10-05", 0),   # datas iguais
        ("2026-10-05", "2026-10-06", 1),
        ("2026-10-09", "2026-10-13", 1),   # sexta → terça com feriado na segunda
        ("2026-10-30", "2026-10-31", 0),   # sexta → sábado
        ("2026-10-06", "2026-10-13", 4),   # lead time do caso C de tests/dados_referencia
        ("2026-10-13", "2026-10-09", -1),  # ordem invertida
    ],
)
def test_dias_uteis_entre(cal: Calendario, inicio: str, fim: str, esperado: int) -> None:
    assert int(cal.dias_uteis_entre(inicio, fim)) == esperado


def test_somar_dias_uteis_pula_feriado(cal: Calendario) -> None:
    assert str(cal.somar_dias_uteis(np.datetime64("2026-10-09"), 1)) == "2026-10-13"
    assert str(cal.somar_dias_uteis(np.datetime64("2026-10-13"), -1)) == "2026-10-09"


def test_dim_calendario_coerente(cal: Calendario, bases: dict) -> None:
    dias = bases["dim_calendario"]
    datas = dias["data"].to_numpy().astype("datetime64[D]")
    assert list(dias["dia_util"]) == list(cal.eh_dia_util(datas))
    assert list(dias["feriado"]) == list(cal.eh_feriado(datas))
    assert len(dias) == 92
