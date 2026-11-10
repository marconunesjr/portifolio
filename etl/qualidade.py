"""Checagens de docs/08 (gerais Q, logísticas L e de plausibilidade P).

As checagens rodam sobre as bases já decodificadas do JSON, isto é, sobre o
que o site vai ler. Os percentuais de L14 e P01-P06 são recalculados aqui só
para validar os dados gerados; a implementação oficial dos KPIs é src/js/kpis.js,
e um teste compara os dois resultados (tests/test_consistencia_kpis.py).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

import dicionario as dic
from calendario import Calendario


@dataclass
class Resultado:
    """Resultado de uma checagem."""

    id: str
    descricao: str
    valor: Any
    limite: str
    ok: bool


Bases = dict[str, pd.DataFrame]


# ------------------------------------------------------------ utilidades

def _janela(config: dict[str, Any]) -> dict[str, np.datetime64]:
    """Datas de início, referência e fim do dia de referência."""
    inicio = np.datetime64(config["geracao"]["data_inicio"], "D")
    ref = np.datetime64(config["geracao"]["data_referencia"], "D")
    return {"inicio": inicio, "ref": ref, "fim": (ref + 1).astype("datetime64[m]")}


def _fora(serie: pd.Series, minimo: Any, maximo: Any) -> int:
    """Conta valores não nulos fora de [minimo, maximo]."""
    valores = serie.dropna()
    return int(((valores < pd.Timestamp(minimo)) | (valores > pd.Timestamp(maximo))).sum())


def _pct(numerador: float, denominador: float) -> float | None:
    """Percentual com proteção contra denominador zero."""
    return None if denominador == 0 else 100.0 * numerador / denominador


def _tipo_ok(serie: pd.Series, tipo: str) -> bool:
    """Confere se os valores não nulos têm o tipo do dicionário."""
    valores = serie.dropna()
    if tipo in ("data", "datahora"):
        return pd.api.types.is_datetime64_any_dtype(serie)
    if tipo == "inteiro":
        return all(isinstance(v, (int, np.integer)) and not isinstance(v, bool) for v in valores)
    if tipo == "decimal":
        return all(isinstance(v, (int, float, np.number)) and not isinstance(v, bool)
                   for v in valores)
    if tipo == "booleano":
        return all(isinstance(v, (bool, np.bool_)) for v in valores)
    return all(isinstance(v, str) for v in valores)


# ------------------------------------------------------------ gerais

def q01_colunas_tipos(bases: Bases) -> int:
    """Divergências de colunas (nome, ordem) e tipos em relação ao dicionário."""
    erros = 0
    for nome, base in dic.BASES.items():
        df = bases[nome]
        if list(df.columns) != base.nomes:
            erros += 1
            continue
        erros += sum(not _tipo_ok(df[c.nome], c.tipo) for c in base.colunas)
    return erros


def q02_nulos(bases: Bases) -> int:
    """Nulos em colunas obrigatórias."""
    return sum(int(bases[n][c.nome].isna().sum())
               for n, b in dic.BASES.items() for c in b.colunas if not c.nulo)


def q03_duplicidade(bases: Bases) -> int:
    """Linhas duplicadas na chave de cada base."""
    return sum(int(bases[n].duplicated(list(b.chave)).sum()) for n, b in dic.BASES.items())


def q04_chaves_estrangeiras(bases: Bases) -> int:
    """Chaves estrangeiras sem correspondência."""
    chave_dim = {"dim_unidades": "unidade_id", "dim_clientes": "cliente_id",
                 "bi4_viagens": "viagem_id"}
    erros = 0
    for nome, base in dic.BASES.items():
        for coluna, dim in base.fks.items():
            validos = set(bases[dim][chave_dim[dim]])
            erros += int((~bases[nome][coluna].dropna().isin(validos)).sum())
    return erros


def q05_datas_na_janela(bases: Bases, config: dict[str, Any]) -> int:
    """Datas fora da janela de cada base."""
    j = _janela(config)
    ini, ref = j["inicio"], j["ref"]
    d = np.timedelta64
    regras: list[tuple[str, str, Any, Any]] = [
        ("dim_calendario", "data", ini, ref + d(2, "D")),
        ("bi1_ctes", "limite_cliente", ini, ref),
        ("bi1_ctes", "emissao", ini - d(15, "D"), ref),
        ("bi1_ctes", "chegada", ini - d(15, "D"), ref),
        ("bi1_ctes", "tentativa_1", ini - d(15, "D"), ref),
        ("bi1_ctes", "realizado", ini - d(15, "D"), ref),
        ("bi1_emissoes_dia", "data", ini, ref),
        ("bi1_entregas_courier", "data", ini, ref),
        ("bi2_piso", "data_evento", ref - d(30, "D"), ref),
        ("bi2_piso", "transferido_em", ref - d(30, "D"), ref),
        ("bi2_piso", "limite_cliente", ref - d(20, "D"), ref + d(10, "D")),
        ("bi3_producao_hora", "data", ini, ref),
        ("bi3_produtividade_operador", "data", ini, ref),
        ("bi3_forecast", "data", ini, ref),
        ("bi4_viagens", "saida_prevista", ini, j["fim"] - d(1, "m")),
        ("bi4_viagens", "saida_real", ini, j["fim"]),
        ("bi4_viagens", "termino_real", ini, j["fim"]),
        ("bi4_viagens", "termino_previsto", ini, ref + d(4, "D")),
        ("bi4_manifestos", "data_transferencia", ini, ref),
        ("bi5_coletas", "solicitacao", ini, ref),
        ("bi5_coletas", "deposito_ponto", ini, ref),
        ("bi5_coletas", "retirada_motorista", ini, ref),
        ("bi5_coletas", "prazo", ini, ref + d(7, "D")),
    ]
    return sum(_fora(bases[b][c], mn, mx) for b, c, mn, mx in regras)


def q06_categorias(bases: Bases, config: dict[str, Any]) -> int:
    """Valores fora da lista do dicionário (e UFs fora das unidades)."""
    erros = 0
    for nome, base in dic.BASES.items():
        for coluna in base.colunas:
            if coluna.valores:
                erros += int((~bases[nome][coluna.nome].dropna().isin(coluna.valores)).sum())
    ufs = {u["uf"] for u in config["unidades"].values()}
    erros += int((~bases["bi1_ctes"]["uf_destino"].isin(ufs)).sum())
    erros += int((~bases["bi3_producao_hora"]["hora"].astype(int).between(6, 21)).sum())
    return erros


def q07_volume_linhas(bases: Bases, config: dict[str, Any]) -> dict[str, int]:
    """Bases com volume fora de ±10% do previsto (devolve as divergentes)."""
    previstas = dict(dic.LINHAS_PREVISTAS) | config["geracao"]["linhas"]
    return {n: len(bases[n]) for n, p in previstas.items()
            if abs(len(bases[n]) - p) > 0.1 * p}


# ------------------------------------------------------------ logísticas

def l01_eventos_fora_de_ordem(b: Bases) -> int:
    """emissao <= chegada <= tentativa_1 <= realizado (ignorando nulos)."""
    c = b["bi1_ctes"]
    ordem = ["emissao", "chegada", "tentativa_1", "realizado"]
    erros = pd.Series(False, index=c.index)
    for i, a in enumerate(ordem):
        for depois in ordem[i + 1:]:
            erros |= c[a].notna() & c[depois].notna() & (c[depois] < c[a])
    return int(erros.sum())


def l02_lead_time(b: Bases, cal: Calendario, maximo: int) -> int:
    """Lead time negativo ou acima do máximo de dias úteis."""
    c = b["bi1_ctes"].dropna(subset=["realizado"])
    lt = cal.dias_uteis_entre(c["emissao"].to_numpy(), c["realizado"].to_numpy())
    return int(((lt < 0) | (lt > maximo)).sum())


def l03_status_realizado(b: Bases) -> int:
    """Entregue sem realizado, ou realizado com status diferente de entregue."""
    c = b["bi1_ctes"]
    entregue = c["status"] == "entregue"
    return int((entregue & c["realizado"].isna()).sum() + (~entregue & c["realizado"].notna()).sum())


def l04_baixas_app(b: Bases) -> int:
    """baixas_app maior que entregas."""
    e = b["bi1_entregas_courier"]
    return int((e["baixas_app"] > e["entregas"]).sum())


def l05_piso_futuro(b: Bases, ref: np.datetime64) -> int:
    """data_evento ou transferido_em depois da referência."""
    p = b["bi2_piso"]
    limite = pd.Timestamp(ref)
    return int((p["data_evento"] > limite).sum() + (p["transferido_em"].dropna() > limite).sum())


def l06_producao(b: Bases) -> int:
    """Volumes negativos; horas trabalhadas igual a 0 ou acima de 10."""
    h = b["bi3_producao_hora"]
    o = b["bi3_produtividade_operador"]
    horas = o["horas_trabalhadas"].astype(float)
    return int((h["volumes_in"] < 0).sum() + (h["volumes_out"] < 0).sum()
               + (o["volumes"] < 0).sum() + ((horas <= 0) | (horas > 10)).sum())


def l07_produtividade(b: Bases, maximo: float) -> int:
    """Produtividade diária acima do máximo de volumes por hora."""
    o = b["bi3_produtividade_operador"]
    return int((o["volumes"].astype(float) / o["horas_trabalhadas"].astype(float) > maximo).sum())


def l08_duracao_viagem(b: Bases, maximo_horas: float) -> int:
    """termino_real antes de saida_real, ou duração acima do máximo."""
    v = b["bi4_viagens"].dropna(subset=["saida_real", "termino_real"])
    horas = (v["termino_real"] - v["saida_real"]).dt.total_seconds() / 3600
    return int(((horas < 0) | (horas > maximo_horas)).sum())


def l09_status_viagem(b: Bases) -> int:
    """Finalizada sem termino_real, ou não finalizada com termino_real."""
    v = b["bi4_viagens"]
    fin = v["status"] == "finalizada"
    return int((fin & v["termino_real"].isna()).sum() + (~fin & v["termino_real"].notna()).sum())


def l10_origem_destino(b: Bases) -> int:
    """Viagem com origem igual ao destino."""
    v = b["bi4_viagens"]
    return int((v["unidade_origem_id"] == v["unidade_destino_id"]).sum())


def l11_manifesto(b: Bases) -> int:
    """ctes_transferidos maior que ctes_total."""
    m = b["bi4_manifestos"]
    return int((m["ctes_transferidos"] > m["ctes_total"]).sum())


def l12_coleta_ordem(b: Bases) -> int:
    """Retirada antes do depósito, ou depósito antes da solicitação."""
    c = b["bi5_coletas"]
    return int((c["retirada_motorista"] < c["deposito_ponto"]).sum()
               + (c["deposito_ponto"] < c["solicitacao"]).sum())


def l13_motivo(b: Bases) -> int:
    """Cancelada sem motivo, ou não cancelada com motivo."""
    c = b["bi5_coletas"]
    canc = c["status"] == "cancelada"
    motivo = c["motivo_cancelamento"].notna()
    return int((canc & ~motivo).sum() + (~canc & motivo).sum())


# ------------------------------------------------------------ percentuais (validação)

def percentuais_por_grupo(b: Bases, ref: np.datetime64) -> dict[str, pd.Series]:
    """Percentuais dos KPIs, geral e por unidade, para L14 e checagens P."""
    ref_ts = pd.Timestamp(ref)
    c = b["bi1_ctes"]
    c = c[~(c["realizado"].isna() & (c["limite_cliente"] > ref_ts))]
    otd = c["realizado"].notna() & (c["realizado"] <= c["limite_cliente"])
    e = b["bi1_entregas_courier"]
    piso = b["bi2_piso"]
    v = b["bi4_viagens"]
    v = v[v["status"] != "cancelada"]
    fin = v[v["status"] == "finalizada"]
    no_transito = ((fin["termino_real"] - fin["saida_real"])
                   <= (fin["termino_previsto"] - fin["saida_prevista"]))
    saiu = v.dropna(subset=["saida_real"])
    m = b["bi4_manifestos"]
    col = b["bi5_coletas"]
    nc = col[col["status"] != "cancelada"]
    nc = nc[~(nc["retirada_motorista"].isna() & (nc["prazo"] > ref_ts))]
    sla = nc["retirada_motorista"].notna() & (nc["retirada_motorista"] <= nc["prazo"])
    return {
        "K01": otd.groupby(c["unidade_destino_id"]).mean() * 100,
        "K01_geral": pd.Series([otd.mean() * 100]),
        "K04": c["ofensor_pickup"].astype(bool).groupby(c["unidade_destino_id"]).mean() * 100,
        "K06": (e.groupby("unidade_id")["baixas_app"].sum()
                / e.groupby("unidade_id")["entregas"].sum() * 100),
        "K07": (piso["limite_cliente"] < ref_ts).groupby(piso["unidade_atual_id"]).mean() * 100,
        "K15": no_transito.groupby(fin["unidade_origem_id"]).mean() * 100,
        "K15_fornecedor": no_transito.groupby(fin["fornecedor_id"]).mean() * 100,
        "K15_geral": pd.Series([no_transito.mean() * 100]),
        "K16": (saiu["saida_real"] <= saiu["saida_prevista"]).groupby(
            saiu["unidade_origem_id"]).mean() * 100,
        "K19": (m.groupby("unidade_origem_id")["ctes_transferidos"].sum()
                / m.groupby("unidade_origem_id")["ctes_total"].sum() * 100),
        "K20": sla.groupby(nc["unidade_id"]).mean() * 100,
        "K20_geral": pd.Series([sla.mean() * 100]),
        "K22": (col["status"] == "cancelada").groupby(col["unidade_id"]).mean() * 100,
    }


def k12_geral(b: Bases) -> float | None:
    """Aderência ao forecast geral, em %."""
    return _pct(float(b["bi3_producao_hora"]["volumes_in"].sum()),
                float(b["bi3_forecast"]["volumes_previstos"].sum()))


def l14_acima_de_100(pcts: dict[str, pd.Series]) -> int:
    """Percentuais acima de 100% (K12 é exceção e não entra na lista)."""
    return int(sum((serie > 100.0 + 1e-9).sum() for serie in pcts.values()))


def p03_fim_de_semana(b: Bases, cal: Calendario) -> float | None:
    """Volume médio de sábado e domingo em % do volume médio de dia útil (produção)."""
    por_dia = b["bi3_producao_hora"].groupby("data")["volumes_in"].sum()
    datas = por_dia.index.to_numpy().astype("datetime64[D]")
    semana = cal.dia_semana(datas)
    util = cal.eh_dia_util(datas)
    fds = por_dia[(semana >= 6)].mean()
    return _pct(float(fds), float(por_dia[util].mean()))


# ------------------------------------------------------------ execução

def executar_checagens(bases: Bases, config: dict[str, Any]) -> list[Resultado]:
    """Roda todas as checagens Q01-Q07, L01-L14 e P01-P06 (Q08 e Q09 ficam no gerador)."""
    cal = Calendario.de_config(config)
    ref = cal.referencia
    lim = config["qualidade"]
    pcts = percentuais_por_grupo(bases, ref)
    otd_geral = float(pcts["K01_geral"].iloc[0])
    k15_geral = float(pcts["K15_geral"].iloc[0])
    k12 = k12_geral(bases)
    k20 = float(pcts["K20_geral"].iloc[0])
    fds = p03_fim_de_semana(bases, cal)
    q07 = q07_volume_linhas(bases, config)
    piores_forn = k15_geral - float(pcts["K15_fornecedor"].min())

    zero = "0"
    itens: list[tuple[str, str, Callable[[], Any], str, Callable[[Any], bool]]] = [
        ("Q01", "Colunas e tipos iguais ao dicionário", lambda: q01_colunas_tipos(bases), zero, _zero),
        ("Q02", "Nulos em colunas obrigatórias", lambda: q02_nulos(bases), zero, _zero),
        ("Q03", "Duplicidade na chave", lambda: q03_duplicidade(bases), zero, _zero),
        ("Q04", "Chaves estrangeiras sem correspondência",
         lambda: q04_chaves_estrangeiras(bases), zero, _zero),
        ("Q05", "Datas fora da janela", lambda: q05_datas_na_janela(bases, config), zero, _zero),
        ("Q06", "Categorias fora do dicionário", lambda: q06_categorias(bases, config), zero, _zero),
        ("Q07", "Volume de linhas fora de ±10%", lambda: len(q07), zero, _zero),
        ("L01", "Eventos de entrega fora de ordem", lambda: l01_eventos_fora_de_ordem(bases),
         zero, _zero),
        ("L02", "Lead time negativo ou acima do máximo",
         lambda: l02_lead_time(bases, cal, lim["lead_time_max_dias_uteis"]), zero, _zero),
        ("L03", "Status entregue x realizado", lambda: l03_status_realizado(bases), zero, _zero),
        ("L04", "baixas_app maior que entregas", lambda: l04_baixas_app(bases), zero, _zero),
        ("L05", "Piso com evento depois da referência", lambda: l05_piso_futuro(bases, ref),
         zero, _zero),
        ("L06", "Volumes negativos ou horas inválidas", lambda: l06_producao(bases), zero, _zero),
        ("L07", "Produtividade acima do máximo",
         lambda: l07_produtividade(bases, lim["produtividade_max_volumes_hora"]), zero, _zero),
        ("L08", "Viagem com término antes da saída ou longa demais",
         lambda: l08_duracao_viagem(bases, lim["viagem_max_horas"]), zero, _zero),
        ("L09", "Status de viagem x término real", lambda: l09_status_viagem(bases), zero, _zero),
        ("L10", "Viagem com origem igual ao destino", lambda: l10_origem_destino(bases),
         zero, _zero),
        ("L11", "Manifesto com transferidos > total", lambda: l11_manifesto(bases), zero, _zero),
        ("L12", "Coleta com eventos fora de ordem", lambda: l12_coleta_ordem(bases), zero, _zero),
        ("L13", "Motivo de cancelamento inconsistente", lambda: l13_motivo(bases), zero, _zero),
        ("L14", "Percentuais acima de 100% (exceto K12)", lambda: l14_acima_de_100(pcts),
         zero, _zero),
        ("P01", "OTD geral (K01), %", lambda: round(otd_geral, 1), "88 a 97",
         lambda v: 88 <= v <= 97),
        ("P02", "Unidades com OTD abaixo de 90%", lambda: int((pcts["K01"] < 90).sum()), ">= 2",
         lambda v: v >= 2),
        ("P03", "Volume de fim de semana em % do dia útil",
         lambda: None if fds is None else round(fds, 1), "< 60", lambda v: v is not None and v < 60),
        ("P04", "Aderência ao forecast (K12) geral, %",
         lambda: None if k12 is None else round(k12, 1), "85 a 110",
         lambda v: v is not None and 85 <= v <= 110),
        ("P05", "Maior distância de um fornecedor para o SLA de trânsito médio, p.p.",
         lambda: round(piores_forn, 1), ">= 10", lambda v: v >= 10),
        ("P06", "SLA de coleta (K20) geral, %", lambda: round(k20, 1), "80 a 95",
         lambda v: 80 <= v <= 95),
    ]
    resultados = []
    for ident, descricao, medir, limite, aprovar in itens:
        valor = medir()
        resultados.append(Resultado(ident, descricao, valor, limite, bool(aprovar(valor))))
    return resultados


def _zero(valor: Any) -> bool:
    """Aprova quando não há ocorrências."""
    return valor == 0
