
import React, { useState, useEffect } from 'react';
import GameComponent from './components/GameComponent';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase } from './supabase';

interface LeaderboardEntry { name: string; score: number; time: number; }
interface QuestionData {
  id?: string; text: string; level_num: number; 
  room1: string; room2: string; room3: string; room4: string; 
  correct_index: number;
}

type AppView = 'landing' | 'login' | 'register' | 'game' | 'leaderboard' | 'admin';

const WHATSAPP_LINK = "https://wa.me/212600000000?text=أريد%20البدء%20في%20مغامرة%20الدرس%20VIP";
const ADMIN_MASTER_KEY = "123456"; // الكود السري للدخول للوحة التحكم

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<any>(null);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isVipFlow, setIsVipFlow] = useState(false);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  
  // Auth/Admin states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSecretAdmin, setIsSecretAdmin] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState('');
  
  const [newQ, setNewQ] = useState<QuestionData>({ 
    text: '', level_num: 1, room1: '', room2: '', room3: '', room4: '', correct_index: 0 
  });

  // التحقق من الرابط عند التحميل
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'portal') {
      setView('admin');
    }

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
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setDbQuestions(data);
      } else {
        setDbQuestions(FALLBACK_LEVELS.map(q => ({
          text: q.question,
          room1: q.rooms[0].label, room2: q.rooms[1].label, room3: q.rooms[2].label, room4: q.rooms[3].label,
          correct_index: q.rooms.findIndex(r => r.isCorrect)
        })));
      }
    } catch (e) { console.error(e); }
  };

  const syncDefaultQuestions = async () => {
    const toInsert = FALLBACK_LEVELS.map(q => ({
      text: q.question,
      room1: q.rooms[0].label, room2: q.rooms[1].label, room3: q.rooms[2].label, room4: q.rooms[3].label,
      correct_index: q.rooms.findIndex(r => r.isCorrect),
      level_num: 1
    }));
    const { error } = await supabase.from('questions').insert(toInsert);
    if (!error) {
      alert('تم رفع الأسئلة الافتراضية لقاعدة البيانات بنجاح! 🎉');
      fetchQuestions();
    } else {
      alert('خطأ في المزامنة: ' + error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent, mode: 'login' | 'reg') => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      let result;
      if (mode === 'reg') {
        result = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      setUser(result.data.user);
      if (isVipFlow) window.open(WHATSAPP_LINK, '_blank');
      setView('landing');
    } catch (err: any) { setAuthError(err.message); } finally { setAuthLoading(false); }
  };

  const addQuestion = async () => {
    if (!newQ.text) return alert('يرجى كتابة نص السؤال');
    const { error } = await supabase.from('questions').insert([newQ]);
    if (!error) {
      alert('تم حفظ السؤال الجديد بنجاح');
      fetchQuestions();
      setNewQ({ text: '', level_num: 1, room1: '', room2: '', room3: '', room4: '', correct_index: 0 });
    }
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase.from('leaderboard').select('name, score, time').order('score', { ascending: false }).limit(10);
    if (data) setLeaderboard(data);
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
        if (nextIdx > 0 && nextIdx % 3 === 0) {
          setLives(l => Math.min(l + 1, 5));
          alert('💖 مكافأة: حصلت على قلب إضافي!');
        }
        if (nextIdx >= dbQuestions.length) {
          setIsVictory(true);
          setGameOver(true);
        } else {
          setLevelIndex(nextIdx);
        }
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, [levelIndex, dbQuestions]);

  const currentQuestion = dbQuestions[levelIndex];

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden font-sans rtl">
      
      {/* لوحة التحكم */}
      {view === 'admin' && (
        <div className="flex flex-col items-center justify-start h-full p-4 md:p-10 bg-slate-900 overflow-y-auto">
          {!isSecretAdmin ? (
            <div className="bg-slate-800 p-10 rounded-[40px] w-full max-w-md shadow-2xl text-center my-auto">
              <h2 className="text-3xl font-black mb-6 italic">ADMIN PORTAL</h2>
              <p className="text-slate-400 mb-8 text-sm italic">أدخل كود الماستر للوصول لبنك الأسئلة</p>
              <input 
                type="password" 
                placeholder="Master Key" 
                className="w-full p-5 mb-6 bg-slate-900 border border-white/10 rounded-2xl text-center font-bold tracking-[1em]" 
                onChange={e => setAdminInputKey(e.target.value)} 
              />
              <button 
                onClick={() => { if(adminInputKey === ADMIN_MASTER_KEY) setIsSecretAdmin(true); else alert('الكود غير صحيح'); }}
                className="w-full py-5 bg-indigo-600 rounded-2xl font-black hover:bg-indigo-500 transition-all"
              >
                فتح البوابة
              </button>
              <button onClick={() => setView('landing')} className="mt-6 text-slate-500 text-xs uppercase underline block mx-auto">العودة للرئيسية</button>
            </div>
          ) : (
            <div className="bg-slate-800 p-6 md:p-12 rounded-[40px] md:rounded-[60px] w-full max-w-4xl shadow-2xl my-4 md:my-10 relative">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <h2 className="text-3xl font-black italic text-center md:text-right">DATABASE MANAGER</h2>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={syncDefaultQuestions} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-amber-500/20 transition-all">مزامنة الأسئلة ⚡</button>
                  <button onClick={() => setView('landing')} className="bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-red-500/30 transition-all">خروج</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* قسم الإضافة */}
                <div className="bg-slate-900/60 p-6 md:p-8 rounded-[35px] border border-white/5 shadow-inner">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-[0.2em]">إضافة سؤال جديد إلى المجرة</label>
                  <div className="space-y-5">
                    <input type="text" placeholder="ما هو نص السؤال؟" className="w-full p-5 bg-slate-800 rounded-2xl border border-white/5 focus:border-indigo-500 transition-colors" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="الخيار 1 (غرفة 1)" className="p-4 bg-slate-800 rounded-xl border border-white/5" value={newQ.room1} onChange={e => setNewQ({...newQ, room1: e.target.value})} />
                      <input type="text" placeholder="الخيار 2 (غرفة 2)" className="p-4 bg-slate-800 rounded-xl border border-white/5" value={newQ.room2} onChange={e => setNewQ({...newQ, room2: e.target.value})} />
                      <input type="text" placeholder="الخيار 3 (غرفة 3)" className="p-4 bg-slate-800 rounded-xl border border-white/5" value={newQ.room3} onChange={e => setNewQ({...newQ, room3: e.target.value})} />
                      <input type="text" placeholder="الخيار 4 (غرفة 4)" className="p-4 bg-slate-800 rounded-xl border border-white/5" value={newQ.room4} onChange={e => setNewQ({...newQ, room4: e.target.value})} />
                    </div>
                    <div className="bg-indigo-600/5 p-5 rounded-2xl border border-indigo-500/10">
                      <label className="text-[10px] font-black text-indigo-400 uppercase block mb-3">حدد الغرفة الصحيحة (0، 1، 2، 3)</label>
                      <input type="number" min="0" max="3" className="w-full p-4 bg-slate-800 rounded-2xl border border-white/5" value={newQ.correct_index} onChange={e => setNewQ({...newQ, correct_index: parseInt(e.target.value)})} />
                    </div>
                    <button onClick={addQuestion} className="w-full py-6 bg-indigo-600 rounded-[2.5rem] font-black text-xl hover:bg-indigo-500 transition-all shadow-xl hover:scale-[1.01] active:scale-95">تأكيد الإضافة للسجلات 💾</button>
                  </div>
                </div>

                {/* قسم القائمة */}
                <div className="bg-slate-900/40 p-6 md:p-8 rounded-[35px] border border-white/5">
                  <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                    الأسئلة الحالية
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20 font-black">{dbQuestions.length} سؤال</span>
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {dbQuestions.length > 0 ? dbQuestions.map((q, i) => (
                      <div key={i} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group hover:bg-slate-800 transition-colors">
                        <div className="flex gap-4 items-center">
                          <span className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 text-indigo-500 rounded-full font-mono font-black text-xs">#{i+1}</span>
                          <span className="text-sm font-bold text-slate-200">{q.text}</span>
                        </div>
                        <div className="flex gap-2 self-end">
                           <span className="text-[9px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black uppercase">Active</span>
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center text-slate-600 italic">لا توجد أسئلة في السجلات بعد..</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-10 border-t border-white/5 text-center">
                <button onClick={() => setView('landing')} className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">خروج من نظام التحكم</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* الواجهة الرئيسية */}
      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
          <div className="mb-4 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Deep Space Adventure</div>
          <h1 className="text-8xl md:text-[10rem] font-black mb-12 italic tracking-tighter leading-none select-none drop-shadow-[0_0_50px_rgba(79,70,229,0.3)]">SPACE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-indigo-800">MAZE</span></h1>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => { setIsVipFlow(false); setView(user ? 'game' : 'register'); }} className="py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all shadow-2xl active:scale-95">مهمة عادية 🚀</button>
            <button onClick={() => { setIsVipFlow(true); if(user) window.open(WHATSAPP_LINK, '_blank'); else setView('register'); }} className="py-5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-[2.5rem] font-black text-xl hover:scale-105 transition-all shadow-xl border border-purple-400/30">مغامرة VIP ✨</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase hover:bg-indigo-500/20 transition-all">دخول</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* اللعبة */}
      {view === 'game' && currentQuestion && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[3rem] text-center shadow-2xl">
              <span className="text-[10px] font-black text-indigo-400 uppercase block mb-1">Mission {levelIndex + 1} / {dbQuestions.length}</span>
              <h3 className="text-xl md:text-2xl font-bold">{currentQuestion.text}</h3>
            </div>
          </div>
          <GameComponent questionData={currentQuestion} levelIndex={levelIndex} />
          <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-40">
             <div className="bg-slate-900/90 px-7 py-4 rounded-3xl border border-white/10 flex items-center gap-3">
                 <span className="text-2xl">❤️</span>
                 <span className="text-3xl font-black font-mono">{lives}</span>
             </div>
             <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-2xl text-3xl font-black font-mono">
                 {score}
             </div>
          </div>
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center z-50">
               <div className="text-center p-14 bg-slate-900 rounded-[70px] border border-white/10 max-w-md w-full">
                  <h2 className="text-5xl font-black mb-8 italic">{isVictory ? 'COMPLETED! 🏆' : 'MISSION FAILED 🛑'}</h2>
                  <p className="text-slate-400 mb-10">النقاط التي جمعتها: {score}</p>
                  <button onClick={() => window.location.reload()} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all">العودة للرئيسية</button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* شاشات التسجيل */}
      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6">
           <div className="bg-slate-900/90 backdrop-blur-3xl p-12 rounded-[50px] w-full max-w-md border border-white/5 text-center relative">
              <button onClick={() => setView('landing')} className="absolute top-8 right-8 text-slate-500 font-bold hover:text-white transition-colors">✕</button>
              <h2 className="text-4xl font-black mb-2 italic">{view === 'login' ? 'WELCOME BACK' : 'JOIN THE MISSION'}</h2>
              <p className="text-slate-500 mb-10 text-sm">{view === 'login' ? 'أدخل بيانات الدخول للاستمرار' : 'سجل لتتمكن من المنافسة على لوحة الشرف'}</p>
              {authError && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold">{authError}</div>}
              <form onSubmit={(e) => handleAuth(e, view === 'login' ? 'login' : 'reg')} className="space-y-4">
                 {view === 'register' && <input type="text" placeholder="Username" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={username} onChange={e => setUsername(e.target.value)} required />}
                 <input type="email" placeholder="Email Address" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="Password" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-6">
                   {authLoading ? 'Verifying...' : (view === 'login' ? 'LOGIN 🚀' : 'REGISTER 🛡️')}
                 </button>
                 <div className="pt-6 mt-6 border-t border-white/5">
                    <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-indigo-400 text-xs font-bold hover:underline">
                      {view === 'login' ? 'ليس لديك حساب؟ اشترك الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* لوحة الشرف */}
      {view === 'leaderboard' && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl p-12 rounded-[70px] border border-indigo-500/20 shadow-2xl text-center relative">
            <button onClick={() => setView('landing')} className="absolute top-10 right-10 text-slate-500 font-bold hover:text-white">✕</button>
            <h2 className="text-4xl font-black italic mb-12 text-indigo-400">LEADERBOARD 🛰️</h2>
            <div className="space-y-3 mb-10 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {leaderboard.length > 0 ? leaderboard.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-slate-800/30 border border-white/5 rounded-[2.5rem]">
                   <span className="text-3xl font-black font-mono text-indigo-400">{e.score}</span>
                   <div className="text-right">
                     <span className="font-black text-xl block">{e.name}</span>
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">RANK #{i+1}</span>
                   </div>
                </div>
              )) : <div className="p-10 text-slate-600 italic">السجلات خالية حالياً</div>}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-slate-100 transition-all">العودة</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
