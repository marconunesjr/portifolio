"""Geração das bases sintéticas descritas em docs/06.

Cada função recebe o contexto (configuração, sorteador com semente fixa e
calendário) e devolve um DataFrame com as colunas na ordem do dicionário.
A ordem das chamadas é fixa, para que a mesma semente gere sempre os mesmos dados.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

import dicionario as dic
from calendario import Calendario
from configuracao import regional_por_unidade

NAT = np.datetime64("NaT", "D")
NAT_MIN = np.datetime64("NaT", "m")
MINUTOS_DIA = 1440

# Perfil de recebimento (IN) por hora cheia, das 6h às 21h: picos no início da
# manhã e no fim da tarde. A expedição (OUT) segue o mesmo perfil deslocado.
PERFIL_IN = np.array([0.5, 1.2, 1.6, 1.4, 1.0, 0.8, 0.6, 0.6, 0.7, 0.9, 1.2, 1.5, 1.4, 1.0, 0.6, 0.4])
PERFIL_OUT = np.array([0.2, 0.4, 0.7, 1.0, 1.1, 1.0, 0.8, 0.7, 0.8, 1.0, 1.3, 1.6, 1.7, 1.4, 1.0, 0.6])
HORAS = np.arange(6, 22)


class Contexto:
    """Parâmetros e sorteador compartilhados por todas as bases."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.rng = np.random.default_rng(config["geracao"]["semente"])
        self.cal = Calendario.de_config(config)
        geracao = config["geracao"]
        self.linhas = geracao["linhas"]
        self.inicio = np.datetime64(geracao["data_inicio"], "D")
        self.referencia = np.datetime64(geracao["data_referencia"], "D")
        self.dias = np.arange(self.inicio, self.referencia + np.timedelta64(1, "D"), dtype="datetime64[D]")
        self.cenario = config["cenario"]
        self.unidades = np.array(list(config["unidades"].keys()))
        self.regional = regional_por_unidade(config)
        porte = np.array([self.cenario["porte_unidades"][u] for u in self.unidades])
        self.p_unidade = porte / porte.sum()
        self.clientes = np.array([f"CL{i:02d}" for i in range(1, len(config["clientes"]) + 1)])
        peso = self.rng.gamma(2.0, 1.0, len(self.clientes))
        self.p_cliente = peso / peso.sum()
        self.fator_dia = self._fator_dia(self.dias)

    def _fator_dia(self, datas: np.ndarray) -> np.ndarray:
        """Sazonalidade por dia da semana, com redução em feriado."""
        fatores = np.array(self.cenario["fator_dia_semana"])
        fator = fatores[self.cal.dia_semana(datas) - 1]
        return np.where(self.cal.eh_feriado(datas), self.cenario["fator_feriado"], fator)

    def tipo_dia(self, datas: np.ndarray) -> np.ndarray:
        """0 = dia útil, 1 = sábado, 2 = domingo ou feriado."""
        semana = self.cal.dia_semana(datas)
        tipo = np.where(semana == 6, 1, np.where(semana == 7, 2, 0))
        return np.where(self.cal.eh_feriado(datas), 2, tipo)

    def sortear(self, n: int, itens: np.ndarray, pesos: np.ndarray | None = None) -> np.ndarray:
        """Sorteia n índices de itens, com pesos opcionais."""
        return self.rng.choice(len(itens), n, p=pesos)


def _ordenar(df: pd.DataFrame, colunas: list[str]) -> pd.DataFrame:
    """Ordena de forma estável e reinicia o índice."""
    return df.sort_values(colunas, kind="stable").reset_index(drop=True)


def _ids(prefixo: str, n: int, digitos: int, inicio: int = 1) -> np.ndarray:
    """Gera códigos sequenciais como CT0000001."""
    return np.array([f"{prefixo}{i:0{digitos}d}" for i in range(inicio, inicio + n)])


# ---------------------------------------------------------------- dimensões

def gerar_dim_unidades(ctx: Contexto) -> pd.DataFrame:
    """Uma linha por unidade, com UF e regional."""
    unidades = ctx.config["unidades"]
    return pd.DataFrame({
        "unidade_id": ctx.unidades,
        "nome": [unidades[u]["nome"] for u in ctx.unidades],
        "uf": [unidades[u]["uf"] for u in ctx.unidades],
        "regional": [ctx.regional[u] for u in ctx.unidades],
    })


def gerar_dim_clientes(ctx: Contexto) -> pd.DataFrame:
    """Uma linha por cliente fictício."""
    nomes = ctx.config["clientes"]
    segmentos = ctx.config["segmentos_clientes"]
    return pd.DataFrame({
        "cliente_id": ctx.clientes, "nome": nomes, "segmento": [segmentos[n] for n in nomes],
    })


