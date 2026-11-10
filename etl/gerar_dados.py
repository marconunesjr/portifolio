"""Gera as bases sintéticas da Aurora Log em src/dados/.

Uso: python etl/gerar_dados.py

Passos: lê config/config.yaml, gera as bases com semente fixa, grava em JSON
colunar, relê o que foi serializado e roda as checagens de docs/08. Se alguma
checagem falhar, nada é gravado e o programa termina com código 1.
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dados_io  # noqa: E402
import dicionario as dic  # noqa: E402
from bases import gerar_todas  # noqa: E402
from configuracao import RAIZ, caminho_projeto, carregar_config  # noqa: E402
from qualidade import Resultado, executar_checagens  # noqa: E402

LIMITE_ARQUIVO_MB = 5.0
LIMITE_TOTAL_MB = 15.0


def serializar_bases(config: dict[str, Any]) -> dict[str, bytes]:
    """Gera todas as bases e devolve o conteúdo JSON de cada arquivo."""
    bases = gerar_todas(config)
    arquivos = {f"{nome}.json": dados_io.serializar(dados_io.codificar(df, dic.BASES[nome]))
                for nome, df in bases.items()}
    arquivos["config_site.json"] = dados_io.serializar(config_do_site(config))
    return arquivos


def config_do_site(config: dict[str, Any]) -> dict[str, Any]:
    """Parâmetros que o site precisa: datas, calendário, metas, faixas e dimensões."""
    return {
        "empresa": config["empresa"],
        "data_referencia": config["geracao"]["data_referencia"],
        "data_inicio": config["geracao"]["data_inicio"],
        "calendario": config["calendario"],
        "metas": config["metas"],
        "faixas": config["faixas"],
        "regionais": config["regionais"],
    }


def hash_arquivos(arquivos: dict[str, bytes]) -> str:
    """Hash único do conjunto de arquivos (Q08)."""
    resumo = hashlib.sha256()
    for nome in sorted(arquivos):
        resumo.update(nome.encode())
        resumo.update(arquivos[nome])
    return resumo.hexdigest()


def checagens_de_arquivo(arquivos: dict[str, bytes], reproduzido: dict[str, bytes]) -> list[Resultado]:
    """Q08 (reprodutibilidade) e Q09 (peso dos arquivos)."""
    mb = {nome: len(conteudo) / 1e6 for nome, conteudo in arquivos.items()}
    total = sum(mb.values())
    maior = max(mb.values())
    iguais = hash_arquivos(arquivos) == hash_arquivos(reproduzido)
    return [
        Resultado("Q08", "Duas gerações com a mesma semente são idênticas",
                  "idênticas" if iguais else "diferentes", "idênticas", iguais),
        Resultado("Q09", "Peso dos arquivos (total / maior), MB", f"{total:.2f} / {maior:.2f}",
                  f"<= {LIMITE_TOTAL_MB:.0f} / <= {LIMITE_ARQUIVO_MB:.0f}",
                  total <= LIMITE_TOTAL_MB and maior <= LIMITE_ARQUIVO_MB),
    ]


def ler_serializados(arquivos: dict[str, bytes]) -> dict[str, Any]:
    """Decodifica os bytes gerados, para validar exatamente o que o site vai ler."""
    return {nome: dados_io.decodificar(json.loads(arquivos[f"{nome}.json"]))
            for nome in dic.BASES}


def gravar(arquivos: dict[str, bytes], pasta: Path) -> None:
    """Grava os arquivos na pasta de dados."""
    pasta.mkdir(parents=True, exist_ok=True)
    for nome, conteudo in arquivos.items():
        (pasta / nome).write_bytes(conteudo)


def registrar(linhas: list[str]) -> None:
    """Mostra o log na tela e grava em logs/geracao.log (fora do Git)."""
    texto = "\n".join(linhas)
    print(texto)
    pasta = RAIZ / "logs"
    pasta.mkdir(exist_ok=True)
    (pasta / "geracao.log").write_text(texto + "\n", encoding="utf-8")


def main() -> int:
    """Executa a geração completa e devolve o código de saída."""
    sys.stdout.reconfigure(errors="replace")
    inicio = time.perf_counter()
    config = carregar_config()
    arquivos = serializar_bases(config)
    bases = ler_serializados(arquivos)
    resultados = executar_checagens(bases, config)
    resultados += checagens_de_arquivo(arquivos, serializar_bases(config))
    duracao = time.perf_counter() - inicio

    log = [f"Geração de dados sintéticos: semente {config['geracao']['semente']}, "
           f"referência {config['geracao']['data_referencia']}", "", "Linhas por base:"]
    log += [f"  {nome:28s} {len(df):>8,d}".replace(",", ".") for nome, df in bases.items()]
    log += ["", "Checagens (docs/08):"]
    log += [f"  {'OK   ' if r.ok else 'FALHA'} {r.id} {r.descricao}: {r.valor} (limite {r.limite})"
            for r in resultados]
    falhas = [r for r in resultados if not r.ok]
    log += ["", f"Duração: {duracao:.1f} s"]
    if falhas:
        log.append(f"ERRO: {len(falhas)} checagem(ns) falharam ({', '.join(r.id for r in falhas)}). "
                   "Nenhum arquivo foi gravado.")
        registrar(log)
        return 1
    pasta = caminho_projeto(config["caminhos"]["dados"])
    gravar(arquivos, pasta)
    log.append(f"{len(arquivos)} arquivos gravados em {config['caminhos']['dados']}/.")
    registrar(log)
    return 0


if __name__ == "__main__":
    sys.exit(main())
