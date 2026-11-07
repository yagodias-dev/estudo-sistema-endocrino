// Teste automático do site no Chrome sem janela (headless), em desktop e celular.
// Uso:  cd testes  →  npm install  →  npm test
// O Chrome (ou Edge) já instalado no computador é usado; para indicar outro: CHROME_PATH=/caminho/do/chrome npm test
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const SITE = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const CAPTURAS = path.join(__dirname, 'capturas');

function acharChrome() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const p = c.find(x => x && fs.existsSync(x));
  if (!p) { console.error('Chrome não encontrado. Rode com CHROME_PATH=/caminho/do/chrome npm test'); process.exit(2); }
  return p;
}

const PERFIS = [
  { nome: 'desktop 1280px', vp: { width: 1280, height: 800 }, toque: false },
  { nome: 'celular 360px', vp: { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, toque: true },
  { nome: 'celular 430px', vp: { width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, toque: true },
  { nome: 'celular 390px + movimento reduzido', vp: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, toque: true, reduzido: true }
];

const espera = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0, total = 0;
function ok(cond, nome, detalhe) {
  total++;
  if (cond) console.log('   ✔ ' + nome);
  else { falhas++; console.log('   ✘ ' + nome + (detalhe ? '  →  ' + detalhe : '')); }
}
async function aguardar(page, fn, arg, ms = 6000) {
  try { await page.waitForFunction(fn, { timeout: ms, polling: 100 }, arg); return true; } catch { return false; }
}
const irPara = (page, sel) => page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
const centro = (page, sel) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, vh: innerHeight }; }, sel);
// toca no centro do elemento, depois de trazê-lo para a tela
async function tocar(page, sel) { await irPara(page, sel); await espera(80); const c = await centro(page, sel); await page.touchscreen.tap(c.x, c.y); }
// arrasta (dedo ou mouse) de um elemento até outro; se o destino estiver fora da tela,
// segura perto da borda até a página rolar sozinha, como um aluno faria no celular
async function arrastar(page, toque, de, para) {
  await irPara(page, de); await espera(100);
  let p = await centro(page, de);
  const down = toque ? () => page.touchscreen.touchStart(p.x, p.y) : async () => { await page.mouse.move(p.x, p.y); await page.mouse.down(); };
  const move = (x, y) => (p = { x, y, vh: p.vh }, toque ? page.touchscreen.touchMove(x, y) : page.mouse.move(x, y));
  const up = () => toque ? page.touchscreen.touchEnd() : page.mouse.up();
  const ir = async (x, y) => { const x0 = p.x, y0 = p.y; for (let i = 1; i <= 8; i++) await move(x0 + (x - x0) * i / 8, y0 + (y - y0) * i / 8); };
  await down();
  for (let i = 0; i < 200; i++) {
    const b = await centro(page, para);
    if (b.y > 90 && b.y < b.vh - 90) {
      // a página pode ainda estar rolando: corrige a mira até o dedo ficar sobre o destino
      for (let k = 0; k < 6; k++) {
        const c = await centro(page, para); await ir(c.x, c.y); await espera(60);
        const d = await centro(page, para); if (Math.abs(d.y - p.y) < 12) break;
      }
      break;
    }
    if (i === 0) await ir(p.x, b.y < 90 ? 20 : b.vh - 20);
    await espera(30);
  }
  await up();
}

