import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

const PaymentModal = ({ isOpen, onClose, folioId, onPaymentReceived }) => {
  const [formData, setFormData] = useState({
    folioId,
    amount: '',
    method: 'CASH',
    reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const methods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card / Swipe' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'EFT', label: 'EFT / Transfer' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/billing/payment', {
        ...formData,
        amount: parseFloat(formData.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onPaymentReceived();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Amount (Pula)</label>
          <input 
            type="number" 
            className="input-field" 
            placeholder="0.00"
            step="0.01"
            value={formData.amount} 
            onChange={e => setFormData({...formData, amount: e.target.value})} 
            required 
          />
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Payment Method</label>
            <select 
              className="input-field" 
              value={formData.method} 
              onChange={e => setFormData({...formData, method: e.target.value})}
              required
            >
              {methods.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Reference / Note</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. TXN-12345"
              value={formData.reference} 
              onChange={e => setFormData({...formData, reference: e.target.value})} 
            />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Recording...' : 'Post Payment'}
          </button>
          <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