def gerar_dim_calendario(ctx: Contexto) -> pd.DataFrame:
    """Um dia por linha: os 90 dias e os 2 seguintes à data de referência."""
    datas = np.arange(ctx.inicio, ctx.referencia + np.timedelta64(3, "D"), dtype="datetime64[D]")
    return pd.DataFrame({
        "data": datas,
        "dia_semana": ctx.cal.dia_semana(datas),
        "dia_util": ctx.cal.eh_dia_util(datas),
        "feriado": ctx.cal.eh_feriado(datas),
    })


# ---------------------------------------------------------------- BI 1

def gerar_bi1_ctes(ctx: Contexto) -> pd.DataFrame:
    """CT-es com vencimento nos 90 dias, com ofensores de OTD por unidade e cliente."""
    rng, cal, ref = ctx.rng, ctx.cal, ctx.referencia
    n = ctx.linhas["bi1_ctes"]
    uteis = ctx.dias[cal.eh_dia_util(ctx.dias)]
    limite = rng.choice(uteis, n)
    destino = ctx.sortear(n, ctx.unidades, ctx.p_unidade)
    origem = np.where(rng.random(n) < 0.3, destino, ctx.sortear(n, ctx.unidades, ctx.p_unidade))
    cliente = ctx.sortear(n, ctx.clientes, ctx.p_cliente)
    prazo = rng.integers(1, 6, n)
    emissao = cal.somar_dias_uteis(limite, -prazo)

    # Probabilidade de entregar no prazo, com ofensores do cenário.
    penal_unidade = np.where(
        np.isin(ctx.unidades, ctx.cenario["unidades_ofensoras_otd"]), 0.09,
        rng.uniform(0.0, 0.02, len(ctx.unidades)),
    )
    penal_cliente = np.where(np.isin(ctx.clientes, ctx.cenario["clientes_ofensores_otd"]), 0.07, 0.0)
    pickup = rng.random(n) < 0.03
    p_prazo = np.clip(0.985 - penal_unidade[destino] - penal_cliente[cliente], 0.5, 1.0)
    p_prazo = np.where(pickup, p_prazo * 0.3, p_prazo)
    no_prazo = rng.random(n) < p_prazo

    antecipa = np.minimum(rng.choice([0, 1, 2], n, p=[0.6, 0.3, 0.1]), prazo - 1)
    atraso = rng.choice(np.arange(1, 11), n,
                        p=[0.45, 0.15, 0.15, 0.08, 0.07, 0.04, 0.02, 0.02, 0.01, 0.01])
    realizado = np.where(no_prazo, cal.somar_dias_uteis(limite, -antecipa),
                         cal.somar_dias_uteis(limite, atraso))
    falhou_1a = ~no_prazo & (rng.random(n) < 0.35)
    tentativa = np.where(falhou_1a, cal.somar_dias_uteis(realizado, -1), realizado)
    tentativa = np.maximum(tentativa, emissao)
    chegada = np.maximum(cal.somar_dias_uteis(tentativa, -rng.integers(0, 2, n)), emissao)

    devolvido = rng.random(n) < 0.012
    aberto = (realizado > ref) | devolvido
    chegada = np.where(chegada > ref, NAT, chegada)
    tentativa = np.where(tentativa > ref, NAT, tentativa)
    status = np.where(
        devolvido, "devolvido",
        np.where(~aberto, "entregue",
                 np.where(~np.isnat(tentativa), "em rota",
                          np.where(~np.isnat(chegada), "na unidade", "em transferência"))),
    )
    realizado = np.where(aberto, NAT, realizado)

    df = pd.DataFrame({
        "cte_id": "",
        "emissao": emissao,
        "unidade_origem_id": ctx.unidades[origem],
        "unidade_destino_id": ctx.unidades[destino],
        "uf_destino": [ctx.config["unidades"][u]["uf"] for u in ctx.unidades[destino]],
        "cliente_id": ctx.clientes[cliente],
        "limite_cliente": limite,
        "chegada": chegada,
        "tentativa_1": tentativa,
        "realizado": realizado,
        "status": status,
        "ofensor_pickup": pickup,
    })
    df = _ordenar(df, ["emissao", "limite_cliente"])
    df["cte_id"] = _ids("CT", n, 7)
    return df


