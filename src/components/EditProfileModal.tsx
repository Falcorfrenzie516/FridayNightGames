import { useState } from 'react';
import { X, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const ICONS = [
  { id: 'lucky_six', label: 'Lucky Six', src: '/avatar_lucky_six.svg' },
  { id: 'hot_roller', label: 'Hot Roller', src: '/avatar_hot_roller.svg' },
  { id: 'ice_strategist', label: 'Ice Strategist', src: '/avatar_ice_strategist.svg' },
  { id: 'lucky_clover', label: 'Lucky Clover', src: '/avatar_lucky_clover.svg' },
  { id: 'chaos_roller', label: 'Chaos Roller', src: '/avatar_chaos_roller.svg' },
  { id: 'dice_bear', label: 'Dice Bear', src: '/avatar_dice_bear.svg' },
  { id: 'dice_monster', label: 'Dice Monster', src: '/avatar_dice_monster.svg' },
  { id: 'speed_roller', label: 'Speed Roller', src: '/avatar_speed_roller.svg' },
];

interface EditProfileModalProps {
  user: User;
  displayName: string;
  displayIcon: string;
  onClose: () => void;
  onSaved: (name: string, icon: string) => void;
}

type Tab = 'profile' | 'password';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  return { score, label: 'Strong', color: '#22c55e' };
}

export default function EditProfileModal({ user, displayName, displayIcon, onClose, onSaved }: EditProfileModalProps) {
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(displayName);
  const [icon, setIcon] = useState(displayIcon || 'bone');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const pwStrength = getPasswordStrength(newPassword);

  async function handleSaveProfile() {
    const trimmed = name.trim();
    if (!trimmed) { setSaveError('Nickname cannot be empty.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    if (trimmed !== displayName) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', trimmed)
        .maybeSingle();

      if (existing) {
        setSaving(false);
        setSaveError('That nickname is already taken. Please choose another.');
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: trimmed, display_icon: icon, updated_at: new Date().toISOString() });

    setSaving(false);
    if (error) {
      setSaveError('Failed to save profile. Please try again.');
    } else {
      setSaveSuccess(true);
      onSaved(trimmed, icon);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) { setPwError('Please enter your current password.'); return; }
    if (!newPassword) { setPwError('New password is required.'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPassword) && !/[0-9]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword)) {
      setPwError('Password must include at least one uppercase letter, number, or special character.');
      return;
    }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (currentPassword === newPassword) { setPwError('New password must be different from your current password.'); return; }

    setPwSaving(true);
    setPwError('');
    setPwSuccess(false);

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (verifyErr) {
      setPwSaving(false);
      setPwError('Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwError(error.message || 'Failed to update password.');
    } else {
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <h2 className="text-lg font-bold text-gray-800">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 mt-4 px-6">
          <button
            onClick={() => setTab('profile')}
            className={`pb-3 px-1 mr-6 text-sm font-semibold border-b-2 transition ${tab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setTab('password')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition ${tab === 'password' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Password
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {tab === 'profile' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nickname</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setSaveError(''); setSaveSuccess(false); }}
                  maxLength={20}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-blue-500 transition"
                  placeholder="Your nickname"
                />
                <p className="text-xs text-gray-400 mt-1">{name.trim().length}/20 characters</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Profile Avatar</label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map(ic => (
                    <button
                      key={ic.id}
                      onClick={() => setIcon(ic.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 border-2 transition ${icon === ic.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300 bg-gray-50'}`}
                      title={ic.label}
                    >
                      <img src={ic.src} alt={ic.label} className="w-12 h-12 object-contain" />
                      <span className="text-[10px] font-semibold text-gray-500 leading-tight text-center">{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <p className="text-red-600 text-sm flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                </p>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                {saving ? 'Checking...' : saveSuccess ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
              </button>
            </>
          )}

          {tab === 'password' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-gray-800 text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="Your current password"
                  />
                  <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-gray-800 text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="New password"
                  />
                  <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : '#e5e7eb' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: pwStrength.color }}>
                      {pwStrength.label}
                      {pwStrength.score < 3 && (
                        <span className="text-gray-400 font-normal ml-1">— use uppercase, numbers, or symbols</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-gray-800 text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="Confirm new password"
                  />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && confirmPassword === newPassword && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {pwError && (
                <p className="text-red-600 text-sm flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
                </p>
              )}
              {pwSuccess && <p className="text-emerald-600 text-sm font-medium">Password updated successfully!</p>}

              <button
                onClick={handleChangePassword}
                disabled={pwSaving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                {pwSaving ? 'Verifying...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
