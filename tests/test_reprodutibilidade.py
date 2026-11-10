"""Q08 e Q09: o gerador é reprodutível, os arquivos versionados batem com ele e o peso cabe no limite."""

from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

import pytest

import gerar_dados


def _hashes(pasta: Path) -> dict[str, str]:
    return {a.name: hashlib.sha256(a.read_bytes()).hexdigest() for a in sorted(pasta.glob("*.json"))}


@pytest.fixture(scope="module")
def gerados(config: dict) -> dict[str, bytes]:
    """Arquivos gerados em memória a partir de config.yaml."""
    return gerar_dados.serializar_bases(config)


def test_mesma_semente_mesmos_bytes(config: dict, gerados: dict[str, bytes]) -> None:
    assert gerar_dados.hash_arquivos(gerados) == gerar_dados.hash_arquivos(gerar_dados.serializar_bases(config))


def test_arquivos_versionados_iguais_ao_gerador(raiz: Path, config: dict, gerados: dict[str, bytes]) -> None:
    pasta = raiz / config["caminhos"]["dados"]
    for nome, conteudo in gerados.items():
        assert (pasta / nome).read_bytes() == conteudo, f"{nome} desatualizado: rode python etl/gerar_dados.py"


def test_peso_dos_arquivos(gerados: dict[str, bytes]) -> None:
    tamanhos = [len(c) / 1e6 for c in gerados.values()]
    assert sum(tamanhos) <= gerar_dados.LIMITE_TOTAL_MB
    assert max(tamanhos) <= gerar_dados.LIMITE_ARQUIVO_MB


@pytest.mark.lento
def test_duas_execucoes_do_script_geram_arquivos_identicos(raiz: Path, config: dict) -> None:
    pasta = raiz / config["caminhos"]["dados"]
    hashes = []
    for _ in range(2):
        execucao = subprocess.run([sys.executable, str(raiz / "etl" / "gerar_dados.py")], cwd=raiz,
                                  capture_output=True, text=True, encoding="utf-8", errors="replace")
        assert execucao.returncode == 0, execucao.stdout + execucao.stderr
        hashes.append(_hashes(pasta))
    assert hashes[0] == hashes[1]
