"""Checagem de anonimização (docs/08, RF10): nenhum termo proibido nos arquivos versionados.

A lista fica em referencias/termos_proibidos.txt, fora do Git; sem ela (ex.: no CI) o teste é pulado.
"""

from __future__ import annotations

from pathlib import Path

import pytest

ALVOS = ["src", "dist", "etl", "tests", "docs", "config", "scripts", ".github",
         "README.md", "CLAUDE.md", "CHANGELOG.md", "pyproject.toml", "package.json"]
EXTENSOES = {".py", ".js", ".mjs", ".json", ".html", ".css", ".md", ".yaml", ".yml", ".toml", ".txt", ".svg"}


def _arquivos(raiz: Path) -> list[Path]:
    arquivos: list[Path] = []
    for alvo in ALVOS:
        caminho = raiz / alvo
        if caminho.is_file():
            arquivos.append(caminho)
        elif caminho.is_dir():
            arquivos += [a for a in caminho.rglob("*") if a.is_file() and a.suffix in EXTENSOES
                         and "vendor" not in a.parts and "__pycache__" not in a.parts]
    return arquivos


def test_nenhum_termo_proibido(raiz: Path) -> None:
    lista = raiz / "referencias" / "termos_proibidos.txt"
    if not lista.exists():
        pytest.skip("referencias/termos_proibidos.txt não está presente (arquivo fora do Git)")
    termos = [t.strip().lower() for t in lista.read_text(encoding="utf-8").splitlines() if t.strip()]
    achados = []
    for arquivo in _arquivos(raiz):
        texto = arquivo.read_text(encoding="utf-8", errors="ignore").lower()
        achados += [f"{arquivo.relative_to(raiz)}: termo nº {i + 1}" for i, t in enumerate(termos) if t in texto]
    assert not achados, "Termos proibidos encontrados:\n" + "\n".join(achados)
