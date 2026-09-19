/**
 * Genera los PDF del Enunciado 2 a partir de los HTML de esta carpeta.
 *
 * Uso:  node docs-src/build.js
 * Requiere puppeteer-core y un Chrome instalado (CHROME_PATH lo sobreescribe).
 * Los PDF se escriben en la raíz del repositorio.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SRC = __dirname;
const OUT = path.resolve(SRC, '..');

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const DOCS = [
  { file: 'Enunciado2_Listado_de_Requerimientos', footer: 'Listado de Requerimientos' },
  { file: 'Enunciado2_User_Stories', footer: 'User Stories' },
  { file: 'Enunciado2_Bosquejo_de_Sprints', footer: 'Bosquejo de división en sprints' },
];

const footerTemplate = (label) => `
  <div style="width:100%;font-family:'Segoe UI',Calibri,Arial,sans-serif;font-size:7.4pt;
              color:#5d6570;padding:0 16mm;display:flex;justify-content:space-between;
              border-top:0.5pt solid #d3d8de;padding-top:3pt;">
    <span>${label}</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });

  for (const doc of DOCS) {
    const src = path.join(SRC, `${doc.file}.html`);
    const dest = path.join(OUT, `${doc.file}.pdf`);
    const page = await browser.newPage();

    await page.goto('file:///' + src.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await page.pdf({
      path: dest,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footerTemplate(doc.footer),
      margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
    });

    await page.close();
    const kb = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`OK  ${doc.file}.pdf  (${kb} KB)`);
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
