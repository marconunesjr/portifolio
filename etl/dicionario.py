"""Contrato das bases sintéticas, transcrito de docs/06_dicionario_de_dados.md.

Cada coluna tem: nome, tipo, se aceita nulo e, quando houver, a lista de
valores permitidos. Tipos: texto, data, datahora, inteiro, decimal, booleano.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Coluna:
    """Uma coluna do dicionário de dados."""

    nome: str
    tipo: str
    nulo: bool = False
    valores: tuple[str, ...] | None = None


@dataclass(frozen=True)
class Base:
    """Uma base do dicionário: colunas, chave e chaves estrangeiras."""

    nome: str
    colunas: tuple[Coluna, ...]
    chave: tuple[str, ...]
    fks: dict[str, str] = field(default_factory=dict)  # coluna -> dimensão

    @property
    def nomes(self) -> list[str]:
        """Nomes das colunas na ordem do dicionário."""
        return [coluna.nome for coluna in self.colunas]


SEGMENTOS = ("moda", "eletrônicos", "casa", "saúde e beleza", "outros")
REGIONAIS = ("São Paulo", "Sudeste", "Sul", "Nordeste", "Centro-Oeste")
STATUS_CTE = ("entregue", "em rota", "na unidade", "em transferência", "devolvido")
STATUS_PISO = ("entrada", "em custódia", "aguardando transferência", "aguardando rota")
TIPOS_ROTA = ("transferência", "coleta")
VEICULOS = ("carreta", "truck", "toco", "van")
STATUS_VIAGEM = ("programada", "em viagem", "finalizada", "cancelada")
OCORRENCIAS = (
    "quebra mecânica", "trânsito", "posto fiscal", "atraso no carregamento", "clima",
    "sem ocorrência",
)
FORNECEDORES = tuple(f"FN{i:02d}" for i in range(1, 9))
STATUS_COLETA = ("solicitada", "depositada", "coletada", "cancelada")
MOTIVOS_CANCELAMENTO = (
    "remetente ausente", "endereço não localizado", "desistência do cliente",
    "carga fora do padrão", "outros",
)

U = "dim_unidades"
C = "dim_clientes"

BASES: dict[str, Base] = {
    "dim_unidades": Base(
        "dim_unidades",
        (Coluna("unidade_id", "texto"), Coluna("nome", "texto"), Coluna("uf", "texto"),
         Coluna("regional", "texto", valores=REGIONAIS)),
        ("unidade_id",),
    ),
    "dim_clientes": Base(
        "dim_clientes",
        (Coluna("cliente_id", "texto"), Coluna("nome", "texto"),
         Coluna("segmento", "texto", valores=SEGMENTOS)),
        ("cliente_id",),
    ),
    "dim_calendario": Base(
        "dim_calendario",
        (Coluna("data", "data"), Coluna("dia_semana", "inteiro"), Coluna("dia_util", "booleano"),
         Coluna("feriado", "booleano")),
        ("data",),
    ),
    "bi1_ctes": Base(
        "bi1_ctes",
        (Coluna("cte_id", "texto"), Coluna("emissao", "data"),
         Coluna("unidade_origem_id", "texto"), Coluna("unidade_destino_id", "texto"),
         Coluna("uf_destino", "texto"), Coluna("cliente_id", "texto"),
         Coluna("limite_cliente", "data"), Coluna("chegada", "data", nulo=True),
         Coluna("tentativa_1", "data", nulo=True), Coluna("realizado", "data", nulo=True),
         Coluna("status", "texto", valores=STATUS_CTE), Coluna("ofensor_pickup", "booleano")),
        ("cte_id",),
        {"unidade_origem_id": U, "unidade_destino_id": U, "cliente_id": C},
    ),
    "bi1_emissoes_dia": Base(
        "bi1_emissoes_dia",
        (Coluna("data", "data"), Coluna("unidade_origem_id", "texto"),
         Coluna("cliente_id", "texto"), Coluna("remessas", "inteiro"),
         Coluna("volumes", "inteiro"), Coluna("peso_kg", "decimal")),
        ("data", "unidade_origem_id", "cliente_id"),
        {"unidade_origem_id": U, "cliente_id": C},
    ),
    "bi1_entregas_courier": Base(
        "bi1_entregas_courier",
        (Coluna("data", "data"), Coluna("unidade_id", "texto"), Coluna("courier_id", "texto"),
         Coluna("entregas", "inteiro"), Coluna("baixas_app", "inteiro")),
        ("data", "courier_id"),
        {"unidade_id": U},
    ),
    "bi2_piso": Base(
        "bi2_piso",
        (Coluna("cte_id", "texto"), Coluna("unidade_atual_id", "texto"),
         Coluna("unidade_destino_id", "texto"), Coluna("cliente_id", "texto"),
         Coluna("status", "texto", valores=STATUS_PISO), Coluna("data_evento", "data"),
         Coluna("limite_cliente", "data"), Coluna("peso_kg", "decimal"),
         Coluna("transferido_em", "data", nulo=True), Coluna("entrou_unidade", "booleano")),
        ("cte_id",),
        {"unidade_atual_id": U, "unidade_destino_id": U, "cliente_id": C},
    ),
    "bi3_producao_hora": Base(
        "bi3_producao_hora",
        (Coluna("data", "data"), Coluna("hora", "inteiro"), Coluna("unidade_id", "texto"),
         Coluna("cliente_id", "texto"), Coluna("volumes_in", "inteiro"),
         Coluna("volumes_out", "inteiro")),
        ("data", "hora", "unidade_id", "cliente_id"),
        {"unidade_id": U, "cliente_id": C},
    ),
    "bi3_produtividade_operador": Base(
        "bi3_produtividade_operador",
        (Coluna("data", "data"), Coluna("unidade_id", "texto"), Coluna("operador_id", "texto"),
         Coluna("volumes", "inteiro"), Coluna("horas_trabalhadas", "decimal")),
        ("data", "operador_id"),
        {"unidade_id": U},
    ),
    "bi3_forecast": Base(
        "bi3_forecast",
        (Coluna("data", "data"), Coluna("unidade_id", "texto"), Coluna("cliente_id", "texto"),
         Coluna("volumes_previstos", "inteiro")),
        ("data", "unidade_id", "cliente_id"),
        {"unidade_id": U, "cliente_id": C},
    ),
    "bi4_viagens": Base(
        "bi4_viagens",
        (Coluna("viagem_id", "texto"), Coluna("rota", "texto"),
         Coluna("tipo_rota", "texto", valores=TIPOS_ROTA), Coluna("unidade_origem_id", "texto"),
         Coluna("unidade_destino_id", "texto"), Coluna("cliente_principal_id", "texto"),
         Coluna("fornecedor_id", "texto", valores=FORNECEDORES),
         Coluna("tipo_veiculo", "texto", valores=VEICULOS), Coluna("motorista_id", "texto"),
         Coluna("saida_prevista", "datahora"), Coluna("saida_real", "datahora", nulo=True),
         Coluna("termino_previsto", "datahora"), Coluna("termino_real", "datahora", nulo=True),
         Coluna("status", "texto", valores=STATUS_VIAGEM),
         Coluna("ocorrencia", "texto", nulo=True, valores=OCORRENCIAS)),
        ("viagem_id",),
        {"unidade_origem_id": U, "unidade_destino_id": U, "cliente_principal_id": C},
    ),
    "bi4_manifestos": Base(
        "bi4_manifestos",
        (Coluna("manifesto_id", "texto"), Coluna("viagem_id", "texto"),
         Coluna("data_transferencia", "data"), Coluna("unidade_origem_id", "texto"),
         Coluna("unidade_destino_id", "texto"), Coluna("cliente_id", "texto"),
         Coluna("ctes_total", "inteiro"), Coluna("ctes_transferidos", "inteiro"),
         Coluna("peso_kg", "decimal")),
        ("manifesto_id",),
        {"viagem_id": "bi4_viagens", "unidade_origem_id": U, "unidade_destino_id": U,
         "cliente_id": C},
    ),
    "bi5_coletas": Base(
        "bi5_coletas",
        (Coluna("coleta_id", "texto"), Coluna("solicitacao", "data"),
         Coluna("deposito_ponto", "data", nulo=True),
         Coluna("retirada_motorista", "data", nulo=True), Coluna("prazo", "data"),
         Coluna("status", "texto", valores=STATUS_COLETA), Coluna("unidade_id", "texto"),
         Coluna("cliente_id", "texto"),
         Coluna("motivo_cancelamento", "texto", nulo=True, valores=MOTIVOS_CANCELAMENTO)),
        ("coleta_id",),
        {"unidade_id": U, "cliente_id": C},
    ),
}

# Linhas previstas em docs/03 (Q07 aceita ±10%).
LINHAS_PREVISTAS = {
    "dim_unidades": 12, "dim_clientes": 15, "dim_calendario": 92,
    "bi1_ctes": 30000, "bi1_emissoes_dia": 16000, "bi1_entregas_courier": 12000,
    "bi2_piso": 8000, "bi3_producao_hora": 120000, "bi3_produtividade_operador": 9000,
    "bi3_forecast": 8600, "bi4_viagens": 6000, "bi4_manifestos": 9000, "bi5_coletas": 15000,
}
