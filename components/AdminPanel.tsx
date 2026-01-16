
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
    if (!isConfigured()) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (err) {
      console.error(err);
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
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_questions: tempQuestions.filter(q => q.trim() !== ''),
          is_active: true 
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSuccessMsg('✅ تم تحديث أسئلة المستخدم وتفعيل VIP بنجاح!');
      fetchUsers(); // تحديث القائمة لرؤية حالة التفعيل
      
      // إخفاء الرسالة بعد 3 ثواني
      setTimeout(() => setSuccessMsg(''), 3000);
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
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl">🛡️</div>
          <h2 className="text-3xl font-black text-white mb-2 italic uppercase">دخول المعلم</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="كود الإدارة" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400" 
              value={adminCodeInput} 
              onChange={(e) => setAdminCodeInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg">تحقق</button>
            <button type="button" onClick={onExit} className="text-slate-600 hover:text-white text-sm underline">خروج</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      {/* القائمة الجانبية للمستخدمين */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl z-10">
        <div className="p-8 border-b border-white/5 bg-slate-900/50">
          <h1 className="text-xl font-black text-indigo-500 italic">إدارة الطلاب</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">اختر طالباً لتخصيص أسئلته</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {users.map((u) => (
            <button 
              key={u.id} 
              onClick={() => selectUser(u)}
              className={`w-full p-5 rounded-2xl border transition-all text-right flex flex-row-reverse items-center justify-between group ${selectedUser?.id === u.id ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'}`}
            >
              <div className="flex flex-row-reverse items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-500'}`} />
                 <div className="truncate">
                    <div className={`font-bold text-sm ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-200'}`}>{u.username || 'طالب مجهول'}</div>
                    <div className={`text-[10px] opacity-40 ${selectedUser?.id === u.id ? 'text-indigo-100' : 'text-slate-400'}`}>{u.email}</div>
                 </div>
              </div>
              {u.is_active && <span className={`text-[8px] font-black px-2 py-1 rounded-full ${selectedUser?.id === u.id ? 'bg-white text-indigo-600' : 'bg-emerald-500/20 text-emerald-400'}`}>VIP</span>}
            </button>
          ))}
          {users.length === 0 && <p className="text-center opacity-20 py-10 italic">لا يوجد مستخدمون حالياً</p>}
        </div>
        <div className="p-4 border-t border-white/5">
           <button onClick={onExit} className="w-full py-4 bg-red-900/10 text-red-500 rounded-xl font-bold text-sm border border-red-500/20 hover:bg-red-900/20 transition-all">إغلاق اللوحة</button>
        </div>
      </aside>

      {/* منطقة العمل المركزية - محرر الأسئلة */}
      <main className="flex-1 h-full overflow-y-auto p-12 bg-[radial-gradient(circle_at_0%_0%,_#1e1b4b_0%,_transparent_40%)] custom-scrollbar">
        {selectedUser ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-left-6 duration-500">
            <header className="mb-10 flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">VIP Customizer</span>
                <h2 className="text-5xl font-black mb-2 italic">تخصيص أسئلة: {selectedUser.username}</h2>
                <p className="text-slate-400">{selectedUser.email}</p>
              </div>
              <div className={`px-6 py-3 rounded-2xl border font-bold text-sm flex items-center gap-2 ${selectedUser.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                {selectedUser.is_active ? '✅ حساب مفعل' : '⏳ بانتظار التفعيل'}
              </div>
            </header>

            {successMsg && (
              <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2rem] font-bold flex items-center justify-center gap-3 animate-bounce">
                <span>{successMsg}</span>
              </div>
            )}

            <div className="bg-slate-900/50 border border-white/5 p-10 rounded-[4rem] shadow-2xl">
              <div className="mb-8 border-b border-white/5 pb-6">
                <h3 className="text-xl font-black text-indigo-400">بنك الأسئلة المخصص (10 أسئلة)</h3>
                <p className="text-xs text-slate-500 mt-2">اكتب نص السؤال فقط، سيقوم النظام تلقائياً بتوزيعه في غرف المتاهة لهذا الطالب.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tempQuestions.map((q, idx) => (
                  <div key={idx} className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-2">
                      <span className="w-5 h-5 bg-indigo-600 rounded-md text-white flex items-center justify-center">{idx + 1}</span>
                      السؤال المخصص
                    </label>
                    <input 
                      type="text" 
                      placeholder="اكتب السؤال هنا..." 
                      className="w-full p-4 bg-slate-800/50 rounded-2xl border border-white/5 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all font-bold text-sm text-right"
                      value={q}
                      onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-12 flex gap-4">
                <button 
                  onClick={saveVipSettings}
                  disabled={loading}
                  className="flex-1 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-[2.5rem] font-black text-xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ وتفعيل VIP 🚀'}
                </button>
                <button 
                  onClick={() => selectUser(selectedUser)}
                  className="px-10 py-6 bg-slate-800 hover:bg-slate-700 text-white rounded-[2.5rem] font-black text-xl transition-all"
                >
                  إعادة ضبط
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
            <div className="text-[12rem] mb-8">👈</div>
            <h2 className="text-4xl font-black italic">اختر طالباً من القائمة الجانبية للبدء</h2>
            <p className="text-xl mt-4">يمكنك كتابة 10 أسئلة مخصصة لكل طالب على حدة</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
