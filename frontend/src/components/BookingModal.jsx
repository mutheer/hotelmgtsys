import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';

const BookingModal = ({ isOpen, onClose, onBookingCreated }) => {
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    guestId: '',
    checkInDate: '',
    checkOutDate: '',
    roomId: '',
    source: '', // Mandatory
    notes: '',
    depositPaid: '0'
  });

  const sources = [
    'WALK_IN', 'PHONE', 'WHATSAPP', 'BOOKING_COM', 'AIRBNB', 
    'AGODA', 'FACEBOOK', 'INSTAGRAM', 'WEBSITE_DIRECT', 'OTHER'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const guestsRes = await axios.get('http://localhost:5000/api/guests', { headers });
      setGuests(guestsRes.data);
    } catch (err) {
      console.error("Failed to load guests", err);
    }
  };

  const checkAvailability = async () => {
    if (!formData.checkInDate || !formData.checkOutDate) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/rooms/available?start=${formData.checkInDate}&end=${formData.checkOutDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) {
      console.error("Failed to check availability", err);
    }
  };

  useEffect(() => {
    checkAvailability();
  }, [formData.checkInDate, formData.checkOutDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.source) {
      setError('Please select a booking source.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/bookings', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onBookingCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Reservation">
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Select Guest</label>
          <select 
            className="input-field" 
            value={formData.guestId} 
            onChange={e => setFormData({...formData, guestId: e.target.value})}
            required
          >
            <option value="">-- Select or Search Guest --</option>
            {guests.map(g => (
              <option key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.phone})</option>
            ))}
          </select>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Check-In Date</label>
            <input 
              type="date" 
              className="input-field" 
              min={new Date().toISOString().split('T')[0]}
              value={formData.checkInDate} 
              onChange={e => setFormData({...formData, checkInDate: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Check-Out Date</label>
            <input 
              type="date" 
              className="input-field" 
              min={formData.checkInDate || new Date().toISOString().split('T')[0]}
              value={formData.checkOutDate} 
              onChange={e => setFormData({...formData, checkOutDate: e.target.value})} 
              required 
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Available Rooms</label>
            <select 
              className="input-field" 
              value={formData.roomId} 
              onChange={e => setFormData({...formData, roomId: e.target.value})}
              required
              disabled={rooms.length === 0}
            >
              <option value="">{rooms.length > 0 ? '-- Select Room --' : 'No rooms available for dates'}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>Room {r.number} - {r.type.name} (P{r.type.basePrice})</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Booking Source</label>
            <select 
              className="input-field" 
              value={formData.source} 
              onChange={e => setFormData({...formData, source: e.target.value})}
              required
            >
              <option value="">-- Mandatory Selection --</option>
              {sources.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Notes / Special Requests</label>
          <textarea 
            className="input-field" 
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={formData.notes} 
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || !formData.roomId}>
            {loading ? 'Creating...' : 'Confirm Reservation'}
          </button>
          <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BookingModal;
