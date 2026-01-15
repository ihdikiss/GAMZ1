
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
      console.warn("Using fallback questions - check connection settings");
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
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUsername(session.user.user_metadata.username || session.user.email?.split('@')[0]);
        }
      } catch (e) {
        console.error("Auth init failed", e);
      }
      
      const params = new URLSearchParams(window.location.search);
      if (params.get('access') === 'portal') {
        setView('admin');
      }
    };
    
    initSession();
    loadLeaderboard();
    fetchQuestions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [fetchQuestions, loadLeaderboard]);

  const handleAuth = async (e: React.FormEvent, mode: 'login' | 'reg') => {
    e.preventDefault();
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
      console.error("Auth error:", err);
      if (err.message.includes("Invalid login credentials") || err.message.includes("Failed to fetch")) {
        setAuthError("خطأ في البيانات أو في الاتصال بقاعدة البيانات. تأكد من تفعيل VPN أو إعدادات السيرفر.");
      } else {
        setAuthError(err.message || "حدث خطأ غير متوقع.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const currentQuestion = dbQuestions[levelIndex];

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden font-sans rtl">
      {view === 'admin' && <AdminPanel onExit={() => {
        window.history.replaceState({}, '', window.location.pathname);
        setView('landing');
      }} />}

      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <h1 className="text-8xl md:text-[10rem] font-black mb-12 italic text-indigo-500 select-none">SPACE MAZE</h1>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => setView(user ? 'game' : 'register')} className="py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:bg-slate-100 active:scale-95 transition-all">مهمة عادية 🚀</button>
            <button onClick={() => { if(user) window.open(WHATSAPP_LINK, '_blank'); else setView('register'); }} className="py-5 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl hover:bg-indigo-600 transition-all">مغامرة VIP ✨</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase hover:bg-slate-800">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase hover:bg-red-900/20">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase hover:bg-indigo-600/20">دخول</button>
              )}
            </div>
          </div>
          {user && <p className="mt-8 text-indigo-400 font-bold">مرحباً مجدداً، {user.user_metadata?.username || user.email}</p>}
        </div>
      )}

      {view === 'game' && currentQuestion && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 text-center">
             <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
                <h3 className="text-xl md:text-2xl font-bold">{currentQuestion.text}</h3>
             </div>
          </div>
          <GameComponent questionData={currentQuestion} levelIndex={levelIndex} />
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50">
               <div className="text-center p-12 bg-slate-900 rounded-[3rem] border border-white/10">
                  <h2 className="text-4xl font-black mb-6">{isVictory ? 'تمت المهمة بنجاح! 🏆' : 'انتهت المحاولات 🛑'}</h2>
                  <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-black rounded-full font-bold">العودة للرئيسية</button>
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
