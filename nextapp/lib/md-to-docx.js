import path from 'path';
import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, ImageRun, LevelFormat,
} from 'docx';
import { AGENTS_DIR } from './constants.js';

// ─── Charte graphique EG ──────────────────────────────────────────────────────
const EG = {
  VERT_PRINCIPAL: '455F51',
  VERT_VIF:       '549E39',
  VERT_MID:       '3D6B4F',
  NOIR:           '1A1A1A',
  GRIS_PIED:      '666666',
  FOND_ENCADRE:   'F0F4F2',
  LIGNES_ALT:     'F5F8F5',
  BLANC:          'FFFFFF',
};

// A4 en DXA (1440 DXA = 1 pouce = 2,54 cm)
const PW = 11906, PH = 16838;
const ML = Math.round(3.0 / 2.54 * 1440); // 3 cm gauche  ≈ 1701
const MR = Math.round(2.0 / 2.54 * 1440); // 2 cm droite  ≈ 1134
const MT = Math.round(2.5 / 2.54 * 1440); // 2,5 cm haut  ≈ 1417
const MB = MT;
const CW = PW - ML - MR; // largeur utile ≈ 9071

const BULLET_REF = 'eg-bullets';

// ─── Parseur inline (bold / italic) ──────────────────────────────────────────
function parseInline(text, { color = EG.NOIR, size = 22, font = 'Calibri' } = {}) {
  const runs = [];
  const clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // strip [text](url)
  const re = /(\*\*[^*]+?\*\*|\*(?!\*)[^*]+?\*(?!\*))/g;
  let last = 0, m;
  while ((m = re.exec(clean)) !== null) {
    if (m.index > last)
      runs.push(new TextRun({ text: clean.slice(last, m.index), color, size, font }));
    const s = m[0];
    if (s.startsWith('**'))
      runs.push(new TextRun({ text: s.slice(2, -2), bold: true, color, size, font }));
    else
      runs.push(new TextRun({ text: s.slice(1, -1), italics: true, color, size, font }));
    last = m.index + s.length;
  }
  if (last < clean.length)
    runs.push(new TextRun({ text: clean.slice(last), color, size, font }));
  return runs.length ? runs : [new TextRun({ text: clean, color, size, font })];
}

function parseInlineWhite(text) {
  const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  return [new TextRun({ text: clean, bold: true, size: 20, font: 'Calibri', color: EG.BLANC })];
}

// ─── Constructeurs de paragraphes ────────────────────────────────────────────
function makeCoverTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 64, font: 'Calibri', color: EG.VERT_PRINCIPAL })],
  });
}

function makeCoverCompany(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text, bold: true, size: 40, font: 'Calibri', color: EG.VERT_PRINCIPAL })],
  });
}

function makeCoverSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 28, font: 'Calibri', color: EG.VERT_MID })],
  });
}

function makeCoverMeta(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: parseInline(text),
  });
}

function makeSection(text) {
  return new Paragraph({
    spacing: { before: 400, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: EG.VERT_VIF, space: 1 } },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Calibri', color: EG.VERT_PRINCIPAL })],
  });
}

function makeSubsection(text) {
  return new Paragraph({
    spacing: { before: 260, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Calibri', color: EG.VERT_MID })],
  });
}

function makeSubSubsection(text) {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri', color: EG.VERT_PRINCIPAL })],
  });
}

function makeBody(text) {
  return new Paragraph({
    spacing: { after: 100, line: 276 },
    children: parseInline(text),
  });
}

function makeBlockquote(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 360 },
    shading: { fill: EG.FOND_ENCADRE, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: EG.VERT_VIF, space: 4 } },
    children: parseInline(text, { size: 22 }),
  });
}

// ─── Tableau EG ───────────────────────────────────────────────────────────────
function makeTable(headerRow, dataRows) {
  const cols = Math.max(1, headerRow.length);
  const colW = Math.floor(CW / cols);
  const colWidths = Array(cols).fill(colW);
  const cb = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  const borders = { top: cb, bottom: cb, left: cb, right: cb };
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

  const rows = [];

  rows.push(new TableRow({
    tableHeader: true,
    children: headerRow.map(cell => new TableCell({
      borders,
      width: { size: colW, type: WidthType.DXA },
      shading: { fill: EG.VERT_PRINCIPAL, type: ShadingType.CLEAR },
      margins: cellMargins,
      verticalAlign: 'center',
      children: [new Paragraph({
        spacing: { after: 0 },
        children: parseInlineWhite(cell),
      })],
    })),
  }));

  dataRows.forEach((row, ri) => {
    rows.push(new TableRow({
      children: row.map(cell => new TableCell({
        borders,
        width: { size: colW, type: WidthType.DXA },
        shading: { fill: ri % 2 === 1 ? EG.LIGNES_ALT : EG.BLANC, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          spacing: { after: 0 },
          children: parseInline(cell.trim(), { size: 20 }),
        })],
      })),
    }));
  });

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  });
}

