import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

const GuestModal = ({ isOpen, onClose, onGuestCreated, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idType: 'Passport',
    idNumber: '',
    dob: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (initialData?.id) {
        await axios.put(`http://localhost:5000/api/guests/${initialData.id}`, formData, { headers });
      } else {
        await axios.post('http://localhost:5000/api/guests', formData, { headers });
      }
      
      onGuestCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save guest profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Guest Profile' : 'Register New Guest'}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">First Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.firstName} 
              onChange={e => setFormData({...formData, firstName: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Last Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.lastName} 
              onChange={e => setFormData({...formData, lastName: e.target.value})} 
              required 
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input 
              type="tel" 
              className="input-field" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email (Optional)</label>
            <input 
              type="email" 
              className="input-field" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">ID Type</label>
            <select 
              className="input-field" 
              value={formData.idType} 
              onChange={e => setFormData({...formData, idType: e.target.value})}
            >
              <option value="Passport">Passport</option>
              <option value="Omang">Omang (ID)</option>
              <option value="Driver License">Driver's License</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">ID Number (Optional)</label>
            <input
              type="text"
              className="input-field"
              value={formData.idNumber}
              onChange={e => setFormData({...formData, idNumber: e.target.value})}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Date of Birth (Optional)</label>
            <input
              type="date"
              className="input-field"
              value={formData.dob}
              onChange={e => setFormData({...formData, dob: e.target.value})}
              onClick={e => e.target.showPicker?.()}
              onFocus={e => e.target.showPicker?.()}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Address</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
            />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Saving...' : initialData ? 'Update Profile' : 'Register Guest'}
          </button>
          <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default GuestModal;
