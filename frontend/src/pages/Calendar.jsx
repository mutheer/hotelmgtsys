import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Users } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import GroupBookingModal from '../components/GroupBookingModal';
import Modal from '../components/Modal';

const API = 'http://localhost:5000/api';

const STATUS_COLORS = {
  CONFIRMED: 'var(--accent-primary)',
  CHECKED_IN: '#22c55e',
  CHECKED_OUT: '#6b7280',
  CANCELLED: '#ef4444',
  NO_SHOW: '#9ca3af',
  PENDING: '#f59e0b',
};

const Calendar = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Booking-detail modal state
  const [selected, setSelected] = useState(null);
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [booksRes, roomsRes] = await Promise.all([
        axios.get(`${API}/bookings`, { headers }),
        axios.get(`${API}/rooms`, { headers })
      ]);
      setBookings(booksRes.data);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openBooking = (booking) => {
    setSelected(booking);
    setEditCheckOut(new Date(booking.checkOutDate).toISOString().split('T')[0]);
    setEditNotes(booking.notes || '');
  };

  const closeBooking = () => {
    setSelected(null);
    setBusy(false);
  };

  const refreshSelected = async (id) => {
    // Re-fetch and re-pick the same booking so the modal reflects new status
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      setBookings(res.data);
      const updated = res.data.find(b => b.id === id);
      if (updated) {
        setSelected(updated);
        setEditCheckOut(new Date(updated.checkOutDate).toISOString().split('T')[0]);
        setEditNotes(updated.notes || '');
      } else {
        closeBooking();
      }
    } catch (_) {
      fetchData();
      closeBooking();
    }
  };

  const saveChanges = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/bookings/${selected.id}`,
        { checkOutDate: editCheckOut, notes: editNotes },
        { headers: { Authorization: `Bearer ${token}` } });
      await refreshSelected(selected.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const doCheckIn = async () => {
    if (!selected) return;
    if (!window.confirm('Check this guest in? This will open their folio.')) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/bookings/${selected.id}/checkin`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      await refreshSelected(selected.id);
      // Jump straight to the folio after a successful check-in
      const id = selected.id;
      closeBooking();
      navigate(`/billing?bookingId=${id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  const doTransfer = async () => {
    if (!selected) return;
    // Build a quick "Room X (Type)" list of currently vacant rooms
    const candidates = rooms.filter(r => r.id !== selected.roomId && (r.status === 'VACANT_CLEAN' || r.status === 'VACANT_DIRTY'));
    if (candidates.length === 0) return alert('No vacant rooms available to transfer into.');
    const list = candidates.map((r, i) => `${i + 1}. Room ${r.number} (${r.type?.name || ''}) — ${r.status}`).join('\n');
    const pick = window.prompt(`Transfer to which room?\n\n${list}\n\nEnter the number (1-${candidates.length}):`);
    if (!pick) return;
    const idx = parseInt(pick, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= candidates.length) return alert('Invalid choice.');
    const room = candidates[idx];
    const reason = window.prompt(`Move ${selected.guest?.firstName} to Room ${room.number}?\nReason for transfer:`) || '';
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/bookings/${selected.id}/transfer`, { newRoomId: room.id, reason }, { headers: { Authorization: `Bearer ${token}` } });
      await refreshSelected(selected.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Transfer failed');
    } finally {
      setBusy(false);
    }
  };

  const doNoShow = async () => {
    if (!selected) return;
    if (!window.confirm(`Mark this booking as NO-SHOW? The room will be released.`)) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/bookings/${selected.id}/no-show`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await refreshSelected(selected.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark no-show');
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!selected) return;
    const reason = window.prompt(
      `Cancel booking for ${selected.guest?.firstName} ${selected.guest?.lastName}?\nEnter reason:`
    );
    if (reason === null) return;
    const feeRaw = window.prompt('Cancellation fee (P)? Leave 0 if none:', '0');
    if (feeRaw === null) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/bookings/${selected.id}/cancel`,
        { reason: reason || 'Cancelled by staff', feeCharged: parseFloat(feeRaw) || 0 },
        { headers: { Authorization: `Bearer ${token}` } });
      await refreshSelected(selected.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setBusy(false);
    }
  };

  const goToFolio = () => {
    if (!selected) return;
    closeBooking();
    navigate(`/billing?bookingId=${selected.id}`);
  };

  // Date grid
  const getDates = () => {
    const dates = [];
    const [y, m, d] = startDate.split('-');
    const baseDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    for (let i = 0; i < 14; i++) {
      const dObj = new Date(baseDate);
      dObj.setDate(baseDate.getDate() + i);
      dates.push(dObj);
    }
    return dates;
  };
  const dates = getDates();

  const isBooked = (roomId, date) => {
    return bookings.find(b => {
      if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') return false;
      const cIn = new Date(b.checkInDate); cIn.setHours(0, 0, 0, 0);
      const cOut = new Date(b.checkOutDate); cOut.setHours(0, 0, 0, 0);
      const target = new Date(date); target.setHours(0, 0, 0, 0);
      return b.roomId === roomId && target >= cIn && target < cOut;
    });
  };

  const canEdit = selected && (selected.status === 'CONFIRMED' || selected.status === 'CHECKED_IN');
  const canCheckIn = selected && selected.status === 'CONFIRMED';
  const canCancel = selected && selected.status === 'CONFIRMED';
  const canTransfer = selected && selected.status === 'CHECKED_IN';
  const canNoShow = selected && selected.status === 'CONFIRMED' &&
    new Date(selected.checkInDate).getTime() < Date.now();
  const canViewFolio = selected && (selected.status === 'CHECKED_IN' || selected.status === 'CHECKED_OUT');

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0, marginBottom: '8px' }}>Availability Map</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Jump to date:</span>
            <input
              type="date"
              className="input-field"
              style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)' }}
              value={startDate}
              min={new Date().toISOString().split('T')[0]}
              max={new Date(new Date().setMonth(new Date().getMonth() + 24)).toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              onFocus={e => e.target.showPicker?.()}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
              Tip: click a guest's name to edit, check in, or cancel
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setIsGroupModalOpen(true)} style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}>
            <Users size={18} /> Group Booking
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Booking
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading availability...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
          <table style={{ borderCollapse: 'collapse', maxWidth: '100%', minWidth: '1000px', width: '100%' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ width: '160px', padding: '16px', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>Room</th>
                {dates.map((d, i) => (
                  <th key={i} style={{ padding: '12px 8px', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: d.getDay() === 0 || d.getDay() === 6 ? 'var(--accent-gold)' : 'var(--text-main)', fontSize: '0.85rem' }}>
                    <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div style={{ fontSize: '1.1rem', marginTop: '4px' }}>{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.id}>
                  <td style={{ padding: '12px 16px', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '600' }}>
                    Room {room.number}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 'normal' }}>{room.type?.name}</div>
                  </td>
                  {dates.map((d, i) => {
                    const booking = isBooked(room.id, d);
                    return (
                      <td key={i} style={{
                        padding: '4px',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: booking ? 'rgba(59, 130, 246, 0.10)' : 'transparent',
                        position: 'relative'
                      }}>
                        {booking && (
                          <button
                            type="button"
                            onClick={() => openBooking(booking)}
                            title={`${booking.guest?.firstName} ${booking.guest?.lastName} — ${booking.status} (click to edit)`}
                            style={{
                              all: 'unset',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              background: STATUS_COLORS[booking.status] || 'var(--accent-primary)',
                              height: '100%',
                              width: '100%',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '0.8rem',
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'block',
                              fontWeight: 500,
                              transition: 'filter 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                          >
                            {booking.groupId && <span style={{ marginRight: '4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: '3px' }}>GRP</span>}
                            {booking.guest?.firstName} {booking.guest?.lastName?.[0] || ''}.
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr><td colSpan={dates.length + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No rooms setup yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingCreated={fetchData}
      />

      <GroupBookingModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={fetchData}
      />

      {selected && (
        <Modal isOpen={!!selected} onClose={closeBooking} title="Booking Details">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '4px' }}>
              {selected.guest?.firstName} {selected.guest?.lastName}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span>Room {selected.room?.number || '—'}</span>
              <span>·</span>
              <span>{selected.source.replace('_', ' ')}</span>
              <span>·</span>
              <span style={{
                background: STATUS_COLORS[selected.status],
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>{selected.status.replace('_', ' ')}</span>
            </div>
            {selected.guest?.phone && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                📞 {selected.guest.phone}{selected.guest.email ? ` · ✉ ${selected.guest.email}` : ''}
              </div>
            )}
            {selected.depositPaid > 0 && (
              <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Deposit paid: P{selected.depositPaid}
              </div>
            )}
          </div>

          {canEdit ? (
            <form onSubmit={saveChanges}>
              <div className="input-group">
                <label className="input-label">Check-In Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={new Date(selected.checkInDate).toISOString().split('T')[0]}
                  disabled
                />
              </div>
              <div className="input-group">
                <label className="input-label">Check-Out Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={editCheckOut}
                  min={new Date(selected.checkInDate).toISOString().split('T')[0]}
                  onChange={e => setEditCheckOut(e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  onFocus={e => e.target.showPicker?.()}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Notes / Special Requests</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ flex: '1 1 140px' }}>
                  {busy ? 'Saving…' : 'Save Changes'}
                </button>
                {canCheckIn && (
                  <button type="button" onClick={doCheckIn} disabled={busy}
                    className="btn"
                    style={{ flex: '1 1 140px', background: '#22c55e', color: '#fff' }}>
                    Check In Guest
                  </button>
                )}
                {canViewFolio && (
                  <button type="button" onClick={goToFolio} disabled={busy}
                    className="btn"
                    style={{ flex: '1 1 140px', background: 'var(--accent-gold)', color: '#1a1a1a' }}>
                    Open Folio / Billing
                  </button>
                )}
                {canTransfer && (
                  <button type="button" onClick={doTransfer} disabled={busy}
                    className="btn"
                    style={{ flex: '1 1 140px', background: '#3b82f6', color: '#fff' }}>
                    Transfer Room
                  </button>
                )}
                {canNoShow && (
                  <button type="button" onClick={doNoShow} disabled={busy}
                    className="btn"
                    style={{ flex: '1 1 140px', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid #f59e0b' }}>
                    Mark No-Show
                  </button>
                )}
                {canCancel && (
                  <button type="button" onClick={doCancel} disabled={busy}
                    className="btn"
                    style={{ flex: '1 1 140px', background: '#ef4444', color: '#fff' }}>
                    Cancel Booking
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Check-In</div>
                  <div>{new Date(selected.checkInDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Check-Out</div>
                  <div>{new Date(selected.checkOutDate).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
              {selected.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Notes</div>
                  <div>{selected.notes}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                {canViewFolio && (
                  <button type="button" onClick={goToFolio}
                    className="btn"
                    style={{ flex: 1, background: 'var(--accent-gold)', color: '#1a1a1a' }}>
                    Open Folio / Billing
                  </button>
                )}
                <button type="button" onClick={closeBooking}
                  className="btn"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Calendar;
