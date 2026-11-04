/* Executa tests/test.html em um navegador headless e imprime o resultado. Requer: npm i puppeteer */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
let puppeteer;
try { puppeteer = (await import('puppeteer')).default; } catch { puppeteer = (await import('puppeteer-core')).default; }
const here = path.dirname(fileURLToPath(import.meta.url));
const extra = (process.env.CHROME_ARGS || '').split(' ').filter(Boolean);
const browser = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--allow-file-access-from-files', ...extra] });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(here, 'test.html')).href);
await page.waitForFunction(() => window.__testResults, { timeout: 30000 });
const r = await page.evaluate(() => window.__testResults);
r.results.forEach(x => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.ok ? '' : ' — ' + x.err)));
console.log(`\n${r.pass} de ${r.total} testes passaram`);
await browser.close();
process.exit(r.pass === r.total ? 0 : 1);
