import React, { useState } from 'react';
import axios from 'axios';
import { Search, Receipt, PlusCircle, CreditCard, ChevronRight } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

const Billing = () => {
  const [bookingId, setBookingId] = useState('');
  const [folio, setFolio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Add Service State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const fetchFolio = async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      // Use the booking ID to get the folio
      const res = await axios.get(`http://localhost:5000/api/billing/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolio(res.data);
    } catch (err) {
      setError('Folio not found or booking ID invalid.');
      setFolio(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handeAddService = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/billing/services`, {
        folioId: folio.id, 
        description: desc, 
        amount: parseFloat(amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDesc(''); setAmount('');
      fetchFolio();
    } catch (err) {
      alert("Failed to add charge");
    }
  };

  const handleCheckout = async () => {
    if (folio.calculatedBalance > 0) {
      alert(`Cannot checkout. Outstanding balance of P${folio.calculatedBalance.toFixed(2)} must be cleared first.`);
      return;
    }
    
    if(!window.confirm("Perform final checkout? This will clear the room status.")) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/billing/checkout`, { folioId: folio.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Checkout successful!");
      setFolio(null);
      setBookingId('');
    } catch (err) {
      alert(err.response?.data?.error || "Checkout failed");
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="page-title">Folios & Billing</h2>
      
      {!folio && (
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px' }}>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Enter a Booking ID to pull up the active guest folio.</p>
          <div className="input-group">
            <input 
              type="text" 
              className="input-field" 
              placeholder="Booking ID..."
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchFolio} disabled={isLoading}>
            <Search size={18} /> {isLoading ? 'Searching...' : 'Find Folio'}
          </button>
          {error && <p style={{ color: '#ef4444', marginTop: '15px' }}>{error}</p>}
        </div>
      )}

      {folio && (
        <div>
          <button className="btn" onClick={() => setFolio(null)} style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.05)' }}>
            &larr; Back to Search
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Col: Master Record */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem' }}>Folio #{folio.id.substring(0, 8)}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{folio.booking.guest.firstName} {folio.booking.guest.lastName} • Room {folio.booking.room?.number || 'Unassigned'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Stay: {new Date(folio.booking.checkInDate).toLocaleDateString()} - {new Date(folio.booking.checkOutDate).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: folio.calculatedBalance > 0 ? '#ef4444' : '#22c55e' }}>P{folio.calculatedBalance.toFixed(2)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Balance Due</div>
                </div>
              </div>

              <h4 style={{ marginBottom: '15px' }}>Service Charges</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <tbody>
                  {folio.services.map(s => (
                     <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{new Date(s.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 0' }}>{s.description}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>P{s.amount.toFixed(2)}</td>
                     </tr>
                  ))}
                  {folio.services.length === 0 && <tr><td colSpan="3" style={{ padding: '12px 0', color: 'var(--text-muted)' }}>No additional services charged yet.</td></tr>}
                </tbody>
              </table>
              
              <h4 style={{ marginBottom: '15px' }}>Payments Applied</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {folio.payments.map(p => (
                     <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 0' }}>{p.method.replace('_', ' ')} <small>({p.reference})</small></td>
                        <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>-P{p.amount.toFixed(2)}</td>
                     </tr>
                  ))}
                  {folio.payments.length === 0 && <tr><td colSpan="3" style={{ padding: '12px 0', color: 'var(--text-muted)' }}>No payments received yet.</td></tr>}
                </tbody>
              </table>

            </div>

            {/* Right Col: Actions */}
            <div>
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={18} color="var(--accent-gold)" /> Post Service Charge</h4>
                <form onSubmit={handeAddService}>
                  <div className="input-group">
                    <input type="text" className="input-field" placeholder="e.g. Laundry (2 items)" value={desc} onChange={e => setDesc(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <input type="number" className="input-field" placeholder="Amount (e.g. 150)" value={amount} onChange={e => setAmount(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">Add Charge</button>
                </form>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                 <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={18} color="#3b82f6" /> Financial Settlement</h4>
                 <button 
                    className="btn btn-block" 
                    onClick={() => setIsPaymentModalOpen(true)}
                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)', marginBottom: '15px', color: 'var(--text-main)' }}
                 >
                    Receive Payment
                 </button>
                 <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '20px 0' }} />
                 <button 
                    className="btn btn-block" 
                    onClick={handleCheckout}
                    style={{ background: '#22c55e', color: '#fff' }}
                 >
                    Final Checkout <ChevronRight size={18} />
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {folio && (
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => setIsPaymentModalOpen(false)} 
          folioId={folio.id} 
          onPaymentReceived={fetchFolio} 
        />
      )}
    </div>
  );
};
