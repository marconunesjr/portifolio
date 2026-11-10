"""Servidor HTTP local para conferir o site, com tipos MIME corretos e subpasta.

Uso:
    python scripts/servidor.py                      # serve dist/ em http://127.0.0.1:8000/portifolio/
    python scripts/servidor.py --pasta src --porta 8765 --subpasta ""

Por que não só "python -m http.server": no Windows ele pode entregar .js como
text/plain (lido do registro), e o navegador recusa módulos JavaScript assim.
A subpasta imita o GitHub Pages (https://marconunesjr.github.io/portifolio/).
"""

from __future__ import annotations

import argparse
import functools
import posixpath
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
}


class Manipulador(SimpleHTTPRequestHandler):
    """Serve arquivos estáticos sob um prefixo de URL, com MIME fixo."""

    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, **TIPOS}
    prefixo = ""

    def translate_path(self, path: str) -> str:
        """Remove o prefixo da subpasta; fora dele, devolve um caminho inexistente."""
        caminho = path.split("?", 1)[0].split("#", 1)[0]
        if self.prefixo:
            if caminho == self.prefixo:
                caminho = self.prefixo + "/"
            if not caminho.startswith(self.prefixo + "/"):
                return str(Path(self.directory) / "__fora_da_subpasta__")
            caminho = caminho[len(self.prefixo):]
        return super().translate_path(posixpath.normpath(caminho) + ("/" if caminho.endswith("/") else ""))

    def log_message(self, formato: str, *args: object) -> None:  # silencioso
        """Não imprime cada requisição."""


def criar_servidor(pasta: Path, porta: int = 0, subpasta: str = "portifolio") -> ThreadingHTTPServer:
    """Cria o servidor (porta 0 = porta livre qualquer)."""
    prefixo = f"/{subpasta.strip('/')}" if subpasta.strip("/") else ""
    classe = type("ManipuladorConfigurado", (Manipulador,), {"prefixo": prefixo})
    manipulador = functools.partial(classe, directory=str(pasta))
    return ThreadingHTTPServer(("127.0.0.1", porta), manipulador)


def iniciar_em_segundo_plano(pasta: Path, subpasta: str = "portifolio") -> tuple[ThreadingHTTPServer, str]:
    """Inicia o servidor numa thread e devolve (servidor, url_base)."""
    servidor = criar_servidor(pasta, 0, subpasta)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    prefixo = f"/{subpasta.strip('/')}/" if subpasta.strip("/") else "/"
    return servidor, f"http://127.0.0.1:{servidor.server_address[1]}{prefixo}"


def main() -> None:
    """Lê os argumentos e serve até Ctrl+C."""
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pasta", default="dist", help="pasta a servir (padrão: dist)")
    parser.add_argument("--porta", type=int, default=8000)
    parser.add_argument("--subpasta", default="portifolio", help='prefixo da URL ("" para a raiz)')
    args = parser.parse_args()
    servidor = criar_servidor(RAIZ / args.pasta, args.porta, args.subpasta)
    prefixo = f"/{args.subpasta.strip('/')}/" if args.subpasta.strip("/") else "/"
    print(f"Servindo {args.pasta}/ em http://127.0.0.1:{args.porta}{prefixo} (Ctrl+C para parar)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
