import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { Users } from 'lucide-react';

const API = 'http://localhost:5000/api';

const SOURCES = ['WALK_IN', 'PHONE', 'WHATSAPP', 'BOOKING_COM', 'AIRBNB', 'AGODA', 'FACEBOOK', 'INSTAGRAM', 'WEBSITE_DIRECT', 'OTHER'];

const GroupBookingModal = ({ isOpen, onClose, onCreated }) => {
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    groupName: '',
    organizerId: '',
    source: '',
    checkInDate: '',
    checkOutDate: '',
    totalDeposit: '0',
    notes: '',
    selectedRoomIds: []
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    axios.get(`${API}/guests`, { headers }).then(r => setGuests(r.data)).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) { setRooms([]); return; }
    axios.get(`${API}/rooms/available?start=${form.checkInDate}&end=${form.checkOutDate}`, { headers })
      .then(r => setRooms(r.data))
      .catch(() => setRooms([]));
  }, [form.checkInDate, form.checkOutDate]);

  const toggleRoom = (roomId) => {
    setForm(f => ({
      ...f,
      selectedRoomIds: f.selectedRoomIds.includes(roomId)
        ? f.selectedRoomIds.filter(id => id !== roomId)
        : [...f.selectedRoomIds, roomId]
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.selectedRoomIds.length < 2) {
      setError('Pick at least 2 rooms — a single-room booking is just a normal booking.');
      return;
    }
    setLoading(true); setError('');
    try {
      const chosenRooms = rooms
        .filter(r => form.selectedRoomIds.includes(r.id))
        .map(r => ({ roomId: r.id, roomTypeId: r.roomTypeId }));

      await axios.post(`${API}/bookings/groups`, {
        groupName: form.groupName,
        organizerId: form.organizerId,
        source: form.source,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        totalDeposit: parseFloat(form.totalDeposit) || 0,
        notes: form.notes,
        rooms: chosenRooms
      }, { headers });
      onCreated?.();
      onClose();
      // Reset
      setForm({ groupName: '', organizerId: '', source: '', checkInDate: '', checkOutDate: '', totalDeposit: '0', notes: '', selectedRoomIds: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group booking');
    } finally {
      setLoading(false);
    }
  };

  // Group available rooms by room type so the UI is scannable
  const byType = rooms.reduce((acc, r) => {
    const key = r.type?.name || 'Other';
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Booking">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-20px', marginBottom: '20px' }}>
        For weddings, conferences, family reunions — one organiser, multiple rooms, same dates.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Group Name</label>
            <input className="input-field" value={form.groupName}
              placeholder="e.g. Mokoena Wedding"
              onChange={e => setForm({ ...form, groupName: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Organiser (Contact Guest)</label>
            <select className="input-field" value={form.organizerId}
              onChange={e => setForm({ ...form, organizerId: e.target.value })} required>
              <option value="">— Select organiser —</option>
              {guests.map(g => (
                <option key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.phone})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Check-In Date</label>
            <input type="date" className="input-field"
              min={new Date().toISOString().split('T')[0]}
              value={form.checkInDate}
              onChange={e => setForm({ ...form, checkInDate: e.target.value, selectedRoomIds: [] })}
              onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()}
              required />
          </div>
          <div className="input-group">
            <label className="input-label">Check-Out Date</label>
            <input type="date" className="input-field"
              min={form.checkInDate || new Date().toISOString().split('T')[0]}
              value={form.checkOutDate}
              onChange={e => setForm({ ...form, checkOutDate: e.target.value, selectedRoomIds: [] })}
              onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()}
              required />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Source</label>
            <select className="input-field" value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })} required>
              <option value="">— Mandatory —</option>
              {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Total Deposit (P)</label>
            <input type="number" step="0.01" className="input-field"
              value={form.totalDeposit}
              onChange={e => setForm({ ...form, totalDeposit: e.target.value })} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            Rooms — pick at least 2 ({form.selectedRoomIds.length} selected)
          </label>
          {!form.checkInDate || !form.checkOutDate ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '10px 0' }}>
              Pick dates first to see what's available.
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ color: '#ef4444', fontSize: '0.9rem', padding: '10px 0' }}>
              No rooms available for these dates.
            </div>
          ) : (
            <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px' }}>
              {Object.entries(byType).map(([typeName, rs]) => (
                <div key={typeName} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {typeName} — P{rs[0].type?.basePrice}/night
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {rs.map(r => {
                      const selected = form.selectedRoomIds.includes(r.id);
                      return (
                        <button key={r.id} type="button" onClick={() => toggleRoom(r.id)}
                          style={{
                            all: 'unset', cursor: 'pointer',
                            padding: '8px 14px', borderRadius: '6px',
                            border: selected ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                            background: selected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                            color: selected ? 'var(--accent-gold)' : 'var(--text-main)',
                            fontWeight: selected ? 600 : 400,
                            fontSize: '0.9rem'
                          }}>
                          Room {r.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea className="input-field" rows="2" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ resize: 'vertical' }}
            placeholder="e.g. Set up tea/coffee for 8 people in Room 9 on arrival" />
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '14px', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading || form.selectedRoomIds.length < 2} style={{ flex: 1 }}>
            <Users size={16} /> {loading ? 'Creating…' : `Create Group (${form.selectedRoomIds.length} rooms)`}
          </button>
          <button type="button" className="btn" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default GroupBookingModal;
