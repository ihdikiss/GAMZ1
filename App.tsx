
import React, { useState, useEffect, useRef } from 'react';
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

const WHATSAPP_LINK = "https://wa.me/212600000000?text=أريد%20البدء%20في%20مغامرة%20الدرس%20VIP";

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
  const [isVipFlow, setIsVipFlow] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
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
  }, []);

  // Timer Logic
  useEffect(() => {
    if (view === 'game' && !gameOver) {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, gameOver]);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('name, score, time, created_at')
        .order('score', { ascending: false })
        .order('time', { ascending: true })
        .limit(10);
      if (!error && data) setLeaderboard(data);
    } catch (e) { console.error("Leaderboard error:", e); }
  };

  const handleStartMission = () => {
    setIsVipFlow(false);
    if (user) {
      setScore(0);
      setTimeElapsed(0);
      setLevelIndex(0);
      setLives(3);
      setGameOver(false);
      setView('game');
    } else {
      setRegSuccess(false);
      setView('register');
    }
  };

  const handleVipAdventure = () => {
    setIsVipFlow(true);
    if (user) {
      window.open(WHATSAPP_LINK, '_blank');
    } else {
      setRegSuccess(false);
      setView('register');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { username } }
      });
      if (error) setAuthError(error.message);
      else if (data.user) {
        if (data.session) { 
          setUser(data.user); 
          setRegSuccess(true);
          if (isVipFlow) window.open(WHATSAPP_LINK, '_blank');
        }
        else setAuthError('يرجى تفعيل حسابك من البريد الإلكتروني للمتابعة.');
      }
    } catch (err) { setAuthError('فشل الاتصال بالخادم.'); }
    finally { setAuthLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      else if (data.user) {
        setUser(data.user);
        setUsername(data.user.user_metadata.username || data.user.email?.split('@')[0]);
        if (isVipFlow) {
          window.open(WHATSAPP_LINK, '_blank');
          setView('landing');
        } else {
          setView('landing');
        }
      }
    } catch (err) { setAuthError('بيانات الدخول غير صحيحة.'); }
    finally { setAuthLoading(false); }
  };

  const saveResult = async () => {
    const finalName = username || "قائد مجهول";
    try {
      await supabase.from('leaderboard').insert([{ name: finalName, score, time: timeElapsed }]);
      await loadLeaderboard();
    } catch (e) { console.error("Could not save score:", e); }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
          <div className="mb-8 px-5 py-2 rounded-full text-[10px] font-black border border-indigo-500/30 text-indigo-400 uppercase tracking-[0.2em]">
            {user ? `هوية القائد: ${username} • متصل` : 'نظام التعريف الفضائي: مطلوب تسجيل الدخول'}
          </div>
          
          <h1 className="text-7xl md:text-[8.5rem] font-black mb-10 tracking-tighter leading-none italic select-none drop-shadow-[0_0_35px_rgba(99,102,241,0.3)]">
            SPACE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-700">MAZE</span>
          </h1>

          <div className="flex flex-col gap-4 w-full max-w-md">
            <button 
              onClick={handleStartMission} 
              className="group relative overflow-hidden py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.15)] active:scale-95"
            >
              <span className="relative z-10">{user ? 'ابدأ المهمة 🚀' : 'سجل هويتك وابدأ 🛡️'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>

            {/* زر VIP الجديد */}
            <button 
              onClick={handleVipAdventure} 
              className="group relative overflow-hidden py-5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-[2.5rem] font-black text-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)] border border-purple-400/30 active:scale-95"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">✨</span>
                مغامرة الدرس VIP
                <span className="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">PRO</span>
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl font-black hover:bg-slate-800 transition-all uppercase text-xs tracking-widest">لوحة الشرف</button>
              {user ? (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); window.location.reload(); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-xs uppercase">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black hover:bg-indigo-600/30 transition-all text-xs tracking-widest uppercase">دخول</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6 bg-slate-950 relative">
          <div className="bg-slate-900/90 backdrop-blur-3xl p-10 md:p-14 rounded-[50px] w-full max-w-md border border-white/5 shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
             
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

             {regSuccess ? (
               <div className="py-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]">✓</div>
                  <h2 className="text-3xl font-black mb-4 tracking-tighter">Identity Verified</h2>
                  <p className="text-slate-400 mb-10 text-sm leading-relaxed">
                    أهلاً بك أيها القائد <span className="text-white font-bold">{username}</span>. 
                    {isVipFlow ? ' جاري تحويلك لمغامرة الـ VIP...' : ' تم تسجيل بياناتك بنجاح.'}
                  </p>
                  <button onClick={() => setView('landing')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition-all">العودة للقاعدة</button>
               </div>
             ) : (
               <>
                 <h2 className="text-4xl font-black mb-2 tracking-tighter">
                   {isVipFlow ? 'تعريف VIP' : (view === 'login' ? 'الدخول للقاعدة' : 'تجنيد قائد')}
                 </h2>
                 <p className="text-slate-500 mb-10 font-medium text-sm">
                   {isVipFlow ? 'سجل هويتك للوصول لخدمات الـ VIP والمتابعة عبر واتساب' : (view === 'register' ? 'أكمل بياناتك لبدء مغامرة المتاهة' : 'أدخل شيفرة الدخول السرية للمتابعة')}
                 </p>
                 
                 {authError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold">{authError}</div>}
                 
                 <form onSubmit={view === 'login' ? handleLogin : handleSignUp} className="space-y-4 text-right">
                    {view === 'register' && (
                      <div className="group text-right">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 transition-colors group-focus-within:text-indigo-400">اسم المستخدم</label>
                        <input 
                          type="text" placeholder="Astro_Warrior" 
                          className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                          value={username} onChange={e => setUsername(e.target.value)} required 
                        />
                      </div>
                    )}
                    <div className="group text-right">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 transition-colors group-focus-within:text-indigo-400">البريد الإلكتروني</label>
                      <input 
                        type="email" placeholder="astronaut@base.com" 
                        className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                        value={email} onChange={e => setEmail(e.target.value)} required 
                      />
                    </div>
                    <div className="group text-right">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mr-4 transition-colors group-focus-within:text-indigo-400">كلمة السر</label>
                      <input 
                        type="password" placeholder="••••••••" 
                        className="w-full p-5 bg-slate-800/40 rounded-2xl border border-slate-700 outline-none focus:border-indigo-500 text-center font-bold" 
                        value={password} onChange={e => setPassword(e.target.value)} required 
                      />
                    </div>
                    
                    <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-8 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50">
                      {authLoading ? 'جاري الاتصال بالسحابة...' : (view === 'login' ? 'تأكيد الهوية 🚀' : 'إنشاء الحساب 🛡️')}
                    </button>
                    
                    <div className="pt-8 border-t border-white/5 mt-8 flex flex-col gap-3">
                      <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-indigo-400 text-xs font-bold hover:underline">
                        {view === 'login' ? 'ليس لديك حساب؟ انضم إلينا الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
                      </button>
                      <button type="button" onClick={() => setView('landing')} className="text-slate-600 text-[10px] uppercase tracking-widest hover:text-slate-400">إلغاء</button>
                    </div>
                 </form>
               </>
             )}
          </div>
        </div>
      )}

      {view === 'game' && user && (
        <div className="w-full h-full relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-900 z-50">
            <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${((levelIndex + 1) / GAME_LEVELS.length) * 100}%` }}></div>
          </div>
          
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 pointer-events-none">
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-6 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2 animate-pulse">المهمة {levelIndex + 1} / {GAME_LEVELS.length}</span>
              <h3 className="text-xl md:text-3xl font-bold text-white italic drop-shadow-lg">{GAME_LEVELS[levelIndex]?.question}</h3>
            </div>
          </div>

          <GameComponent />

          <div className="absolute bottom-10 left-10 right-10 z-40 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="bg-slate-900/80 backdrop-blur-lg px-7 py-4 rounded-[2rem] border border-white/10 flex items-center gap-3 shadow-xl">
                 <span className="text-2xl">❤️</span>
                 <span className="text-3xl font-black font-mono">{lives}</span>
              </div>
              <div className="bg-indigo-600 px-8 py-4 rounded-[2.5rem] shadow-2xl border border-indigo-400/30">
                 <span className="text-[10px] font-black block leading-none opacity-80 uppercase tracking-widest mb-1">النقاط</span>
                 <span className="text-3xl font-black font-mono">{score}</span>
              </div>
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-lg px-8 py-4 rounded-[2rem] border border-white/10 shadow-xl">
               <span className="text-[10px] font-black block leading-none opacity-60 uppercase tracking-widest mb-1">الوقت المنقضي</span>
               <span className="text-3xl font-black font-mono text-indigo-400">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-500">
              <div className="bg-slate-900 p-12 rounded-[70px] border border-white/10 text-center max-w-lg w-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <h2 className="text-6xl font-black mb-6 italic tracking-tighter">{isVictory ? 'تمت المهمة بنجاح!' : 'فشل المهمة'}</h2>
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-slate-800/40 p-8 rounded-[40px]">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-2">إجمالي النقاط</span>
                    <p className="text-4xl font-black text-indigo-400 font-mono">{score}</p>
                  </div>
                  <div className="bg-slate-800/40 p-8 rounded-[40px]">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-2">الزمن المستغرق</span>
                    <p className="text-4xl font-black text-indigo-400 font-mono">{formatTime(timeElapsed)}</p>
                  </div>
                </div>
                <button onClick={saveResult} className="w-full py-6 bg-green-600 rounded-[2.5rem] font-black text-2xl mb-4 hover:bg-green-500 transition-all shadow-lg active:scale-95">حفظ النتيجة في السجلات ✅</button>
                <button onClick={() => window.location.reload()} className="text-slate-500 font-bold hover:text-white transition-colors">العودة لقائمة العمليات</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950">
          <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-3xl p-12 rounded-[70px] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
            <h2 className="text-4xl font-black italic mb-12 text-center text-indigo-400 uppercase tracking-tighter">أساطير الفضاء</h2>
            <div className="space-y-3 mb-12 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-right">
              {leaderboard.length > 0 ? leaderboard.map((e, i) => (
                <div key={i} className={`flex justify-between items-center p-6 rounded-[2.5rem] transition-all hover:translate-x-1 ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/40' : i === 1 ? 'bg-slate-400/10 border border-slate-400/30' : i === 2 ? 'bg-orange-700/10 border border-orange-700/30' : 'bg-slate-800/30 border border-white/5'}`}>
                   <div className="flex items-center gap-5 flex-row-reverse">
                     <span className={`text-sm font-black w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-slate-700 text-white'}`}>{i + 1}</span>
                     <div className="text-right">
                       <span className="font-black text-xl tracking-tight block">{e.name}</span>
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">الزمن: {formatTime(e.time)}</span>
                     </div>
                   </div>
                   <span className={`text-3xl font-black font-mono ${i === 0 ? 'text-yellow-500' : 'text-indigo-400'}`}>{e.score}</span>
                </div>
              )) : (
                <div className="text-center py-20 text-slate-600 italic">سجلات الأرشيف خالية حالياً... كن أول من يسجل اسمه!</div>
              )}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-slate-100 transition-all active:scale-95">العودة للقاعدة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
