
import React, { useState, useEffect, useRef } from 'react';
import GameComponent from './components/GameComponent';
import { GAME_LEVELS } from './game/constants';

interface LeaderboardEntry {
  name: string;
  score: number;
  time: number;
}

type AppView = 'landing' | 'login' | 'game' | 'vip_form' | 'leaderboard' | 'success';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // VIP Form State
  const [vipData, setVipData] = useState({
    studentName: '',
    lessonTitle: '',
    content: '',
    transactionId: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('maze_leaderboard');
    if (saved) setLeaderboard(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (view === 'game' && !gameOver && !isVictory) {
      timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, gameOver, isVictory]);

  useEffect(() => {
    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'LOSE_LIFE') {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
            setScoreSaved(false);
          }
          return newLives;
        });
      }
      if (e.detail.type === 'SCORE_UP') setScore(prev => prev + 500);
      if (e.detail.type === 'NEXT_LEVEL') {
        setScore(prev => prev + 1000);
        setLevelIndex(prev => {
          const next = prev + 1;
          if (next >= GAME_LEVELS.length) {
            setIsVictory(true);
            setGameOver(true);
            return prev;
          }
          return next;
        });
      }
    };
    window.addEventListener('maze-game-event', handleGameEvent);
    return () => window.removeEventListener('maze-game-event', handleGameEvent);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const restartGame = () => {
    setLives(3);
    setGameOver(false);
    setIsVictory(false);
    setScore(0);
    setLevelIndex(0);
    setTimeElapsed(0);
    setScoreSaved(false);
    setView('game');
  };

  const saveToLeaderboard = () => {
    if (!playerName.trim()) return;
    const newEntry = { name: playerName.trim(), score, time: timeElapsed };
    const updated = [...leaderboard, newEntry].sort((a, b) => b.score - a.score || a.time - b.time).slice(0, 5);
    setLeaderboard(updated);
    localStorage.setItem('maze_leaderboard', JSON.stringify(updated));
    setScoreSaved(true);
    setView('leaderboard');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'admin@test.com' && loginPassword === '12345678') {
      setView('vip_form');
    } else {
      alert("خطأ في بيانات الدخول. (تلميح المطور: admin@test.com / 12345678)");
    }
  };

  const simulateAdminNotification = (data: any, fileUrls: string[]) => {
    console.group("Admin Notification Sent");
    console.log("Details:", data);
    console.log("Uploaded Files:", fileUrls);
    console.groupEnd();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleVipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    const uploadSimulation = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadSimulation);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    await new Promise(resolve => setTimeout(resolve, 2500));
    const mockFileUrls = selectedFiles.map(f => `https://firebase-storage-mock.com/${f.name}`);

    const finalData = {
      ...vipData,
      fileUrls: mockFileUrls,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    simulateAdminNotification(finalData, mockFileUrls);

    setIsUploading(false);
    alert(`تم استقبال بياناتك بنجاح!\nتم رفع ${selectedFiles.length} ملفات.\nسيتم مراجعة الطلب قريباً.`);
    setView('success');
  };

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 text-center bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed overflow-y-auto overflow-x-hidden">
      <div className="max-w-4xl w-full animate-in fade-in zoom-in duration-700 py-10">
        <div className="inline-block px-4 py-1 mb-6 text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          مستقبل التعليم هنا
        </div>
        <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          وداعاً للدراسة المملة..<br/>أهلاً بالمغامرة!
        </h1>
        <p className="text-lg md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          حوّل دروسك الصعبة إلى لعبة ممتعة بـ <span className="text-green-400 font-black">2 دولار فقط</span> للدرس الواحد. ادرس بذكاء، وليس بجهد.
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <button 
            onClick={restartGame}
            className="w-full md:w-auto px-12 py-5 bg-white text-slate-950 rounded-2xl font-black text-xl hover:bg-indigo-50 transition-all transform hover:scale-105 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
          >
            النسخة التجريبية 🚀
          </button>
          <button 
            onClick={() => setView('login')}
            className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all transform hover:scale-105 shadow-[0_20px_40px_rgba(79,70,229,0.3)] border border-indigo-400/30"
          >
            نسخة VIP المميزة ⭐
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
          {[
            { title: "تعلم تفاعلي", desc: "لا مزيد من الحفظ الجاف، تحرك داخل المعلومة.", icon: "🎯" },
            { title: "تخصيص كامل", desc: "أرسل لنا درسك، وسنحوله لمتاهة خاصة بك.", icon: "🛠️" },
            { title: "نتائج مذهلة", desc: "تحسن ملحوظ في الاستيعاب والذاكرة البصرية.", icon: "📈" }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 overflow-x-hidden">
      <div className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-2xl rounded-[40px] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <h2 className="text-3xl font-black text-center mb-2">تسجيل الدخول</h2>
        <p className="text-slate-400 text-center mb-8">انضم إلى مجتمع VIP لتجربة دروسك الخاصة</p>
        
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-2">البريد الإلكتروني</label>
            <input 
              type="email" 
              required 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none transition-all text-left" 
              placeholder="admin@test.com" 
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-2">كلمة المرور</label>
            <input 
              type="password" 
              required 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none transition-all text-left" 
              placeholder="12345678" 
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 mt-4">
            دخول (وضع المطور)
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          أليس لديك حساب؟ <button className="text-indigo-400 font-bold">إنشاء حساب جديد</button>
        </div>
        <button onClick={() => setView('landing')} className="w-full mt-4 text-slate-400 text-xs hover:text-white transition-colors">العودة للرئيسية</button>
      </div>
    </div>
  );

  const renderVipForm = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-4 md:p-6 overflow-x-hidden">
      <div className="w-full max-w-2xl p-6 md:p-8 bg-slate-900/80 backdrop-blur-2xl rounded-[40px] border border-indigo-500/30 shadow-2xl animate-in fade-in duration-500 overflow-y-auto max-h-[95vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black">طلب درس VIP مخصص</h2>
            <p className="text-slate-400 text-sm md:text-base">حول أي محتوى دراسي إلى تحدي في المتاهة</p>
          </div>
          <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-2xl border border-green-500/20 font-black text-sm md:text-base">
            $2.00
          </div>
        </div>

        <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl mb-6 text-xs md:text-sm text-indigo-300 leading-relaxed">
          <strong>طريقة الدفع:</strong> يرجى تحويل مبلغ 2 دولار عبر (PayPal/Vodafone Cash) وإرفاق رقم المعاملة أدناه. سيتم تجهيز درسك خلال أقل من 24 ساعة.
        </div>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6" onSubmit={handleVipSubmit}>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-1">اسم الطالب</label>
            <input 
              type="text" required 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none text-sm md:text-base" 
              value={vipData.studentName}
              onChange={e => setVipData({...vipData, studentName: e.target.value})}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-1">عنوان الدرس</label>
            <input 
              type="text" required 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none text-sm md:text-base" 
              placeholder="مثال: الجهاز الهضمي"
              value={vipData.lessonTitle}
              onChange={e => setVipData({...vipData, lessonTitle: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-1">محتوى الدرس أو الأسئلة (اختياري)</label>
            <textarea 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none h-32 resize-none text-sm md:text-base" 
              placeholder="الصق نص الدرس هنا أو الأسئلة التي تريدها..."
              value={vipData.content}
              onChange={e => setVipData({...vipData, content: e.target.value})}
            ></textarea>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-1">صور الدرس أو ملفات (PDF/Word)</label>
            <div className="relative group">
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full bg-slate-800/50 border-2 border-dashed border-slate-700 p-6 rounded-2xl group-hover:border-indigo-500 transition-all flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-4xl">☁️</span>
                <span className="text-slate-400 text-sm font-bold">
                  {selectedFiles.length > 0 ? `تم اختيار ${selectedFiles.length} ملفات` : 'اسحب الملفات هنا أو اضغط للاختيار'}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">JPG, PNG, PDF, DOC (MAX 10MB)</span>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="bg-slate-800 px-3 py-1 rounded-full text-[10px] text-indigo-300 border border-indigo-500/20 truncate max-w-[150px]">
                    📎 {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-400 mb-2 mr-1">رقم عملية التحويل (Transaction ID)</label>
            <input 
              type="text" required 
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:border-indigo-500 outline-none font-mono text-sm md:text-base" 
              placeholder="TXN-123456789"
              value={vipData.transactionId}
              onChange={e => setVipData({...vipData, transactionId: e.target.value})}
            />
          </div>

          {isUploading && (
            <div className="md:col-span-2 space-y-2 animate-pulse">
              <div className="flex justify-between text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                <span>جاري رفع الملفات إلى السحابة...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex flex-col md:flex-row gap-4 mt-4">
            <button 
              type="submit" 
              disabled={isUploading}
              className="flex-1 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95"
            >
              {isUploading ? 'جاري الإرسال...' : 'إرسال الطلب 🚀'}
            </button>
            <button type="button" onClick={() => setView('landing')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
              <span>🚪</span> خروج للقائمة
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 overflow-x-hidden">
      <div className="w-full max-w-md p-10 bg-slate-900 rounded-[40px] border-2 border-green-500/30 text-center shadow-2xl">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl text-white">✅</span>
        </div>
        <h2 className="text-3xl font-black mb-4">تم استلام طلبك!</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">شكراً لك {vipData.studentName}. نحن نقوم الآن بتحويل درس "{vipData.lessonTitle}" إلى مغامرة فضائية. ستصلك رسالة عبر البريد عند جاهزية اللعبة.</p>
        <button onClick={() => setView('landing')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">العودة للرئيسية</button>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 overflow-x-hidden">
      <div className="w-full max-w-lg p-8 bg-slate-900/90 backdrop-blur-2xl rounded-[40px] border-2 border-indigo-500/30 shadow-2xl relative animate-in zoom-in-95 duration-300">
        <h2 className="text-3xl font-black text-center mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">أبطال التاريخ 🏆</h2>
        <div className="space-y-3 mb-10">
          {leaderboard.length === 0 ? <div className="text-center p-10 text-slate-500 italic">لا توجد نتائج مسجلة بعد...</div> : 
            leaderboard.map((entry, idx) => (
              <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]' : 'bg-slate-800/50 border-white/5'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'}`}>{idx + 1}</span>
                  <span className="font-bold text-xl">{entry.name}</span>
                </div>
                <div className="flex gap-6 text-sm font-mono">
                  <div className="text-right"><span className="block text-slate-500 text-[10px] uppercase font-bold">النقاط</span><span className="text-indigo-300 font-bold text-lg">{entry.score}</span></div>
                  <div className="text-right border-r border-white/10 pr-6"><span className="block text-slate-500 text-[10px] uppercase font-bold">الوقت</span><span className="text-purple-300 font-bold text-lg">{formatTime(entry.time)}</span></div>
                </div>
              </div>
            ))
          }
        </div>
        <button onClick={() => setView('landing')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95">العودة للقائمة الرئيسية</button>
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-950 text-white font-sans rtl selection:bg-indigo-500/30">
      {/* Dynamic Views */}
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'vip_form' && renderVipForm()}
      {view === 'leaderboard' && renderLeaderboard()}
      {view === 'success' && renderSuccess()}

      {view === 'game' && (
        <div className="w-full h-full relative overflow-hidden">
          <GameComponent />
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none select-none z-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 bg-black/60 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <span key={i} className={`text-2xl transition-all duration-300 ${i < lives ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'opacity-20 grayscale scale-90'}`}>❤️</span>
                    ))}
                  </div>
                  <div className="w-px h-6 bg-white/20 mx-2"></div>
                  <div className="text-xl font-bold font-mono text-indigo-300 tracking-tighter">{formatTime(timeElapsed)}</div>
              </div>
              <div className="bg-indigo-600/80 px-4 py-1.5 rounded-full text-[10px] font-black text-center border border-white/20 uppercase tracking-widest shadow-lg">
                المستوى {levelIndex + 1} / {GAME_LEVELS.length}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-black/60 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-3">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">SCORE</span>
                <span className="text-white font-mono text-2xl font-black">{score.toString().padStart(6, '0')}</span>
              </div>
              
              <button 
                onClick={() => setView('landing')}
                className="pointer-events-auto bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-2xl border border-red-500/30 transition-all backdrop-blur-md group"
                title="الخروج للقائمة الرئيسية"
              >
                <span className="text-xl group-hover:scale-110 transition-transform block">🏠</span>
              </button>
            </div>
          </div>

          {!gameOver && !isVictory && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 pointer-events-none z-10">
              <div className="bg-slate-900/95 backdrop-blur-3xl p-8 rounded-[35px] border-t-4 border-indigo-500 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-none"></div>
                <span className="text-indigo-400 block text-xs mb-3 font-black uppercase tracking-[0.3em]">MISSION OBJECTIVE</span>
                <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md">
                  {GAME_LEVELS[levelIndex].question}
                </h2>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
              <div className="bg-slate-900 w-full max-w-md p-10 rounded-[45px] border-2 border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isVictory ? 'from-green-500 to-blue-500' : 'from-red-500 to-purple-500'}`}></div>
                
                <div className="mb-6">
                  <span className="text-6xl">{isVictory ? '🏆' : '💀'}</span>
                </div>
                <h2 className="text-4xl font-black text-white mb-2">{isVictory ? 'نصر تاريخي!' : 'مهمة فاشلة'}</h2>
                <p className="text-slate-400 mb-8 font-medium">
                  {isVictory ? 'لقد أتقنت أحداث الحرب العالمية الأولى بالكامل' : 'المتاهة كانت أصعب هذه المرة، حاول مجدداً'}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5 shadow-inner">
                    <span className="text-slate-500 text-[10px] block mb-1 font-black uppercase tracking-widest">FINAL SCORE</span>
                    <span className="text-3xl font-black text-indigo-400">{score}</span>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5 shadow-inner">
                    <span className="text-slate-500 text-[10px] block mb-1 font-black uppercase tracking-widest">TOTAL TIME</span>
                    <span className="text-3xl font-black text-purple-400">{formatTime(timeElapsed)}</span>
                  </div>
                </div>

                {!scoreSaved ? (
                  <div className="mb-8 space-y-3">
                    <input 
                      type="text" 
                      placeholder="اسم البطل..." 
                      className="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button 
                      onClick={saveToLeaderboard}
                      disabled={!playerName.trim()}
                      className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95"
                    >
                      تخليد اسمي في التاريخ 💾
                    </button>
                  </div>
                ) : (
                  <div className="mb-8 p-4 bg-green-500/10 text-green-400 rounded-2xl font-black border border-green-500/20 animate-pulse">
                    تم الحفظ في لوحة الشرف!
                  </div>
                )}

                <div className="space-y-3">
                  <button onClick={restartGame} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all shadow-lg active:scale-95">
                    إعادة المحاولة 🔄
                  </button>
                  <button onClick={() => setView('landing')} className="w-full py-3 text-slate-400 hover:text-white font-bold transition-colors">الخروج للقائمة الرئيسية</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-30 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
};

export default App;
