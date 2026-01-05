
import React, { useState, useEffect } from 'react';
import GameComponent from './components/GameComponent';
import { GAME_LEVELS } from './game/constants';
import { supabase, isConfigured } from './supabase';

interface LeaderboardEntry {
  name: string;
  score: number;
  time: number;
  created_at?: string;
}

type AppView = 'landing' | 'login' | 'register' | 'game' | 'leaderboard';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<any>(null);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const connected = isConfigured();

  useEffect(() => {
    if (connected) {
      const checkUser = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setUsername(session.user.user_metadata.username || session.user.email?.split('@')[0]);
          }
        } catch (e) {
          console.error("Auth check failed:", e);
        }
      };
      checkUser();
      loadLeaderboard();
    }
  }, [connected]);

  const loadLeaderboard = async () => {
    if (connected) {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('name, score, time, created_at')
          .order('score', { ascending: false })
          .limit(5);
        if (!error && data) setLeaderboard(data);
      } catch (e) { console.error("Leaderboard error:", e); }
    }
  };

  const handleStartMission = () => {
    if (user) {
      setView('game');
    } else {
      setView('register');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setAuthError('إعدادات الاتصال مفقودة.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        try {
          await supabase.from('profiles').upsert([{ id: data.user.id, username, email }]);
        } catch (dbErr) {
          console.warn("Profile sync skipped.");
        }
        setUser(data.user);
        alert(`تم تسجيلك بنجاح يا ${username}! يمكنك الآن بدء المهمة من القائمة الرئيسية.`);
        setView('landing');
      }
    } catch (err: any) {
      setAuthError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        setUser(data.user);
        setUsername(data.user.user_metadata.username || data.user.email?.split('@')[0]);
        setView('landing');
      }
    } catch (err) {
      setAuthError('خطأ في الدخول.');
    } finally {
      setAuthLoading(false);
    }
  };

  const saveResult = async () => {
    const finalName = username || "مستكشف مجهول";
    if (connected) {
      await supabase.from('leaderboard').insert([{ name: finalName, score, time: timeElapsed }]);
      await loadLeaderboard();
    }
    setView('leaderboard');
  };

  useEffect(() => {
    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'LOSE_LIFE') setLives(v => {
        if (v <= 1) setGameOver(true);
        return v - 1;
      });
      if (e.detail.type === 'SCORE_UP') setScore(s => s + 500);
      if (e.detail.type === 'NEXT_LEVEL') {
        setScore(s => s + 1000);
        setLevelIndex(idx => {
          if (idx + 1 >= GAME_LEVELS.length) {
            setIsVictory(true);
            setGameOver(true);
            return idx;
          }
          return idx + 1;
        });
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
          <div className="mb-8 px-5 py-2 rounded-full text-[10px] font-black border border-indigo-500/30 text-indigo-400 uppercase tracking-[0.2em] animate-pulse">
            {user ? `مرحباً بالقائد: ${username}` : 'تتطلب المهمة تحديد الهوية أولاً'}
          </div>
          
          <h1 className="text-7xl md:text-[9.5rem] font-black mb-12 tracking-tighter leading-none italic select-none drop-shadow-[0_0_35px_rgba(99,102,241,0.3)]">
            SPACE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-700">MAZE</span>
          </h1>

          <div className="flex flex-col gap-4 w-full max-w-md">
            <button 
              onClick={handleStartMission} 
              className="group relative overflow-hidden py-6 bg-white text-black rounded-[2.5rem] font-black text-3xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-95"
            >
              <span className="relative z-10">{user ? 'ابدأ المهمة 🚀' : 'سجل للدخول للمهمة 🛡️'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl font-black hover:bg-slate-800 transition-all uppercase text-xs tracking-widest">لوحة الشرف</button>
              {user ? (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); window.location.reload(); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-xs">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-3xl font-black hover:bg-indigo-600/30 transition-all text-xs tracking-widest uppercase">لديك حساب؟</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6 bg-slate-950 relative">
          <div className="bg-slate-900/90 backdrop-blur-3xl p-10 md:p-14 rounded-[50px] w-full max-w-md border border-white/5 shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
             <h2 className="text-4xl font-black mb-2 tracking-tighter">
               {view === 'login' ? 'تسجيل الدخول' : 'مجند جديد'}
             </h2>
             <p className="text-slate-500 mb-10 font-medium text-sm">
               {view === 'register' ? 'أنشئ هويتك الفضائية لفتح أبواب المتاهة' : 'أدخل بياناتك للعودة للمهمة'}
             </p>
             
             {authError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold">{authError}</div>}
             
             <form onSubmit={view === 'login' ? handleLogin : handleSignUp} className="space-y-4 text-right">
                {view === 'register' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4">اسم المستخدم</label>
                    <input 
                      type="text" placeholder="Astro_Warrior" 
                      className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                      value={username} onChange={e => setUsername(e.target.value)} required 
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4">البريد الإلكتروني</label>
                  <input 
                    type="email" placeholder="astronaut@base.com" 
                    className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                    value={email} onChange={e => setEmail(e.target.value)} required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4">كلمة السر</label>
                  <input 
                    type="password" placeholder="••••••••" 
                    className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                    value={password} onChange={e => setPassword(e.target.value)} required 
                  />
                </div>
                
                <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-8 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50">
                  {authLoading ? 'جاري التحقق...' : (view === 'login' ? 'دخول 🚀' : 'إنشاء حساب 🛡️')}
                </button>
                
                <div className="pt-8 border-t border-white/5 mt-8 flex flex-col gap-3">
                  <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-indigo-400 text-xs font-bold hover:underline">
                    {view === 'login' ? 'ليس لديك حساب؟ سجل من هنا' : 'لديك حساب؟ سجل دخولك'}
                  </button>
                  <button type="button" onClick={() => setView('landing')} className="text-slate-600 text-[10px] uppercase tracking-widest">إلغاء</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {view === 'game' && user && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 pointer-events-none">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[3rem] text-center relative overflow-hidden">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2">المستوى {levelIndex + 1}</span>
              <h3 className="text-xl md:text-3xl font-bold text-white italic">{GAME_LEVELS[levelIndex]?.question}</h3>
            </div>
          </div>

          <GameComponent />

          <div className="absolute bottom-10 left-10 z-40 flex items-center gap-5">
            <div className="bg-slate-900/80 backdrop-blur-lg px-7 py-4 rounded-[2rem] border border-white/10 flex items-center gap-3">
               <span className="text-2xl animate-pulse">❤️</span>
               <span className="text-3xl font-black font-mono">{lives}</span>
            </div>
            <div className="bg-indigo-600 px-8 py-4 rounded-[2.5rem] shadow-xl border border-indigo-400/30">
               <span className="text-3xl font-black font-mono">{score}</span>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6 z-50">
              <div className="bg-slate-900 p-12 rounded-[70px] border border-white/10 text-center max-w-lg w-full">
                <h2 className="text-6xl font-black mb-6 italic">{isVictory ? 'VICTORY!' : 'FAILED'}</h2>
                <div className="bg-slate-800/40 p-10 rounded-[50px] mb-10">
                  <p className="text-8xl font-black text-indigo-400 font-mono">{score}</p>
                </div>
                <button onClick={saveResult} className="w-full py-6 bg-green-600 rounded-[2.5rem] font-black text-2xl mb-4">حفظ النتيجة ✅</button>
                <button onClick={() => window.location.reload()} className="text-slate-500 font-bold">القائمة الرئيسية</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950">
          <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl p-12 rounded-[70px] border border-indigo-500/20">
            <h2 className="text-4xl font-black italic mb-12 text-center text-indigo-400 uppercase tracking-tighter">Space Legends</h2>
            <div className="space-y-4 mb-12">
              {leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-7 rounded-[2.5rem] ${i === 0 ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-slate-800/30'}`}>
                   <span className="font-black text-2xl">{e.name}</span>
                   <span className="text-3xl font-black text-indigo-400 font-mono">{e.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl">العودة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
