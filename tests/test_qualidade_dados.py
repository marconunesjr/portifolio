"""Checagens de qualidade de docs/08 sobre os JSON gravados em src/dados/.

Q01-Q07, L01-L16 e P01-P08 rodam sobre as bases lidas do JSON (o que o site lê).
Q08 (reprodutibilidade) e Q09 (peso) estão em test_reprodutibilidade.py.
"""

from __future__ import annotations

import pytest

from qualidade import executar_checagens

IDS = [f"Q0{i}" for i in range(1, 8)] + [f"L{i:02d}" for i in range(1, 17)] + [f"P0{i}" for i in range(1, 9)]


@pytest.fixture(scope="module")
def resultados(bases: dict, config: dict) -> dict:
    """Resultado de todas as checagens, por identificador."""
    return {r.id: r for r in executar_checagens(bases, config)}


def test_todas_as_checagens_de_docs08_existem(resultados: dict) -> None:
    assert sorted(resultados) == sorted(IDS)


@pytest.mark.parametrize("ident", IDS)
def test_checagem(resultados: dict, ident: str) -> None:
    r = resultados[ident]
    assert r.ok, f"{r.id} {r.descricao}: {r.valor} (limite {r.limite})"


def test_volumes_de_linhas_por_base(bases: dict, config: dict) -> None:
    for nome, previsto in config["geracao"]["linhas"].items():
        assert len(bases[nome]) == previsto, nome


def test_pessoas_so_por_codigo(bases: dict) -> None:
    padroes = {
        ("bi1_entregas_courier", "courier_id"): r"^CR\d{4}$",
        ("bi3_produtividade_operador", "operador_id"): r"^OP\d{4}$",
        ("bi4_viagens", "motorista_id"): r"^MT\d{4}$",
    }
    for (base, coluna), padrao in padroes.items():
        assert bases[base][coluna].str.match(padrao).all(), f"{base}.{coluna}"
