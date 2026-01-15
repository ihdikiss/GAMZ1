
import React, { useState, useEffect, useCallback } from 'react';
import GameComponent from './components/GameComponent';
import AdminPanel from './components/AdminPanel';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase } from './supabase';

interface LeaderboardEntry { name: string; score: number; }
interface QuestionData {
  id?: string;
  text: string;
  room1: string;
  room2: string;
  room3: string;
  room4: string; 
  correct_index: number;
}

type AppView = 'landing' | 'login' | 'register' | 'game' | 'leaderboard' | 'admin';

const WHATSAPP_LINK = "https://wa.me/212600000000?text=أريد%20البدء%20في%20مغامرة%20الدرس%20VIP";

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<any>(null);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dbQuestions, setDbQuestions] = useState<QuestionData[]>([]);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setDbQuestions(data as any[]);
      } else {
        const fallbacks: QuestionData[] = FALLBACK_LEVELS.map(q => ({
          text: q.question,
          room1: q.rooms[0].label,
          room2: q.rooms[1].label,
          room3: q.rooms[2].label,
          room4: q.rooms[3].label,
          correct_index: q.rooms.findIndex(r => r.isCorrect)
        }));
        setDbQuestions(fallbacks);
      }
    } catch (e) {
      console.error("Fetch questions failed", e);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase.from('leaderboard').select('name, score').order('score', { ascending: false }).limit(10);
      if (data) setLeaderboard(data as LeaderboardEntry[]);
    } catch (e) {
      console.error("Leaderboard error", e);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata.username || session.user.email?.split('@')[0]);
      }
    };
    checkUser();
    loadLeaderboard();
    fetchQuestions();

    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'portal') setView('admin');
  }, [fetchQuestions, loadLeaderboard]);

  const handleAuth = async (e: React.FormEvent, mode: 'login' | 'reg') => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      let result;
      if (mode === 'reg') {
        result = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (result.data.user) {
          await supabase.from('profiles').insert([{ id: result.data.user.id, email, username }]);
          await supabase.from('leaderboard').insert([{ name: username, score: 0 }]);
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      setUser(result.data.user);
      setView('landing');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'LOSE_LIFE') {
        setLives(v => {
          if (v <= 1) setGameOver(true);
          return v - 1;
        });
      }
      if (e.detail.type === 'NEXT_LEVEL') {
        setScore(s => s + 1000);
        const nextIdx = levelIndex + 1;
        if (nextIdx >= dbQuestions.length) {
          setIsVictory(true);
          setGameOver(true);
          if (user) supabase.from('leaderboard').upsert([{ name: username, score: score + 1000 }]);
        } else {
          setLevelIndex(nextIdx);
        }
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, [levelIndex, dbQuestions, user, username, score]);

  const currentQuestion = dbQuestions[levelIndex];

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden font-sans rtl">
      {/* Admin View */}
      {view === 'admin' && <AdminPanel onExit={() => setView('landing')} />}

      {/* Landing View */}
      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <h1 className="text-8xl md:text-[10rem] font-black mb-12 italic text-indigo-500 select-none">SPACE MAZE</h1>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => setView(user ? 'game' : 'register')} className="py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl active:scale-95 transition-transform">مهمة عادية 🚀</button>
            <button onClick={() => { if(user) window.open(WHATSAPP_LINK, '_blank'); else setView('register'); }} className="py-5 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl">مغامرة VIP ✨</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase">دخول</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game View */}
      {view === 'game' && currentQuestion && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[3rem] text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase">Mission {levelIndex + 1} / {dbQuestions.length}</span>
              <h3 className="text-xl md:text-2xl font-bold">{currentQuestion.text}</h3>
            </div>
          </div>
          <GameComponent questionData={currentQuestion} levelIndex={levelIndex} />
          <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-40">
             <div className="bg-slate-900/90 px-7 py-4 rounded-3xl border border-white/10 flex items-center gap-3">
                 <span>❤️</span><span className="text-3xl font-black">{lives}</span>
             </div>
             <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-2xl text-3xl font-black">{score}</div>
          </div>
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center z-50">
               <div className="text-center p-14 bg-slate-900 rounded-[70px] border border-white/10 max-w-md w-full">
                  <h2 className="text-5xl font-black mb-8 italic">{isVictory ? 'COMPLETED! 🏆' : 'FAILED 🛑'}</h2>
                  <p className="text-slate-400 mb-10">النقاط: {score}</p>
                  <button onClick={() => window.location.reload()} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl">العودة</button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Auth Views */}
      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6">
           <div className="bg-slate-900/90 backdrop-blur-3xl p-12 rounded-[50px] w-full max-w-md border border-white/5 text-center relative">
              <button onClick={() => setView('landing')} className="absolute top-8 right-8 text-slate-500 font-bold hover:text-white">✕</button>
              <h2 className="text-4xl font-black mb-2 italic">{view === 'login' ? 'WELCOME BACK' : 'JOIN'}</h2>
              {authError && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold">{authError}</div>}
              <form onSubmit={(e) => handleAuth(e, view === 'login' ? 'login' : 'reg')} className="space-y-4">
                 {view === 'register' && <input type="text" placeholder="Username" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={username} onChange={e => setUsername(e.target.value)} required />}
                 <input type="email" placeholder="Email" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="Password" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-6">
                   {authLoading ? '...' : (view === 'login' ? 'LOGIN' : 'REGISTER')}
                 </button>
                 <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="mt-4 text-xs text-indigo-400 hover:underline">
                    {view === 'login' ? 'اشترك الآن' : 'سجل دخول'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Leaderboard View */}
      {view === 'leaderboard' && (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-xl bg-slate-900 p-12 rounded-[70px] border border-indigo-500/20 text-center relative shadow-2xl">
            <button onClick={() => setView('landing')} className="absolute top-10 right-10 text-slate-500 font-bold">✕</button>
            <h2 className="text-4xl font-black italic mb-12 text-indigo-400">LEADERBOARD</h2>
            <div className="space-y-3 mb-10 max-h-80 overflow-y-auto">
              {leaderboard.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-slate-800/30 rounded-[2rem] border border-white/5">
                   <span className="text-3xl font-black text-indigo-400">{e.score}</span>
                   <div className="text-right">
                     <span className="font-black text-xl block">{e.name}</span>
                     <span className="text-[10px] text-slate-500 uppercase">RANK #{i+1}</span>
                   </div>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="opacity-30 italic">لا يوجد نتائج بعد</p>}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-full font-black text-2xl">العودة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
