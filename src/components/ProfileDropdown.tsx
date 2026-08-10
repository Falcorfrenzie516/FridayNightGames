import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Pencil, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import EditProfileModal from './EditProfileModal';
import PlayerRecordModal from './PlayerRecordModal';
import ThemePicker from './ThemePicker';
import TablePicker from './TablePicker';

export const ICON_MAP: Record<string, string> = {
  lucky_six: '/avatar_lucky_six.svg',
  hot_roller: '/avatar_hot_roller.svg',
  ice_strategist: '/avatar_ice_strategist.svg',
  lucky_clover: '/avatar_lucky_clover.svg',
  chaos_roller: '/avatar_chaos_roller.svg',
  dice_bear: '/avatar_dice_bear.svg',
  dice_monster: '/avatar_dice_monster.svg',
  speed_roller: '/avatar_speed_roller.svg',
};

interface ProfileDropdownProps {
  user: SupabaseUser;
  displayName: string;
  displayIcon: string;
  currentTheme: string;
  currentTable: string;
  onSignOut?: () => void;
  onProfileSaved: (name: string, icon: string) => void;
  onThemeChange: (themeId: string) => void;
  onTableChange: (tableId: string) => void;
}

export default function ProfileDropdown({ user, displayName, displayIcon, currentTheme, currentTable, onSignOut, onProfileSaved, onThemeChange, onTableChange }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    onSignOut?.();
  }

  const iconSrc = ICON_MAP[displayIcon];
  const label = displayName || user.email?.split('@')[0] || 'Player';
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? '??';

  function AvatarInner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const imgSize = size === 'md' ? 'w-7 h-7' : 'w-5 h-5';
    return iconSrc ? (
      <img src={iconSrc} alt={label} className={`${imgSize} object-contain`} />
    ) : (
      <span className={size === 'md' ? 'text-sm' : 'text-xs'}>{initials}</span>
    );
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold transition shadow-sm overflow-hidden"
          title={label}
        >
          <AvatarInner size="sm" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  <AvatarInner size="md" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => { setShowEdit(true); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Pencil className="w-4 h-4 text-gray-400" />
                Edit Profile
              </button>
              <button
                onClick={() => { setShowRecord(true); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Trophy className="w-4 h-4 text-gray-400" />
                My Record
              </button>
            </div>

            <ThemePicker
              user={user}
              currentTheme={currentTheme}
              onThemeChange={onThemeChange}
            />

            <TablePicker
              user={user}
              currentTable={currentTable}
              onTableChange={onTableChange}
            />

            <div className="py-1 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <EditProfileModal
          user={user}
          displayName={displayName}
          displayIcon={displayIcon}
          onClose={() => setShowEdit(false)}
          onSaved={(name, icon) => {
            onProfileSaved(name, icon);
            setShowEdit(false);
          }}
        />
      )}

      {showRecord && (
        <PlayerRecordModal
          user={user}
          displayName={displayName}
          onClose={() => setShowRecord(false)}
        />
      )}
    </>
  );
}

interface LoginButtonProps {
  onClick: () => void;
}

export function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition shadow-sm"
      title="Sign In"
    >
      <User className="w-4 h-4" />
    </button>
  );
}
