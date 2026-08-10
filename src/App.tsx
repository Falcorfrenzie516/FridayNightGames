import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import DiceGame, { BotConfig, BonesSavedState } from './components/DiceGame';
import SoloSetup from './components/SoloSetup';
import GamesHub from './components/GamesHub';
import CardGame313, { Game313SavedState } from './components/CardGame313';
import CardGame313Setup, { Bot313Config } from './components/CardGame313Setup';
import SoloBingo, { BingoSavedState } from './components/SoloBingo';
import DominoTrains, { BotConfig as DominoBotConfig, DominoSavedState } from './components/DominoTrains';
import DominoTrainsSetup from './components/DominoTrainsSetup';
import MultiplayerHub from './components/MultiplayerHub';
import AuthModal from './components/AuthModal';
import type { MpSession, MpPlayer } from './lib/multiplayerService';
import { supabase } from './lib/supabase';
import { getTheme, applyTheme, DEFAULT_THEME_ID } from './lib/themes';
import { getTable, DEFAULT_TABLE_ID } from './lib/tables';
import { getDeckColor, DEFAULT_DECK_COLOR } from './components/CardBack';
import { getDaubColor, DEFAULT_DAUB_COLOR } from './components/DaubColorPicker';
import { saveGame, loadSavedGame, clearSavedGame } from './lib/savedGameService';

type AppView =
  | 'hub'
  | 'multiplayer'
  | 'solo-setup'
  | 'solo'
  | '313-setup'
  | 'solo-313'
  | 'solo-bingo'
  | 'domino-setup'
  | 'domino-trains';

