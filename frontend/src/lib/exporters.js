// Export utilities for match statistics (CSV & PDF)
// Used by Estatisticas page to download per-match summaries and season aggregates.
// Both exporters accept an `options` object so the user can pick which columns
// and sections to include (see DEFAULT_EXPORT_OPTIONS below).

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTime, formatTimeLong, formatCountdown, getMatchDuration } from './time';

// ---------- Field catalog ----------

// Season aggregate columns (per athlete over all matches in scope)
export const SEASON_PLAYER_FIELDS = [
  { id: 'games', label: 'Jogos', short: 'J', pdfWidth: 9, halign: 'right', get: (a) => a.games },
  { id: 'minutes', label: 'Minutos', short: 'Minutos', pdfWidth: 20, halign: 'right', get: (a) => formatTimeLong(a.totalTime) },
  { id: 'goals', label: 'Golos', short: 'G', pdfWidth: 9, halign: 'right', get: (a) => a.scored },
  { id: 'assists', label: 'Assist.', short: 'A', pdfWidth: 9, halign: 'right', get: (a) => a.assists },
  { id: 'goalsFor', label: 'GF', short: 'GF', pdfWidth: 10, halign: 'right', get: (a) => a.goalsFor },
  { id: 'goalsAgainst', label: 'GS', short: 'GS', pdfWidth: 10, halign: 'right', get: (a) => a.goalsAgainst },
  { id: 'fouls', label: 'Faltas', short: 'F', pdfWidth: 9, halign: 'right', get: (a) => a.foulsCommitted },
  { id: 'yellows', label: 'Amarelos', short: 'CA', pdfWidth: 9, halign: 'right', get: (a) => a.yellowCards },
  { id: 'reds', label: 'Vermelhos', short: 'CV', pdfWidth: 9, halign: 'right', get: (a) => a.redCards },
  { id: 'plusMinus', label: '+/-', short: '+/-', pdfWidth: 11, halign: 'right', get: (a) => a.plusMinus },
];

// Per-match player columns
export const MATCH_PLAYER_FIELDS = [
  { id: 'minutes', label: 'Minutos', short: 'Minutos', pdfWidth: 18, halign: 'right', get: (p) => formatTimeLong(p.totalTime || 0) },
  { id: 'goals', label: 'Golos', short: 'G', pdfWidth: 9, halign: 'right', get: (p) => p.scored || 0 },
  { id: 'assists', label: 'Assist.', short: 'A', pdfWidth: 9, halign: 'right', get: (p) => p.assists || 0 },
  { id: 'goalsFor', label: 'GF', short: 'GF', pdfWidth: 10, halign: 'right', get: (p) => p.goalsFor || 0 },
  { id: 'goalsAgainst', label: 'GS', short: 'GS', pdfWidth: 10, halign: 'right', get: (p) => p.goalsAgainst || 0 },
  { id: 'fouls', label: 'Faltas', short: 'F', pdfWidth: 9, halign: 'right', get: (p) => p.foulsCommitted || 0 },
  { id: 'yellows', label: 'Amarelos', short: 'CA', pdfWidth: 9, halign: 'right', get: (p) => p.yellowCards || 0 },
  { id: 'reds', label: 'Vermelhos', short: 'CV', pdfWidth: 9, halign: 'right', get: (p) => p.redCards || 0 },
  { id: 'sentOff', label: 'Expulso', short: 'Exp.', pdfWidth: 10, halign: 'center', get: (p) => (p.sentOff ? 'Sim' : '') },
];

// Section toggles
export const MATCH_SECTIONS = [
  { id: 'summary', label: 'Sumário do jogo' },
  { id: 'players', label: 'Tabela de atletas' },
  { id: 'stints', label: 'Parciais (stints)' },
  { id: 'goals', label: 'Lista de golos' },
  { id: 'fouls', label: 'Lista de faltas' },
  { id: 'cards', label: 'Lista de cartões' },
  { id: 'subs', label: 'Substituições' },
];

export const SEASON_SECTIONS = [
  { id: 'players', label: 'Agregado por atleta' },
  { id: 'matches', label: 'Lista de jogos' },
];

