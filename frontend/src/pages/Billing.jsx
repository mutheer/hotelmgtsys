import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, PlusCircle, CreditCard, ChevronRight, Printer, Coffee, Shirt, Car, Tag } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

const API = 'http://localhost:5000/api';

const QUICK_SERVICES = [
  { label: 'Breakfast', icon: <Coffee size={14} />, settingKey: 'SERVICE_BREAKFAST_PRICE', defaultAmt: 100 },
  { label: 'Laundry', icon: <Shirt size={14} />, settingKey: 'SERVICE_LAUNDRY_PRICE', defaultAmt: 80 },
  { label: 'Airport Shuttle', icon: <Car size={14} />, settingKey: 'SERVICE_AIRPORT_TRANSFER_PRICE', defaultAmt: 150 },
];

const Billing = () => {
  const [bookingId, setBookingId] = useState('');
  const [folio, setFolio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/settings`, { headers })
      .then(r => setSettings(r.data))
      .catch(() => {});
  }, []);

  const fetchFolio = async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/billing/${bookingId}`, { headers });
      setFolio(res.data);
    } catch {
      setError('Folio not found or booking ID invalid.');
      setFolio(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async (e, quickDesc = null, quickAmt = null) => {
    if (e) e.preventDefault();
    const serviceDesc = quickDesc || desc;
    const serviceAmt = quickAmt || parseFloat(amount);
    if (!serviceDesc || !serviceAmt) return;
    try {
      await axios.post(`${API}/billing/service`, {
        folioId: folio.id,
        description: serviceDesc,
        amount: serviceAmt
      }, { headers });
      setDesc(''); setAmount('');
      fetchFolio();
    } catch {
      alert('Failed to add charge');
    }
  };

  const handleQuickService = (svc) => {
    const price = parseFloat(settings[svc.settingKey]) || svc.defaultAmt;
    handleAddService(null, svc.label, price);
  };

  const handleCheckout = async () => {
    if (folio.calculatedBalance > 0) {
      alert(`Cannot checkout. Outstanding balance of P${folio.calculatedBalance.toFixed(2)} must be cleared first.`);
      return;
    }
    if (!window.confirm('Perform final checkout? This will clear the room status.')) return;
    try {
      await axios.post(`${API}/billing/${folio.id}/checkout`, {}, { headers });
      alert('Checkout successful!');
      setFolio(null);
      setBookingId('');
    } catch (err) {
      alert(err.response?.data?.error || 'Checkout failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!folio) {
    return (
      <div className="animate-fade-in">
        <h2 className="page-title">Folios & Billing</h2>
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px' }}>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Enter a Booking ID to pull up the active guest folio.</p>
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Booking ID..."
              value={bookingId}
              onChange={e => setBookingId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchFolio()}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchFolio} disabled={isLoading}>
            <Search size={18} /> {isLoading ? 'Searching...' : 'Find Folio'}
          </button>
          {error && <p style={{ color: '#ef4444', marginTop: '15px' }}>{error}</p>}
        </div>
      </div>
    );
  }

  const guest = folio.booking?.guest;
  const room = folio.booking?.room;

  return (
    <div className="animate-fade-in">
      {/* Screen header — hidden when printing */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn" onClick={() => setFolio(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>
          &larr; Back to Search
        </button>
        <button className="btn" onClick={handlePrint} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Printer size={16} /> Print Invoice
        </button>
      </div>

      {/* ===== PRINTABLE INVOICE AREA ===== */}
      <div id="invoice-print">
        {/* Print-only header */}
        <div className="print-only" style={{ marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>The Melva Elegant Guest House</h1>
          <p style={{ color: '#555', margin: '4px 0' }}>Gabamutsha, Block 8, Gaborone, Botswana</p>
          <p style={{ color: '#555', margin: '4px 0' }}>Tel: +267 — | info@themelva.com</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Left: Folio Detail */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Folio #{folio.id.substring(0, 8).toUpperCase()}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{guest?.firstName} {guest?.lastName} • Room {room?.number || 'Unassigned'}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Stay: {new Date(folio.booking.checkInDate).toLocaleDateString('en-GB')} — {new Date(folio.booking.checkOutDate).toLocaleDateString('en-GB')}
                </p>
                {guest?.idNumber && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ID: {guest.idNumber}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: folio.calculatedBalance > 0 ? '#ef4444' : '#22c55e' }}>
                  P{folio.calculatedBalance.toFixed(2)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Balance Due</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '15px' }}>Charges</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 'normal' }}>Date</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 'normal' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'normal' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(folio.booking.checkInDate).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px 0' }}>
                    Room {room?.number} — Accommodation
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>{folio.nights} night{folio.nights !== 1 ? 's' : ''} × P{folio.ratePerNight?.toFixed(2)} ({room?.type?.name})</small>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>P{folio.roomBaseCharge?.toFixed(2)}</td>
                </tr>
                {folio.services.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '12px 0' }}>{s.description}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>P{s.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border-light)', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '12px 0', textAlign: 'right', paddingRight: '16px' }}>Subtotal</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>P{((folio.roomBaseCharge || 0) + (folio.totalServices || 0)).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ marginBottom: '15px' }}>Payments Applied</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {folio.payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '12px 0' }}>{p.method.replace('_', ' ')}{p.reference ? ` (${p.reference})` : ''}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>-P{p.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {folio.payments.length === 0 && (
                  <tr><td colSpan="3" style={{ padding: '12px 0', color: 'var(--text-muted)' }}>No payments received yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right: Actions (hidden on print) */}
          <div className="no-print">
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="var(--accent-gold)" /> Quick Charges
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {QUICK_SERVICES.map(svc => (
                  <button key={svc.label} onClick={() => handleQuickService(svc)} className="btn" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{svc.icon} {svc.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>P{parseFloat(settings[svc.settingKey] || svc.defaultAmt).toFixed(2)}</span>
                  </button>
                ))}
              </div>

              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={16} color="var(--accent-gold)" /> Custom Charge
              </h4>
              <form onSubmit={handleAddService}>
                <div className="input-group">
                  <input type="text" className="input-field" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} required />
                </div>
                <div className="input-group">
                  <input type="number" className="input-field" placeholder="Amount (P)" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary btn-block">Add Charge</button>
              </form>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} color="#3b82f6" /> Settlement
              </h4>
              <button
                className="btn btn-block"
                onClick={() => setIsPaymentModalOpen(true)}
                style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)', marginBottom: '12px', color: 'var(--text-main)' }}
              >
                Receive Payment
              </button>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />
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
      {/* ===== END PRINTABLE AREA ===== */}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        folioId={folio.id}
        onPaymentReceived={fetchFolio}
      />

      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; top: 0; left: 0; width: 100%; color: #000 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .glass-panel { background: transparent !important; border: 1px solid #ccc !important; box-shadow: none !important; }
          table { border-collapse: collapse; }
          td, th { color: #000 !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Billing;
