// Export utilities for match statistics (CSV & PDF)
// Used by Estatisticas page to download per-match summaries and season aggregates.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTime, formatTimeLong, formatCountdown } from './time';

// ---------- CSV helpers ----------

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const rowsToCsv = (rows) =>
  rows.map((r) => r.map(csvEscape).join(';')).join('\n');

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

export const exportMatchCSV = (team, match) => {
  const teamName = team?.name || 'Equipa';
  const rows = [];
  // Header block
  rows.push(['FUTSAL TIME HUB — RESUMO DO JOGO']);
  rows.push(['Equipa', teamName]);
  rows.push(['Adversário', match.opponent || '']);
  rows.push(['Data', fmtDate(match.date)]);
  if (match.competition) rows.push(['Competição', match.competition]);
  if (match.matchday) rows.push(['Jornada', match.matchday]);
  if (typeof match.home_score === 'number') {
    rows.push(['Resultado', `${match.home_score} - ${match.away_score}`]);
  }
  rows.push(['Duração', formatTimeLong(match.total_duration || 0)]);
  rows.push(['Faltas Marcadas', match.fouls_committed ?? 0]);
  rows.push(['Faltas Sofridas', match.fouls_suffered ?? 0]);
  rows.push(['Cartões Amarelos', match.yellow_cards ?? 0]);
  rows.push(['Cartões Vermelhos', match.red_cards ?? 0]);
  rows.push([]);

  // Players
  rows.push(['ATLETAS']);
  rows.push(['#', 'Nome', 'Pos.', 'Minutos', 'Golos', 'Assist.', 'GF', 'GS', 'Faltas', 'Amarelos', 'Vermelhos', 'Expulso']);
  [...(match.players || [])]
    .sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
    .forEach((p) => {
      rows.push([
        p.number, p.name, p.position || '',
        formatTimeLong(p.totalTime || 0),
        p.scored || 0, p.assists || 0,
        p.goalsFor || 0, p.goalsAgainst || 0,
        p.foulsCommitted || 0, p.yellowCards || 0, p.redCards || 0,
        p.sentOff ? 'Sim' : 'Não',
      ]);
    });
  rows.push([]);

  // Parciais (stints) per player
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

  // Goals
  if ((match.goals || []).length > 0) {
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

  // Fouls
  if ((match.fouls || []).length > 0) {
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

  // Cards
  if ((match.cards || []).length > 0) {
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

  // Subs
  if ((match.subs || []).length > 0) {
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

export const exportSeasonCSV = (team, aggregate, matches) => {
  const teamName = team?.name || 'Equipa';
  const rows = [];
  rows.push(['FUTSAL TIME HUB — ESTATÍSTICAS DA ÉPOCA']);
  rows.push(['Equipa', teamName]);
  rows.push(['Jogos registados', matches.length]);
  rows.push(['Exportado em', new Date().toLocaleString('pt-PT')]);
  rows.push([]);

  rows.push(['AGREGADO POR ATLETA']);
  rows.push(['#', 'Nome', 'Pos.', 'Jogos', 'Minutos', 'G', 'A', 'GF', 'GS', 'Faltas', 'CA', 'CV', '+/-']);
  aggregate.forEach((a) => {
    rows.push([
      a.number, a.name, a.position || '',
      a.games, formatTimeLong(a.totalTime),
      a.scored, a.assists, a.goalsFor, a.goalsAgainst,
      a.foulsCommitted, a.yellowCards, a.redCards,
      a.plusMinus,
    ]);
  });
  rows.push([]);

  rows.push(['LISTA DE JOGOS']);
  rows.push(['Data', 'Adversário', 'Competição', 'Jornada', 'Resultado', 'Duração', 'Golos', 'Faltas', 'Cartões', 'Subs']);
  matches.forEach((m) => {
    rows.push([
      fmtDate(m.date), m.opponent || '',
      m.competition || '', m.matchday || '',
      typeof m.home_score === 'number' ? `${m.home_score}-${m.away_score}` : '—',
      formatTimeLong(m.total_duration || 0),
      (m.goals || []).length, (m.fouls || []).length, (m.cards || []).length, (m.subs || []).length,
    ]);
  });

  const blob = new Blob(['\ufeff' + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `epoca-${safeFilename(teamName)}-${safeFilename(new Date().toISOString().slice(0, 10))}.csv`);
};

// ---------- PDF helpers ----------

const NEON = [212, 255, 26]; // #d4ff1a
const DARK = [10, 10, 10];
const GREY = [120, 120, 120];

const pdfHeader = (doc, title, subtitle) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Top neon bar
  doc.setFillColor(...NEON);
  doc.rect(0, 0, pageWidth, 10, 'F');
  // Brand block
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

// ---------- Match PDF ----------

export const exportMatchPDF = (team, match) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const teamName = team?.name || 'Equipa';
  const subtitle = `${fmtDate(match.date)}${match.competition ? ' · ' + match.competition : ''}${match.matchday ? ' · J' + match.matchday : ''}`;
  pdfHeader(doc, `${teamName} vs ${match.opponent || '—'}`, subtitle);

  let y = 46;
  // Scoreboard
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
    const verdict = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
    doc.text(verdict, 60, y - 2);
    doc.text(`Duração: ${formatTimeLong(match.total_duration || 0)}`, 60, y + 4);
    y += 10;
  }

  // Summary line
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(
    `Golos: ${(match.goals || []).length}  ·  Faltas marcadas: ${match.fouls_committed ?? 0}  ·  Sofridas: ${match.fouls_suffered ?? 0}  ·  Amarelos: ${match.yellow_cards ?? 0}  ·  Vermelhos: ${match.red_cards ?? 0}`,
    12, y,
  );
  y += 6;

  // Players table
  const playerRows = [...(match.players || [])]
    .sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
    .map((p) => [
      p.number, p.name, p.position || '',
      formatTimeLong(p.totalTime || 0),
      p.scored || 0, p.assists || 0,
      p.goalsFor || 0, p.goalsAgainst || 0,
      p.foulsCommitted || 0, p.yellowCards || 0, p.redCards || 0,
      p.sentOff ? 'Sim' : '',
    ]);
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [['#', 'Atleta', 'Pos.', 'Minutos', 'G', 'A', 'GF', 'GS', 'F', 'CA', 'CV', 'Exp.']],
    body: playerRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      2: { cellWidth: 14 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 9 },
      5: { halign: 'right', cellWidth: 9 },
      6: { halign: 'right', cellWidth: 10 },
      7: { halign: 'right', cellWidth: 10 },
      8: { halign: 'right', cellWidth: 9 },
      9: { halign: 'right', cellWidth: 9 },
      10: { halign: 'right', cellWidth: 9 },
      11: { halign: 'center', cellWidth: 10 },
    },
  });

  // Parciais
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
      startY: doc.lastAutoTable.finalY + 6,
      head: [['#', 'Atleta', 'Parcial', 'Entrou', 'Saiu', 'Duração']],
      body: stintRows,
      didDrawPage: () => {},
    });
  }

  // Goals
  if ((match.goals || []).length > 0) {
    const rows = [...match.goals].reverse().map((g) => [
      `${g.half}.ª`,
      formatCountdown(g.minute),
      g.type === 'home' ? teamName : (match.opponent || 'Adversário'),
      g.type === 'home' ? (g.scorerName ? `${g.scorerNumber} ${g.scorerName}` : '—') : '—',
      g.type === 'home' && g.assistName ? `${g.assistNumber} ${g.assistName}` : '',
    ]);
    autoTable(doc, {
      ...tableTheme,
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Parte', 'Minuto', 'Equipa', 'Marcador', 'Assistência']],
      body: rows,
    });
  }

  // Fouls
  if ((match.fouls || []).length > 0) {
    const rows = [...match.fouls].reverse().map((f) => [
      `${f.half}.ª`,
      formatCountdown(f.minute),
      f.type === 'committed' ? 'Marcada' : 'Sofrida',
      f.playerName ? `${f.playerNumber} ${f.playerName}` : (f.type === 'committed' ? 'Sem autor' : 'A favor da equipa'),
    ]);
    autoTable(doc, {
      ...tableTheme,
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Parte', 'Minuto', 'Tipo', 'Atleta']],
      body: rows,
    });
  }

  // Cards
  if ((match.cards || []).length > 0) {
    const rows = [...match.cards].reverse().map((c) => [
      `${c.half}.ª`,
      formatCountdown(c.minute),
      c.type === 'red' ? 'Vermelho' : 'Amarelo',
      `${c.playerNumber} ${c.playerName}`,
    ]);
    autoTable(doc, {
      ...tableTheme,
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Parte', 'Minuto', 'Cor', 'Atleta']],
      body: rows,
    });
  }

  // Subs
  if ((match.subs || []).length > 0) {
    const rows = match.subs.map((s) => [
      `${s.half}.ª`, formatCountdown(s.minute),
      `${s.out.number} ${s.out.name}`,
      `${s.in.number} ${s.in.name}`,
    ]);
    autoTable(doc, {
      ...tableTheme,
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Parte', 'Minuto', 'Sai', 'Entra']],
      body: rows,
    });
  }

  pdfFooter(doc);
  doc.save(`jogo-${safeFilename(teamName)}-vs-${safeFilename(match.opponent)}-${safeFilename(fmtDate(match.date))}.pdf`);
};