def gerar_bi1_emissoes_dia(ctx: Contexto) -> pd.DataFrame:
    """Remessas, volumes e peso por dia, unidade de origem e cliente."""
    rng = ctx.rng
    d, u, c = np.meshgrid(np.arange(len(ctx.dias)), np.arange(len(ctx.unidades)),
                          np.arange(len(ctx.clientes)), indexing="ij")
    d, u, c = d.ravel(), u.ravel(), c.ravel()
    media = (ctx.cenario["volume_emissoes_dia"] * ctx.fator_dia[d]
             * ctx.p_unidade[u] * ctx.p_cliente[c])
    remessas = np.maximum(1, rng.poisson(media))
    volumes = remessas + rng.poisson(remessas * 0.4)
    peso = np.round(volumes * rng.lognormal(np.log(2.2), 0.3, len(d)), 1)
    return pd.DataFrame({
        "data": ctx.dias[d], "unidade_origem_id": ctx.unidades[u], "cliente_id": ctx.clientes[c],
        "remessas": remessas, "volumes": volumes, "peso_kg": peso,
    })


def gerar_bi1_entregas_courier(ctx: Contexto) -> pd.DataFrame:
    """Entregas e baixas pelo aplicativo por dia e courier (só dias trabalhados)."""
    rng = ctx.rng
    por_unidade = ctx.config["geracao"]["couriers_por_unidade"]
    n_couriers = por_unidade * len(ctx.unidades)
    unidade_courier = np.repeat(np.arange(len(ctx.unidades)), por_unidade)
    p_app = np.where(rng.random(n_couriers) < 0.1, rng.beta(6, 4, n_couriers),
                     rng.beta(18, 3, n_couriers))
    ritmo = rng.lognormal(0, 0.15, n_couriers)

    presenca_tipo = np.array([0.93, 0.55, 0.0])  # dia útil, sábado, domingo ou feriado
    presenca_tipo_feriado = 0.1
    tipo = ctx.tipo_dia(ctx.dias)
    p_presenca = np.where(ctx.cal.eh_feriado(ctx.dias), presenca_tipo_feriado, presenca_tipo[tipo])
    d, k = np.meshgrid(np.arange(len(ctx.dias)), np.arange(n_couriers), indexing="ij")
    d, k = d.ravel(), k.ravel()
    trabalhou = rng.random(len(d)) < p_presenca[d]
    d, k = d[trabalhou], k[trabalhou]
    fator = np.where(tipo[d] == 0, 1.0, 0.7)
    entregas = np.clip(rng.poisson(55 * fator * ritmo[k]), 1, 150)
    baixas = rng.binomial(entregas, p_app[k])
    return pd.DataFrame({
        "data": ctx.dias[d], "unidade_id": ctx.unidades[unidade_courier[k]],
        "courier_id": _ids("CR", n_couriers, 4)[k], "entregas": entregas, "baixas_app": baixas,
    })


# ---------------------------------------------------------------- BI 2

def gerar_bi2_piso(ctx: Contexto) -> pd.DataFrame:
    """Foto do piso na data de referência."""
    rng, ref = ctx.rng, ctx.referencia
    n = ctx.linhas["bi2_piso"]
    atual = ctx.sortear(n, ctx.unidades, ctx.p_unidade)
    no_destino = rng.random(n) < 0.55
    destino = np.where(no_destino, atual, ctx.sortear(n, ctx.unidades, ctx.p_unidade))
    no_destino = destino == atual
    cliente = ctx.sortear(n, ctx.clientes, ctx.p_cliente)

    status = np.where(
        no_destino,
        np.array(["entrada", "em custódia", "aguardando rota"])[rng.choice(3, n, p=[0.25, 0.2, 0.55])],
        np.array(["entrada", "em custódia", "aguardando transferência"])[
            rng.choice(3, n, p=[0.2, 0.15, 0.65])],
    )
    faixa = rng.choice(4, n, p=[0.55, 0.25, 0.13, 0.07])
    aging = np.select(
        [faixa == 0, faixa == 1, faixa == 2],
        [rng.integers(0, 2, n), rng.integers(2, 4, n), rng.integers(4, 8, n)],
        rng.integers(8, 26, n),
    )
    data_evento = ref - aging.astype("timedelta64[D]")

    # Classificação de vencimento: a unidade ofensora acumula vencidos; carga velha vence mais.
    p_vencido = np.where(ctx.unidades == ctx.cenario["unidade_ofensora_piso"], 0.16,
                         rng.uniform(0.02, 0.06, len(ctx.unidades)))[atual]
    p_vencido = np.clip(p_vencido * np.where(aging >= 4, 2.5, 1.0), 0, 0.9)
    sorteio = rng.random(n)
    limite = np.where(
        sorteio < p_vencido, ref - rng.integers(1, 21, n).astype("timedelta64[D]"),
        np.where(sorteio < p_vencido + 0.08, ref,
                 ref + rng.integers(1, 11, n).astype("timedelta64[D]")),
    )
    peso = np.round(np.clip(rng.lognormal(np.log(4.0), 0.9, n), 0.1, 60.0), 1)

    transferido = no_destino & (rng.random(n) < 0.65)
    transferido_em = np.where(transferido, data_evento, NAT)
    p_sem_entrada = np.where(ctx.unidades == ctx.cenario["unidade_ofensora_entrada"], 0.12, 0.03)
    sem_entrada = transferido & (rng.random(n) < p_sem_entrada[atual])
    entrou = np.where(transferido, ~sem_entrada, no_destino)

    df = pd.DataFrame({
        "cte_id": "",
        "unidade_atual_id": ctx.unidades[atual],
        "unidade_destino_id": ctx.unidades[destino],
        "cliente_id": ctx.clientes[cliente],
        "status": status,
        "data_evento": data_evento,
        "limite_cliente": limite,
        "peso_kg": peso,
        "transferido_em": transferido_em,
        "entrou_unidade": entrou,
    })
    df = _ordenar(df, ["data_evento", "unidade_atual_id"])
    df["cte_id"] = _ids("CT", n, 7, inicio=5_000_001)
    return df


