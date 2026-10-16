import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';
import {
  MATCH_PLAYER_FIELDS, SEASON_PLAYER_FIELDS,
  MATCH_SECTIONS, SEASON_SECTIONS,
  DEFAULT_EXPORT_OPTIONS,
} from '../lib/exporters';

const LS_KEY = 'flh_export_prefs_v1';

const readPrefs = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_EXPORT_OPTIONS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_EXPORT_OPTIONS;
};

const writePrefs = (prefs) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
};

// scope: 'match' | 'season'
export default function ExportOptionsDialog({ open, onClose, scope, title, onGenerate }) {
  const isMatch = scope === 'match';
  const FIELDS = isMatch ? MATCH_PLAYER_FIELDS : SEASON_PLAYER_FIELDS;
  const SECTIONS = isMatch ? MATCH_SECTIONS : SEASON_SECTIONS;

  const [prefs, setPrefs] = useState(readPrefs);
  const scoped = prefs[scope];

  useEffect(() => { if (open) setPrefs(readPrefs()); }, [open]);

  if (!open) return null;

  const setScoped = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, [scope]: { ...prev[scope], ...patch } };
      writePrefs(next);
      return next;
    });
  };

  const toggleField = (id) => {
    const cur = new Set(scoped.columns);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    setScoped({ columns: FIELDS.filter((f) => cur.has(f.id)).map((f) => f.id) });
  };
  const toggleSection = (id) => {
    const cur = new Set(scoped.sections);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    setScoped({ sections: SECTIONS.filter((s) => cur.has(s.id)).map((s) => s.id) });
  };

  const selectAll = () => setScoped({ columns: FIELDS.map((f) => f.id), sections: SECTIONS.map((s) => s.id) });
  const clearAll = () => setScoped({ columns: [], sections: [] });

  const generate = (format) => {
    onGenerate(format, scoped);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
      onClick={onClose}
      data-testid="export-options-overlay"
    >
      <div
        className="bg-[#0f0f0f] border border-neon/40 rounded-sm w-full max-w-lg p-5 lg:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="export-options-dialog"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] tracking-label uppercase text-neon mb-1">Exportar</div>
            <h3 className="font-display text-2xl uppercase">{title}</h3>
            <div className="text-xs text-white/55 mt-1">Escolhe as secções e colunas a incluir.</div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-red-400 transition-colors"
            aria-label="Fechar"
            data-testid="export-options-close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mb-3 text-[10px] tracking-label uppercase">
          <button
            onClick={selectAll}
            className="text-white/55 hover:text-neon"
            data-testid="export-select-all"
          >
            Selecionar tudo
          </button>
          <span className="text-white/20">·</span>
          <button
            onClick={clearAll}
            className="text-white/55 hover:text-red-400"
            data-testid="export-clear-all"
          >
            Limpar
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[10px] tracking-label uppercase text-white/45 mb-2">Secções</div>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border cursor-pointer text-xs uppercase tracking-wide ${
                  scoped.sections.includes(s.id)
                    ? 'border-neon/50 bg-neon/10 text-neon'
                    : 'border-white/10 bg-black/30 text-white/60 hover:border-white/25'
                }`}
              >
                <input
                  type="checkbox"
                  checked={scoped.sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                  className="accent-neon"
                  data-testid={`export-section-${s.id}`}
                />
                <span className="truncate">{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-[10px] tracking-label uppercase text-white/45 mb-2">
            Colunas por atleta
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border cursor-pointer text-xs uppercase tracking-wide ${
                  scoped.columns.includes(f.id)
                    ? 'border-neon/50 bg-neon/10 text-neon'
                    : 'border-white/10 bg-black/30 text-white/60 hover:border-white/25'
                }`}
              >
                <input
                  type="checkbox"
                  checked={scoped.columns.includes(f.id)}
                  onChange={() => toggleField(f.id)}
                  className="accent-neon"
                  data-testid={`export-column-${f.id}`}
                />
                <span className="truncate">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
          <button
            onClick={() => generate('csv')}
            disabled={!scoped.sections.length}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white hover:border-neon hover:text-neon transition-colors font-display text-xs uppercase tracking-wider px-3 py-2 rounded-sm disabled:opacity-40 disabled:pointer-events-none"
            data-testid="export-generate-csv"
          >
            <FileSpreadsheet size={14} /> Gerar CSV
          </button>
          <button
            onClick={() => generate('pdf')}
            disabled={!scoped.sections.length}
            className="inline-flex items-center gap-2 bg-neon text-black hover:bg-[#bbdc0d] transition-colors font-display text-xs uppercase tracking-wider px-3 py-2 rounded-sm disabled:opacity-40 disabled:pointer-events-none"
            data-testid="export-generate-pdf"
          >
            <FileText size={14} /> Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
