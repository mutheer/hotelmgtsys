import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Search, Edit, History, ExternalLink } from 'lucide-react';
import GuestModal from '../components/GuestModal';
import Modal from '../components/Modal';

const API = 'http://localhost:5000/api';

const Guests = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [historyGuest, setHistoryGuest] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/guests`, { headers });
      setGuests(res.data);
    } catch (err) {
      console.error("Failed to fetch guests", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []);

  // If we landed here via search ?guestId=..., open the history modal directly
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('guestId');
    if (id) openHistory({ id });
  }, [location.search]);

  const openHistory = async (g) => {
    try {
      const res = await axios.get(`${API}/guests/${g.id}`, { headers });
      setHistoryGuest(res.data);
    } catch {
      alert('Could not load guest history.');
    }
  };

  const handleEdit = (guest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedGuest(null);
    setIsModalOpen(true);
  };

  const filteredGuests = guests.filter(g => 
    g.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm)
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Guest Registry</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          <UserPlus size={18} /> Add New Guest
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            style={{ width: '100%', paddingLeft: '40px' }} 
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p>Loading guests...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px' }}>Name</th>
                <th style={{ padding: '16px' }}>Phone</th>
                <th style={{ padding: '16px' }}>ID / Passport</th>
                <th style={{ padding: '16px' }}>DOB</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.length > 0 ? filteredGuests.map(guest => (
                <tr key={guest.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '16px', fontWeight: '500' }}>{guest.firstName} {guest.lastName}</td>
                  <td style={{ padding: '16px' }}>{guest.phone}</td>
                  <td style={{ padding: '16px' }}>{guest.idNumber || 'N/A'} <small style={{ color: 'var(--text-muted)' }}>({guest.idType || 'None'})</small></td>
                  <td style={{ padding: '16px' }}>{guest.dob ? new Date(guest.dob).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: '16px' }}>
                    {guest.isRepeat ? (
                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', fontSize: '0.8rem' }}>Repeat</span>
                    ) : (
                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>New</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button onClick={() => openHistory(guest)} title="View stay history"
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', marginRight: '6px' }}>
                      <History size={18} />
                    </button>
                    <button onClick={() => handleEdit(guest)} title="Edit"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No guests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <GuestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGuestCreated={fetchGuests}
        initialData={selectedGuest}
      />

      {historyGuest && (
        <Modal isOpen={!!historyGuest} onClose={() => setHistoryGuest(null)} title={`${historyGuest.firstName} ${historyGuest.lastName} — Stay History`}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {historyGuest.phone}{historyGuest.email ? ` · ${historyGuest.email}` : ''}{historyGuest.idNumber ? ` · ${historyGuest.idType}: ${historyGuest.idNumber}` : ''}
          </div>
          {!historyGuest.bookings || historyGuest.bookings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>This guest has no bookings yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total stays: <strong style={{ color: 'var(--text-main)' }}>{historyGuest.bookings.length}</strong>
                {' · '}Total billed:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  P{historyGuest.bookings.reduce((s, b) => s + (b._summary?.totalBilled || 0), 0).toFixed(2)}
                </strong>
              </div>
              {historyGuest.bookings.map(b => (
                <div key={b.id} style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        Room {b.room?.number || '—'} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>({b.room?.type?.name || '—'})</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(b.checkInDate).toLocaleDateString('en-GB')} → {new Date(b.checkOutDate).toLocaleDateString('en-GB')} ({b._summary?.nights} night{b._summary?.nights !== 1 ? 's' : ''})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Source: {b.source.replace('_', ' ')}
                        {b.groupId && <span> · part of a group</span>}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                      background: b.status === 'CHECKED_OUT' ? 'rgba(107,114,128,0.2)'
                        : b.status === 'CHECKED_IN' ? 'rgba(34,197,94,0.2)'
                        : b.status === 'CONFIRMED' ? 'rgba(59,130,246,0.2)'
                        : b.status === 'CANCELLED' ? 'rgba(239,68,68,0.2)'
                        : 'rgba(255,255,255,0.1)',
                      color: b.status === 'CHECKED_OUT' ? '#9ca3af'
                        : b.status === 'CHECKED_IN' ? '#86efac'
                        : b.status === 'CONFIRMED' ? '#93c5fd'
                        : b.status === 'CANCELLED' ? '#fca5a5'
                        : '#fff'
                    }}>{b.status}</span>
                  </div>
                  {b.folio && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Billed: </span><strong>P{b._summary?.totalBilled.toFixed(2)}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '14px' }}>Paid: </span><strong>P{b._summary?.payments.toFixed(2)}</strong>
                        {b._summary?.balance > 0.0001 && (
                          <><span style={{ color: '#ef4444', marginLeft: '14px' }}>Balance: <strong>P{b._summary.balance.toFixed(2)}</strong></span></>
                        )}
                      </div>
                      <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => { setHistoryGuest(null); navigate(`/billing?bookingId=${b.id}`); }}>
                        <ExternalLink size={12} /> Open folio
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Guests;
