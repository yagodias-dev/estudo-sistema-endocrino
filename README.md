# Sistema Endócrino Humano

Site educativo sobre o sistema endócrino para estudantes do ensino médio, em português do Brasil.
Feito só com HTML, CSS e JavaScript puros: sem frameworks e sem etapa de build.

> **Aviso:** site educativo. Não substitui orientação médica.

## Como abrir

Basta abrir o arquivo `index.html` no navegador. O modelo 3D usa a biblioteca Three.js, carregada da internet (cdnjs). Sem internet ou sem WebGL, o site mostra automaticamente uma versão 2D do corpo com as mesmas glândulas.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | Estrutura e textos fixos das seções |
| `style.css` | Visual, modo claro e escuro, ajustes de celular e acessibilidade |
| `script.js` | Interações: corpo interativo, simuladores, quiz, jogo, lupa, gráficos e animações |
| `testes/` | Teste automático no navegador (veja abaixo) |

### Onde editar o conteúdo

- **Glândulas** (painel do corpo interativo, tabela e lista em texto): array `G` no começo do `script.js`.
  Cada glândula tem `ps` ("Em poucas palavras"), `tx` ("Explicação técnica"), `pl` ("Para lembrar"), `h` (hormônios), `f` (função) e `d` (doenças).
- **Doenças, linha do tempo, hábitos, mitos, glossário e quiz**: listas no `script.js` (procure por `mk('#dz'`, `mk('#tl'`, `mk('#hb'`, `mk('#mt'`, `const GL=` e `const Q=`).
- **Posição das glândulas no corpo 3D**: abra o site com `?calibrar` no endereço (por exemplo, `index.html?calibrar`) para ajustar com o teclado e copiar os valores.

Os simuladores (glicemia, termostato da tireoide, estresse, cortisol e ciclo menstrual) são **qualitativos**: não mostram valores clínicos de propósito.

## Teste automático

A pasta `testes/` tem um teste que abre o site num Chrome sem janela (headless), em quatro tamanhos:
desktop (1280px), celular 360px, celular 430px e celular 390px com movimento reduzido.

Ele confere, em cada tamanho:

- ausência de erros de JavaScript e de rolagem lateral;
- aviso médico no topo e no rodapé;
- botão "Pular abertura", tema claro/escuro (e se a escolha fica salva) e menu;
- corpo interativo: painel da glândula com as três partes, painel abaixo do modelo no celular, rolagem da página com o dedo sobre o modelo, dica de zoom e teclado;
- termostato da tireoide, simulador de glicemia e ausência de valores clínicos;
- lupa do microscópio (mouse, toque e teclado);
- cards de mito/verdade e busca na tabela;
- jogo de arrastar (tocar e tocar, teclado e arrastar com mouse ou dedo, inclusive até um espaço fora da tela);
- quiz (mostra a resposta e avança).

### Como rodar

Precisa do [Node.js](https://nodejs.org) (versão 18 ou mais nova) e do Google Chrome (ou Microsoft Edge) instalado. O teste usa o navegador do computador e não baixa outro.

```bash
cd testes
npm install   # só na primeira vez
npm test
```

No fim aparece algo como `95/95 verificações passaram. Tudo certo!`. Cada falha aparece marcada com ✘ e uma explicação. Capturas de tela de cada tamanho ficam em `testes/capturas/` (essa pasta não vai para o Git).

Se o Chrome estiver num lugar diferente do padrão, indique o caminho:

```bash
# Windows (PowerShell)
$env:CHROME_PATH = "C:\caminho\para\chrome.exe"; npm test
# macOS / Linux
CHROME_PATH="/caminho/para/chrome" npm test
```

O teste usa a internet para carregar o Three.js. Sem internet, ele testa a versão 2D do modelo e mostra um aviso de rede (⚠), que não conta como falha.

## Fontes de referência

Livros de fisiologia humana (Guyton & Hall; Costanzo), [Ministério da Saúde](https://www.gov.br/saude) e [Sociedade Brasileira de Endocrinologia e Metabologia (SBEM)](https://www.endocrino.org.br).