const allIds = (fields) => fields.map((f) => f.id);
export const DEFAULT_EXPORT_OPTIONS = {
  match: {
    columns: allIds(MATCH_PLAYER_FIELDS),
    sections: allIds(MATCH_SECTIONS),
  },
  season: {
    columns: allIds(SEASON_PLAYER_FIELDS),
    sections: allIds(SEASON_SECTIONS),
  },
};

const pickFields = (all, ids) => all.filter((f) => ids.includes(f.id));
const hasSection = (opts, id) => (opts?.sections || []).includes(id);

// ---------- CSV helpers ----------

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const rowsToCsv = (rows) => rows.map((r) => r.map(csvEscape).join(';')).join('\n');

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const safeFilename = (s) =>
  String(s || 'jogo').toLowerCase().replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(iso);
  }
};

// ---------- Match CSV ----------

export const exportMatchCSV = (team, match, options = DEFAULT_EXPORT_OPTIONS.match) => {
  const teamName = team?.name || 'Equipa';
  const cols = pickFields(MATCH_PLAYER_FIELDS, options.columns);
  const rows = [];

  if (hasSection(options, 'summary')) {
    rows.push(['FUTSAL TIME HUB — RESUMO DO JOGO']);
    rows.push(['Equipa', teamName]);
    rows.push(['Adversário', match.opponent || '']);
    rows.push(['Data', fmtDate(match.date)]);
    if (match.competition) rows.push(['Competição', match.competition]);
    if (match.matchday) rows.push(['Jornada', match.matchday]);
    if (typeof match.home_score === 'number') {
      rows.push(['Resultado', `${match.home_score} - ${match.away_score}`]);
    }
    rows.push(['Duração', formatTimeLong(getMatchDuration(match))]);
    rows.push(['Faltas Marcadas', match.fouls_committed ?? 0]);
    rows.push(['Faltas Sofridas', match.fouls_suffered ?? 0]);
    rows.push(['Cartões Amarelos', match.yellow_cards ?? 0]);
    rows.push(['Cartões Vermelhos', match.red_cards ?? 0]);
    rows.push([]);
  }

  if (hasSection(options, 'players') && cols.length > 0) {
    rows.push(['ATLETAS']);
    rows.push(['#', 'Nome', 'Pos.', ...cols.map((c) => c.label)]);
    [...(match.players || [])]
      .sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
      .forEach((p) => {
        rows.push([p.number, p.name, p.position || '', ...cols.map((c) => c.get(p))]);
      });
    rows.push([]);
  }

  if (hasSection(options, 'stints')) {
    rows.push(['PARCIAIS (STINTS)']);
    rows.push(['#', 'Atleta', 'Parcial', 'Entrou (parte/min)', 'Saiu (parte/min)', 'Duração']);
    (match.players || []).forEach((p) => {
      (p.stints || []).forEach((s, idx) => {
        rows.push([
          p.number, p.name, `P${idx + 1}`,
          `${s.inHalf}.ª ${formatCountdown(s.inMinute)}`,
          s.outHalf === null ? '—' : `${s.outHalf}.ª ${formatCountdown(s.outMinute)}`,
          formatTime(s.duration || 0),
        ]);
      });
    });
    rows.push([]);
  }

  if (hasSection(options, 'goals') && (match.goals || []).length > 0) {
    rows.push(['GOLOS']);
    rows.push(['Parte', 'Minuto', 'Equipa', 'Marcador', 'Assistência']);
    [...match.goals].reverse().forEach((g) => {
      rows.push([
        `${g.half}.ª`, formatCountdown(g.minute),
        g.type === 'home' ? teamName : (match.opponent || 'Adversário'),
        g.type === 'home' ? (g.scorerName ? `${g.scorerNumber} ${g.scorerName}` : '—') : '—',
        g.type === 'home' && g.assistName ? `${g.assistNumber} ${g.assistName}` : '',
      ]);
    });
    rows.push([]);
  }

  if (hasSection(options, 'fouls') && (match.fouls || []).length > 0) {
    rows.push(['FALTAS']);
    rows.push(['Parte', 'Minuto', 'Tipo', 'Atleta']);
    [...match.fouls].reverse().forEach((f) => {
      rows.push([
        `${f.half}.ª`, formatCountdown(f.minute),
        f.type === 'committed' ? 'Marcada' : 'Sofrida',
        f.playerName ? `${f.playerNumber} ${f.playerName}` : (f.type === 'committed' ? 'Sem autor' : 'A favor da equipa'),
      ]);
    });
    rows.push([]);
  }

  if (hasSection(options, 'cards') && (match.cards || []).length > 0) {
    rows.push(['CARTÕES']);
    rows.push(['Parte', 'Minuto', 'Cor', 'Atleta']);
    [...match.cards].reverse().forEach((c) => {
      rows.push([
        `${c.half}.ª`, formatCountdown(c.minute),
        c.type === 'red' ? 'Vermelho' : 'Amarelo',
        `${c.playerNumber} ${c.playerName}`,
      ]);
    });
    rows.push([]);
  }

  if (hasSection(options, 'subs') && (match.subs || []).length > 0) {
    rows.push(['SUBSTITUIÇÕES']);
    rows.push(['Parte', 'Minuto', 'Sai', 'Entra']);
    match.subs.forEach((s) => {
      rows.push([
        `${s.half}.ª`, formatCountdown(s.minute),
        `${s.out.number} ${s.out.name}`,
        `${s.in.number} ${s.in.name}`,
      ]);
    });
  }

  const blob = new Blob(['\ufeff' + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `jogo-${safeFilename(teamName)}-vs-${safeFilename(match.opponent)}-${safeFilename(fmtDate(match.date))}.csv`);
};

// ---------- Season CSV ----------

export const exportSeasonCSV = (team, aggregate, matches, competitionLabel = null, options = DEFAULT_EXPORT_OPTIONS.season) => {
  const teamName = team?.name || 'Equipa';
  const cols = pickFields(SEASON_PLAYER_FIELDS, options.columns);
  const rows = [];
  rows.push(['FUTSAL TIME HUB — ESTATÍSTICAS DA ÉPOCA']);
  rows.push(['Equipa', teamName]);
  if (competitionLabel) rows.push(['Competição', competitionLabel]);
  rows.push(['Jogos registados', matches.length]);
  rows.push(['Exportado em', new Date().toLocaleString('pt-PT')]);
  rows.push([]);

  if (hasSection(options, 'players') && cols.length > 0) {
    rows.push(['AGREGADO POR ATLETA']);
    rows.push(['#', 'Nome', 'Pos.', ...cols.map((c) => c.label)]);
    aggregate.forEach((a) => {
      rows.push([a.number, a.name, a.position || '', ...cols.map((c) => c.get(a))]);
    });
    rows.push([]);
  }

  if (hasSection(options, 'matches')) {
    rows.push(['LISTA DE JOGOS']);
    rows.push(['Data', 'Adversário', 'Competição', 'Jornada', 'Resultado', 'Duração', 'Golos', 'Faltas', 'Cartões', 'Subs']);
    matches.forEach((m) => {
      rows.push([
        fmtDate(m.date), m.opponent || '',
        m.competition || '', m.matchday || '',
        typeof m.home_score === 'number' ? `${m.home_score}-${m.away_score}` : '—',
        formatTimeLong(getMatchDuration(m)),
        (m.goals || []).length, (m.fouls || []).length, (m.cards || []).length, (m.subs || []).length,
      ]);
    });
  }

  const blob = new Blob(['\ufeff' + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const compSuffix = competitionLabel ? `-${safeFilename(competitionLabel)}` : '';
  triggerDownload(blob, `epoca-${safeFilename(teamName)}${compSuffix}-${safeFilename(new Date().toISOString().slice(0, 10))}.csv`);
};

// ---------- PDF helpers ----------

const NEON = [212, 255, 26];
const DARK = [10, 10, 10];
const GREY = [120, 120, 120];

const pdfHeader = (doc, title, subtitle) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NEON);
  doc.rect(0, 0, pageWidth, 10, 'F');
  doc.setFillColor(...DARK);
  doc.rect(0, 10, pageWidth, 26, 'F');
  doc.setTextColor(...NEON);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FUTSAL TIME HUB', 12, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(title.toUpperCase(), 12, 30);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(subtitle, pageWidth - 12, 30, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
};

const pdfFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text('Futsal Time Hub · Criado por Pedro Pipa', 12, pageHeight - 8);
    doc.text(`Página ${i} / ${pageCount}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
  }
};

const tableTheme = {
  theme: 'grid',
  headStyles: { fillColor: DARK, textColor: NEON, fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
  alternateRowStyles: { fillColor: [245, 245, 245] },
  styles: { cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.1 },
};

const buildColumnStyles = (fixedWidths, dynamicCols, startIdx) => {
  const styles = { ...fixedWidths };
  dynamicCols.forEach((c, i) => {
    styles[startIdx + i] = { halign: c.halign, cellWidth: c.pdfWidth };
  });
  return styles;
};

// ---------- Match PDF ----------

export const exportMatchPDF = (team, match, options = DEFAULT_EXPORT_OPTIONS.match) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const teamName = team?.name || 'Equipa';
  const subtitle = `${fmtDate(match.date)}${match.competition ? ' · ' + match.competition : ''}${match.matchday ? ' · J' + match.matchday : ''}`;
  pdfHeader(doc, `${teamName} vs ${match.opponent || '—'}`, subtitle);
  const cols = pickFields(MATCH_PLAYER_FIELDS, options.columns);

  let y = 46;

  if (hasSection(options, 'summary')) {
    if (typeof match.home_score === 'number') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      const isWin = match.home_score > match.away_score;
      const isDraw = match.home_score === match.away_score;
      doc.setTextColor(...DARK);
      doc.text(`${match.home_score}  ·  ${match.away_score}`, 12, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GREY);
      doc.text(isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA', 60, y - 2);
      doc.text(`Duração: ${formatTimeLong(getMatchDuration(match))}`, 60, y + 4);
      y += 10;
    }
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(
      `Golos: ${(match.goals || []).length}  ·  Faltas marcadas: ${match.fouls_committed ?? 0}  ·  Sofridas: ${match.fouls_suffered ?? 0}  ·  Amarelos: ${match.yellow_cards ?? 0}  ·  Vermelhos: ${match.red_cards ?? 0}`,
      12, y,
    );
    y += 6;
  }

  if (hasSection(options, 'players') && cols.length > 0) {
    const playerRows = [...(match.players || [])]
      .sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
      .map((p) => [p.number, p.name, p.position || '', ...cols.map((c) => c.get(p))]);
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [['#', 'Atleta', 'Pos.', ...cols.map((c) => c.short)]],
      body: playerRows,
      columnStyles: buildColumnStyles({ 0: { halign: 'center', cellWidth: 8 }, 2: { cellWidth: 14 } }, cols, 3),
    });
  }

  if (hasSection(options, 'stints')) {
    const stintRows = [];
    (match.players || []).forEach((p) => {
      (p.stints || []).forEach((s, idx) => {
        stintRows.push([
          p.number, p.name, `P${idx + 1}`,
          `${s.inHalf}.ª ${formatCountdown(s.inMinute)}`,
          s.outHalf === null ? '—' : `${s.outHalf}.ª ${formatCountdown(s.outMinute)}`,
          formatTime(s.duration || 0),
        ]);
      });
    });
    if (stintRows.length > 0) {
      autoTable(doc, {
        ...tableTheme,
        startY: (doc.lastAutoTable?.finalY ?? y) + 6,
        head: [['#', 'Atleta', 'Parcial', 'Entrou', 'Saiu', 'Duração']],
        body: stintRows,
      });
    }
  }

  if (hasSection(options, 'goals') && (match.goals || []).length > 0) {
    const rows = [...match.goals].reverse().map((g) => [
      `${g.half}.ª`, formatCountdown(g.minute),
      g.type === 'home' ? teamName : (match.opponent || 'Adversário'),
      g.type === 'home' ? (g.scorerName ? `${g.scorerNumber} ${g.scorerName}` : '—') : '—',
      g.type === 'home' && g.assistName ? `${g.assistNumber} ${g.assistName}` : '',
    ]);
    autoTable(doc, { ...tableTheme, startY: (doc.lastAutoTable?.finalY ?? y) + 6, head: [['Parte', 'Minuto', 'Equipa', 'Marcador', 'Assistência']], body: rows });
  }

  if (hasSection(options, 'fouls') && (match.fouls || []).length > 0) {
    const rows = [...match.fouls].reverse().map((f) => [
      `${f.half}.ª`, formatCountdown(f.minute),
      f.type === 'committed' ? 'Marcada' : 'Sofrida',
      f.playerName ? `${f.playerNumber} ${f.playerName}` : (f.type === 'committed' ? 'Sem autor' : 'A favor da equipa'),
    ]);
    autoTable(doc, { ...tableTheme, startY: (doc.lastAutoTable?.finalY ?? y) + 6, head: [['Parte', 'Minuto', 'Tipo', 'Atleta']], body: rows });
  }

  if (hasSection(options, 'cards') && (match.cards || []).length > 0) {
    const rows = [...match.cards].reverse().map((c) => [
      `${c.half}.ª`, formatCountdown(c.minute),
      c.type === 'red' ? 'Vermelho' : 'Amarelo',
      `${c.playerNumber} ${c.playerName}`,
    ]);
    autoTable(doc, { ...tableTheme, startY: (doc.lastAutoTable?.finalY ?? y) + 6, head: [['Parte', 'Minuto', 'Cor', 'Atleta']], body: rows });
  }

  if (hasSection(options, 'subs') && (match.subs || []).length > 0) {
    const rows = match.subs.map((s) => [
      `${s.half}.ª`, formatCountdown(s.minute),
      `${s.out.number} ${s.out.name}`,
      `${s.in.number} ${s.in.name}`,
    ]);
    autoTable(doc, { ...tableTheme, startY: (doc.lastAutoTable?.finalY ?? y) + 6, head: [['Parte', 'Minuto', 'Sai', 'Entra']], body: rows });
  }

  pdfFooter(doc);
  doc.save(`jogo-${safeFilename(teamName)}-vs-${safeFilename(match.opponent)}-${safeFilename(fmtDate(match.date))}.pdf`);
};

// ---------- Season PDF ----------

export const exportSeasonPDF = (team, aggregate, matches, competitionLabel = null, options = DEFAULT_EXPORT_OPTIONS.season) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const teamName = team?.name || 'Equipa';
  const title = competitionLabel ? `${teamName} — ${competitionLabel}` : `Estatísticas — ${teamName}`;
  pdfHeader(doc, title, `${matches.length} jogos · ${new Date().toLocaleDateString('pt-PT')}`);
  const cols = pickFields(SEASON_PLAYER_FIELDS, options.columns);

  let startY = 46;
  if (hasSection(options, 'players') && cols.length > 0) {
    const aggRows = aggregate.map((a) => [a.number, a.name, a.position || '', ...cols.map((c) => c.get(a))]);
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [['#', 'Atleta', 'Pos.', ...cols.map((c) => c.short)]],
      body: aggRows,
      columnStyles: buildColumnStyles({ 0: { halign: 'center', cellWidth: 8 }, 2: { cellWidth: 14 } }, cols, 3),
    });
    startY = doc.lastAutoTable.finalY + 8;
  }

  if (hasSection(options, 'matches')) {
    const matchRows = matches.map((m) => [
      fmtDate(m.date), m.opponent || '',
      m.competition || '—', m.matchday || '—',
      typeof m.home_score === 'number' ? `${m.home_score}-${m.away_score}` : '—',
      formatTimeLong(getMatchDuration(m)),
      (m.goals || []).length, (m.fouls || []).length, (m.cards || []).length,
    ]);
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [['Data', 'Adversário', 'Competição', 'J.', 'Resultado', 'Duração', 'Golos', 'Faltas', 'Cartões']],
      body: matchRows,
    });
  }

  pdfFooter(doc);
  const compSuffix = competitionLabel ? `-${safeFilename(competitionLabel)}` : '';
  doc.save(`epoca-${safeFilename(teamName)}${compSuffix}-${safeFilename(new Date().toISOString().slice(0, 10))}.pdf`);
};
