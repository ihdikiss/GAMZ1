
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../supabase';

interface QuestionObject {
  question: string;
  options: string[]; // [opt1, opt2, opt3, opt4]
  correct_answer: string; 
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  custom_questions: QuestionObject[];
  created_at?: string;
}

const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const SECRET_ADMIN_CODE = "ADMIN2025"; 

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // الحالة المحلية للأسئلة العشره
  const [tempQuestions, setTempQuestions] = useState<QuestionObject[]>(
    Array(10).fill(null).map(() => ({
      question: '',
      options: ['', '', '', ''],
      correct_answer: ''
    }))
  );
  
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === SECRET_ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchUsers();
    } else {
      alert("⚠️ الكود السري غير صحيح!");
    }
  };

  const fetchUsers = async () => {
    if (!isConfigured()) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setFetchError(err.message || "فشل الاتصال بـ Supabase");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    // جلب الأسئلة الموجودة أو إنشاء 10 فارغة
    const existing = Array.isArray(user.custom_questions) ? user.custom_questions : [];
    const filled = [...existing];
    while (filled.length < 10) {
      filled.push({ question: '', options: ['', '', '', ''], correct_answer: '' });
    }
    setTempQuestions(filled.slice(0, 10));
    setSuccessMsg('');
  };

  const updateQuestionText = (index: number, val: string) => {
    const newQs = [...tempQuestions];
    newQs[index] = { ...newQs[index], question: val };
    setTempQuestions(newQs);
  };

  const updateOptionText = (qIdx: number, optIdx: number, val: string) => {
    const newQs = [...tempQuestions];
    const newOptions = [...newQs[qIdx].options];
    const oldVal = newOptions[optIdx];
    newOptions[optIdx] = val;
    
    // إذا كان هذا الخيار هو الإجابة الصحيحة، نحتاج لتحديث نص الإجابة الصحيحة أيضاً
    let newCorrect = newQs[qIdx].correct_answer;
    if (newCorrect === oldVal && oldVal !== '') {
        newCorrect = val;
    }

    newQs[qIdx] = { ...newQs[qIdx], options: newOptions, correct_answer: newCorrect };
    setTempQuestions(newQs);
  };

  const setCorrectAnswer = (qIdx: number, optVal: string) => {
    if (!optVal.trim()) {
        alert("⚠️ يرجى كتابة نص الخيار أولاً قبل تحديده كإجابة صحيحة");
        return;
    }
    const newQs = [...tempQuestions];
    newQs[qIdx] = { ...newQs[qIdx], correct_answer: optVal };
    setTempQuestions(newQs);
  };

  const saveVipSettings = async () => {
    if (!selectedUser) return;
    
    // التحقق من صحة البيانات قبل الحفظ
    const validQuestions = tempQuestions.filter(q => q.question.trim() !== '');
    const hasIncomplete = validQuestions.some(q => 
        q.options.some(opt => opt.trim() === '') || q.correct_answer === ''
    );

    if (hasIncomplete) {
        if (!confirm("⚠️ بعض الأسئلة التي كتبت نصها لا تملك خيارات كاملة أو إجابة صحيحة محددة. هل تريد الاستمرار بحفظ الأسئلة الكاملة فقط؟")) {
            return;
        }
    }

    const finalData = validQuestions.filter(q => 
        q.options.every(opt => opt.trim() !== '') && q.correct_answer !== ''
    );

    setLoading(true);
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_questions: finalData,
          is_active: true 
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSuccessMsg('✅ تم حفظ بيانات VIP بنجاح!');
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert("❌ خطأ أثناء الحفظ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[10000] p-6 font-sans">
        <div className="bg-slate-900 border-2 border-indigo-500/30 p-10 rounded-[3rem] w-full max-w-md text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg shadow-indigo-600/30">🛡️</div>
          <h2 className="text-3xl font-black text-white mb-6 italic uppercase">نظام الإدارة</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="كود الدخول السري" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400" 
              value={adminCodeInput} 
              onChange={(e) => setAdminCodeInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl shadow-indigo-600/20">دخول</button>
            <button type="button" onClick={onExit} className="text-slate-500 hover:text-white text-sm underline mt-4">الرجوع للعبة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      {/* القائمة الجانبية للطلاب */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/5 bg-slate-900/50">
          <h1 className="text-xl font-black text-indigo-500 italic">الطلاب المسجلون</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">انقر لاختيار طالب وتعديله</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {fetchError && (
             <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-xs text-center border border-red-500/20">
                {fetchError}
                <button onClick={fetchUsers} className="block w-full mt-2 underline font-bold">إعادة المحاولة 🔄</button>
             </div>
          )}

          {users.map((u) => (
            <button 
              key={u.id} 
              onClick={() => selectUser(u)}
              className={`w-full p-5 rounded-3xl border transition-all text-right flex flex-row-reverse items-center justify-between group cursor-pointer ${selectedUser?.id === u.id ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/30' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'}`}
            >
              <div className="flex flex-row-reverse items-center gap-4 truncate">
                 <div className={`w-3 h-3 rounded-full shrink-0 ${u.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-500'}`} />
                 <div className="truncate">
                    <div className={`font-black text-sm ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-200'}`}>{u.username || 'بدون اسم'}</div>
                    <div className={`text-[10px] font-bold opacity-40 ${selectedUser?.id === u.id ? 'text-indigo-100' : 'text-slate-400'}`}>{u.email}</div>
                 </div>
              </div>
              {u.is_active && (
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${selectedUser?.id === u.id ? 'bg-white text-indigo-600' : 'bg-emerald-500/20 text-emerald-400'}`}>VIP</span>
              )}
            </button>
          ))}
          
          {loading && users.length === 0 && (
            <div className="py-10 text-center opacity-30 animate-pulse">جاري التحميل...</div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-slate-900/50">
           <button onClick={onExit} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all border border-white/5">خروج</button>
        </div>
      </aside>

      {/* محرر الأسئلة الرئيسي */}
      <main className="flex-1 h-full overflow-y-auto p-12 bg-[radial-gradient(circle_at_0%_0%,_#1e1b4b_0%,_transparent_40%)] relative custom-scrollbar">
        {selectedUser ? (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-left-6 duration-500">
            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/80 backdrop-blur-md p-10 rounded-[3.5rem] border border-white/10 shadow-2xl">
              <div>
                <span className="px-4 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">تعديل محتوى VIP للطالب</span>
                <h2 className="text-5xl font-black mb-2 italic">المستخدم: {selectedUser.username}</h2>
                <p className="text-slate-500 text-sm font-mono tracking-tight">{selectedUser.email}</p>
              </div>
              <div className={`mt-6 md:mt-0 px-8 py-4 rounded-3xl border-2 font-black text-sm flex items-center gap-4 ${selectedUser.is_active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                <div className={`w-3 h-3 rounded-full ${selectedUser.is_active ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
                {selectedUser.is_active ? 'مغامرة VIP مفعلة' : 'بانتظار تخصيص المحتوى'}
              </div>
            </header>

            {successMsg && (
              <div className="mb-10 p-8 bg-emerald-600 text-white rounded-[3rem] font-black text-center text-xl shadow-3xl shadow-emerald-600/30 animate-bounce flex items-center justify-center gap-4">
                <span className="text-3xl">🚀</span> {successMsg}
              </div>
            )}

            <div className="space-y-16 pb-32">
              {tempQuestions.map((q, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-white/10 rounded-[4rem] p-12 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-bl-[100%] -mr-10 -mt-10 transition-all group-hover:bg-indigo-600/10" />
                  
                  <div className="flex items-center gap-8 mb-12 border-b border-white/5 pb-8 relative z-10">
                    <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black italic shadow-2xl shadow-indigo-600/40">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white italic">المستوى {idx + 1}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase mt-1">أدخل نص السؤال والخيارات ثم اختر الإجابة</p>
                    </div>
                  </div>

                  <div className="space-y-10 relative z-10">
                    {/* نص السؤال */}
                    <div className="space-y-4">
                      <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest px-2">نص السؤال الرئيسي</label>
                      <input 
                        type="text" 
                        placeholder="اكتب السؤال هنا... (مثال: ما هي عاصمة المغرب؟)" 
                        className="w-full p-7 bg-slate-800/40 rounded-3xl border border-white/5 focus:border-indigo-500 focus:bg-slate-800 outline-none font-black text-2xl text-right transition-all"
                        value={q.question}
                        onChange={(e) => updateQuestionText(idx, e.target.value)}
                      />
                    </div>

                    {/* شبكة الخيارات */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_answer === opt && opt !== '';
                        return (
                          <div key={optIdx} className="space-y-3">
                            <label className="flex justify-between items-center px-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">الخيار {optIdx + 1}</span>
                                {isCorrect && <span className="text-[10px] font-black text-emerald-400 uppercase animate-pulse">✓ الإجابة الصحيحة</span>}
                            </label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="text" 
                                    placeholder={`الخيار ${optIdx + 1}...`}
                                    className={`flex-1 p-5 rounded-2xl border outline-none font-bold text-lg text-right transition-all ${isCorrect ? 'bg-emerald-500/10 border-emerald-500 text-emerald-50' : 'bg-slate-800/20 border-white/5 focus:border-indigo-500'}`}
                                    value={opt}
                                    onChange={(e) => updateOptionText(idx, optIdx, e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setCorrectAnswer(idx, opt)}
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40' : 'bg-slate-800 border-white/5 text-slate-600 hover:text-white hover:border-white/20'}`}
                                    title="تحديد كإجابة صحيحة"
                                >
                                    <span className="text-xl font-black">✓</span>
                                </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* زر الحفظ العائم */}
            <div className="fixed bottom-12 left-12 right-[24rem] flex justify-center pointer-events-none z-50">
               <button 
                  onClick={saveVipSettings}
                  disabled={loading}
                  className="pointer-events-auto px-16 py-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full font-black text-2xl shadow-[0_25px_60px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center gap-6"
                >
                  {loading ? (
                    <span className="animate-pulse">جاري الحفظ والرفع...</span>
                  ) : (
                    <>حفظ جميع الأسئلة وتفعيل VIP ✨</>
                  )}
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 select-none py-40">
            <div className="text-[18rem] mb-12 animate-bounce">🖱️</div>
            <h2 className="text-6xl font-black italic tracking-tighter">اختر طالباً للبدء</h2>
            <p className="text-2xl mt-8 font-bold">استخدم القائمة اليمنى لاختيار حساب طالب وتخصيص أسئلته</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
