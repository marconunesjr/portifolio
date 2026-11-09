# 02 — Requisitos

## Requisitos funcionais
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF01 | Página inicial | Mostra 5 cartões, um por BI, com nome, pergunta que responde e link; cada link abre o BI correto |
| RF02 | BI Indicadores Operacionais | Mostra K01 a K06 conforme docs/07; K01 com meta, comparação e semáforo |
| RF03 | BI Piso – Vencimento por Cliente | Mostra K07 a K11; K07 com meta, comparação e semáforo |
| RF04 | BI Produção do Dia | Mostra K12 a K14, com mapa de calor hora × dia; K12 com meta, comparação e semáforo |
| RF05 | BI Transporte e Transferências | Mostra K15 a K19, com Pareto de ocorrências; K15, K16 e K19 com meta e semáforo |
| RF06 | BI SLA de Coletas | Mostra K20 a K23; K20 com meta, comparação e semáforo |
| RF07 | Filtros | Cada BI tem filtros de período, unidade, UF/regional e cliente; mudar um filtro recalcula todos os KPIs e gráficos da página |
| RF08 | Navegação | De qualquer BI é possível voltar à página inicial e ir a outro BI com 1 clique |
| RF09 | Transparência | Cada página mostra a pergunta que responde, a data de referência, o aviso de dados fictícios e uma nota com as fórmulas |
| RF10 | Anonimização | Nenhum termo de referencias/termos_proibidos.txt aparece em arquivo versionado; pessoas só por código |
| RF11 | Dados sintéticos | `python etl/gerar_dados.py` gera todas as bases de docs/06; duas execuções com a mesma semente dão arquivos idênticos |
| RF12 | Publicação | O workflow do GitHub Actions publica `dist/` no GitHub Pages do repositório marconunesjr/portifolio; todos os caminhos do site são relativos |

## Requisitos não funcionais
| ID | Requisito | Critério de aceite |
|---|---|---|
| RNF01 | Sem erros | 0 erros no console do navegador nas 6 páginas |
| RNF02 | Desempenho | Cada página carrega e mostra os KPIs em até 3 segundos em conexão banda larga; cada filtro responde em até 1 segundo |
| RNF03 | Peso | Soma dos JSON de `src/dados/` de até 15 MB; nenhum arquivo acima de 5 MB |
| RNF04 | Responsividade | Layout utilizável de 360 px a 1920 px de largura, sem rolagem horizontal da página |
| RNF05 | Ambiente | Site 100% estático; funciona no GitHub Pages e abrindo `dist/index.html` por servidor local simples |
| RNF06 | Acessibilidade | Contraste de texto de pelo menos 4,5:1; estado do semáforo indicado por cor e por texto ou ícone |
| RNF07 | Idioma e formato | Textos em pt-BR; datas em dd/mm/aaaa; vírgula decimal |
| RNF08 | Tema | Temas claro e escuro, seguindo a preferência do sistema |
| RNF09 | Qualidade de código | `ruff check` sem erros; `python -m pytest` e `node --test` passando |
