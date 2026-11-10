"""Configuração comum dos testes Python: caminhos, config e bases lidas do JSON."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
for pasta in ("etl", "scripts"):
    if str(RAIZ / pasta) not in sys.path:
        sys.path.insert(0, str(RAIZ / pasta))

import dados_io  # noqa: E402
import dicionario as dic  # noqa: E402
from configuracao import carregar_config  # noqa: E402


@pytest.fixture(scope="session")
def raiz() -> Path:
    """Pasta raiz do projeto."""
    return RAIZ


@pytest.fixture(scope="session")
def config() -> dict:
    """Conteúdo de config/config.yaml."""
    return carregar_config()


@pytest.fixture(scope="session")
def bases(config: dict) -> dict:
    """Bases gravadas em src/dados/, decodificadas como o site as lê."""
    pasta = RAIZ / config["caminhos"]["dados"]
    return {nome: dados_io.ler_base(pasta, nome) for nome in dic.BASES}
