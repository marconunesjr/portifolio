/**
 * Tema claro/escuro: segue a preferência do sistema; o botão do topo fixa uma escolha.
 * A escolha fica no navegador (localStorage) apenas como conveniência.
 */

const CHAVE = 'aurora-tema';
const consulta = () => window.matchMedia('(prefers-color-scheme: dark)');

function ler_escolha() {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}

function gravar_escolha(valor) {
  try { localStorage.setItem(CHAVE, valor); } catch { /* sem armazenamento: só nesta visita */ }
}

/** Tema em uso agora: "light" ou "dark". */
export function tema_efetivo() {
  const fixo = document.documentElement.dataset.theme;
  if (fixo === 'light' || fixo === 'dark') return fixo;
  return consulta().matches ? 'dark' : 'light';
}

function aplicar() {
  document.documentElement.dataset.temaEfetivo = tema_efetivo();
}

/**
 * Liga o botão de tema e avisa quando o tema muda (para redesenhar os gráficos).
 * @param {() => void} [ao_mudar]
 */
export function iniciar_tema(ao_mudar) {
  const escolha = ler_escolha();
  if (escolha === 'light' || escolha === 'dark') document.documentElement.dataset.theme = escolha;
  aplicar();
  const avisar = () => { aplicar(); if (ao_mudar) ao_mudar(); };
  consulta().addEventListener('change', () => { if (!document.documentElement.dataset.theme) avisar(); });
  const botao = document.querySelector('.botao-tema');
  if (botao) {
    const rotular = () => botao.setAttribute('aria-label',
      tema_efetivo() === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro');
    rotular();
    botao.addEventListener('click', () => {
      const novo = tema_efetivo() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = novo;
      gravar_escolha(novo);
      rotular();
      avisar();
    });
  }
}
