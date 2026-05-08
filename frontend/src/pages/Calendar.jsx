import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Check, X, Edit2 } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import Modal from '../components/Modal';

const API = 'http://localhost:5000/api';

const Calendar = () => {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Default to today, but allow scrolling up to 24 months
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [booksRes, roomsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/bookings', { headers }),
          axios.get('http://localhost:5000/api/rooms', { headers })
      ]);
      
      setBookings(booksRes.data);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error("Failed to fetch calendar data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (bookingId) => {
    if(!window.confirm("Confirm Guest Check-In? This will open their folio.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/checkin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Check-in failed");
    }
  };

  const openEdit = (booking, e) => {
    e.stopPropagation();
    setEditBooking(booking);
    setEditCheckOut(new Date(booking.checkOutDate).toISOString().split('T')[0]);
    setEditNotes(booking.notes || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/bookings/${editBooking.id}`, { checkOutDate: editCheckOut, notes: editNotes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditBooking(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    }
  };

  const handleCancel = async (bookingId, guestName, e) => {
    e.stopPropagation();
    const reason = window.prompt(`Cancel booking for ${guestName}?\nEnter reason (or leave blank):`);
    if (reason === null) return; // user pressed Cancel on prompt
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/cancel`, { reason: reason || 'Cancelled by staff' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Cancellation failed");
    }
  };

  // Generate an array of dates starting from selected date for 14 days
  const getDates = () => {
    const dates = [];
    const [y, m, d] = startDate.split('-');
    const baseDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    
    for(let i = 0; i < 14; i++) {
        const dObj = new Date(baseDate);
        dObj.setDate(baseDate.getDate() + i);
        dates.push(dObj);
    }
    return dates;
  };

  const dates = getDates();

  const isBooked = (roomId, date) => {
    return bookings.find(b => {
        if(b.status === 'CANCELLED' || b.status === 'NO_SHOW') return false;
        
        const cIn = new Date(b.checkInDate);
        const cOut = new Date(b.checkOutDate);
        cIn.setHours(0,0,0,0);
        cOut.setHours(0,0,0,0);
        const target = new Date(date);
        target.setHours(0,0,0,0);
        
        return b.roomId === roomId && target >= cIn && target < cOut;
    });
  };

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
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Booking
        </button>
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
                                        background: booking ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        position: 'relative'
                                    }}>
                                        {booking && (
                                            <div 
                                                title={`${booking.guest?.firstName} ${booking.guest?.lastName} - ${booking.status}`}
                                                style={{
                                                    background: booking.status === 'CHECKED_IN' ? '#22c55e' : 'var(--accent-primary)',
                                                    height: '100%',
                                                    width: '100%',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    fontSize: '0.75rem',
                                                    color: '#fff',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <span>{booking.guest?.firstName}</span>
                                                {booking.status === 'CONFIRMED' && (
                                                    <span style={{ display: 'flex', gap: '2px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(booking.id); }}
                                                            title="Check In"
                                                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <Check size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => openEdit(booking, e)}
                                                            title="Edit Booking"
                                                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleCancel(booking.id, `${booking.guest?.firstName} ${booking.guest?.lastName}`, e)}
                                                            title="Cancel Booking"
                                                            style={{ background: 'rgba(239,68,68,0.4)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                )
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

      {editBooking && (
        <Modal isOpen={!!editBooking} onClose={() => setEditBooking(null)} title="Edit Booking">
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            {editBooking.guest?.firstName} {editBooking.guest?.lastName} — Room {editBooking.room?.number}
          </p>
          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <label className="input-label">Check-Out Date</label>
              <input
                type="date"
                className="input-field"
                value={editCheckOut}
                min={new Date(editBooking.checkInDate).toISOString().split('T')[0]}
                onChange={e => setEditCheckOut(e.target.value)}
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
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              <button type="button" className="btn" onClick={() => setEditBooking(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Calendar;
