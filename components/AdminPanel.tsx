
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../supabase';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  custom_questions: string[];
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
  const [tempQuestions, setTempQuestions] = useState<string[]>(Array(10).fill(''));
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
    if (!isConfigured()) {
      setFetchError("لم يتم العثور على إعدادات Supabase (URL/Key).");
      return;
    }
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
      console.error("Fetch error:", err);
      setFetchError(err.message || "فشل الاتصال بقاعدة البيانات (TypeError: Failed to fetch)");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    // ملء الحقول بالأسئلة الموجودة مسبقاً أو حقول فارغة
    const existing = user.custom_questions || [];
    const filled = [...existing];
    while (filled.length < 10) filled.push('');
    setTempQuestions(filled.slice(0, 10));
    setSuccessMsg('');
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQs = [...tempQuestions];
    newQs[index] = value;
    setTempQuestions(newQs);
  };

  const saveVipSettings = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      // إزالة الأسئلة الفارغة قبل الحفظ
      const cleanedQuestions = tempQuestions.map(q => q.trim()).filter(q => q !== '');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_questions: cleanedQuestions,
          is_active: true 
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSuccessMsg('✅ تم تحديث أسئلة المستخدم وتفعيل VIP بنجاح!');
      fetchUsers(); // تحديث القائمة لرؤية حالة التفعيل الجديدة
      
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
          <h2 className="text-3xl font-black text-white mb-2 italic uppercase">نظام الإدارة</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="كود الدخول السري" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400 transition-all" 
              value={adminCodeInput} 
              onChange={(e) => setAdminCodeInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95">دخول</button>
            <button type="button" onClick={onExit} className="text-slate-500 hover:text-white text-sm underline transition-colors">الرجوع للعبة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      {/* القائمة الجانبية للمستخدمين */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl z-20">
        <div className="p-8 border-b border-white/5 bg-slate-900/50">
          <h1 className="text-xl font-black text-indigo-500 italic">الطلاب المسجلون</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">انقر على مستخدم للاختيار</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {fetchError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center">
              {fetchError}
              <button onClick={fetchUsers} className="block w-full mt-2 underline font-bold">إعادة المحاولة 🔄</button>
            </div>
          )}

          {loading && !users.length && (
             <div className="py-20 text-center animate-pulse opacity-50">جاري جلب البيانات...</div>
          )}

          {users.map((u) => (
            <button 
              key={u.id} 
              type="button"
              onClick={() => selectUser(u)}
              className={`w-full p-5 rounded-2xl border transition-all text-right flex flex-row-reverse items-center justify-between group cursor-pointer ${selectedUser?.id === u.id ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/30' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'}`}
            >
              <div className="flex flex-row-reverse items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-500'} shadow-sm`} />
                 <div className="truncate text-right">
                    <div className={`font-black text-sm ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-200'}`}>{u.username || 'طالب مجهول'}</div>
                    <div className={`text-[10px] font-bold opacity-60 ${selectedUser?.id === u.id ? 'text-indigo-100' : 'text-slate-400'}`}>{u.email}</div>
                 </div>
              </div>
              {u.is_active && (
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${selectedUser?.id === u.id ? 'bg-white text-indigo-600' : 'bg-emerald-500/20 text-emerald-400'}`}>VIP</span>
              )}
            </button>
          ))}
          
          {!loading && users.length === 0 && !fetchError && (
            <p className="text-center opacity-30 py-20 italic">لا يوجد مسجلون حالياً</p>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-slate-900/50">
           <button onClick={onExit} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-black text-sm transition-all border border-white/5">خروج</button>
        </div>
      </aside>

      {/* منطقة العمل المركزية - محرر الأسئلة */}
      <main className="flex-1 h-full overflow-y-auto p-12 bg-[radial-gradient(circle_at_0%_0%,_#1e1b4b_0%,_transparent_40%)] custom-scrollbar relative">
        {selectedUser ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-left-8 duration-500">
            <header className="mb-12 flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">تخصيص أسئلة VIP</span>
                <h2 className="text-5xl font-black mb-2 italic">المستخدم: {selectedUser.username}</h2>
                <p className="text-slate-500 font-mono text-sm">{selectedUser.email}</p>
              </div>
              <div className={`px-6 py-4 rounded-3xl border-2 font-black text-sm flex items-center gap-3 ${selectedUser.is_active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                <div className={`w-3 h-3 rounded-full ${selectedUser.is_active ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
                {selectedUser.is_active ? 'حساب نشط' : 'بانتظار التفعيل'}
              </div>
            </header>

            {successMsg && (
              <div className="mb-10 p-6 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-[2.5rem] font-black text-center text-lg animate-bounce flex items-center justify-center gap-4">
                <span className="text-2xl">🎉</span>
                {successMsg}
              </div>
            )}

            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-12 rounded-[4rem] shadow-3xl">
              <div className="mb-10 border-b border-white/5 pb-8">
                <h3 className="text-2xl font-black text-indigo-400 italic">محرر الأسئلة المخصصة (10 مستويات)</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">أدخل نص السؤال فقط. سيتم عرض هذه الأسئلة لهذا الطالب تحديداً عند بدء مغامرته في المتاهة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {tempQuestions.map((q, idx) => (
                  <div key={idx} className="space-y-3 group">
                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-3 px-2">
                      <span className="w-6 h-6 bg-slate-800 group-focus-within:bg-indigo-600 rounded-lg text-white flex items-center justify-center transition-colors">{idx + 1}</span>
                      السؤال المخصص {idx + 1}
                    </label>
                    <input 
                      type="text" 
                      placeholder="اكتب نص السؤال هنا..." 
                      className="w-full p-5 bg-slate-800/40 rounded-2xl border border-white/10 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all font-bold text-sm text-right text-indigo-100"
                      value={q}
                      onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-16 flex flex-col md:flex-row gap-6">
                <button 
                  onClick={saveVipSettings}
                  disabled={loading}
                  className="flex-1 py-7 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                  {loading ? (
                    <span className="animate-pulse">جاري الحفظ...</span>
                  ) : (
                    <>حفظ وتفعيل VIP 🚀</>
                  )}
                </button>
                <button 
                  onClick={() => selectUser(selectedUser)}
                  className="px-12 py-7 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-[3rem] font-black text-xl transition-all"
                >
                  تفريغ الحقول
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 py-40 select-none">
            <div className="text-[15rem] mb-12 animate-bounce">👈</div>
            <h2 className="text-5xl font-black italic tracking-tighter">اختر طالباً للبدء</h2>
            <p className="text-2xl mt-6 font-bold">انقر على إيميل الطالب من القائمة اليمنى لتخصيص محتواه</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
