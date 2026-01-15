import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface UserProfile {
  id: string;
  email: string;
  username: string;
}

const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        setStatus('loading');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, username');

        if (error) throw error;
        setUsers(data || []);
        setStatus('ready');
      } catch (err: any) {
        console.error("Admin fetch error:", err);
        setErrorMessage(err.message || "فشل الاتصال بقاعدة البيانات");
        setStatus('error');
      }
    }
    loadUsers();
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#020617', color: 'white',
      zIndex: 10000, padding: '20px', fontFamily: 'sans-serif', direction: 'rtl'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>لوحة التحكم (Admin)</h1>
        <button onClick={onExit} style={{ padding: '8px 20px', backgroundColor: '#ef4444', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}>خروج</button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '10px' }}>
        {status === 'loading' && <p>جاري جلب قائمة المستخدمين...</p>}
        
        {status === 'error' && (
          <div style={{ color: '#f87171' }}>
            <p>خطأ: {errorMessage}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '10px', color: '#6366f1', background: 'none', border: '1px solid #6366f1', padding: '5px 10px', cursor: 'pointer' }}>إعادة المحاولة</button>
          </div>
        )}

        {status === 'ready' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'right', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '10px' }}>الإيميل</th>
                <th style={{ padding: '10px' }}>اسم المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>لا يوجد مستخدمين مسجلين بعد.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px' }}>{u.email}</td>
                    <td style={{ padding: '10px' }}>{u.username}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
