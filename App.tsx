
import React, { useState, useEffect, useCallback } from 'react';
import GameComponent from './components/GameComponent';
import { GAME_LEVELS as FALLBACK_LEVELS } from './game/constants';
import { supabase } from './supabase';

// Interfaces مبسطة لتجنب أخطاء البناء
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
interface Profile {
  id: string;
  email: string;
  username: string;
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
  const [dbQuestions, setDbQuestions] = useState<QuestionData[]>([]);
  
  // Admin States
  const [adminUsers, setAdminUsers] = useState<Profile[]>([]);
  const [adminQuestions, setAdminQuestions] = useState<QuestionData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSecretAdmin, setIsSecretAdmin] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setDbQuestions(data as any[]);
        setAdminQuestions(data as any[]);
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
        setAdminQuestions(fallbacks);
      }
    } catch (e) {
      console.error("Fetch questions failed", e);
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

  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, username');
      if (error) throw error;
      if (data) setAdminUsers(data as Profile[]);
    } catch (err) {
      console.error("Admin fetch users error", err);
    }
  }, []);

  useEffect(() => {
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

    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'portal') setView('admin');
  }, [fetchQuestions, loadLeaderboard]);

  useEffect(() => {
    if (isSecretAdmin) {
      fetchAdminUsers();
    }
  }, [isSecretAdmin, fetchAdminUsers]);

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
          await supabase.from('leaderboard').insert([{ name: username, score: 0 }]);
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      setUser(result.data.user);
      setView('landing');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminQuestionChange = (index: number, field: keyof QuestionData, value: any) => {
    const updated = [...adminQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setAdminQuestions(updated);
  };

  const handleSaveAllQuestions = async () => {
    setIsSaving(true);
    try {
      for (const q of adminQuestions) {
        if (q.id) {
          await supabase.from('questions').update({
            text: q.text,
            room1: q.room1,
            room2: q.room2,
            room3: q.room3,
            room4: q.room4,
            correct_index: q.correct_index
          }).eq('id', q.id);
        }
      }
      alert('✅ تم التحديث بنجاح');
      fetchQuestions();
    } catch (err: any) {
      alert('❌ فشل الحفظ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
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
      {/* Admin Panel */}
      {view === 'admin' && (
        <div className="absolute inset-0 z-[60] bg-slate-900 flex flex-col md:flex-row overflow-hidden">
          {!isSecretAdmin ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-6">
              <div className="bg-slate-800 p-12 rounded-[50px] w-full max-w-md shadow-2xl text-center border border-white/5">
                <h2 className="text-4xl font-black mb-8 italic text-indigo-500 uppercase">Portal</h2>
                <input 
                  type="password" 
                  placeholder="Secret Key" 
                  className="w-full p-6 mb-8 bg-slate-950 border border-white/10 rounded-3xl text-center font-bold tracking-[1em] focus:border-indigo-500 outline-none" 
                  onChange={e => setAdminInputKey(e.target.value)} 
                />
                <button 
                  onClick={() => { if(adminInputKey === ADMIN_MASTER_KEY) setIsSecretAdmin(true); else alert('مفتاح خاطئ'); }}
                  className="w-full py-6 bg-indigo-600 rounded-3xl font-black text-xl hover:bg-indigo-500"
                >
                  فتح لوحة التحكم
                </button>
                <button onClick={() => setView('landing')} className="mt-8 text-slate-500 text-xs font-bold uppercase hover:text-white">إلغاء</button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full md:w-[320px] bg-slate-950 border-l border-white/10 flex flex-col h-full overflow-y-auto">
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                  <h3 className="text-xl font-black italic text-indigo-400">USERS</h3>
                </div>
                <div className="p-4 space-y-3">
                  {adminUsers.map(u => (
                    <div key={u.id} className="p-5 rounded-[2rem] border bg-slate-900/80 border-white/5">
                      <span className="font-black text-sm block truncate">{u.email}</span>
                      <span className="text-[9px] opacity-40 uppercase">{u.username || 'User'}</span>
                    </div>
                  ))}
                  {adminUsers.length === 0 && <p className="text-center opacity-30 p-10 italic">لا يوجد مستخدمين بعد</p>}
                </div>
                <div className="mt-auto p-6 bg-slate-900 border-t border-white/5">
                  <button onClick={() => setView('landing')} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase">خروج</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 p-6 md:p-12">
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="flex justify-between items-center bg-slate-800/50 p-8 rounded-[40px] border border-white/5">
                    <h2 className="text-3xl font-black italic">EDITOR</h2>
                    <button 
                      onClick={handleSaveAllQuestions}
                      disabled={isSaving}
                      className="px-10 py-4 bg-indigo-600 rounded-2xl font-black disabled:opacity-50"
                    >
                      {isSaving ? 'حفظ...' : 'حفظ الكل ✅'}
                    </button>
                  </div>
                  <div className="space-y-6">
                    {adminQuestions.map((q, idx) => (
                      <div key={idx} className="bg-slate-800/40 p-8 rounded-[40px] border border-white/5">
                        <h4 className="font-black mb-4 uppercase">Q {idx+1}</h4>
                        <div className="space-y-4">
                          <textarea 
                            className="w-full p-6 bg-slate-950 rounded-3xl border border-white/5 min-h-[100px] outline-none"
                            value={q.text}
                            onChange={(e) => handleAdminQuestionChange(idx, 'text', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(num => (
                              <input 
                                key={num}
                                className="p-4 bg-slate-950 rounded-2xl text-xs border border-white/5 outline-none" 
                                value={(q as any)[`room${num}`]} 
                                onChange={(e) => handleAdminQuestionChange(idx, `room${num}` as any, e.target.value)} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between p-4 bg-indigo-600/5 rounded-2xl">
                            <span className="text-xs font-black">الجواب:</span>
                            <select 
                              className="bg-slate-950 p-3 rounded-xl text-indigo-400 outline-none"
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

      {/* Views Logic */}
      {view === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <h1 className="text-8xl md:text-[10rem] font-black mb-12 italic text-indigo-500 select-none">SPACE MAZE</h1>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button onClick={() => setView(user ? 'game' : 'register')} className="py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl active:scale-95 transition-transform">مهمة عادية 🚀</button>
            <button onClick={() => { if(user) window.open(WHATSAPP_LINK, '_blank'); else setView('register'); }} className="py-5 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl">مغامرة VIP ✨</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('leaderboard')} className="py-4 bg-slate-900 border border-white/10 rounded-3xl font-black text-[10px] uppercase">لوحة الشرف</button>
              {user ? (
                <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="py-4 bg-red-900/10 text-red-400 border border-red-500/20 rounded-3xl font-black text-[10px] uppercase">خروج</button>
              ) : (
                <button onClick={() => setView('login')} className="py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-3xl font-black text-[10px] uppercase">دخول</button>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'game' && currentQuestion && (
        <div className="w-full h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[3rem] text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase">Mission {levelIndex + 1} / {dbQuestions.length}</span>
              <h3 className="text-xl md:text-2xl font-bold">{currentQuestion.text}</h3>
            </div>
          </div>
          <GameComponent questionData={currentQuestion} levelIndex={levelIndex} />
          <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-40">
             <div className="bg-slate-900/90 px-7 py-4 rounded-3xl border border-white/10 flex items-center gap-3">
                 <span>❤️</span><span className="text-3xl font-black">{lives}</span>
             </div>
             <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-2xl text-3xl font-black">{score}</div>
          </div>
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center z-50">
               <div className="text-center p-14 bg-slate-900 rounded-[70px] border border-white/10 max-w-md w-full">
                  <h2 className="text-5xl font-black mb-8 italic">{isVictory ? 'COMPLETED! 🏆' : 'FAILED 🛑'}</h2>
                  <p className="text-slate-400 mb-10">النقاط: {score}</p>
                  <button onClick={() => window.location.reload()} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl">العودة</button>
               </div>
            </div>
          )}
        </div>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="flex items-center justify-center h-full p-6">
           <div className="bg-slate-900/90 backdrop-blur-3xl p-12 rounded-[50px] w-full max-w-md border border-white/5 text-center relative">
              <button onClick={() => setView('landing')} className="absolute top-8 right-8 text-slate-500 font-bold hover:text-white">✕</button>
              <h2 className="text-4xl font-black mb-2 italic">{view === 'login' ? 'WELCOME BACK' : 'JOIN'}</h2>
              {authError && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold">{authError}</div>}
              <form onSubmit={(e) => handleAuth(e, view === 'login' ? 'login' : 'reg')} className="space-y-4">
                 {view === 'register' && <input type="text" placeholder="Username" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={username} onChange={e => setUsername(e.target.value)} required />}
                 <input type="email" placeholder="Email" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
                 <input type="password" placeholder="Password" className="w-full p-5 bg-slate-800/50 rounded-2xl text-center font-bold outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
                 <button disabled={authLoading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl mt-6">
                   {authLoading ? '...' : (view === 'login' ? 'LOGIN' : 'REGISTER')}
                 </button>
                 <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="mt-4 text-xs text-indigo-400 hover:underline">
                    {view === 'login' ? 'اشترك الآن' : 'سجل دخول'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-xl bg-slate-900 p-12 rounded-[70px] border border-indigo-500/20 text-center relative shadow-2xl">
            <button onClick={() => setView('landing')} className="absolute top-10 right-10 text-slate-500 font-bold">✕</button>
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
              {leaderboard.length === 0 && <p className="opacity-30 italic">لا يوجد نتائج بعد</p>}
            </div>
            <button onClick={() => setView('landing')} className="w-full py-6 bg-white text-black rounded-full font-black text-2xl">العودة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
