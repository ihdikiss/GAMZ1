
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Profile {
  id: string;
  email: string;
  username: string;
}

const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, username');

        if (error) throw error;
        setUsers(data || []);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || "فشل في جلب المستخدمين");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#0f172a',
      color: 'white',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>لوحة التحكم Admin</h1>
        <button 
          onClick={onExit}
          style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          خروج
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#818cf8' }}>قائمة المستخدمين المسجلين</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', opacity: 0.6, marginTop: '40px' }}>جاري جلب المستخدمين...</p>
        ) : error ? (
          <p style={{ color: '#f87171', backgroundColor: '#450a0a', padding: '15px', borderRadius: '8px' }}>{error}</p>
        ) : users.length === 0 ? (
          <p style={{ opacity: 0.5 }}>لا يوجد مستخدمين حالياً</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {users.map((u) => (
              <li key={u.id} style={{ 
                padding: '12px', 
                borderBottom: '1px solid #334155', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontWeight: 'bold' }}>{u.email}</span>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>الاسم: {u.username || 'غير محدد'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <p style={{ marginTop: '20px', fontSize: '10px', opacity: 0.3, textAlign: 'center' }}>
        Production Ready Admin Panel - Space Maze Chase
      </p>
    </div>
  );
};

export default AdminPanel;
