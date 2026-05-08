import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, UserCheck, UserX, KeyRound } from 'lucide-react';
import Modal from '../components/Modal';

const API = 'http://localhost:5000/api';

const ROLE_COLORS = {
  OWNER: { bg: 'rgba(212,175,55,0.15)', text: '#d4af37' },
  RECEPTIONIST: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  ACCOUNTANT: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
};

const Staff = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'RECEPTIONIST' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = () => {
    axios.get(`${API}/auth/users`, { headers })
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => {
    setEditUser(null);
    setForm({ username: '', password: '', name: '', role: 'RECEPTIONIST' });
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, password: '', name: user.name, role: user.role });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const payload = { name: form.name };
        if (form.password) payload.password = form.password;
        await axios.patch(`${API}/auth/users/${editUser.id}`, payload, { headers });
      } else {
        await axios.post(`${API}/auth/users`, form, { headers });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    if (user.id === me.id) return;
    const action = user.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} account for ${user.name}?`)) return;
    try {
      await axios.patch(`${API}/auth/users/${user.id}`, { isActive: !user.isActive }, { headers });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Staff Accounts</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Manage who can log in to the system</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <UserPlus size={16} /> Add Staff
        </button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
          {users.map(user => {
            const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.RECEPTIONIST;
            return (
              <div key={user.id} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: user.isActive ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: roleStyle.bg, color: roleStyle.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600' }}>{user.name} {user.id === me.id && <small style={{ color: 'var(--text-muted)' }}>(you)</small>}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{user.username}</div>
                  </div>
                  <span style={{ background: roleStyle.bg, color: roleStyle.text, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {user.role}
                  </span>
                  {!user.isActive && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>INACTIVE</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(user)} className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <KeyRound size={14} /> Edit
                  </button>
                  {user.id !== me.id && (
                    <button onClick={() => toggleActive(user)} className="btn" style={{ background: user.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: user.isActive ? '#ef4444' : '#22c55e', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {user.isActive ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Reactivate</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editUser ? `Edit — ${editUser.name}` : 'Add Staff Account'}>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input className="input-field" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          {!editUser && (
            <div className="input-group">
              <label className="input-label">Username</label>
              <input className="input-field" type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">{editUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
            <input className="input-field" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editUser} />
          </div>
          {!editUser && (
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
          )}
          {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create Account'}</button>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Staff;
