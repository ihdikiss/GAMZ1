
import React, { useState, useEffect } from 'react';
import GameComponent from './components/GameComponent';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase } from './supabase';

interface LeaderboardEntry { name: string; score: number; time: number; }
interface QuestionData {
  id?: string;
  text: string;
  room1: string; room2: string; room3: string; room4: string; 
  correct_index: number;
}

type AppView = 'landing' | 'login' | 'register' | 'game' | 'leaderboard' | 'admin';

const WHATSAPP_LINK = "https://wa.me/212600000000?text=أريد%20البدء%20في%20مغامرة%20الدرس%20VIP";
const ADMIN_MASTER_KEY = "123456";

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
  
  // Admin States
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminQuestions, setAdminQuestions] = useState<QuestionData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSecretAdmin, setIsSecretAdmin] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'portal') setView('admin');

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
      const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setDbQuestions(data);
        setAdminQuestions(data);
      } else {
        const fallbacks = FALLBACK_LEVELS.map(q => ({
          text: q.question,
          room1: q.rooms[0].label, room2: q.rooms[1].label, room3: q.rooms[2].label, room4: q.rooms[3].label,
          correct_index: q.rooms.findIndex(r => r.isCorrect)
        }));
        setDbQuestions(fallbacks);
        setAdminQuestions(fallbacks);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAdminUsers = async () => {
    setIsFetchingUsers(true);
    try {
      // نجلب الحقول الأساسية فقط التي نضمن وجودها
      const { data, error } = await supabase.from('profiles').select('id, email, username');
      if (!error) setAdminUsers(data || []);
    } catch (err) { console.error(err); }
    finally { setIsFetchingUsers(false); }
  };

  useEffect(() => {
    if (isSecretAdmin) fetchAdminUsers();
  }, [isSecretAdmin]);

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
          await supabase.from('leaderboard').insert([{ name: username, score: 0, time: 0 }]);
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      setUser(result.data.user);
      if (isVipFlow) window.open(WHATSAPP_LINK, '_blank');
      setView('landing');
    } catch (err: any) { setAuthError(err.message); } finally { setAuthLoading(false); }
  };

  const handleAdminQuestionChange = (index: number, field: keyof QuestionData, value: any) => {
    const updated = [...adminQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setAdminQuestions(updated);
  };

  const handleSaveAllQuestions = async () => {
    setIsSaving(true);
    try {
      // تحديث الأسئلة في جدول questions العام
      for (const q of adminQuestions) {
        if (q.id) {
          await supabase.from('questions').update({
            text: q.text, room1: q.room1, room2: q.room2, room3: q.room3, room4: q.room4, correct_index: q.correct_index
          }).eq('id', q.id);
        }
      }
      alert('✅ تم تحديث جميع الأسئلة بنجاح!');
      fetchQuestions();
    } catch (err: any) {
      alert('❌ خطأ في الحفظ: ' + err.message);
    } finally {
      setIsSaving(false);
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
      {view === 'admin' && (
        <div className="absolute inset-0 z-[60] bg-slate-900 overflow-hidden flex flex-col md:flex-row">
          {!isSecretAdmin ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-6">
              <div className="bg-slate-800 p-12 rounded-[50px] w-full max-w-md shadow-2xl text-center border border-white/5">
                <h2 className="text-4xl font-black mb-8 italic text-indigo-500 uppercase tracking-widest">Master Portal</h2>
                <input 
                  type="password" 
                  placeholder="Secret Key" 
                  className="w-full p-6 mb-8 bg-slate-950 border border-white/10 rounded-3xl text-center font-bold tracking-[1em] focus:border-indigo-500 outline-none" 
                  onChange={e => setAdminInputKey(e.target.value)} 
                />
                <button 
                  onClick={() => { if(adminInputKey === ADMIN_MASTER_KEY) setIsSecretAdmin(true); else alert('مفتاح خاطئ'); }}
                  className="w-full py-6 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-500 transition-all"
                >
                  فتح بوابة التحكم
                </button>
                <button onClick={() => setView('landing')} className="mt-8 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white">إلغاء</button>
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar: Users (View only) */}
              <div className="w-full md:w-[320px] bg-slate-950 border-l border-white/10 flex flex-col overflow-hidden h-full">
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                  <h3 className="text-xl font-black italic text-indigo-400">USERS LIST</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">إجمالي المستخدمين المسجلين</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                  {isFetchingUsers ? (
                    <div className="text-center py-10 opacity-50">جاري التحميل...</div>
                  ) : adminUsers.length > 0 ? (
                    adminUsers.map(u => (
                      <div key={u.id} className="w-full p-5 rounded-[2rem] text-right border bg-slate-900/80 border-white/5">
                        <span className="font-black text-sm block truncate">{u.email}</span>
                        <span className="text-[9px] opacity-40 font-mono uppercase">{u.username || 'N/A'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-slate-600 italic">لا يوجد مستخدمين حالياً</div>
                  )}
                </div>
                <div className="p-6 bg-slate-900 border-t border-white/5">
                  <button onClick={() => setView('landing')} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase">خروج</button>
                </div>
              </div>

              {/* Main Area: Global Question Editor */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900">
                <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-10">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-800/50 p-8 rounded-[40px] border border-white/5">
                    <div className="text-center md:text-right">
                      <h2 className="text-3xl font-black italic">GLOBAL MISSION EDITOR</h2>
                      <p className="text-slate-400 text-sm mt-1">تعديل الأسئلة العامة للمهمة</p>
                    </div>
                    <button 
                      onClick={handleSaveAllQuestions}
                      disabled={isSaving}
                      className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات العامة ✅'}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {adminQuestions.map((q, idx) => (
                      <div key={idx} className="bg-slate-800/40 p-8 rounded-[40px] border border-white/5 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                          <span className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black">#{idx+1}</span>
                          <h4 className="font-black text-lg uppercase">Mission Question {idx+1}</h4>
                        </div>
                        <div className="space-y-6">
                          <textarea 
                            placeholder="نص السؤال..." 
                            className="w-full p-6 bg-slate-950 rounded-3xl border border-white/5 focus:border-indigo-500 min-h-[100px] outline-none"
                            value={q.text}
                            onChange={(e) => handleAdminQuestionChange(idx, 'text', e.target.value)}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(num => (
                              <input 
                                key={num}
                                placeholder={`خيار الغرفة ${num}`}
                                className="p-4 bg-slate-950 rounded-2xl text-xs border border-white/5 focus:border-indigo-400 outline-none" 
                                value={(q as any)[`room${num}`]} 
                                onChange={(e) => handleAdminQuestionChange(idx, `room${num}` as any, e.target.value)} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between p-6 bg-indigo-600/5 rounded-3xl border border-indigo-500/10">
                            <span className="text-xs font-black text-indigo-400 uppercase">الجواب الصحيح:</span>
                            <select 
                              className="bg-slate-950 p-4 rounded-2xl font-black text-sm border border-indigo-500/30 text-indigo-400 outline-none min-w-[150px]"
                              value={q.correct_index}
                              onChange={(e) => handleAdminQuestionChange(idx, 'correct_index', parseInt(e.target.value))}
                            >
                              <option value={0}>الغرفة 1</option>
                              <option value={1}>الغرفة 2</option>
                              <option value={2}>الغرفة 3</option>
                              <option value={3}>الغرفة 4</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Landing View */}
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

      {/* Game View */}
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

      {/* Auth Views */}
      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6">
           <div className="bg-slate-900/90 backdrop-blur-3xl p-12 rounded-[50px] w-full max-w-md border border-white/5 text-center relative">
              <button onClick={() => setView('landing')} className="absolute top-8 right-8 text-slate-500 font-bold hover:text-white transition-colors">✕</button>
              <h2 className="text-4xl font-black mb-2 italic">{view === 'login' ? 'WELCOME BACK' : 'JOIN THE MISSION'}</h2>
              <p className="text-slate-500 mb-10 text-sm">{view === 'login' ? 'أدخل بيانات الدخول للاستمرار' : 'سجل لتتمكن من المنافسة على لوحة الشرف'}</p>
              {authError && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold">{authError}</div>}
              <form onSubmit={(e) => handleAuth(e, view === 'login' ? 'login' : 'reg')} className="space-y-4">
                 {view === 'register' && <input type="text" placeholder="Username" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={username} onChange={e => setUsername(e.target.value)} required />}
                 <input type="email" placeholder="Email" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="Password" className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 text-center font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-6">
                   {authLoading ? 'Verifying...' : (view === 'login' ? 'LOGIN' : 'REGISTER')}
                 </button>
                 <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="mt-4 text-xs text-indigo-400 hover:underline">
                    {view === 'login' ? 'ليس لديك حساب؟ اشترك' : 'لديك حساب؟ سجل دخول'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Leaderboard View */}
      {view === 'leaderboard' && (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl p-12 rounded-[70px] border border-indigo-500/20 shadow-2xl text-center relative">
            <button onClick={() => setView('landing')} className="absolute top-10 right-10 text-slate-500 font-bold hover:text-white">✕</button>
            <h2 className="text-4xl font-black italic mb-12 text-indigo-400">LEADERBOARD</h2>
            <div className="space-y-3 mb-10 max-h-80 overflow-y-auto custom-scrollbar">
              {leaderboard.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-slate-800/30 rounded-[2rem] border border-white/5">
                   <span className="text-3xl font-black text-indigo-400">{e.score}</span>
                   <div className="text-right">
                     <span className="font-black text-xl block">{e.name}</span>
                     <span className="text-[10px] text-slate-500 uppercase">RANK #{i+1}</span>
                   </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-full font-black text-2xl">العودة</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
