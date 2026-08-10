import { Check, TableProperties, Sparkles } from 'lucide-react';
import { CLASSIC_TABLES, LEGENDARY_TABLES } from '../lib/tables';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface TablePickerProps {
  user: User;
  currentTable: string;
  onTableChange: (tableId: string) => void;
}

export default function TablePicker({ user, currentTable, onTableChange }: TablePickerProps) {
  async function handleSelect(tableId: string) {
    onTableChange(tableId);
    await supabase
      .from('profiles')
      .upsert({ id: user.id, table_id: tableId, updated_at: new Date().toISOString() });
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2.5">
        <TableProperties className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Table</span>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Classic</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {CLASSIC_TABLES.map(table => {
          const active = currentTable === table.id;
          return (
            <button
              key={table.id}
              onClick={() => handleSelect(table.id)}
              title={table.name}
              className="group flex flex-col items-center gap-1 rounded-xl p-1 transition hover:bg-gray-50"
            >
              <div
                className="relative w-full aspect-square rounded-lg overflow-hidden border-2 transition"
                style={{
                  borderColor: active ? '#1d4ed8' : 'transparent',
                  backgroundImage: `url(${table.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: table.previewColor,
                }}
              >
                {active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-[8px] font-semibold text-gray-500 group-hover:text-gray-700 transition leading-none text-center w-full truncate">
                {table.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="rounded-xl p-2.5"
        style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0f2e 50%, #0f1a0f 100%)' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span
            className="text-[9px] font-bold uppercase tracking-wide"
            style={{ color: '#f5d060', textShadow: '0 0 8px rgba(245,208,96,0.6)' }}
          >
            Legendary
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {LEGENDARY_TABLES.map(table => {
            const active = currentTable === table.id;
            return (
              <button
                key={table.id}
                onClick={() => handleSelect(table.id)}
                title={table.name}
                className="group flex flex-col items-center gap-1 rounded-lg p-0.5 transition"
              >
                <div
                  className="relative w-full aspect-square rounded-lg overflow-hidden border-2 transition"
                  style={{
                    borderColor: active ? (table.glowColor ?? '#f5d060') : 'rgba(245,208,96,0.25)',
                    backgroundImage: `url(${table.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: table.previewColor,
                    boxShadow: active
                      ? `0 0 8px 2px ${table.glowColor ?? '#f5d060'}60`
                      : 'none',
                  }}
                >
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span
                  className="text-[7px] font-semibold leading-none text-center w-full truncate transition"
                  style={{ color: active ? (table.glowColor ?? '#f5d060') : 'rgba(245,208,96,0.5)' }}
                >
                  {table.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