// ---------- Season PDF ----------

export const exportSeasonPDF = (team, aggregate, matches) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const teamName = team?.name || 'Equipa';
  pdfHeader(doc, `Estatísticas — ${teamName}`, `${matches.length} jogos · ${new Date().toLocaleDateString('pt-PT')}`);

  const aggRows = aggregate.map((a) => [
    a.number, a.name, a.position || '',
    a.games, formatTimeLong(a.totalTime),
    a.scored, a.assists, a.goalsFor, a.goalsAgainst,
    a.foulsCommitted, a.yellowCards, a.redCards, a.plusMinus,
  ]);
  autoTable(doc, {
    ...tableTheme,
    startY: 46,
    head: [['#', 'Atleta', 'Pos.', 'J', 'Minutos', 'G', 'A', 'GF', 'GS', 'F', 'CA', 'CV', '+/-']],
    body: aggRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      2: { cellWidth: 14 },
      3: { halign: 'right', cellWidth: 9 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 9 },
      6: { halign: 'right', cellWidth: 9 },
      7: { halign: 'right', cellWidth: 10 },
      8: { halign: 'right', cellWidth: 10 },
      9: { halign: 'right', cellWidth: 9 },
      10: { halign: 'right', cellWidth: 9 },
      11: { halign: 'right', cellWidth: 9 },
      12: { halign: 'right', cellWidth: 11 },
    },
  });

  const matchRows = matches.map((m) => [
    fmtDate(m.date), m.opponent || '',
    m.competition || '—', m.matchday || '—',
    typeof m.home_score === 'number' ? `${m.home_score}-${m.away_score}` : '—',
    formatTimeLong(m.total_duration || 0),
    (m.goals || []).length,
    (m.fouls || []).length,
    (m.cards || []).length,
  ]);
  autoTable(doc, {
    ...tableTheme,
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Data', 'Adversário', 'Competição', 'J.', 'Resultado', 'Duração', 'Golos', 'Faltas', 'Cartões']],
    body: matchRows,
  });

  pdfFooter(doc);
  doc.save(`epoca-${safeFilename(teamName)}-${safeFilename(new Date().toISOString().slice(0, 10))}.pdf`);
};
