
import React, { useState, useEffect, useCallback } from 'react';
import GameComponent from './components/GameComponent';
import AdminPanel from './components/AdminPanel';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase, isConfigured } from './supabase';

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
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const fetchQuestions = useCallback(async () => {
    if (!isConfigured()) {
      applyFallbacks();
      return;
    }
    try {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setDbQuestions(data as any[]);
      } else {
        applyFallbacks();
      }
    } catch (e) {
      applyFallbacks();
    }
  }, []);

  const applyFallbacks = () => {
    const fallbacks: QuestionData[] = FALLBACK_LEVELS.map(q => ({
      text: q.question,
      room1: q.rooms[0].label,
      room2: q.rooms[1].label,
      room3: q.rooms[2].label,
      room4: q.rooms[3].label,
      correct_index: q.rooms.findIndex(r => r.isCorrect)
    }));
    setDbQuestions(fallbacks);
  };

  const loadLeaderboard = useCallback(async () => {
    if (!isConfigured()) return;
    try {
      const { data } = await supabase.from('leaderboard').select('name, score').order('score', { ascending: false }).limit(10);
      if (data) setLeaderboard(data as LeaderboardEntry[]);
    } catch (e) {
      console.warn("Could not load leaderboard");
    }
  }, []);

  const saveScore = async (finalScore: number) => {
    if (!isConfigured() || !user) return;
    const name = user.user_metadata?.username || user.email;
    try {
      await supabase.from('leaderboard').insert([{ name, score: finalScore }]);
      loadLeaderboard();
    } catch (e) {
      console.error("Failed to save score");
    }
  };

  useEffect(() => {
    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'LOSE_LIFE') {
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setGameOver(true);
            setIsVictory(false);
          }
          return next;
        });
      } else if (e.detail.type === 'NEXT_LEVEL') {
        setScore(prev => prev + 100);
        setLevelIndex(prev => {
          const next = prev + 1;
          if (next >= dbQuestions.length) {
            setGameOver(true);
            setIsVictory(true);
            saveScore(score + 100);
          }
          return next;
        });
      }
    };

    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, [dbQuestions.length, user, score]);

  useEffect(() => {
    const initSession = async () => {
      if (!isConfigured()) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUsername(session.user.user_metadata.username || session.user.email?.split('@')[0]);
        }
      } catch (e) {
        console.error("Auth init failed", e);
      }
    };
    
    initSession();
    loadLeaderboard();
    fetchQuestions();

    if (isConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
      return () => subscription.unsubscribe();
    }
  }, [fetchQuestions, loadLeaderboard]);

  const handleAuth = async (e: React.FormEvent, mode: 'login' | 'reg') => {
    e.preventDefault();
    if (!isConfigured()) {
      setAuthError("تنبيه: قاعدة البيانات غير معدة (VITE_SUPABASE_URL مفقود).");
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      if (mode === 'reg') {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { data: { username } } 
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert([{ id: data.user.id, email, username }]);
          setUser(data.user);
          setView('landing');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          setView('landing');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "فشل الاتصال.");
    } finally {
      setAuthLoading(false);
    }
  };

  const currentQuestion = dbQuestions[levelIndex];

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden font-sans rtl">
      {/* شريط تنبيه في حالة عدم وجود الإعدادات */}
      {!isConfigured() && (
        <div className="bg-amber-600 text-white text-[10px] py-1 text-center font-bold z-[11000] relative">
          ⚠️ تنبيه: التطبيق يعمل في وضع المعاينة فقط (Fallback Mode). إعدادات Supabase غير مكتملة.
        </div>
      )}

      {view === 'admin' && <AdminPanel onExit={() => setView('landing')} />}

      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <h1 className="text-8xl md:text-[10rem] font-black mb-12 italic text-indigo-500 select-none">SPACE MAZE</h1>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => { setLives(3); setLevelIndex(0); setScore(0); setGameOver(false); setView(user || !isConfigured() ? 'game' : 'register'); }} className="py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:bg-slate-100 active:scale-95 transition-all">مهمة عادية 🚀</button>
            <button onClick={() => { if(user || !isConfigured()) window.open(WHATSAPP_LINK, '_blank'); else setView('register'); }} className="py-5 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl hover:bg-indigo-600 transition-all">مغامرة VIP ✨</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase hover:bg-slate-800">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase hover:bg-red-900/20">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase hover:bg-indigo-600/20">دخول</button>
              )}
            </div>
            <button onClick={() => setView('admin')} className="text-xs opacity-20 hover:opacity-100 transition-opacity">لوحة المسؤول</button>
          </div>
          {user && <p className="mt-8 text-indigo-400 font-bold italic">مرحباً بك، {user.user_metadata?.username || user.email}</p>}
        </div>
      )}

      {view === 'game' && currentQuestion && (
        <div className="w-full h-full relative">
          <div className="absolute top-6 left-0 right-0 z-40 px-6 flex justify-between items-center pointer-events-none">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl transition-all duration-500 ${i < lives ? 'grayscale-0 scale-100' : 'grayscale opacity-20 scale-75'}`}>❤️</span>
              ))}
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl text-center min-w-[300px] pointer-events-auto">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">المهمة {levelIndex + 1} / {dbQuestions.length}</p>
              <h3 className="text-lg md:text-xl font-bold leading-tight">{currentQuestion.text}</h3>
            </div>

            <div className="text-right">
              <p className="text-xs font-black text-indigo-500 uppercase">SCORE</p>
              <p className="text-3xl font-black italic">{score}</p>
            </div>
          </div>

          <GameComponent questionData={currentQuestion} levelIndex={levelIndex} />

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-6">
               <div className="text-center p-12 bg-slate-900 rounded-[3rem] border border-white/10 max-w-sm w-full shadow-2xl">
                  <div className="text-6xl mb-6">{isVictory ? '👑' : '💥'}</div>
                  <h2 className="text-4xl font-black mb-2 leading-tight">{isVictory ? 'نصر مؤزر!' : 'تحطم المكوك!'}</h2>
                  <p className="text-slate-400 mb-8">{isVictory ? `أحسنت يا بطل، لقد حصلت على ${score} نقطة` : 'لقد نفدت محاولاتك في هذه المتاهة'}</p>
                  <button onClick={() => setView('landing')} className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xl hover:bg-slate-200 transition-all">العودة للرئيسية</button>
               </div>
            </div>
          )}
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6">
           <div className="bg-slate-900 p-10 rounded-[40px] w-full max-w-md border border-white/5 text-center relative shadow-2xl">
              <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
              <h2 className="text-3xl font-black mb-6 text-indigo-400">{view === 'login' ? 'تسجيل دخول' : 'إنشاء حساب'}</h2>
              {authError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs leading-relaxed">{authError}</div>}
              <form onSubmit={(e) => handleAuth(e, view === 'login' ? 'login' : 'reg')} className="space-y-4">
                 {view === 'register' && <input type="text" placeholder="اسم المستخدم" className="w-full p-4 bg-slate-800 rounded-xl outline-none focus:ring-2 ring-indigo-500 text-center font-bold border border-white/5" value={username} onChange={e => setUsername(e.target.value)} required />}
                 <input type="email" placeholder="البريد الإلكتروني" className="w-full p-4 bg-slate-800 rounded-xl outline-none focus:ring-2 ring-indigo-500 text-center font-bold border border-white/5" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="كلمة المرور" className="w-full p-4 bg-slate-800 rounded-xl outline-none focus:ring-2 ring-indigo-500 text-center font-bold border border-white/5" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
                   {authLoading ? 'جاري التحقق...' : (view === 'login' ? 'دخول' : 'تسجيل')}
                 </button>
                 <button type="button" onClick={() => { setAuthError(''); setView(view === 'login' ? 'register' : 'login'); }} className="text-xs text-indigo-400 hover:underline block mx-auto mt-4">
                    {view === 'login' ? 'ليس لديك حساب؟ اشترك' : 'لديك حساب؟ سجل دخول'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-xl bg-slate-900 p-10 rounded-[40px] border border-white/10 text-center relative shadow-2xl">
            <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-slate-500">✕</button>
            <h2 className="text-3xl font-black mb-8 italic text-indigo-400">لوحة الشرف</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {leaderboard.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-800/50 rounded-2xl border border-white/5">
                   <span className="font-black text-2xl text-indigo-400">{e.score}</span>
                   <span className="font-bold text-lg">{e.name}</span>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="opacity-30 italic">لا يوجد نتائج بعد في هذه المجرة</p>}
            </div>
            <button onClick={() => setView('landing')} className="mt-8 w-full py-4 bg-white text-black rounded-2xl font-black text-xl hover:bg-slate-200 transition-all">العودة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
