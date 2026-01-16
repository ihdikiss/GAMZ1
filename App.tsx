
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameQuestions, setGameQuestions] = useState<QuestionData[]>([]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // دالة تحويل الأسئلة المخصصة (نص فقط) إلى كائنات أسئلة كاملة للعبة
  const formatCustomQuestions = (texts: string[]): QuestionData[] => {
    return texts.map(text => ({
      text,
      room1: 'الخيار أ',
      room2: 'الخيار ب',
      room3: 'الخيار ج',
      room4: 'الخيار د',
      correct_index: 0 // بشكل افتراضي، أول خيار هو الصحيح (يمكن تطوير هذا لاحقاً)
    }));
  };

  const loadQuestionsForGame = useCallback(async (profile?: any) => {
    // 1. إذا كان مستخدم VIP ولديه أسئلة مخصصة
    if (profile?.is_active && profile?.custom_questions?.length > 0) {
      setGameQuestions(formatCustomQuestions(profile.custom_questions));
      return;
    }

    // 2. المحاولة من جدول الأسئلة العام
    if (isConfigured()) {
      try {
        const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
        if (data && data.length > 0) {
          setGameQuestions(data as any[]);
          return;
        }
      } catch (e) {}
    }

    // 3. الرجوع للأسئلة الافتراضية الثابتة
    const fallbacks: QuestionData[] = FALLBACK_LEVELS.map(q => ({
      text: q.question,
      room1: q.rooms[0].label,
      room2: q.rooms[1].label,
      room3: q.rooms[2].label,
      room4: q.rooms[3].label,
      correct_index: q.rooms.findIndex(r => r.isCorrect)
    }));
    setGameQuestions(fallbacks);
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (!isConfigured()) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setUserProfile(data);
      loadQuestionsForGame(data);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      if (!isConfigured()) {
        loadQuestionsForGame();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        loadQuestionsForGame();
      }
    };
    initSession();
    
    if (isConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        if (session?.user) fetchUserProfile(session.user.id);
        else {
          setUserProfile(null);
          loadQuestionsForGame();
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [loadQuestionsForGame]);

  // منطق أحداث اللعبة
  useEffect(() => {
    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'LOSE_LIFE') {
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
      } else if (e.detail.type === 'NEXT_LEVEL') {
        setScore(prev => prev + 100);
        setLevelIndex(prev => {
          const next = prev + 1;
          // للطلاب العاديين (غير VIP) الحد الأقصى هو 3 أسئلة
          const maxAllowed = userProfile?.is_active ? gameQuestions.length : 3;
          if (next >= maxAllowed) {
            setGameOver(true);
            setIsVictory(true);
          }
          return next;
        });
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, [gameQuestions, userProfile]);

  const handleAuth = async (e: React.FormEvent, mode: 'login' | 'reg') => {
    e.preventDefault();
    if (!isConfigured()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      if (mode === 'reg') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert([{ id: data.user.id, email, username }]);
          setView('landing');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setView('landing');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadLeaderboard = useCallback(async () => {
    if (!isConfigured()) return;
    const { data } = await supabase.from('leaderboard').select('name, score').order('score', { ascending: false }).limit(10);
    if (data) setLeaderboard(data as LeaderboardEntry[]);
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden font-sans rtl">
      {view === 'admin' && <AdminPanel onExit={() => setView('landing')} />}

      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#1e1b4b_0%,_transparent_50%)] opacity-30 pointer-events-none" />
          <h1 className="text-7xl md:text-9xl font-black mb-12 italic text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-700 select-none animate-pulse">SPACE MAZE</h1>
          
          <div className="flex flex-col gap-4 w-full max-w-md z-10">
            <button onClick={() => { setLives(3); setLevelIndex(0); setScore(0); setGameOver(false); setView('game'); }} className="group relative py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:bg-slate-100 transition-all active:scale-95 overflow-hidden">
              <span className="relative z-10">مهمة تجريبية 🚀</span>
              <div className="absolute inset-0 bg-indigo-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>

            <div className="relative">
              <button 
                onClick={() => {
                   if (!user) setView('register');
                   else if (userProfile?.is_active) { setLives(3); setLevelIndex(0); setScore(0); setGameOver(false); setView('game'); }
                   else window.open(WHATSAPP_LINK, '_blank');
                }} 
                className={`w-full py-5 rounded-[2.5rem] font-black text-xl transition-all flex items-center justify-center gap-3 ${userProfile?.is_active ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-indigo-700 hover:bg-indigo-600'}`}
              >
                {userProfile?.is_active ? 'ابدأ مغامرة VIP ✨' : 'تفعيل مغامرة VIP ✨'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all">الترتيب العالمي</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); setUserProfile(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase">دخول</button>
              )}
            </div>
            <button onClick={() => setView('admin')} className="text-xs opacity-20 hover:opacity-100 transition-opacity mt-4">لوحة تحكم المعلم 🛡️</button>
          </div>

          {userProfile && (
            <div className="mt-8 flex items-center gap-3 bg-slate-900/50 p-4 rounded-3xl border border-white/5 animate-in fade-in zoom-in">
              <div className={`w-3 h-3 rounded-full ${userProfile.is_active ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500'}`} />
              <p className="text-sm font-bold italic">
                {userProfile.is_active ? `أهلاً بك يا بطل: ${userProfile.username}` : `بانتظار التفعيل: ${userProfile.username}`}
              </p>
            </div>
          )}
        </div>
      )}

      {view === 'game' && gameQuestions[levelIndex] && (
        <div className="w-full h-full relative">
          <div className="absolute top-6 left-0 right-0 z-40 px-6 flex justify-between items-center pointer-events-none">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl transition-all duration-500 ${i < lives ? 'grayscale-0 scale-100' : 'grayscale opacity-20 scale-75'}`}>❤️</span>
              ))}
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl text-center min-w-[300px] pointer-events-auto shadow-2xl">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">المهمة {levelIndex + 1} / {userProfile?.is_active ? gameQuestions.length : 3}</p>
              <h3 className="text-lg md:text-xl font-bold leading-tight">{gameQuestions[levelIndex].text}</h3>
            </div>

            <div className="text-right">
              <p className="text-xs font-black text-indigo-500 uppercase tracking-tighter">النقاط</p>
              <p className="text-3xl font-black italic">{score}</p>
            </div>
          </div>

          <GameComponent questionData={gameQuestions[levelIndex]} levelIndex={levelIndex} />

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-6">
               <div className="text-center p-12 bg-slate-900 rounded-[3rem] border border-white/10 max-w-sm w-full shadow-2xl">
                  <div className="text-6xl mb-6">{isVictory ? '👑' : '💥'}</div>
                  <h2 className="text-4xl font-black mb-2">{isVictory ? 'أتممت المهمة!' : 'تحطم المكوك!'}</h2>
                  {!userProfile?.is_active && isVictory && <p className="text-amber-400 text-xs font-bold mb-4">اشترك في النسخة الكاملة لفتح جميع الأسئلة!</p>}
                  <button onClick={() => { setView('landing'); setGameOver(false); }} className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xl hover:bg-slate-200 transition-all">العودة للرئيسية</button>
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
