
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
          console.error("Auth check failed (possibly network):", e);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setAuthError('خطأ: لم يتم ربط تطبيق Supabase بشكل صحيح. يرجى إضافة SUPABASE_URL و SUPABASE_ANON_KEY في إعدادات المشروع.');
      return;
    }
    if (!username || !email || !password) {
      setAuthError('يرجى ملء جميع الحقول');
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
          console.warn("Could not sync to profiles table, but auth succeeded.");
        }
        setUser(data.user);
        alert(`أهلاً بك يا ${username}! تم إنشاء حسابك بنجاح.`);
        setView('landing');
      }
    } catch (err: any) {
      if (err.message?.includes('fetch')) {
        setAuthError('فشل الاتصال بخوادم Supabase. تأكد من صحة الرابط (URL) ومن أنك متصل بالإنترنت.');
      } else {
        setAuthError('حدث خطأ غير متوقع أثناء التسجيل.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setAuthError('إعدادات Supabase غير مكتملة.');
      return;
    }
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
      setAuthError('خطأ في الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setAuthLoading(false);
    }
  };

  const saveResult = async () => {
    const finalName = username || "مستكشف مجهول";
    const newScore = { name: finalName, score, time: timeElapsed };

    if (connected) {
      try {
        await supabase.from('leaderboard').insert([newScore]);
        await loadLeaderboard();
      } catch (e) {
        console.error("Failed to save score:", e);
      }
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
      {/* Warning Banner if not connected */}
      {!connected && (view === 'login' || view === 'register') && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black py-2 text-center z-[100] animate-pulse">
          ⚠️ تنبيه: إعدادات اتصال Supabase مفقودة. يرجى إضافة مفاتيح API في بيئة العمل.
        </div>
      )}

      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
          <div className="mb-8 px-5 py-2 rounded-full text-[10px] font-black border border-indigo-500/30 text-indigo-400 uppercase tracking-[0.2em]">
            {user ? `القائد الحالي: ${username}` : 'المهمة الفضائية: المتاهة التعليمية'}
          </div>
          
          <h1 className="text-7xl md:text-[9.5rem] font-black mb-12 tracking-tighter leading-none italic select-none drop-shadow-[0_0_35px_rgba(99,102,241,0.3)]">
            SPACE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-700">MAZE</span>
          </h1>

          <div className="flex flex-col gap-4 w-full max-w-md">
            <button 
              onClick={() => setView('game')} 
              className="group relative overflow-hidden py-6 bg-white text-black rounded-[2.5rem] font-black text-3xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-95"
            >
              <span className="relative z-10">ابدأ المهمة 🚀</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl font-black hover:bg-slate-800 transition-all uppercase text-xs tracking-widest">لوحة الشرف</button>
              {user ? (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); window.location.reload(); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-xs">خروج</button>
              ) : (
                <button onClick={() => setView('register')} className="py-4 bg-indigo-600 rounded-3xl font-black hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all text-xs tracking-widest">النسخة التجريبية 🛡️</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6 bg-slate-950 relative">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          
          <div className="bg-slate-900/90 backdrop-blur-3xl p-10 md:p-14 rounded-[50px] w-full max-w-md border border-white/5 shadow-2xl animate-in zoom-in duration-500 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             
             <h2 className="text-4xl font-black mb-2 tracking-tighter">
               {view === 'login' ? 'تسجيل الدخول' : 'مجند جديد'}
             </h2>
             <p className="text-slate-500 mb-10 font-medium text-sm">
               {view === 'register' ? 'أكمل بياناتك لبدء مغامرتك وحفظ تقدمك' : 'أهلاً بك مجدداً في القاعدة'}
             </p>
             
             {authError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold leading-relaxed">{authError}</div>}
             
             <form onSubmit={view === 'login' ? handleLogin : handleSignUp} className="space-y-4 text-right">
                {view === 'register' && (
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 group-focus-within:text-indigo-400 transition-colors">اسم المستخدم</label>
                    <input 
                      type="text" placeholder="مثال: Astro_Warrior" 
                      className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 focus:bg-slate-800 text-center font-bold transition-all" 
                      value={username} onChange={e => setUsername(e.target.value)} required 
                    />
                  </div>
                )}
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 group-focus-within:text-indigo-400 transition-colors">البريد الإلكتروني</label>
                  <input 
                    type="email" placeholder="astronaut@base.com" 
                    className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 focus:bg-slate-800 text-center font-bold transition-all" 
                    value={email} onChange={e => setEmail(e.target.value)} required 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 group-focus-within:text-indigo-400 transition-colors">كلمة السر</label>
                  <input 
                    type="password" placeholder="••••••••" 
                    className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 focus:bg-slate-800 text-center font-bold transition-all" 
                    value={password} onChange={e => setPassword(e.target.value)} required 
                  />
                </div>
                
                <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-8 disabled:opacity-50 hover:bg-indigo-500 transition-all active:scale-95">
                  {authLoading ? 'جاري الاتصال بالسحابة...' : (view === 'login' ? 'دخول 🚀' : 'إنشاء حساب 🛡️')}
                </button>
                
                <div className="pt-8 border-t border-white/5 mt-8 flex flex-col gap-3">
                  <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-indigo-400 text-xs font-bold hover:underline">
                    {view === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً تجريبياً' : 'لديك حساب؟ سجل دخولك من هنا'}
                  </button>
                  <button type="button" onClick={() => setView('landing')} className="text-slate-600 text-[10px] uppercase tracking-widest hover:text-slate-400 transition-colors">العودة للرئيسية</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {view === 'game' && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 pointer-events-none">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[3rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50"></div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2 relative z-10">المستوى {levelIndex + 1}</span>
              <h3 className="text-xl md:text-3xl font-bold leading-tight tracking-tight text-white italic relative z-10 drop-shadow-lg">
                {GAME_LEVELS[levelIndex]?.question}
              </h3>
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-pulse"></div>
            </div>
          </div>

          <GameComponent />

          <div className="absolute bottom-10 left-10 z-40 flex items-center gap-5">
            <div className="bg-slate-900/80 backdrop-blur-lg px-7 py-4 rounded-[2rem] border border-white/10 flex items-center gap-3 shadow-xl">
               <span className="text-2xl animate-pulse">❤️</span>
               <span className="text-3xl font-black font-mono">{lives}</span>
            </div>
            <div className="bg-indigo-600 px-8 py-4 rounded-[2.5rem] shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-400/30">
               <span className="text-[10px] font-black block leading-none opacity-80 uppercase tracking-widest mb-1">Score</span>
               <span className="text-3xl font-black font-mono">{score}</span>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-500">
              <div className="bg-slate-900 p-12 rounded-[70px] border border-white/10 text-center max-w-lg w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
                <h2 className="text-6xl font-black mb-6 tracking-tighter uppercase italic">{isVictory ? 'Victory!' : 'Mission Failed'}</h2>
                <div className="bg-slate-800/40 p-10 rounded-[50px] mb-10 border border-white/5 shadow-inner">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] block mb-3">Final Score</span>
                  <p className="text-8xl font-black text-indigo-400 font-mono tracking-tighter drop-shadow-2xl">{score}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={saveResult} className="w-full py-6 bg-green-600 hover:bg-green-500 text-white rounded-[2.5rem] font-black text-2xl shadow-xl transition-all active:scale-95">حفظ النتيجة ✅</button>
                  <button onClick={() => window.location.reload()} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">إعادة المحاولة</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950">
          <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl p-12 rounded-[70px] border border-indigo-500/20 shadow-2xl animate-in slide-in-from-bottom-12 duration-500">
            <h2 className="text-4xl font-black italic tracking-tighter mb-12 text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">SPACE LEGENDS</h2>
            <div className="space-y-4 mb-12 min-h-[300px]">
              {leaderboard.length === 0 ? (
                <div className="text-center py-20 text-slate-600 italic font-medium">لا توجد سجلات في الأرشيف الفضائي بعد..</div>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-7 rounded-[2.5rem] border transition-all ${i === 0 ? 'bg-indigo-600/20 border-indigo-500/50 scale-105 shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'bg-slate-800/30 border-white/5'}`}>
                   <div className="flex items-center gap-4">
                     <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700'}`}>{i + 1}</span>
                     <span className="font-black text-2xl tracking-tight">{e.name}</span>
                   </div>
                   <span className="text-3xl font-black text-indigo-400 font-mono">{e.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-slate-100 transition-all">العودة للقاعدة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
