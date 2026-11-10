"""Calendário de dias úteis: implementação única em Python.

Regras de docs/07:
- dia útil é segunda a sexta (lista em config.yaml), exceto feriado nacional;
- dias úteis entre duas datas = dias úteis depois da data inicial até a final,
  inclusive; datas iguais resultam em 0; se a final for anterior, o valor é negativo;
- a data de referência faz o papel de "hoje"; nada usa a data do sistema.
"""

from __future__ import annotations

from typing import Any

import numpy as np

DIAS_SEMANA = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]


class Calendario:
    """Calendário de dias úteis com feriados nacionais e data de referência."""

    def __init__(self, dias_uteis: list[str], feriados: list[str], data_referencia: str) -> None:
        self.mascara = "".join("1" if dia in dias_uteis else "0" for dia in DIAS_SEMANA)
        self.feriados = np.array(sorted(feriados), dtype="datetime64[D]")
        self.referencia = np.datetime64(data_referencia, "D")

    @classmethod
    def de_config(cls, config: dict[str, Any]) -> Calendario:
        """Cria o calendário a partir de config.yaml."""
        return cls(
            config["calendario"]["dias_uteis"],
            config["calendario"]["feriados_nacionais"],
            config["geracao"]["data_referencia"],
        )

    @staticmethod
    def dia_semana(datas: Any) -> np.ndarray:
        """Dia da semana de cada data: 1 = segunda ... 7 = domingo."""
        dias = np.asarray(datas, dtype="datetime64[D]").astype("int64")
        return (dias + 3) % 7 + 1  # 01/01/1970 foi uma quinta-feira

    def eh_feriado(self, datas: Any) -> np.ndarray:
        """Indica, para cada data, se é feriado nacional."""
        return np.isin(np.asarray(datas, dtype="datetime64[D]"), self.feriados)

    def eh_dia_util(self, datas: Any) -> np.ndarray:
        """Indica, para cada data, se é dia útil."""
        return np.is_busday(
            np.asarray(datas, dtype="datetime64[D]"), weekmask=self.mascara, holidays=self.feriados
        )

    def dias_uteis_entre(self, inicio: Any, fim: Any) -> np.ndarray:
        """Conta os dias úteis em (inicio, fim]; negativo se fim for anterior a inicio."""
        a = np.asarray(inicio, dtype="datetime64[D]") + 1
        b = np.asarray(fim, dtype="datetime64[D]") + 1
        return np.busday_count(a, b, weekmask=self.mascara, holidays=self.feriados)

    def somar_dias_uteis(self, datas: Any, quantidade: Any) -> np.ndarray:
        """Desloca cada data em N dias úteis (N negativo volta no tempo).

        Uma data que não é dia útil é antes ajustada para o dia útil seguinte
        (N >= 0) ou anterior (N < 0).
        """
        datas = np.asarray(datas, dtype="datetime64[D]")
        quantidade = np.asarray(quantidade)
        frente = np.busday_offset(
            datas, np.maximum(quantidade, 0), roll="forward",
            weekmask=self.mascara, holidays=self.feriados,
        )
        tras = np.busday_offset(
            datas, np.minimum(quantidade, 0), roll="backward",
            weekmask=self.mascara, holidays=self.feriados,
        )
        return np.where(quantidade >= 0, frente, tras)