// ─── Parseur markdown ─────────────────────────────────────────────────────────
function parseMarkdown(mdContent) {
  let content = mdContent;

  // Supprimer le frontmatter YAML
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) content = content.slice(end + 4).trimStart();
  }

  const lines   = content.split('\n');
  const children = [];
  let onCover    = true;   // Vrai jusqu'à la première section du corps
  let inTable    = false;
  let tableRows  = [];
  let inBq       = false;
  let bqLines    = [];

  function flushTable() {
    if (!tableRows.length) return;
    const sepIdx = tableRows.findIndex(r => r.every(c => /^[-: ]+$/.test(c.trim())));
    const hIdx   = sepIdx > 0 ? sepIdx - 1 : 0;
    const header = tableRows[hIdx] || tableRows[0] || [];
    const data   = tableRows.filter((_, i) => i !== hIdx && (sepIdx < 0 || i !== sepIdx));
    if (header.length) children.push(makeTable(header, data));
    children.push(new Paragraph({ spacing: { after: 120 } }));
    tableRows = [];
  }

  function flushBq() {
    if (!bqLines.length) return;
    const text = bqLines.join(' ').trim();
    if (text) children.push(makeBlockquote(text));
    bqLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Commentaires HTML — ignorer (potentiellement multi-lignes)
    if (line.trim().startsWith('<!--')) {
      while (i < lines.length && !lines[i].includes('-->')) i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      if (inTable) { flushTable(); inTable = false; }
      inBq = true;
      bqLines.push(line.trim().replace(/^>\s*/, ''));
      continue;
    } else if (inBq) {
      flushBq();
      inBq = false;
    }

    // Ligne de tableau
    if (line.trim().startsWith('|')) {
      if (!inTable) { inTable = true; tableRows = []; }
      const cells = line.trim()
        .split('|')
        .filter((_, j, arr) => j > 0 && j < arr.length - 1)
        .map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    // # Titre niveau 1
    if (/^# /.test(line)) {
      const text = line.slice(2).trim();
      children.push(onCover ? makeCoverTitle(text) : makeSection(text));
      continue;
    }

    // ## Titre niveau 2
    if (/^## /.test(line)) {
      const text = line.slice(3).trim();
      if (onCover && (text === 'Table des matières' || /^\d+\./.test(text) || text.toLowerCase().includes('résumé') && /^\d/.test(text))) {
        onCover = false;
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
      children.push(onCover ? makeCoverCompany(text) : makeSection(text));
      continue;
    }

    // ### Titre niveau 3
    if (/^### /.test(line)) {
      const text = line.slice(4).trim();
      children.push(onCover ? makeCoverSubtitle(text) : makeSubsection(text));
      continue;
    }

    // #### Titre niveau 4
    if (/^#### /.test(line)) {
      const text = line.slice(5).trim();
      children.push(makeSubSubsection(text));
      continue;
    }

    // Séparateur horizontal ---
    if (/^-{3,}$/.test(line.trim())) {
      if (onCover) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: EG.LIGNES_ALT, space: 1 } },
          children: [],
        }));
      }
      continue;
    }

    // Liste à puces (- item ou * item)
    if (/^[*-] /.test(line)) {
      const text = line.slice(2).trim();
      children.push(new Paragraph({
        numbering: { reference: BULLET_REF, level: 0 },
        spacing: { after: 60, line: 276 },
        children: parseInline(text),
      }));
      continue;
    }

    // Liste numérotée
    if (/^\d+\. /.test(line)) {
      const text = line.replace(/^\d+\. /, '').trim();
      if (!onCover) {
        children.push(new Paragraph({
          numbering: { reference: BULLET_REF, level: 0 },
          spacing: { after: 60, line: 276 },
          children: parseInline(text),
        }));
      } else {
        children.push(makeCoverMeta(text));
      }
      continue;
    }

    // Ligne vide
    if (!line.trim()) {
      children.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }

    // Texte courant
    children.push(onCover ? makeCoverMeta(line) : makeBody(line));
  }

  if (inTable) flushTable();
  if (inBq)    flushBq();

  return children;
}

// ─── Générateur principal ─────────────────────────────────────────────────────
export async function generateDocx(mdContent, cas) {
  // Logo EG
  const logoPath = path.join(AGENTS_DIR, 'eg-logo.png');
  let logoBuffer = null;
  try { if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath); } catch {}

  const coverElements = [];

  if (logoBuffer) {
    coverElements.push(new Paragraph({
      spacing: { before: 0, after: 480 },
      children: [new ImageRun({
        type: 'png',
        data: logoBuffer,
        transformation: { width: 110, height: 45 },
        altText: { title: 'Efficience Globale', description: 'Logo EG', name: 'eg-logo' },
      })],
    }));
  } else {
    coverElements.push(new Paragraph({
      spacing: { before: 0, after: 480 },
      children: [new TextRun({ text: 'EFFICIENCE GLOBALE', bold: true, size: 28, font: 'Calibri', color: EG.VERT_PRINCIPAL })],
    }));
  }

  const bodyElements = parseMarkdown(mdContent);
  const children = [...coverElements, ...bodyElements];

  // Pied de page EG
  const dateStr = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      tabStops: [{ type: 'right', position: CW }],
      children: [
        new TextRun({ text: `Efficience Globale | Confidentiel | ${dateStr}`, size: 18, font: 'Calibri', color: EG.GRIS_PIED }),
        new TextRun({ text: '\t', size: 18, font: 'Calibri' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Calibri', color: EG.VERT_PRINCIPAL }),
      ],
    })],
  });

  const doc = new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: EG.NOIR },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PW, height: PH },
          margin: { top: MT, bottom: MB, left: ML, right: MR },
        },
      },
      footers: { default: footer },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
