import { useState } from 'react';
import { X, LogIn, UserPlus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

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

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pwStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  async function handleSubmit() {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter a nickname.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!/[A-Z]/.test(password) && !/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
        setError('Password must contain at least one uppercase letter, number, or special character.');
        return;
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', displayName.trim())
        .maybeSingle();

      if (existing) {
        setError('That nickname is already taken. Please choose another.');
        return;
      }
    }

    setLoading(true);

    if (mode === 'login') {
      const { data: signInData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setLoading(false); setError(err.message); return; }
      if (signInData.user) {
        const token = crypto.randomUUID();
        localStorage.setItem('session_token', token);
        await supabase.from('profiles').update({ active_session_token: token }).eq('id', signInData.user.id);
      }
      setLoading(false);
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setLoading(false); setError(err.message); return; }
      if (data.user) {
        const token = crypto.randomUUID();
        localStorage.setItem('session_token', token);
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          active_session_token: token,
        });
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) { setLoading(false); setError(signInErr.message); return; }
        }
      }
      setLoading(false);
    }

    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Sign in to track your games and stats.' : 'Join to save your game history.'}
        </p>

        <div className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Nickname</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How others see you"
                maxLength={20}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-blue-500 transition"
            />
            {mode === 'signup' && email && !validateEmail(email) && (
              <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Enter a valid email address
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-blue-500 transition"
            />
            {mode === 'signup' && password && pwStrength && (
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
                    <span className="text-gray-400 font-normal ml-1">
                      — use uppercase, numbers, or symbols
                    </span>
                  )}
                </p>
              </div>
            )}
            {mode === 'signup' && password && password.length >= 8 && pwStrength && pwStrength.score >= 3 && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Password looks good
              </p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
