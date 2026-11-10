"""Monta dist/ como cópia de src/, pronta para o GitHub Pages.

Uso: python scripts/montar_dist.py

Não há build: os arquivos do site são copiados como estão. Arquivos .gitkeep
ficam de fora e dist/ é recriada do zero a cada execução.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "src"
DESTINO = RAIZ / "dist"
IGNORAR = shutil.ignore_patterns(".gitkeep", "__pycache__", "*.pyc")


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
