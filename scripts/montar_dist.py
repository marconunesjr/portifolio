"""Monta dist/ como cópia de src/, pronta para o GitHub Pages.

Uso: python scripts/montar_dist.py

Não há build: os arquivos do site são copiados como estão. Ficam de fora os
.gitkeep e os .json de src/dados/ (o site lê os .js equivalentes; os .json servem
aos testes). dist/ é recriada do zero a cada execução.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "src"
DESTINO = RAIZ / "dist"
_PADRAO = shutil.ignore_patterns(".gitkeep", "__pycache__", "*.pyc")


def IGNORAR(pasta: str, nomes: list[str]) -> set[str]:  # noqa: N802 (usado como constante por copytree)
    """Ignora arquivos auxiliares e os .json de dados (o site publicado lê só os .js)."""
    ignorados = set(_PADRAO(pasta, nomes))
    if Path(pasta).name == "dados":
        ignorados |= {n for n in nomes if n.endswith(".json")}
    return ignorados


def montar(origem: Path = ORIGEM, destino: Path = DESTINO) -> int:
    """Copia origem para destino e devolve a quantidade de arquivos copiados."""
    if destino.exists():
        for item in destino.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
    shutil.copytree(origem, destino, ignore=IGNORAR, dirs_exist_ok=True)
    (destino / ".nojekyll").write_text("", encoding="utf-8")
    return sum(1 for arquivo in destino.rglob("*") if arquivo.is_file())


def main() -> int:
    """Executa a cópia e informa o resultado."""
    quantidade = montar()
    print(f"dist/ montada a partir de src/: {quantidade} arquivos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
