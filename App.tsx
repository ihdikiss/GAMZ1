
import React, { useState, useEffect, useCallback } from 'react';
import GameComponent from './components/GameComponent';
import AdminPanel from './components/AdminPanel';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase, isConfigured } from './supabase';

interface LeaderboardEntry { name: string; score: number; }
interface QuestionData {
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

  /**
   * تحويل وتصفية الأسئلة المخصصة
   */
  const formatCustomQuestions = (questions: any[]): QuestionData[] => {
    if (!Array.isArray(questions)) return [];
    
    return questions
      .filter(q => {
        const hasText = q.question && q.question.trim().length > 0;
        const hasOptions = Array.isArray(q.options) && q.options.length === 4 && q.options.every((opt: string) => opt && opt.trim().length > 0);
        const hasCorrect = q.correct_answer && q.correct_answer.trim().length > 0;
        return hasText && hasOptions && hasCorrect;
      })
      .map(q => {
        const opts = q.options;
        const correctIdx = opts.indexOf(q.correct_answer);
        return {
          text: q.question,
          room1: opts[0],
          room2: opts[1],
          room3: opts[2],
          room4: opts[3],
          correct_index: correctIdx !== -1 ? correctIdx : 0
        };
      });
  };

  const loadQuestionsForGame = useCallback(async (profile?: any) => {
    // 1. الأولوية المطلقة: بمجرد وجود أي سؤال مخصص صالح، نعتمد عليه فقط
    if (profile?.custom_questions) {
      const formatted = formatCustomQuestions(profile.custom_questions);
      if (formatted.length > 0) {
        setGameQuestions(formatted);
        console.log(`[Priority] Custom questions loaded: ${formatted.length}`);
        return; 
      }
    }

    // 2. الرجوع للأسئلة العامة من قاعدة البيانات
    if (isConfigured()) {
      try {
        const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
        if (data && data.length > 0) {
          setGameQuestions(data as any[]);
          return;
        }
      } catch (e) {}
    }

    // 3. الأسئلة الافتراضية
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
      if (!isConfigured()) { loadQuestionsForGame(); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        loadQuestionsForGame();
      }
    };
    initSession();
  }, [loadQuestionsForGame]);

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
          if (next >= gameQuestions.length) {
            setGameOver(true);
            setIsVictory(true);
            return prev;
          }
          return next;
        });
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, [gameQuestions]);

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
          await supabase.from('profiles').upsert([{ id: data.user.id, email, username, is_active: false, custom_questions: [] }]);
          setView('landing');
          alert("تم التسجيل بنجاح!");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload(); 
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // التحقق مما إذا كان المستخدم يملك أسئلة مخصصة جاهزة للعب
  const hasValidCustomQuestions = gameQuestions.length > 0 && 
    userProfile?.custom_questions && 
    formatCustomQuestions(userProfile.custom_questions).length > 0;

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
            </button>

            <button 
              onClick={() => {
                 if (!user) setView('register');
                 else if (hasValidCustomQuestions) { setLives(3); setLevelIndex(0); setScore(0); setGameOver(false); setView('game'); }
                 else window.open(WHATSAPP_LINK, '_blank');
              }} 
              className={`w-full py-5 rounded-[2.5rem] font-black text-xl transition-all flex items-center justify-center gap-3 ${hasValidCustomQuestions ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-indigo-700 hover:bg-indigo-600'}`}
            >
              {hasValidCustomQuestions ? 'ابدأ مهمتك الخاصة ✨' : 'تفعيل مغامرة VIP ✨'}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px]">الترتيب العالمي</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut().then(() => window.location.reload()); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px]">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px]">دخول</button>
              )}
            </div>
            <button onClick={() => setView('admin')} className="text-xs opacity-20 hover:opacity-100 transition-opacity mt-4">لوحة تحكم المعلم 🛡️</button>
          </div>
        </div>
      )}

      {view === 'game' && gameQuestions[levelIndex] && (
        <div className="w-full h-full relative">
          <div className="absolute top-6 left-0 right-0 z-40 px-6 flex justify-between items-center pointer-events-none">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl transition-all ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl text-center min-w-[300px] pointer-events-auto">
              <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">المهمة {levelIndex + 1} / {gameQuestions.length}</p>
              <h3 className="text-lg font-bold">{gameQuestions[levelIndex].text}</h3>
            </div>

            <div className="text-right">
              <p className="text-xs font-black text-indigo-500">النقاط</p>
              <p className="text-3xl font-black italic">{score}</p>
            </div>
          </div>

          <GameComponent questionData={gameQuestions[levelIndex]} levelIndex={levelIndex} />

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-6">
               <div className="text-center p-12 bg-slate-900 rounded-[3rem] border border-white/10 max-w-sm w-full animate-in zoom-in duration-300">
                  <div className="text-6xl mb-6">{isVictory ? '👑' : '💥'}</div>
                  <h2 className="text-4xl font-black mb-6">{isVictory ? 'أتممت المهمة!' : 'تحطم المكوك!'}</h2>
                  <p className="text-slate-400 mb-8 font-bold">لقد أنهيت التحدي. نقاطك: {score}</p>
                  <button onClick={() => { setView('landing'); setGameOver(false); }} className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xl hover:bg-slate-200 transition-all">العودة للرئيسية</button>
               </div>
            </div>
          )}
        </div>
      )}
      
      {/* باقي الواجهات تظل كما هي */}
      {view === 'login' && (
        <div className="flex items-center justify-center h-full p-6 animate-in fade-in duration-500">
           <div className="bg-slate-900 p-10 rounded-[40px] w-full max-w-md border border-white/5 text-center relative shadow-2xl">
              <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
              <h2 className="text-3xl font-black mb-6 text-indigo-400 italic">تسجيل دخول</h2>
              <form onSubmit={(e) => handleAuth(e, 'login')} className="space-y-4">
                 <input type="email" placeholder="البريد الإلكتروني" className="w-full p-5 bg-slate-800 rounded-2xl outline-none text-center font-bold border border-white/5" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="كلمة المرور" className="w-full p-5 bg-slate-800 rounded-2xl outline-none text-center font-bold border border-white/5" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all">
                   {authLoading ? 'جاري التحقق...' : 'دخول'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {view === 'register' && (
        <div className="flex items-center justify-center h-full p-6 animate-in fade-in duration-500">
           <div className="bg-slate-900 p-10 rounded-[40px] w-full max-w-md border border-white/5 text-center relative shadow-2xl">
              <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
              <h2 className="text-3xl font-black mb-6 text-indigo-400 italic">إنشاء حساب جديد</h2>
              <form onSubmit={(e) => handleAuth(e, 'reg')} className="space-y-4">
                 <input type="text" placeholder="اسم المستخدم" className="w-full p-5 bg-slate-800 rounded-2xl outline-none text-center font-bold border border-white/5" value={username} onChange={e => setUsername(e.target.value)} required />
                 <input type="email" placeholder="البريد الإلكتروني" className="w-full p-5 bg-slate-800 rounded-2xl outline-none text-center font-bold border border-white/5" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="كلمة المرور" className="w-full p-5 bg-slate-800 rounded-2xl outline-none text-center font-bold border border-white/5" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all">
                   {authLoading ? 'جاري المعالجة...' : 'اشترك الآن'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