async function testarPerfil(browser, perfil) {
  console.log('\n▶ ' + perfil.nome);
  const page = await browser.newPage();
  const erros = [], avisos = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_/.test(t)) avisos.push(t); else erros.push(t);
  });
  page.on('requestfailed', r => avisos.push('falha de rede: ' + r.url()));
  await page.setViewport(perfil.vp);
  if (perfil.reduzido) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) { } });
  await page.goto(SITE, { waitUntil: 'load', timeout: 60000 });
  await espera(1500);

  const tem3D = await page.evaluate(() => !!document.querySelector('#cv'));
  if (!tem3D) console.log('   (sem WebGL ou sem internet: testando a versão 2D do modelo)');

  // aviso médico no topo e no rodapé
  const aviso = await page.evaluate(() => [document.querySelector('#hero').textContent, document.querySelector('footer').textContent]
    .map(t => /não substitui orientação médica/i.test(t)));
  ok(aviso[0] && aviso[1], 'aviso médico no topo e no rodapé');

  // título legível pelo leitor de tela como frase inteira
  ok(await page.evaluate(() => { const s = document.querySelector('#t .sr'); return s && s.textContent.includes('conversa com o seu corpo'); }), 'título com texto inteiro para leitor de tela');

  // botão de pular a abertura
  await page.click('#skp');
  ok(await aguardar(page, () => Math.abs(document.querySelector('#modelo').getBoundingClientRect().top) < 120 && document.activeElement.id === 'modelo'),
    'botão "Pular abertura" leva ao modelo e move o foco');

  // tema claro/escuro
  const tema0 = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('#th');
  const tema = await page.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('#th').getAttribute('aria-pressed'), localStorage.getItem('tema')]);
  ok(tema[0] !== tema0 && tema[1] === String(tema[0] === 'light') && tema[2] === tema[0], 'tema alterna, aria-pressed e escolha salva', JSON.stringify(tema));
  await page.click('#th');

  // corpo interativo: escolher uma glândula abre o painel com as três partes
  await irPara(page, '#modelo .stage');
  if (tem3D) await page.evaluate(() => document.querySelector('#lbs button[data-id=pan]').click());
  else await page.evaluate(() => document.querySelector('.fg[data-id=pan]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const painel = await page.evaluate(() => { const p = document.querySelector('#panel'); return { t: p.textContent, abaixo: p.classList.contains('below') }; });
  ok(/Pâncreas/.test(painel.t) && /Em poucas palavras/.test(painel.t) && /Explicação técnica/.test(painel.t) && /Para lembrar/.test(painel.t), 'painel da glândula com as três partes');
  if (perfil.vp.width <= 560) ok(painel.abaixo, 'no celular o painel fica abaixo do modelo');
  if (tem3D) {
    if (perfil.toque) ok(await page.evaluate(() => getComputedStyle(document.querySelector('#cv')).touchAction === 'pan-y'), 'modelo 3D deixa a página rolar com o dedo (touch-action: pan-y)');
    await page.evaluate(() => document.querySelector('#cv').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })));
    ok(await page.evaluate(() => !document.querySelector('#zh').hidden), 'rolagem sem Ctrl mostra a dica de zoom');
    await page.focus('#cv'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await page.keyboard.press('Escape');
    ok(true, 'modelo 3D aceita teclado (setas, +, Esc) sem erro');
  }

  // termostato hormonal da tireoide
  await irPara(page, '#t4');
  const termo = async v => page.evaluate(v => { const r = document.querySelector('#t4'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); return [document.querySelector('#fbt').textContent, document.querySelector('#n3').classList.contains('hot'), document.querySelector('#n1').classList.contains('hot')]; }, v);
  const alto = await termo(95), baixo = await termo(5);
  ok(/alto/.test(alto[0]) && alto[1] && /baixo/.test(baixo[0]) && baixo[2], 'termostato: T4 alto e T4 baixo mudam a cadeia e o texto');

  // simulador de glicemia (sem valores clínicos)
  await irPara(page, '#gc');
  await espera(300);
  await page.click('#eat');
  ok(await aguardar(page, () => /acima/.test(document.querySelector('#gs').textContent), null, 8000), 'glicemia: "Comer" faz a glicose subir e o texto avisar');
  ok(await page.evaluate(() => !/mg\/dL|\d+\s*bpm/i.test(document.body.innerText)), 'sem valores clínicos (mg/dL ou bpm) na página');

  // lupa do microscópio
  await irPara(page, '#ms');
  await espera(300);
  const caixa = await (await page.$('#ms')).boundingBox();
  const t0 = await page.evaluate(() => document.querySelector('#lens').style.transform);
  if (perfil.toque) await page.touchscreen.tap(caixa.x + caixa.width * .3, caixa.y + caixa.height * .8);
  else await page.mouse.move(caixa.x + caixa.width * .3, caixa.y + caixa.height * .6);
  await espera(150);
  const lente = await page.evaluate(() => [document.querySelector('#lens').classList.contains('on'), document.querySelector('#lens').style.transform]);
  ok(lente[0] && lente[1] !== t0, 'lupa aparece e segue o ' + (perfil.toque ? 'toque' : 'mouse'));
  await page.focus('#ms'); await page.keyboard.press('ArrowLeft');
  ok(await page.evaluate(t => document.querySelector('#lens').style.transform !== t, lente[1]), 'lupa se move com as setas do teclado');

  // menu: link leva à seção e fica marcado
  await page.evaluate(() => document.querySelector('nav a[href="#quiz"]').click());
  ok(await aguardar(page, () => document.querySelector('nav a[href="#quiz"]').getAttribute('aria-current') === 'location', null, 5000), 'menu leva ao Quiz e marca o link atual');

  // mito × verdade
  await irPara(page, '.fc');
  await page.click('.fc');
  ok(await page.evaluate(() => { const b = document.querySelector('.fc'); return b.getAttribute('aria-pressed') === 'true' && b.children[1].getAttribute('aria-hidden') === 'false'; }), 'card de mito/verdade vira e libera o verso');

  // tabela pesquisável
  await irPara(page, '#q');
  await page.type('#q', 'insulina');
  ok(await page.evaluate(() => [...document.querySelectorAll('#tb tr')].filter(r => !r.hidden).length === 1), 'busca na tabela filtra as linhas');

  // jogo de arrastar: tocar/clicar, teclado e arrastar
  await irPara(page, '#jg');
  await espera(200);
  const chip = (t, h) => `#jg .chip[data-t="${t}"][data-h="${h}"]`, slot = (t, h) => `#jg .slot[data-t="${t}"][data-h="${h}"]`;
  const bom = s => page.evaluate(s => document.querySelector(s).classList.contains('good'), s);
  if (perfil.toque) { await tocar(page, chip('g', 0)); await tocar(page, slot('g', 0)); }
  else { await page.click(chip('g', 0)); await page.click(slot('g', 0)); }
  ok(await bom(slot('g', 0)), 'jogo: ' + (perfil.toque ? 'tocar' : 'clicar') + ' no cartão e depois no espaço');
  await page.focus(chip('f', 0)); await page.keyboard.press('Space'); await page.focus(slot('f', 0)); await page.keyboard.press('Enter');
  ok(await bom(slot('f', 0)), 'jogo: teclado (Espaço no cartão, Enter no espaço)');
  const longe = await page.evaluate((c, s) => { document.querySelector(c).scrollIntoView({ block: 'center', behavior: 'instant' }); return document.querySelector(s).getBoundingClientRect().bottom < 0; }, chip('g', 1), slot('g', 1));
  await arrastar(page, perfil.toque, chip('g', 1), slot('g', 1));
  ok(await bom(slot('g', 1)), 'jogo: arrastar com ' + (perfil.toque ? 'o dedo' : 'o mouse') + (longe ? ' até um espaço fora da tela (a página rola sozinha)' : ''));

  // quiz: responder avança para a próxima pergunta
  await irPara(page, '#qz');
  const p1 = await page.$eval('#qz h3', e => e.textContent);
  await page.click('#qz .q button');
  ok(await page.evaluate(() => document.querySelector('#ex2').textContent.length > 0 && !!document.querySelector('#qz button.ok')), 'quiz mostra a resposta certa e a explicação');
  ok(await aguardar(page, t => document.querySelector('#qz h3').textContent !== t, p1, 5000), 'quiz avança para a próxima pergunta');

  // sem rolagem lateral (conferido no fim, depois de todas as interações)
  await espera(300);
  const larg = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(larg[0] <= larg[1], 'sem rolagem lateral', larg.join(' > '));

  if (perfil.reduzido) ok(await page.evaluate(() => getComputedStyle(document.querySelector('#t .c')).opacity === '1' && getComputedStyle(document.documentElement).scrollBehavior !== 'smooth'), 'movimento reduzido: título visível e sem rolagem suave');

  ok(erros.length === 0, 'nenhum erro de JavaScript', erros.join(' | '));
  if (avisos.length) console.log('   ⚠ avisos de rede (internet ou CDN): ' + avisos.length);

  fs.mkdirSync(CAPTURAS, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(CAPTURAS, perfil.nome.replace(/[^\w]+/g, '-') + '.png') });
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: acharChrome(), headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  try { for (const p of PERFIS) await testarPerfil(browser, p); }
  catch (e) { falhas++; console.log('   ✘ o teste parou com erro: ' + e.message); }
  finally { await browser.close(); }
  console.log(`\n${total - falhas}/${total} verificações passaram.` + (falhas ? ` ${falhas} falharam.` : ' Tudo certo!'));
  process.exit(falhas ? 1 : 0);
})();
