'use strict';
/**
 * generate-bp.js — Génère le business plan .docx depuis les livrables Markdown
 * Usage : node scripts/generate-bp.js <cas>
 * Nécessite : npm install docx
 */
const fs   = require('fs');
const path = require('path');

const cas = process.argv[2];
if (!cas) { console.error('Usage: node scripts/generate-bp.js <cas>'); process.exit(1); }

let Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak;
try {
  ({ Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = require('docx'));
} catch {
  console.error('Package "docx" manquant. Installez-le : npm install docx');
  process.exit(1);
}

const EG_DARK = '455F51';
const EG_MID  = '549E39';
const EG_DEEP = '2D5016';
const EG_TEXT = '1A1A1A';

const AGENTS_DIR    = path.resolve(__dirname, '../..');
const LIVRABLES_DIR = path.join(AGENTS_DIR, 'livrables');
const livDir        = path.join(LIVRABLES_DIR, cas, '06-livraison');
const synFile       = path.join(livDir, 'business-plan-synthese-v1.md');
const annexFile     = path.join(livDir, 'business-plan-annexes-v1.md');

if (!fs.existsSync(synFile)) { console.error(`Fichier non trouvé : ${synFile}`); process.exit(1); }

const synContent   = fs.readFileSync(synFile, 'utf-8');
const annexContent = fs.existsSync(annexFile) ? fs.readFileSync(annexFile, 'utf-8') : null;

function inlineRuns(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map(p =>
    p.startsWith('**') && p.endsWith('**')
      ? new TextRun({ text: p.slice(2, -2), bold: true, font: 'Calibri', size: 22, color: EG_TEXT })
      : new TextRun({ text: p, font: 'Calibri', size: 22, color: EG_TEXT })
  );
}

function parseMarkdown(text) {
  const children = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if      (line.startsWith('#### ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: line.slice(5).trim(), bold: true, font: 'Calibri', size: 22, color: EG_DEEP })], spacing: { before: 120, after: 40 } }));
    else if (line.startsWith('### '))  children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.slice(4).trim(), bold: true, font: 'Calibri', size: 26, color: EG_DEEP })], spacing: { before: 200, after: 60 } }));
    else if (line.startsWith('## '))   children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.slice(3).trim(), bold: true, font: 'Calibri', size: 30, color: EG_MID  })], spacing: { before: 280, after: 80 } }));
    else if (line.startsWith('# '))    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.slice(2).trim(), bold: true, font: 'Calibri', size: 40, color: EG_DARK })], spacing: { before: 360, after: 120 } }));
    else if (line.startsWith('- ') || line.startsWith('* ')) children.push(new Paragraph({ children: [new TextRun({ text: '• ', bold: true, color: EG_MID, font: 'Calibri', size: 22 }), ...inlineRuns(line.slice(2).trim())], indent: { left: 640, hanging: 320 }, spacing: { after: 60 } }));
    else if (/^\d+\. /.test(line))    children.push(new Paragraph({ children: inlineRuns(line.replace(/^\d+\. /, '').trim()), indent: { left: 640 }, spacing: { after: 60 } }));
    else if (line.trim() === '' || line.startsWith('---')) children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 60 } }));
    else children.push(new Paragraph({ children: inlineRuns(line), spacing: { after: 60 } }));
  }
  return children;
}

const mainChildren = parseMarkdown(synContent);
if (annexContent) { mainChildren.push(new Paragraph({ children: [new PageBreak()] })); mainChildren.push(...parseMarkdown(annexContent)); }

const doc = new Document({
  creator: 'Efficience Globale — EG-AGENTS',
  description: `Business plan — ${cas}`,
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22, color: EG_TEXT } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, font: 'Calibri', color: EG_DARK }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: 'Calibri', color: EG_MID  }, paragraph: { spacing: { before: 280, after: 80  }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Calibri', color: EG_DEEP }, paragraph: { spacing: { before: 200, after: 60  }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: 'Calibri', color: EG_DEEP }, paragraph: { spacing: { before: 120, after: 40  }, outlineLevel: 3 } },
    ],
  },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } }, children: mainChildren }],
});

const outFile = path.join(livDir, `business-plan-${cas}.docx`);
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outFile, buf); console.log(`✓ Généré : ${outFile}`); }).catch(e => { console.error(e.message); process.exit(1); });
