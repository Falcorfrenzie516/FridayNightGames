export interface Theme {
  id: string;
  name: string;
  preview: string[];
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    preview: ['#1d4ed8', '#3b82f6', '#bfdbfe'],
    vars: {
      '--color-primary':        '#1d4ed8',
      '--color-primary-hover':  '#1e40af',
      '--color-primary-light':  '#dbeafe',
      '--color-primary-text':   '#1d4ed8',
      '--color-accent':         '#0ea5e9',
      '--color-bg':             '#f0f9ff',
      '--color-surface':        '#ffffff',
      '--color-border':         '#bfdbfe',
      '--color-heading':        '#1e3a5f',
      '--color-body':           '#334155',
      '--color-muted':          '#94a3b8',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    preview: ['#b91c1c', '#ef4444', '#fecaca'],
    vars: {
      '--color-primary':        '#b91c1c',
      '--color-primary-hover':  '#991b1b',
      '--color-primary-light':  '#fee2e2',
      '--color-primary-text':   '#b91c1c',
      '--color-accent':         '#f97316',
      '--color-bg':             '#fff7ed',
      '--color-surface':        '#ffffff',
      '--color-border':         '#fecaca',
      '--color-heading':        '#7f1d1d',
      '--color-body':           '#44403c',
      '--color-muted':          '#a8a29e',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    preview: ['#166534', '#22c55e', '#bbf7d0'],
    vars: {
      '--color-primary':        '#166534',
      '--color-primary-hover':  '#14532d',
      '--color-primary-light':  '#dcfce7',
      '--color-primary-text':   '#15803d',
      '--color-accent':         '#84cc16',
      '--color-bg':             '#f0fdf4',
      '--color-surface':        '#ffffff',
      '--color-border':         '#bbf7d0',
      '--color-heading':        '#14532d',
      '--color-body':           '#374151',
      '--color-muted':          '#9ca3af',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    preview: ['#1e293b', '#475569', '#cbd5e1'],
    vars: {
      '--color-primary':        '#1e293b',
      '--color-primary-hover':  '#0f172a',
      '--color-primary-light':  '#f1f5f9',
      '--color-primary-text':   '#334155',
      '--color-accent':         '#64748b',
      '--color-bg':             '#f8fafc',
      '--color-surface':        '#ffffff',
      '--color-border':         '#e2e8f0',
      '--color-heading':        '#0f172a',
      '--color-body':           '#334155',
      '--color-muted':          '#94a3b8',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    preview: ['#92400e', '#f59e0b', '#fde68a'],
    vars: {
      '--color-primary':        '#92400e',
      '--color-primary-hover':  '#78350f',
      '--color-primary-light':  '#fef3c7',
      '--color-primary-text':   '#92400e',
      '--color-accent':         '#f59e0b',
      '--color-bg':             '#fffbeb',
      '--color-surface':        '#ffffff',
      '--color-border':         '#fde68a',
      '--color-heading':        '#78350f',
      '--color-body':           '#44403c',
      '--color-muted':          '#a8a29e',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    preview: ['#0ea5e9', '#38bdf8', '#0c4a6e'],
    vars: {
      '--color-primary':        '#0ea5e9',
      '--color-primary-hover':  '#0284c7',
      '--color-primary-light':  '#0c4a6e',
      '--color-primary-text':   '#38bdf8',
      '--color-accent':         '#06b6d4',
      '--color-bg':             '#0f172a',
      '--color-surface':        '#1e293b',
      '--color-border':         '#1e3a5f',
      '--color-heading':        '#f0f9ff',
      '--color-body':           '#cbd5e1',
      '--color-muted':          '#64748b',
      '--color-success':        '#10b981',
      '--color-danger':         '#f87171',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    preview: ['#be123c', '#fb7185', '#ffe4e6'],
    vars: {
      '--color-primary':        '#be123c',
      '--color-primary-hover':  '#9f1239',
      '--color-primary-light':  '#ffe4e6',
      '--color-primary-text':   '#be123c',
      '--color-accent':         '#f43f5e',
      '--color-bg':             '#fff1f2',
      '--color-surface':        '#ffffff',
      '--color-border':         '#fecdd3',
      '--color-heading':        '#881337',
      '--color-body':           '#44403c',
      '--color-muted':          '#a8a29e',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    preview: ['#0f766e', '#14b8a6', '#99f6e4'],
    vars: {
      '--color-primary':        '#0f766e',
      '--color-primary-hover':  '#0d6b63',
      '--color-primary-light':  '#ccfbf1',
      '--color-primary-text':   '#0f766e',
      '--color-accent':         '#06b6d4',
      '--color-bg':             '#f0fdfa',
      '--color-surface':        '#ffffff',
      '--color-border':         '#99f6e4',
      '--color-heading':        '#134e4a',
      '--color-body':           '#374151',
      '--color-muted':          '#9ca3af',
      '--color-success':        '#059669',
      '--color-danger':         '#dc2626',
    },
  },
];

export const DEFAULT_THEME_ID = 'ocean';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}