function App() {
  const [view, setView] = useState<AppView>('hub');
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayIcon, setDisplayIcon] = useState('');
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME_ID);
  const [currentTable, setCurrentTable] = useState(DEFAULT_TABLE_ID);
  const [currentDeckColor, setCurrentDeckColor] = useState(DEFAULT_DECK_COLOR);
  const [currentDaubColor, setCurrentDaubColor] = useState(DEFAULT_DAUB_COLOR);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [soloBots, setSoloBots] = useState<BotConfig[]>([]);
  const [deckSize, setDeckSize] = useState<'regular' | 'large'>('regular');
  const [dominoBots, setDominoBots] = useState<DominoBotConfig[]>([]);
  const [bots313, setBots313] = useState<Bot313Config[]>([{ name: 'Ruby', difficulty: 'medium' }]);

  const [sessionConflict, setSessionConflict] = useState(false);

  // Saved game state
  const [bonesSave, setBonesSave] = useState<BonesSavedState | null>(null);
  const [save313, setSave313] = useState<Game313SavedState | null>(null);
  const [bingoSave, setBingoSave] = useState<BingoSavedState | null>(null);
  const [dominoSave, setDominoSave] = useState<DominoSavedState | null>(null);

  // Debounce refs for saves
  const bonesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save313Debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bingoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dominoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    applyTheme(getTheme(DEFAULT_THEME_ID));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadAllSaves(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadAllSaves(session.user.id);
      } else {
        setDisplayName('');
        setDisplayIcon('');
        setCurrentTheme(DEFAULT_THEME_ID);
        setCurrentTable(DEFAULT_TABLE_ID);
        setCurrentDeckColor(DEFAULT_DECK_COLOR);
        setCurrentDaubColor(DEFAULT_DAUB_COLOR);
        applyTheme(getTheme(DEFAULT_THEME_ID));
        setBonesSave(null);
        setSave313(null);
        setBingoSave(null);
        setDominoSave(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadAllSaves(userId: string) {
    const [bones, g313, bingo, domino] = await Promise.all([
      loadSavedGame(userId, 'bones'),
      loadSavedGame(userId, '3-13'),
      loadSavedGame(userId, 'card-bingo'),
      loadSavedGame(userId, 'domino-trains'),
    ]);
    if (bones) setBonesSave(bones as BonesSavedState);
    if (g313) setSave313(g313 as Game313SavedState);
    if (bingo) setBingoSave(bingo as BingoSavedState);
    if (domino) setDominoSave(domino as DominoSavedState);
  }

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`session-monitor:${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const newToken = (payload.new as { active_session_token?: string }).active_session_token;
        const myToken = localStorage.getItem('session_token');
        if (newToken && myToken && newToken !== myToken) {
          setSessionConflict(true);
          supabase.auth.signOut();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  async function loadProfile(userId: string) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.email) {
      supabase.from('profiles').upsert({ id: userId, email: authData.user.email.toLowerCase() }, { onConflict: 'id' });
    }
    const { data } = await supabase
      .from('profiles')
      .select('display_name, display_icon, theme, table_id, deck_color, daub_color')
      .eq('id', userId)
      .maybeSingle();
    if (data?.display_name) setDisplayName(data.display_name);
    if (data?.display_icon) setDisplayIcon(data.display_icon);
    if (data?.theme) {
      setCurrentTheme(data.theme);
      applyTheme(getTheme(data.theme));
    }
    if (data?.table_id) setCurrentTable(data.table_id);
    if (data?.deck_color) setCurrentDeckColor(data.deck_color);
    if (data?.daub_color) setCurrentDaubColor(data.daub_color);
  }

  function handleProfileSaved(name: string, icon: string) {
    setDisplayName(name);
    setDisplayIcon(icon);
  }

  function handleThemeChange(themeId: string) {
    setCurrentTheme(themeId);
    applyTheme(getTheme(themeId));
  }

  async function handleTableChange(tableId: string) {
    setCurrentTable(tableId);
    if (user) {
      await supabase.from('profiles').update({ table_id: tableId }).eq('id', user.id);
    }
  }

  async function handleDeckColorChange(colorId: string) {
    setCurrentDeckColor(colorId);
    if (user) {
      await supabase.from('profiles').update({ deck_color: colorId }).eq('id', user.id);
    }
  }

  async function handleDaubColorChange(colorId: string) {
    setCurrentDaubColor(colorId);
    if (user) {
      await supabase.from('profiles').update({ daub_color: colorId }).eq('id', user.id);
    }
  }

  function handleSelectGame(gameId: string) {
    if (gameId === 'bones') {
      setView('solo-setup');
    } else if (gameId === '3-13') {
      setView('313-setup');
    } else if (gameId === 'bingo') {
      setView('solo-bingo');
    } else if (gameId === 'domino-trains') {
      setView('domino-setup');
    }
  }

  function handleMpGameStart(_session: MpSession, _player: MpPlayer) {
    // Placeholder: multiplayer gameplay components will be wired here in the future
    // For now, return to multiplayer hub after session starts
    setView('multiplayer');
  }

  // Save callbacks with debounce
  const handleBonesSave = useCallback((state: BonesSavedState) => {
    setBonesSave(state);
    if (!user) return;
    if (bonesDebounce.current) clearTimeout(bonesDebounce.current);
    bonesDebounce.current = setTimeout(() => {
      saveGame(user.id, 'bones', state);
    }, 2000);
  }, [user]);

  const handleBonesClearSave = useCallback(() => {
    setBonesSave(null);
    if (!user) return;
    clearSavedGame(user.id, 'bones');
  }, [user]);

  const handle313Save = useCallback((state: Game313SavedState) => {
    setSave313(state);
    if (!user) return;
    if (save313Debounce.current) clearTimeout(save313Debounce.current);
    save313Debounce.current = setTimeout(() => {
      saveGame(user.id, '3-13', state);
    }, 2000);
  }, [user]);

  const handle313ClearSave = useCallback(() => {
    setSave313(null);
    if (!user) return;
    clearSavedGame(user.id, '3-13');
  }, [user]);

  const handleBingoSave = useCallback((state: BingoSavedState) => {
    setBingoSave(state);
    if (!user) return;
    if (bingoDebounce.current) clearTimeout(bingoDebounce.current);
    bingoDebounce.current = setTimeout(() => {
      saveGame(user.id, 'card-bingo', state);
    }, 2000);
  }, [user]);

  const handleBingoClearSave = useCallback(() => {
    setBingoSave(null);
    if (!user) return;
    clearSavedGame(user.id, 'card-bingo');
  }, [user]);

  const handleDominoSave = useCallback((state: DominoSavedState) => {
    setDominoSave(state);
    if (!user) return;
    if (dominoDebounce.current) clearTimeout(dominoDebounce.current);
    dominoDebounce.current = setTimeout(() => {
      saveGame(user.id, 'domino-trains', state);
    }, 2000);
  }, [user]);

  const handleDominoClearSave = useCallback(() => {
    setDominoSave(null);
    if (!user) return;
    clearSavedGame(user.id, 'domino-trains');
  }, [user]);

  const sharedProfileProps = {
    user,
    displayName,
    displayIcon,
    currentTheme,
    currentTable,
    onDisplayNameChange: setDisplayName,
    onProfileSaved: handleProfileSaved,
    onThemeChange: handleThemeChange,
    onTableChange: handleTableChange,
  };

  const tableUrl = getTable(currentTable).url;
  const deckColorHex = getDeckColor(currentDeckColor);
  const daubColorObj = getDaubColor(currentDaubColor);

  if (view === 'multiplayer') {
    return (
      <MultiplayerHub
        user={user}
        displayName={displayName}
        onBack={() => setView('hub')}
        onShowAuth={() => setShowAuthModal(true)}
        onGameStart={handleMpGameStart}
      />
    );
  }

  if (view === 'solo-setup') {
    return (
      <SoloSetup
        onStart={(bots) => { setSoloBots(bots); setBonesSave(null); setView('solo'); }}
        onCancel={() => setView('hub')}
        hasSavedGame={!!bonesSave}
        onResume={() => {
          if (bonesSave) {
            setSoloBots(bonesSave.bots);
            setView('solo');
          }
        }}
      />
    );
  }

  if (view === 'solo') {
    return (
      <DiceGame
        onBackToMenu={() => setView('solo-setup')}
        userId={user?.id ?? null}
        tableUrl={tableUrl}
        currentTable={currentTable}
        onTableChange={handleTableChange}
        bots={soloBots}
        deckColor={deckColorHex}
        currentDeckColor={currentDeckColor}
        onDeckColorChange={handleDeckColorChange}
        savedState={bonesSave}
        onSave={user ? handleBonesSave : undefined}
        onClearSave={user ? handleBonesClearSave : undefined}
      />
    );
  }

  if (view === '313-setup') {
    return (
      <CardGame313Setup
        onStart={(bots) => { setBots313(bots); setSave313(null); setView('solo-313'); }}
        onCancel={() => setView('hub')}
        hasSavedGame={!!save313}
        onResume={() => {
          if (save313) {
            setBots313(save313.botConfigs);
            setView('solo-313');
          }
        }}
      />
    );
  }

  if (view === 'solo-313') {
    return (
      <CardGame313
        onBackToMenu={() => setView('313-setup')}
        userId={user?.id ?? null}
        botConfigs={bots313}
        tableUrl={tableUrl}
        currentTable={currentTable}
        onTableChange={handleTableChange}
        deckSize={deckSize}
        onDeckSizeChange={setDeckSize}
        deckColor={deckColorHex}
        currentDeckColor={currentDeckColor}
        onDeckColorChange={handleDeckColorChange}
        savedState={save313}
        onSave={user ? handle313Save : undefined}
        onClearSave={user ? handle313ClearSave : undefined}
      />
    );
  }

  if (view === 'solo-bingo') {
    return (
      <SoloBingo
        onBackToMenu={() => setView('hub')}
        userId={user?.id ?? null}
        tableUrl={tableUrl}
        deckColor={deckColorHex}
        currentDeckColor={currentDeckColor}
        onDeckColorChange={handleDeckColorChange}
        daubColor={daubColorObj.hex}
        daubGhostColor={daubColorObj.ghostHex}
        currentDaubColor={currentDaubColor}
        onDaubColorChange={handleDaubColorChange}
        savedState={bingoSave}
        onSave={user ? handleBingoSave : undefined}
        onClearSave={user ? handleBingoClearSave : undefined}
      />
    );
  }

  if (view === 'domino-setup') {
    return (
      <DominoTrainsSetup
        onStart={(bots) => { setDominoBots(bots); setDominoSave(null); setView('domino-trains'); }}
        onCancel={() => setView('hub')}
        hasSavedGame={!!dominoSave}
        onResume={() => {
          if (dominoSave) {
            setDominoBots(dominoSave.bots);
            setView('domino-trains');
          }
        }}
      />
    );
  }

  if (view === 'domino-trains') {
    return (
      <DominoTrains
        onBackToMenu={() => setView('domino-setup')}
        userId={user?.id ?? null}
        displayName={displayName}
        bots={dominoBots}
        tableUrl={tableUrl}
        currentTable={currentTable}
        onTableChange={handleTableChange}
        savedState={dominoSave}
        onSave={user ? handleDominoSave : undefined}
        onClearSave={user ? handleDominoClearSave : undefined}
      />
    );
  }

  return (
    <>
      <GamesHub
        onSelectGame={handleSelectGame}
        onSelectMultiplayer={() => setView('multiplayer')}
        onShowAuth={() => setShowAuthModal(true)}
        {...sharedProfileProps}
      />
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
      )}
      {sessionConflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Signed in elsewhere</h2>
            <p className="text-gray-500 text-sm mb-6">Your account was signed in from another device or browser. You have been signed out here.</p>
            <button
              onClick={() => { setSessionConflict(false); setView('hub'); }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
