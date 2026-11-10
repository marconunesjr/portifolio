"""Leitura de config/config.yaml, a única fonte de parâmetros do projeto."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

RAIZ = Path(__file__).resolve().parent.parent
ARQUIVO_CONFIG = RAIZ / "config" / "config.yaml"


def carregar_config(caminho: Path = ARQUIVO_CONFIG) -> dict[str, Any]:
    """Lê o YAML de configuração e devolve um dicionário."""
    with open(caminho, encoding="utf-8") as arquivo:
        return yaml.safe_load(arquivo)


def caminho_projeto(relativo: str) -> Path:
    """Converte um caminho relativo de config.yaml em caminho absoluto."""
    return RAIZ / relativo


def regional_por_unidade(config: dict[str, Any]) -> dict[str, str]:
    """Mapeia cada unidade para a sua regional."""
    return {
        unidade: regional
        for regional, unidades in config["regionais"].items()
        for unidade in unidades
    }
