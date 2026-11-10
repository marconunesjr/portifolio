"""Gravação e leitura das bases em JSON colunar.

Formato (lido também por src/js/dados.js):
    {"base": nome, "linhas": n,
     "colunas": [{"nome": ..., "tipo": ...}, ...],
     "dados": {coluna: [valores] | {"dominio": [...], "indices": [...]}}}

Colunas de texto ou data com poucos valores distintos são gravadas como
domínio + índices, o que reduz o arquivo sem perder informação. Nulos são null.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from dicionario import Base

LIMITE_DOMINIO = 2000  # até quantos valores distintos vale codificar por domínio


def _para_lista(serie: pd.Series, tipo: str) -> list[Any]:
    """Converte uma coluna em lista de valores JSON nativos."""
    if tipo in ("data", "datahora"):
        unidade = "D" if tipo == "data" else "m"
        valores = np.datetime_as_string(serie.to_numpy().astype(f"datetime64[{unidade}]"),
                                        unit=unidade)
        return [None if v == "NaT" else v for v in valores.tolist()]
    if tipo == "inteiro":
        return [int(v) for v in serie.to_numpy()]
    if tipo == "decimal":
        return [round(float(v), 2) for v in serie.to_numpy()]
    if tipo == "booleano":
        return [bool(v) for v in serie.to_numpy()]
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else str(v)
            for v in serie.tolist()]


def codificar(df: pd.DataFrame, base: Base) -> dict[str, Any]:
    """Converte um DataFrame no objeto JSON colunar da base."""
    dados: dict[str, Any] = {}
    for coluna in base.colunas:
        valores = _para_lista(df[coluna.nome], coluna.tipo)
        distintos = sorted({v for v in valores if v is not None})
        if (coluna.tipo in ("texto", "data", "datahora") and len(valores) > 50
                and len(distintos) <= LIMITE_DOMINIO):
            posicao = {v: i for i, v in enumerate(distintos)}
            dados[coluna.nome] = {
                "dominio": distintos,
                "indices": [None if v is None else posicao[v] for v in valores],
            }
        else:
            dados[coluna.nome] = valores
    return {
        "base": base.nome,
        "linhas": len(df),
        "colunas": [{"nome": c.nome, "tipo": c.tipo} for c in base.colunas],
        "dados": dados,
    }


def serializar(objeto: dict[str, Any]) -> bytes:
    """Serializa de forma determinística (mesma entrada, mesmos bytes)."""
    texto = json.dumps(objeto, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    return (texto + "\n").encode("utf-8")


def decodificar(objeto: dict[str, Any]) -> pd.DataFrame:
    """Reconstrói o DataFrame a partir do JSON colunar (datas como datetime64)."""
    colunas: dict[str, Any] = {}
    for coluna in objeto["colunas"]:
        bruto = objeto["dados"][coluna["nome"]]
        if isinstance(bruto, dict):
            dominio = bruto["dominio"]
            valores = [None if i is None else dominio[i] for i in bruto["indices"]]
        else:
            valores = bruto
        if coluna["tipo"] in ("data", "datahora"):
            colunas[coluna["nome"]] = pd.to_datetime(pd.Series(valores, dtype="object"))
        else:
            colunas[coluna["nome"]] = pd.Series(valores, dtype="object" if coluna["tipo"] in (
                "texto",) else None)
    return pd.DataFrame(colunas)


def ler_base(pasta: Path, nome: str) -> pd.DataFrame:
    """Lê uma base gravada em JSON colunar."""
    with open(pasta / f"{nome}.json", encoding="utf-8") as arquivo:
        return decodificar(json.load(arquivo))
