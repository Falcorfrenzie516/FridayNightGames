import { Palette, Check } from 'lucide-react';
import { THEMES, applyTheme } from '../lib/themes';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface ThemePickerProps {
  user: User;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export default function ThemePicker({ user, currentTheme, onThemeChange }: ThemePickerProps) {
  async function handleSelect(themeId: string) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    applyTheme(theme);
    onThemeChange(themeId);
    await supabase
      .from('profiles')
      .upsert({ id: user.id, theme: themeId, updated_at: new Date().toISOString() });
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2.5">
        <Palette className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Theme</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => handleSelect(theme.id)}
            title={theme.name}
            className="group relative flex flex-col items-center gap-1 rounded-xl p-1.5 transition hover:bg-gray-50"
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 transition"
              style={{ borderColor: currentTheme === theme.id ? theme.vars['--color-primary'] : 'transparent' }}>
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1" style={{ background: theme.vars['--color-primary'] }} />
                <div className="flex-1 flex">
                  <div className="flex-1" style={{ background: theme.vars['--color-accent'] }} />
                  <div className="flex-1" style={{ background: theme.vars['--color-bg'] }} />
                </div>
              </div>
              {currentTheme === theme.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[9px] font-semibold text-gray-500 group-hover:text-gray-700 transition leading-none">
              {theme.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
