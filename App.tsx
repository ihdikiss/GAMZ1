
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
    // التحقق من الجلسة عند التحميل
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata.username || session.user.email?.split('@')[0]);
      }
    });

    loadLeaderboard();
  }, []);

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
    if (!username || !email || !password) {
      setAuthError('يرجى ملء جميع الحقول');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    
    // 1. تسجيل المستخدم في نظام Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      // 2. محاولة إضافة البروفايل (جدول Profiles)
      try {
        await supabase.from('profiles').insert([
          { id: data.user.id, username, email }
        ]);
      } catch (err) {
        console.warn("Profile table entry might already exist.");
      }
      
      setUser(data.user);
      alert('تم التسجيل بنجاح! مرحباً بك في الفريق.');
      setView('landing');
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
    } else {
      setUser(data.user);
      setUsername(data.user?.user_metadata.username || data.user?.email?.split('@')[0]);
      setView('landing');
    }
    setAuthLoading(false);
  };

  const saveResult = async () => {
    const finalName = username || "مستكشف مجهول";
    const newScore = { name: finalName, score, time: timeElapsed };

    if (connected) {
      await supabase.from('leaderboard').insert([newScore]);
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
          <div className="mb-8 px-5 py-2 rounded-full text-[10px] font-black border border-indigo-500/30 text-indigo-400">
            {user ? `مرحباً بالقائد: ${username}` : 'النسخة التجريبية - سجل بياناتك للحفظ'}
          </div>
          
          <h1 className="text-7xl md:text-[9rem] font-black mb-12 tracking-tighter leading-none italic select-none">
            SPACE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-600">MAZE</span>
          </h1>

          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => setView('game')} className="py-6 bg-white text-black rounded-[2rem] font-black text-3xl hover:scale-105 transition-all shadow-xl">ابدأ المهمة 🚀</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-2xl font-black hover:bg-slate-800 transition-all">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/20 text-red-400 border border-red-500/20 rounded-2xl font-black">خروج</button>
              ) : (
                <button onClick={() => setView('register')} className="py-4 bg-indigo-600 rounded-2xl font-black hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all text-sm">التسجيل التجريبي 🛡️</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6 bg-slate-950">
          <div className="bg-slate-900/80 backdrop-blur-xl p-10 md:p-14 rounded-[50px] w-full max-w-md border border-white/5 shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             
             <h2 className="text-4xl font-black mb-2 tracking-tighter">{view === 'login' ? 'عودة القائد' : 'تسجيل مجند جديد'}</h2>
             <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">
               {view === 'register' ? 'أدخل اسمك، بريدك، وكلمة سر قوية للبدء' : 'أدخل بياناتك للمتابعة'}
             </p>
             
             {authError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold">{authError}</div>}
             
             <form onSubmit={view === 'login' ? handleLogin : handleSignUp} className="space-y-4 text-right">
                {view === 'register' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 mr-4">Username / اسم المستخدم</label>
                    <input 
                      type="text" placeholder="مثال: SpaceExplorer" 
                      className="w-full p-5 bg-slate-800/50 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                      value={username} onChange={e => setUsername(e.target.value)} required 
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 mr-4">Email / البريد الإلكتروني</label>
                  <input 
                    type="email" placeholder="astronaut@base.com" 
                    className="w-full p-5 bg-slate-800/50 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                    value={email} onChange={e => setEmail(e.target.value)} required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 mr-4">Password / كلمة السر</label>
                  <input 
                    type="password" placeholder="••••••••" 
                    className="w-full p-5 bg-slate-800/50 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                    value={password} onChange={e => setPassword(e.target.value)} required 
                  />
                </div>
                
                <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-6 disabled:opacity-50 hover:bg-indigo-500 transition-all">
                  {authLoading ? 'جاري التحميل...' : (view === 'login' ? 'دخول 🚀' : 'إنشاء حساب وتجربة 🛡️')}
                </button>
                
                <div className="pt-6 border-t border-white/5 mt-6">
                  <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="w-full text-indigo-400 text-sm font-bold">
                    {view === 'login' ? 'ليس لديك حساب؟ سجل هنا' : 'لديك حساب؟ سجل دخولك'}
                  </button>
                  <button type="button" onClick={() => setView('landing')} className="w-full text-slate-600 text-xs mt-4 hover:underline">إلغاء</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {view === 'game' && (
        <div className="w-full h-full relative">
          {/* Question Overlay */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] shadow-2xl text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">المهمة الحالية: {levelIndex + 1}</span>
              <h3 className="text-xl md:text-2xl font-bold leading-tight tracking-tight text-white italic">
                {GAME_LEVELS[levelIndex]?.question}
              </h3>
            </div>
          </div>

          <GameComponent />

          {/* HUD (Lives & Score) */}
          <div className="absolute bottom-8 left-8 z-40 flex items-center gap-4">
            <div className="bg-slate-900/80 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-2">
               <span className="text-xl">❤️</span>
               <span className="text-2xl font-black">{lives}</span>
            </div>
            <div className="bg-indigo-600 px-6 py-3 rounded-2xl shadow-lg">
               <span className="text-xs font-black block leading-none opacity-70">SCORE</span>
               <span className="text-2xl font-black">{score}</span>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-700">
              <div className="bg-slate-900 p-12 rounded-[60px] border border-white/10 text-center max-w-lg w-full shadow-2xl">
                <h2 className="text-6xl font-black mb-4 tracking-tighter">{isVictory ? 'مهمة ناجحة!' : 'خسارة القائد'}</h2>
                <div className="bg-slate-800/50 p-10 rounded-[40px] mb-10 border border-white/5">
                  <span className="text-slate-500 text-xs font-black uppercase tracking-widest block mb-2">النتيجة النهائية</span>
                  <p className="text-7xl font-black text-indigo-400 font-mono tracking-tighter">{score}</p>
                </div>
                <button onClick={saveResult} className="w-full py-6 bg-green-600 hover:bg-green-500 text-white rounded-3xl font-black text-2xl shadow-xl transition-all">متابعة للوحة الشرف ✅</button>
                <button onClick={() => window.location.reload()} className="w-full mt-4 py-4 text-slate-500 font-bold">إعادة اللعب</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950">
          <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-3xl p-12 rounded-[60px] border border-indigo-500/20 shadow-2xl">
            <h2 className="text-4xl font-black italic tracking-tighter mb-10 text-center">HALL OF FAME</h2>
            <div className="space-y-4 mb-10">
              {leaderboard.length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic">لا توجد نتائج بعد..</div>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-6 rounded-[2rem] border ${i === 0 ? 'bg-indigo-600/20 border-indigo-500 scale-105' : 'bg-slate-800/40 border-white/5'}`}>
                   <span className="font-black text-2xl">{e.name}</span>
                   <span className="text-3xl font-black text-indigo-400 font-mono">{e.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-indigo-600 rounded-3xl font-black text-2xl shadow-xl">العودة للرئيسية</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