# ---------------------------------------------------------------- BI 3

def _clientes_das_unidades(ctx: Contexto) -> np.ndarray:
    """Sorteia, para cada unidade, os clientes atendidos na produção."""
    k = ctx.cenario["clientes_por_unidade"]
    return np.array([
        np.sort(ctx.rng.choice(len(ctx.clientes), k, replace=False, p=ctx.p_cliente))
        for _ in ctx.unidades
    ])


def _horas_operacao(ctx: Contexto) -> np.ndarray:
    """Máscara [tipo de dia, hora]: dia útil 6h-21h, sábado 6h-15h, domingo/feriado 8h-15h."""
    return np.array([
        (HORAS >= 6) & (HORAS <= 21),
        (HORAS >= 6) & (HORAS <= 15),
        (HORAS >= 8) & (HORAS <= 15),
    ])


def gerar_bi3(ctx: Contexto) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Produção por hora e forecast diário, por unidade e cliente."""
    rng = ctx.rng
    clientes_unid = _clientes_das_unidades(ctx)
    n_d, n_u, n_k = len(ctx.dias), len(ctx.unidades), clientes_unid.shape[1]
    peso_cli = ctx.p_cliente[clientes_unid]
    peso_cli = peso_cli / peso_cli.sum(axis=1, keepdims=True)

    esperado = (ctx.cenario["volume_producao_dia"] * ctx.fator_dia[:, None, None]
                * ctx.p_unidade[None, :, None] * peso_cli[None, :, :])
    previsto = np.maximum(1, np.round(esperado * rng.lognormal(0, 0.04, esperado.shape))).astype(int)
    aderencia = np.where(ctx.unidades == ctx.cenario["unidade_ofensora_forecast"], 0.86,
                         rng.uniform(0.95, 1.03, n_u))
    real = np.round(esperado * aderencia[None, :, None]
                    * rng.lognormal(0, 0.07, esperado.shape)).astype(int)
    expedido = np.round(real * rng.uniform(0.94, 1.0, real.shape)).astype(int)

    mascara = _horas_operacao(ctx)
    tipo = ctx.tipo_dia(ctx.dias)
    p_in = PERFIL_IN * mascara
    p_in = p_in / p_in.sum(axis=1, keepdims=True)
    p_out = PERFIL_OUT * mascara
    p_out = p_out / p_out.sum(axis=1, keepdims=True)
    forma = (n_d, n_u, n_k, len(HORAS))
    vin = rng.multinomial(real, np.broadcast_to(p_in[tipo][:, None, None, :], forma))
    vout = rng.multinomial(expedido, np.broadcast_to(p_out[tipo][:, None, None, :], forma))

    d, u, k, h = np.meshgrid(np.arange(n_d), np.arange(n_u), np.arange(n_k),
                             np.arange(len(HORAS)), indexing="ij")
    opera = mascara[tipo][:, None, None, :] & np.ones(forma, dtype=bool)
    sel = opera.ravel()
    d, u, k, h = d.ravel()[sel], u.ravel()[sel], k.ravel()[sel], h.ravel()[sel]
    producao = pd.DataFrame({
        "data": ctx.dias[d], "hora": HORAS[h], "unidade_id": ctx.unidades[u],
        "cliente_id": ctx.clientes[clientes_unid[u, k]],
        "volumes_in": vin.ravel()[sel], "volumes_out": vout.ravel()[sel],
    })

    d2, u2, k2 = np.meshgrid(np.arange(n_d), np.arange(n_u), np.arange(n_k), indexing="ij")
    forecast = pd.DataFrame({
        "data": ctx.dias[d2.ravel()], "unidade_id": ctx.unidades[u2.ravel()],
        "cliente_id": ctx.clientes[clientes_unid[u2.ravel(), k2.ravel()]],
        "volumes_previstos": previsto.ravel(),
    })
    return (_ordenar(producao, ["data", "unidade_id", "cliente_id", "hora"]),
            _ordenar(forecast, ["data", "unidade_id", "cliente_id"]))


def gerar_bi3_produtividade_operador(ctx: Contexto) -> pd.DataFrame:
    """Volumes e horas por operador e dia trabalhado."""
    rng = ctx.rng
    por_unidade = ctx.config["geracao"]["operadores_por_unidade"]
    n_op = por_unidade * len(ctx.unidades)
    unidade_op = np.repeat(np.arange(len(ctx.unidades)), por_unidade)
    ritmo = rng.lognormal(np.log(120), 0.25, n_op)
    presenca = np.array([0.85, 0.6, 0.3])[ctx.tipo_dia(ctx.dias)]
    d, k = np.meshgrid(np.arange(len(ctx.dias)), np.arange(n_op), indexing="ij")
    d, k = d.ravel(), k.ravel()
    trabalhou = rng.random(len(d)) < presenca[d]
    d, k = d[trabalhou], k[trabalhou]
    util = ctx.tipo_dia(ctx.dias)[d] == 0
    horas = np.where(util, np.clip(rng.normal(8.0, 0.7, len(d)), 4.0, 10.0),
                     rng.uniform(4.0, 6.5, len(d)))
    horas = np.round(horas, 1)
    volumes = np.round(ritmo[k] * rng.lognormal(0, 0.1, len(d)) * horas).astype(int)
    df = pd.DataFrame({
        "data": ctx.dias[d], "unidade_id": ctx.unidades[unidade_op[k]],
        "operador_id": _ids("OP", n_op, 4)[k], "volumes": volumes, "horas_trabalhadas": horas,
    })
    return _ordenar(df, ["data", "operador_id"])


# ---------------------------------------------------------------- BI 4

def _formatar_minutos(minutos: np.ndarray) -> np.ndarray:
    """Converte minutos desde 1970 em datetime64[m], com NaT para ausentes."""
    return np.where(np.isnan(minutos), NAT_MIN,
                    np.nan_to_num(minutos).astype("int64").astype("datetime64[m]"))


def gerar_bi4_viagens(ctx: Contexto) -> pd.DataFrame:
    """Viagens de transferência e de coleta, com um fornecedor ofensor no trânsito."""
    rng = ctx.rng
    n = ctx.linhas["bi4_viagens"]
    regionais = list(ctx.config["regionais"].keys())
    reg_unid = np.array([regionais.index(ctx.regional[u]) for u in ctx.unidades])

    coleta = rng.random(n) < 0.2
    origem = ctx.sortear(n, ctx.unidades, ctx.p_unidade)
    destino = ctx.sortear(n, ctx.unidades, ctx.p_unidade)
    # Rota de coleta fica na mesma regional; destino sempre diferente da origem.
    for i in np.flatnonzero(coleta | (destino == origem)):
        candidatos = np.flatnonzero((reg_unid == reg_unid[origem[i]]) if coleta[i]
                                    else np.ones(len(ctx.unidades), dtype=bool))
        candidatos = candidatos[candidatos != origem[i]]
        destino[i] = rng.choice(candidatos)

    distancia = np.abs(reg_unid[origem] - reg_unid[destino])
    mesma_reg = reg_unid[origem] == reg_unid[destino]
    duracao_prev = np.where(mesma_reg, rng.uniform(3, 8, n),
                            12 + 8 * distancia + rng.uniform(0, 6, n))
    duracao_prev = np.round(duracao_prev * 4) / 4 * 60  # minutos, múltiplos de 15

    dia = rng.choice(len(ctx.dias), n, p=ctx.fator_dia / ctx.fator_dia.sum())
    noturna = rng.random(n) < 0.7
    hora = np.where(noturna, rng.choice([18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5], n),
                    rng.integers(6, 18, n))
    minuto = rng.choice([0, 15, 30, 45], n)
    inicio_min = ctx.inicio.astype("datetime64[m]").astype("int64")
    saida_prev = (ctx.dias[dia].astype("datetime64[m]").astype("int64")
                  + hora * 60 + minuto).astype(float)
    termino_prev = saida_prev + duracao_prev

    fornecedor = rng.choice(len(dic.FORNECEDORES), n,
                            p=[0.18, 0.16, 0.14, 0.12, 0.14, 0.1, 0.08, 0.08])
    ofensor = np.array(dic.FORNECEDORES)[fornecedor] == ctx.cenario["fornecedor_ofensor"]
    longa = duracao_prev > 600
    veiculo = np.where(longa, rng.choice(["carreta", "truck"], n, p=[0.6, 0.4]),
                       rng.choice(["truck", "toco", "van"], n, p=[0.3, 0.4, 0.3]))

    saida_atrasada = rng.random(n) < np.where(ofensor, 0.12, 0.06)
    desvio_saida = np.where(saida_atrasada, 10 + rng.exponential(45, n), -rng.uniform(0, 20, n))
    saida_real = np.maximum(np.round(saida_prev + desvio_saida), inicio_min)
    transito_atrasado = rng.random(n) < np.where(ofensor, 0.27, 0.05)
    duracao_real = np.where(
        transito_atrasado,
        duracao_prev * (1 + rng.uniform(0.03, 0.35, n)) + rng.uniform(15, 240, n),
        duracao_prev * (1 - rng.uniform(0.0, 0.08, n)),
    )
    duracao_real = np.minimum(np.round(duracao_real), 95 * 60)
    termino_real = saida_real + duracao_real

    tipos = np.array(dic.OCORRENCIAS[:-1])
    ocorr_atraso = tipos[rng.choice(len(tipos), n, p=[0.15, 0.35, 0.2, 0.15, 0.15])]
    ocorr_leve = np.where(rng.random(n) < 0.1, tipos[rng.choice(len(tipos), n)], "sem ocorrência")
    ocorrencia = np.where(transito_atrasado, ocorr_atraso,
                          np.where(saida_atrasada, "atraso no carregamento", ocorr_leve))

    fim = (ctx.referencia + np.timedelta64(1, "D")).astype("datetime64[m]").astype("int64")  # 01/11 00:00
    cancelada = rng.random(n) < 0.025
    programada = ~cancelada & (saida_prev >= fim - 6 * 60) & (rng.random(n) < 0.5)
    sem_saida = cancelada | programada | (saida_real >= fim)
    programada = programada | (~cancelada & (saida_real >= fim))
    em_viagem = ~sem_saida & (termino_real >= fim)
    status = np.where(cancelada, "cancelada", np.where(
        programada, "programada", np.where(em_viagem, "em viagem", "finalizada")))
    saida_real = np.where(sem_saida, np.nan, saida_real)
    termino_real = np.where(sem_saida | em_viagem, np.nan, termino_real)
    ocorrencia = np.where(sem_saida | em_viagem, None, ocorrencia)

    df = pd.DataFrame({
        "viagem_id": "",
        "rota": [f"{a}-{b}" for a, b in zip(ctx.unidades[origem], ctx.unidades[destino],
                                            strict=True)],
        "tipo_rota": np.where(coleta, "coleta", "transferência"),
        "unidade_origem_id": ctx.unidades[origem],
        "unidade_destino_id": ctx.unidades[destino],
        "cliente_principal_id": ctx.clientes[ctx.sortear(n, ctx.clientes, ctx.p_cliente)],
        "fornecedor_id": np.array(dic.FORNECEDORES)[fornecedor],
        "tipo_veiculo": veiculo,
        "motorista_id": _ids("MT", 300, 4)[rng.integers(0, 300, n)],
        "saida_prevista": _formatar_minutos(saida_prev),
        "saida_real": _formatar_minutos(saida_real),
        "termino_previsto": _formatar_minutos(termino_prev),
        "termino_real": _formatar_minutos(termino_real),
        "status": status,
        "ocorrencia": ocorrencia,
    })
    df = _ordenar(df, ["saida_prevista", "rota"])
    df["viagem_id"] = _ids("VG", n, 6)
    return df


def gerar_bi4_manifestos(ctx: Contexto, viagens: pd.DataFrame) -> pd.DataFrame:
    """Manifestos levados pelas viagens de transferência que já saíram."""
    rng = ctx.rng
    n = ctx.linhas["bi4_manifestos"]
    elegiveis = viagens[(viagens["tipo_rota"] == "transferência") & viagens["saida_real"].notna()]
    escolha = elegiveis.iloc[np.sort(rng.integers(0, len(elegiveis), n))]
    total = np.clip(np.round(rng.lognormal(np.log(60), 0.8, n)), 1, 400).astype(int)
    origem = escolha["unidade_origem_id"].to_numpy()
    p_incompleto = np.where(origem == ctx.cenario["unidade_ofensora_transferencia"], 0.45, 0.1)
    incompleto = rng.random(n) < p_incompleto
    faltam = np.where(incompleto, rng.binomial(total, rng.uniform(0.03, 0.15, n)), 0)
    cliente = np.where(rng.random(n) < 0.6, escolha["cliente_principal_id"].to_numpy(),
                       ctx.clientes[ctx.sortear(n, ctx.clientes, ctx.p_cliente)])
    data = escolha["saida_real"].to_numpy().astype("datetime64[D]")
    return pd.DataFrame({
        "manifesto_id": _ids("MF", n, 6),
        "viagem_id": escolha["viagem_id"].to_numpy(),
        "data_transferencia": np.maximum(data, ctx.inicio),
        "unidade_origem_id": origem,
        "unidade_destino_id": escolha["unidade_destino_id"].to_numpy(),
        "cliente_id": cliente,
        "ctes_total": total,
        "ctes_transferidos": total - faltam,
        "peso_kg": np.round(total * rng.lognormal(np.log(3.0), 0.4, n), 1),
    })


# ---------------------------------------------------------------- BI 5

def gerar_bi5_coletas(ctx: Contexto) -> pd.DataFrame:
    """Solicitações de coleta, com uma regional ofensora no prazo."""
    rng, cal, ref = ctx.rng, ctx.cal, ctx.referencia
    n = ctx.linhas["bi5_coletas"]
    solicitacao = ctx.dias[rng.choice(len(ctx.dias), n, p=ctx.fator_dia / ctx.fator_dia.sum())]
    unidade = ctx.sortear(n, ctx.unidades, ctx.p_unidade)
    cliente = ctx.sortear(n, ctx.clientes, ctx.p_cliente)
    prazo = cal.somar_dias_uteis(solicitacao, rng.choice([1, 2], n, p=[0.6, 0.4]))
    deposito = cal.somar_dias_uteis(solicitacao, rng.choice([0, 1], n, p=[0.7, 0.3]))

    ofensora = np.array([ctx.regional[u] == ctx.cenario["regional_ofensora_coleta"]
                         for u in ctx.unidades])[unidade]
    no_prazo = rng.random(n) < np.where(ofensora, 0.76, 0.91)
    folga = np.maximum(cal.dias_uteis_entre(deposito, prazo), 0)
    retirada = np.where(
        no_prazo, cal.somar_dias_uteis(deposito, np.floor(rng.random(n) * (folga + 1)).astype(int)),
        cal.somar_dias_uteis(np.maximum(prazo, deposito), rng.integers(1, 5, n)),
    )

    cancelada = rng.random(n) < 0.055
    motivos = np.array(dic.MOTIVOS_CANCELAMENTO)
    motivo = np.where(cancelada, motivos[rng.choice(len(motivos), n, p=[0.32, 0.22, 0.24, 0.12, 0.1])],
                      None)
    deposito = np.where(cancelada | (deposito > ref), NAT, deposito)
    retirada = np.where(np.isnat(deposito) | (retirada > ref), NAT, retirada)
    status = np.where(cancelada, "cancelada", np.where(
        ~np.isnat(retirada), "coletada", np.where(~np.isnat(deposito), "depositada", "solicitada")))
    df = pd.DataFrame({
        "coleta_id": "",
        "solicitacao": solicitacao,
        "deposito_ponto": deposito,
        "retirada_motorista": retirada,
        "prazo": prazo,
        "status": status,
        "unidade_id": ctx.unidades[unidade],
        "cliente_id": ctx.clientes[cliente],
        "motivo_cancelamento": motivo,
    })
    df = _ordenar(df, ["solicitacao", "unidade_id"])
    df["coleta_id"] = _ids("CO", n, 6)
    return df


# ---------------------------------------------------------------- BI 6

def gerar_bi6_processos(ctx: Contexto) -> pd.DataFrame:
    """Processos de contencioso ligados à operação (avaria, extravio, atraso).

    Os processos começam até um ano antes do histórico, para formar o estoque.
    Unidades e clientes ofensores de OTD geram mais processos e perdem mais.
    """
    rng, ref = ctx.rng, ctx.referencia
    p = ctx.cenario["contencioso"]
    n = ctx.linhas["bi6_processos"]
    primeiro = ctx.inicio - np.timedelta64(p["dias_antes_do_inicio"], "D")
    dias = np.arange(primeiro, ref + np.timedelta64(1, "D"), dtype="datetime64[D]")
    peso_dia = np.where(ctx.cal.eh_dia_util(dias), 1.0, 0.05)  # protocolo quase só em dia útil
    abertura = rng.choice(dias, n, p=peso_dia / peso_dia.sum())

    fator = p["fator_processos_ofensores"]
    ofensora_u = np.isin(ctx.unidades, ctx.cenario["unidades_ofensoras_otd"])
    ofensor_c = np.isin(ctx.clientes, ctx.cenario["clientes_ofensores_otd"])
    peso_u = ctx.p_unidade * np.where(ofensora_u, fator, 1.0)
    peso_c = ctx.p_cliente * np.where(ofensor_c, fator, 1.0)
    unidade = ctx.sortear(n, ctx.unidades, peso_u / peso_u.sum())
    cliente = ctx.sortear(n, ctx.clientes, peso_c / peso_c.sum())

    tipos = np.array(dic.TIPOS_PROCESSO)
    tipo = rng.choice(len(tipos), n, p=[0.35, 0.25, 0.40])
    origem = np.array(dic.ORIGENS_PROCESSO)[rng.choice(3, n, p=[0.45, 0.35, 0.20])]
    mediana_valor = np.array([2500.0, 4000.0, 1200.0])[tipo]
    pedido = np.round(np.clip(rng.lognormal(np.log(mediana_valor), 0.9), 100.0, 200_000.0), 2)

    duracao = np.clip(rng.lognormal(np.log(p["mediana_dias_encerramento"]), 0.55, n), 15, 900).astype(int)
    encerramento = abertura + duracao.astype("timedelta64[D]")
    encerrado = encerramento <= ref
    acordo = rng.random(n) < p["pct_acordo"]
    ofensor = ofensora_u[unidade] | ofensor_c[cliente]
    ganho = rng.random(n) < np.where(ofensor, p["taxa_exito_ofensores"], p["taxa_exito"])
    situacao = np.where(~encerrado, "em andamento",
                        np.where(acordo, "acordo", np.where(ganho, "ganho", "perdido")))

    riscos = np.array(dic.RISCOS_PROCESSO)
    pesos_risco = {"em andamento": [0.25, 0.45, 0.30], "perdido": [0.70, 0.25, 0.05],
                   "acordo": [0.50, 0.40, 0.10], "ganho": [0.05, 0.35, 0.60]}
    sorteio = rng.random(n)
    risco = np.empty(n, dtype=object)
    for nome, pesos in pesos_risco.items():
        limites = np.cumsum(pesos)
        sel = situacao == nome
        risco[sel] = riscos[np.searchsorted(limites, sorteio[sel], side="right").clip(0, 2)]

    provisionado = np.where((situacao == "em andamento") & (risco == "provável"),
                            np.round(pedido * rng.uniform(0.5, 0.9, n), 2), 0.0)
    pago = np.round(np.where(situacao == "perdido", pedido * rng.uniform(0.6, 1.0, n),
                             np.where(situacao == "acordo", pedido * rng.uniform(0.2, 0.6, n), 0.0)), 2)

    df = pd.DataFrame({
        "processo_id": "",
        "data_abertura": abertura,
        "data_encerramento": np.where(encerrado, encerramento, NAT),
        "tipo": tipos[tipo],
        "origem": origem,
        "unidade_id": ctx.unidades[unidade],
        "cliente_id": ctx.clientes[cliente],
        "valor_pedido": pedido,
        "valor_provisionado": provisionado,
        "valor_pago": pago,
        "situacao": situacao,
        "risco": risco.astype(str),
    })
    df = _ordenar(df, ["data_abertura", "unidade_id"])
    df["processo_id"] = _ids("PR", n, 6)
    return df


# ---------------------------------------------------------------- todas

def gerar_todas(config: dict[str, Any]) -> dict[str, pd.DataFrame]:
    """Gera todas as bases, sempre na mesma ordem de sorteio."""
    ctx = Contexto(config)
    bases: dict[str, pd.DataFrame] = {
        "dim_unidades": gerar_dim_unidades(ctx),
        "dim_clientes": gerar_dim_clientes(ctx),
        "dim_calendario": gerar_dim_calendario(ctx),
        "bi1_ctes": gerar_bi1_ctes(ctx),
        "bi1_emissoes_dia": gerar_bi1_emissoes_dia(ctx),
        "bi1_entregas_courier": gerar_bi1_entregas_courier(ctx),
        "bi2_piso": gerar_bi2_piso(ctx),
    }
    bases["bi3_producao_hora"], bases["bi3_forecast"] = gerar_bi3(ctx)
    bases["bi3_produtividade_operador"] = gerar_bi3_produtividade_operador(ctx)
    bases["bi4_viagens"] = gerar_bi4_viagens(ctx)
    bases["bi4_manifestos"] = gerar_bi4_manifestos(ctx, bases["bi4_viagens"])
    bases["bi5_coletas"] = gerar_bi5_coletas(ctx)
    bases["bi6_processos"] = gerar_bi6_processos(ctx)  # por último: não altera o sorteio das outras bases
    return {nome: bases[nome][dic.BASES[nome].nomes] for nome in dic.BASES}
