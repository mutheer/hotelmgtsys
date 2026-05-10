import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, User, KeyRound, LogOut } from 'lucide-react';
import Modal from './Modal';

const API = 'http://localhost:5000/api';

const TopBar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ guests: [], bookings: [] });
  const [showResults, setShowResults] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdErr, setPwdErr] = useState('');
  const [pwdOk, setPwdOk] = useState('');

  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults({ guests: [], bookings: [] }); return; }
    debounceRef.current = setTimeout(() => {
      axios.get(`${API}/search?q=${encodeURIComponent(q)}`, { headers })
        .then(r => setResults(r.data))
        .catch(() => setResults({ guests: [], bookings: [] }));
    }, 250);
  }, [q]);

  // Click-outside closes both popovers
  useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwdErr(''); setPwdOk('');
    if (pwd.next !== pwd.confirm) return setPwdErr('New passwords do not match.');
    if (pwd.next.length < 6) return setPwdErr('New password must be at least 6 characters.');
    try {
      await axios.post(`${API}/auth/change-password`, { currentPassword: pwd.current, newPassword: pwd.next }, { headers });
      setPwdOk('Password updated.');
      setPwd({ current: '', next: '', confirm: '' });
      setTimeout(() => { setShowPwd(false); setPwdOk(''); }, 1200);
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'Failed to change password.');
    }
  };

  const goToBooking = (b) => {
    setShowResults(false); setQ('');
    navigate(`/billing?bookingId=${b.id}`);
  };
  const goToGuests = (g) => {
    setShowResults(false); setQ('');
    navigate(`/guests?guestId=${g.id}`);
  };

  const totalResults = results.guests.length + results.bookings.length;

  return (
    <header className="topbar" ref={containerRef}>
      <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '480px' }}>
        <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <Search size={16} />
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="Search guests or booking ID…"
          value={q}
          onChange={e => { setQ(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          style={{ width: '100%', paddingLeft: '36px', padding: '8px 12px 8px 36px', background: 'rgba(255,255,255,0.05)' }}
        />
        {showResults && q.trim().length >= 2 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '380px', overflowY: 'auto', zIndex: 50 }}>
            {totalResults === 0 ? (
              <div style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No matches</div>
            ) : (
              <>
                {results.guests.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Guests</div>
                    {results.guests.map(g => (
                      <div key={g.id} onClick={() => goToGuests(g)} style={{ padding: '10px 12px', cursor: 'pointer', borderTop: '1px solid var(--border-light)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div>{g.firstName} {g.lastName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.phone}{g.email ? ` · ${g.email}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
                {results.bookings.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bookings</div>
                    {results.bookings.map(b => (
                      <div key={b.id} onClick={() => goToBooking(b)} style={{ padding: '10px 12px', cursor: 'pointer', borderTop: '1px solid var(--border-light)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div>{b.guest?.firstName} {b.guest?.lastName} — Room {b.room?.number || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.status} · {new Date(b.checkInDate).toLocaleDateString('en-GB')} → {new Date(b.checkOutDate).toLocaleDateString('en-GB')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
        <span style={{ color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <div
          onClick={() => setShowMenu(v => !v)}
          title="Account menu"
          style={{ height: '35px', width: '35px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
          {user?.name?.charAt(0) || 'U'}
        </div>
        {showMenu && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', minWidth: '200px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user?.username} · {user?.role}</div>
            </div>
            <button onClick={() => { setShowMenu(false); setShowPwd(true); }} style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <KeyRound size={14} /> Change Password
            </button>
            <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer', width: '100%', boxSizing: 'border-box', color: '#fca5a5' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>

      {showPwd && (
        <Modal isOpen={showPwd} onClose={() => setShowPwd(false)} title="Change Password">
          <form onSubmit={submitPasswordChange}>
            <div className="input-group">
              <label className="input-label">Current Password</label>
              <input type="password" className="input-field" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input type="password" className="input-field" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input type="password" className="input-field" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} required />
            </div>
            {pwdErr && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{pwdErr}</p>}
            {pwdOk && <p style={{ color: '#22c55e', marginBottom: '12px', fontSize: '0.9rem' }}>{pwdOk}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Password</button>
              <button type="button" className="btn" onClick={() => setShowPwd(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
};

export default TopBar;
