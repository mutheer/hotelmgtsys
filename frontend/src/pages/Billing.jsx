import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, PlusCircle, CreditCard, ChevronRight, Printer, Coffee, Shirt, Car, Tag, Trash2, Percent, Receipt, LogIn as CheckInIcon, XCircle, ArrowRightLeft, UserX, Edit3, Save, Trash } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

const API = 'http://localhost:5000/api';

const QUICK_SERVICES = [
  { label: 'Breakfast', icon: <Coffee size={14} />, settingKey: 'SERVICE_BREAKFAST_PRICE', defaultAmt: 100 },
  { label: 'Laundry', icon: <Shirt size={14} />, settingKey: 'SERVICE_LAUNDRY_PRICE', defaultAmt: 80 },
  { label: 'Airport Shuttle', icon: <Car size={14} />, settingKey: 'SERVICE_AIRPORT_TRANSFER_PRICE', defaultAmt: 150 },
];

const Billing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState('');
  const [folio, setFolio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [printDoc, setPrintDoc] = useState(null); // last-issued document being previewed for print

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/settings`, { headers })
      .then(r => setSettings(r.data))
      .catch(() => {});
  }, []);

  // If we arrived from the Calendar with ?bookingId=..., auto-load the folio
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('bookingId');
    if (id) {
      setBookingId(id);
      fetchFolioFor(id);
    }
  }, [location.search]);

  const fetchFolioFor = async (id) => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/billing/${id}`, { headers });
      setFolio(res.data);
    } catch {
      setError('Folio not found or booking ID invalid.');
      setFolio(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolio = () => fetchFolioFor(bookingId);

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

  const isOpenFolio = folio?.status === 'OPEN';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canDiscount = user.role === 'OWNER' || user.role === 'ACCOUNTANT';

  // Tourism levy: per-person-per-night charge. Settings.TOURISM_LEVY_RATE,
  // default P10. Asks for guests, multiplies by nights from the booking.
  const addTourismLevy = async () => {
    if (!folio) return;
    const rate = parseFloat(settings.TOURISM_LEVY_RATE) || 10;
    const nights = folio.nights || 1;
    const guestsStr = window.prompt(`Tourism Levy at P${rate.toFixed(2)} per person per night for ${nights} night${nights > 1 ? 's' : ''}.\nHow many guests?`, '2');
    if (!guestsStr) return;
    const guests = parseInt(guestsStr, 10);
    if (!Number.isFinite(guests) || guests < 1) return alert('Please enter a valid guest count.');
    const qty = guests * nights;
    try {
      await axios.post(`${API}/billing/service`, {
        folioId: folio.id,
        description: 'LEVY',
        quantity: qty,
        unitPrice: rate
      }, { headers });
      fetchFolio();
    } catch {
      alert('Failed to add levy');
    }
  };

  // Discount: OWNER/ACCOUNTANT only. Adds a Discount row that is deducted
  // from the calculated balance.
  const addDiscount = async () => {
    if (!folio) return;
    const amountStr = window.prompt('Discount amount (P)?');
    if (!amountStr) return;
    const amt = parseFloat(amountStr);
    if (!Number.isFinite(amt) || amt <= 0) return alert('Please enter a valid amount.');
    const reason = window.prompt('Reason for discount? (required for audit)');
    if (!reason) return alert('A reason is required.');
    try {
      await axios.post(`${API}/billing/discount`, {
        folioId: folio.id, amount: amt, reason
      }, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add discount');
    }
  };

  const handleRemoveDiscount = async (d) => {
    if (!window.confirm(`Remove discount of P${d.amount.toFixed(2)} (${d.reason})?`)) return;
    try {
      await axios.delete(`${API}/billing/discount/${d.id}`, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove discount');
    }
  };

  const handleRemoveCharge = async (charge) => {
    if (!window.confirm(`Remove "${charge.description}" (P${charge.amount.toFixed(2)})?`)) return;
    try {
      await axios.delete(`${API}/billing/service/${charge.id}`, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove charge');
    }
  };

  const handleRemovePayment = async (payment) => {
    if (!window.confirm(`Remove this ${payment.method.replace('_', ' ')} payment of P${payment.amount.toFixed(2)}?`)) return;
    try {
      await axios.delete(`${API}/billing/payment/${payment.id}`, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove payment');
    }
  };

  // ─── Booking-level actions (work whether or not a folio exists) ────────
  const booking = folio?.booking;
  const status = booking?.status;
  const hasFolio = folio && folio.status !== 'NO_FOLIO';

  // Notes editor state — initialised once a booking is loaded
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [coDateDraft, setCoDateDraft] = useState('');
  useEffect(() => {
    if (booking) {
      setNotesDraft(booking.notes || '');
      setCoDateDraft(new Date(booking.checkOutDate).toISOString().split('T')[0]);
    }
  }, [booking?.id]);

  const saveBookingEdits = async () => {
    if (!booking) return;
    try {
      const payload = { notes: notesDraft };
      // Dates only sent if booking is still active
      if (!['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(status)) payload.checkOutDate = coDateDraft;
      await axios.patch(`${API}/bookings/${booking.id}`, payload, { headers });
      setEditingNotes(false);
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save changes');
    }
  };

  const doCheckIn = async () => {
    if (!booking) return;
    if (!window.confirm(`Check ${booking.guest?.firstName} ${booking.guest?.lastName} into Room ${booking.room?.number}? This will open the folio.`)) return;
    try {
      await axios.post(`${API}/bookings/${booking.id}/checkin`, {}, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    }
  };

  const doCancel = async () => {
    if (!booking) return;
    const reason = window.prompt(`Cancel booking ${booking.humanId || booking.id.slice(0, 8)}?\nEnter reason:`);
    if (reason === null) return;
    const feeRaw = window.prompt('Cancellation fee (P)? Leave 0 if none:', '0');
    if (feeRaw === null) return;
    try {
      await axios.post(`${API}/bookings/${booking.id}/cancel`, { reason: reason || 'Cancelled by staff', feeCharged: parseFloat(feeRaw) || 0 }, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed');
    }
  };

  const doNoShow = async () => {
    if (!booking) return;
    if (!window.confirm('Mark as NO-SHOW? The room will be released.')) return;
    try {
      await axios.post(`${API}/bookings/${booking.id}/no-show`, {}, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark no-show');
    }
  };

  const doTransfer = async () => {
    if (!booking) return;
    try {
      const res = await axios.get(`${API}/rooms`, { headers });
      const candidates = res.data.filter(r => r.id !== booking.roomId && (r.status === 'VACANT_CLEAN' || r.status === 'VACANT_DIRTY'));
      if (candidates.length === 0) return alert('No vacant rooms available to transfer into.');
      const list = candidates.map((r, i) => `${i + 1}. Room ${r.number} (${r.type?.name || ''}) — ${r.status}`).join('\n');
      const pick = window.prompt(`Transfer to which room?\n\n${list}\n\nEnter the number (1-${candidates.length}):`);
      if (!pick) return;
      const idx = parseInt(pick, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= candidates.length) return alert('Invalid choice.');
      const room = candidates[idx];
      const reason = window.prompt(`Move ${booking.guest?.firstName} to Room ${room.number}?\nReason for transfer:`) || '';
      await axios.post(`${API}/bookings/${booking.id}/transfer`, { newRoomId: room.id, reason }, { headers });
      fetchFolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Transfer failed');
    }
  };

  const doDeleteBooking = async () => {
    if (!booking) return;
    if (!window.confirm(`Permanently delete booking ${booking.humanId || booking.id.slice(0, 8)}? This can't be undone.`)) return;
    try {
      await axios.delete(`${API}/bookings/${booking.id}`, { headers });
      navigate('/calendar');
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
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

  const issueAndPrint = async () => {
    if (!folio) return;
    try {
      const res = await axios.post(`${API}/billing/${folio.id}/documents`, {}, { headers });
      setPrintDoc(res.data);
      // Let the print block mount first
      setTimeout(async () => {
        if (window.melvaApi?.saveDocumentPdf) {
          const kind = res.data.type === 'RECEIPT' ? 'receipts' : 'invoices';
          const saved = await window.melvaApi.saveDocumentPdf({ kind, number: res.data.invoiceNum });
          if (saved?.ok) {
            console.log('PDF saved to', saved.path);
          } else {
            console.warn('PDF save failed:', saved?.error);
          }
        }
        window.print();
      }, 250);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to issue document');
    }
  };

  const documentLabel = folio && folio.calculatedBalance <= 0.0001 ? 'Receipt' : 'Invoice';

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
        {hasFolio && (
          <button className="btn" onClick={issueAndPrint} style={{ background: 'var(--accent-gold)', color: '#1a1a1a' }}>
            <Printer size={16} /> Issue & Print {documentLabel}
          </button>
        )}
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
                <h3 style={{ fontSize: '1.4rem' }}>
                  {hasFolio
                    ? (folio.humanId || `Folio #${folio.id.substring(0, 8).toUpperCase()}`)
                    : (booking.humanId || `Booking #${booking.id.substring(0, 8).toUpperCase()}`)}
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  {guest?.firstName} {guest?.lastName} • Room {room?.number || 'Unassigned'}
                  {booking.humanId && hasFolio && <span style={{ marginLeft: '8px', fontSize: '0.8rem', opacity: 0.7 }}>({booking.humanId})</span>}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Stay: {new Date(folio.booking.checkInDate).toLocaleDateString('en-GB')} — {new Date(folio.booking.checkOutDate).toLocaleDateString('en-GB')}
                </p>
                <p style={{ marginTop: '6px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                    background: status === 'CHECKED_OUT' ? 'rgba(107,114,128,0.2)'
                      : status === 'CHECKED_IN' ? 'rgba(34,197,94,0.2)'
                      : status === 'CONFIRMED' ? 'rgba(59,130,246,0.2)'
                      : status === 'CANCELLED' ? 'rgba(239,68,68,0.2)'
                      : status === 'NO_SHOW' ? 'rgba(245,158,11,0.2)'
                      : 'rgba(255,255,255,0.1)',
                    color: status === 'CHECKED_OUT' ? '#9ca3af'
                      : status === 'CHECKED_IN' ? '#86efac'
                      : status === 'CONFIRMED' ? '#93c5fd'
                      : status === 'CANCELLED' ? '#fca5a5'
                      : status === 'NO_SHOW' ? '#fcd34d'
                      : '#fff'
                  }}>{status?.replace('_', ' ')}</span>
                </p>
                {guest?.idNumber && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ID: {guest.idNumber}</p>}
                {guest?.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📞 {guest.phone}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: folio.calculatedBalance > 0 ? '#ef4444' : '#22c55e' }}>
                  P{folio.calculatedBalance.toFixed(2)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Balance Due</div>
              </div>
            </div>

            {hasFolio && (<>
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
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                      {folio.nights} night{folio.nights !== 1 ? 's' : ''} × P{folio.ratePerNight?.toFixed(2)} ({room?.type?.name})
                      <em style={{ marginLeft: '8px', opacity: 0.7 }}>— auto from dates, edit dates to change</em>
                    </small>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>P{folio.roomBaseCharge?.toFixed(2)}</td>
                </tr>
                {folio.services.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '12px 0' }}>
                      {s.description}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
                        P{s.amount.toFixed(2)}
                        {isOpenFolio && (
                          <button
                            type="button"
                            className="no-print"
                            onClick={() => handleRemoveCharge(s)}
                            title="Remove this charge"
                            style={{
                              cursor: 'pointer',
                              background: 'rgba(239,68,68,0.12)',
                              border: '1px solid rgba(239,68,68,0.35)',
                              color: '#ef4444',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              lineHeight: 1
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border-light)', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '12px 0', textAlign: 'right', paddingRight: '16px' }}>Subtotal</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>P{((folio.roomBaseCharge || 0) + (folio.totalServices || 0)).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {folio.discounts && folio.discounts.length > 0 && (
              <>
                <h4 style={{ marginBottom: '15px' }}>Discounts</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <tbody>
                    {folio.discounts.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
                        <td style={{ padding: '10px 0' }}>{d.reason}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', color: '#c4b5fd' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
                            -P{d.amount.toFixed(2)}
                            {isOpenFolio && canDiscount && (
                              <button type="button" className="no-print" onClick={() => handleRemoveDiscount(d)} title="Remove discount"
                                style={{ cursor: 'pointer', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', padding: '6px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h4 style={{ marginBottom: '15px' }}>Payments Applied</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {folio.payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '12px 0' }}>{p.method.replace('_', ' ')}{p.reference ? ` (${p.reference})` : ''}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
                        -P{p.amount.toFixed(2)}
                        {isOpenFolio && (
                          <button
                            type="button"
                            className="no-print"
                            onClick={() => handleRemovePayment(p)}
                            title="Remove this payment"
                            style={{
                              cursor: 'pointer',
                              background: 'rgba(239,68,68,0.12)',
                              border: '1px solid rgba(239,68,68,0.35)',
                              color: '#ef4444',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              lineHeight: 1
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {folio.payments.length === 0 && (
                  <tr><td colSpan="3" style={{ padding: '12px 0', color: 'var(--text-muted)' }}>No payments received yet.</td></tr>
                )}
              </tbody>
            </table>
            </>)}

            {/* Notes editor — works on every booking regardless of status */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0 }}>Notes / Special Requests</h4>
                {!editingNotes ? (
                  <button className="btn no-print" onClick={() => setEditingNotes(true)} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', fontSize: '0.85rem' }}>
                    <Edit3 size={13} /> Edit
                  </button>
                ) : (
                  <span style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn no-print" onClick={saveBookingEdits} style={{ background: 'var(--accent-gold)', color: '#1a1a1a', padding: '4px 12px', fontSize: '0.85rem' }}>
                      <Save size={13} /> Save
                    </button>
                    <button className="btn no-print" onClick={() => { setEditingNotes(false); setNotesDraft(booking.notes || ''); }} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  </span>
                )}
              </div>
              {editingNotes ? (
                <>
                  {!['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(status) && (
                    <div className="input-group">
                      <label className="input-label">Check-Out Date</label>
                      <input type="date" className="input-field"
                        value={coDateDraft}
                        min={new Date(booking.checkInDate).toISOString().split('T')[0]}
                        onChange={e => setCoDateDraft(e.target.value)}
                        onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} />
                    </div>
                  )}
                  <textarea className="input-field" rows="3" value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)} style={{ width: '100%', resize: 'vertical' }}
                    placeholder="Add any special requests, dietary needs, follow-ups…" />
                </>
              ) : (
                <p style={{ color: booking.notes ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', fontStyle: booking.notes ? 'normal' : 'italic' }}>
                  {booking.notes || 'No notes on this booking yet.'}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions (hidden on print) */}
          <div className="no-print">

            {/* Status-aware booking actions panel — top of the right column */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '14px', fontSize: '0.95rem', color: 'var(--accent-gold)' }}>Booking Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {status === 'CONFIRMED' && (
                  <>
                    <button onClick={doCheckIn} className="btn" style={{ background: '#22c55e', color: '#fff', justifyContent: 'flex-start' }}>
                      <CheckInIcon size={16} /> Check In Guest
                    </button>
                    <button onClick={doCancel} className="btn" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid #ef4444', color: '#fca5a5', justifyContent: 'flex-start' }}>
                      <XCircle size={16} /> Cancel Booking
                    </button>
                    {new Date(booking.checkInDate).getTime() < Date.now() && (
                      <button onClick={doNoShow} className="btn" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid #f59e0b', color: '#fcd34d', justifyContent: 'flex-start' }}>
                        <UserX size={16} /> Mark No-Show
                      </button>
                    )}
                  </>
                )}
                {status === 'CHECKED_IN' && (
                  <button onClick={doTransfer} className="btn" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#93c5fd', justifyContent: 'flex-start' }}>
                    <ArrowRightLeft size={16} /> Transfer Room
                  </button>
                )}
                {(status === 'CANCELLED' || status === 'NO_SHOW') && user.role === 'OWNER' && (
                  <button onClick={doDeleteBooking} className="btn" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid #ef4444', color: '#fca5a5', justifyContent: 'flex-start' }}>
                    <Trash size={16} /> Delete Booking (Owner)
                  </button>
                )}
                {status === 'CHECKED_OUT' && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Folio closed. You can still reprint the receipt above.
                  </p>
                )}
              </div>
            </div>

            {status === 'CHECKED_IN' && (<>
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
                <button onClick={addTourismLevy} className="btn" style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Receipt size={14} /> Tourism Levy</span>
                  <span style={{ fontSize: '0.85rem' }}>P{(parseFloat(settings.TOURISM_LEVY_RATE) || 10).toFixed(2)} / pp / night</span>
                </button>
                {canDiscount && (
                  <button onClick={addDiscount} className="btn" style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid #a855f7', color: '#c4b5fd', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Percent size={14} /> Apply Discount</span>
                    <span style={{ fontSize: '0.85rem' }}>{user.role === 'OWNER' ? 'Owner' : 'Accountant'} only</span>
                  </button>
                )}
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
            </>)}
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

      {/* Print-only document — strict layout matching The Melva's receipt template */}
      {printDoc && (
        <div className="print-only print-doc-wrapper">
          <div className="print-doc">

            {/* ── Header: 3 columns — logo | name+address | label+meta ── */}
            <table style={{ marginBottom: '4px', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ width: '22%', verticalAlign: 'middle', textAlign: 'left' }}>
                    <img
                      src="/melva-logo.png"
                      alt=""
                      style={{ maxWidth: '130px', maxHeight: '110px', objectFit: 'contain' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    <div style={{ fontSize: '15pt', fontWeight: 700, lineHeight: '1.25' }}>
                      THE MELVA ELEGANT<br />BOUTIQUE GUEST HOUSE
                    </div>
                    <div style={{ marginTop: '14px', fontSize: '10pt', lineHeight: '1.5' }}>
                      PLOT 34912, BLOCK 8<br />
                      GABORONE, BOTSWANA<br />
                      Tel:+267 3119162/ 75010066
                    </div>
                  </td>
                  <td style={{ width: '32%', verticalAlign: 'top', textAlign: 'right' }}>
                    <div style={{ fontSize: '18pt', fontWeight: 700, marginBottom: '14px' }}>
                      {printDoc.type}
                    </div>
                    <table style={{ marginLeft: 'auto', fontSize: '10pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 600, paddingRight: '14px' }}>{printDoc.type} NO.</td>
                          <td style={{ fontWeight: 700, textAlign: 'right' }}>{printDoc.invoiceNum}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600, paddingRight: '14px' }}>DATE</td>
                          <td style={{ fontWeight: 700, textAlign: 'right' }}>{new Date(printDoc.createdAt).toLocaleDateString('en-GB')}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600, paddingRight: '14px' }}>CHECK IN</td>
                          <td style={{ fontWeight: 700, textAlign: 'right' }}>{new Date(folio.booking.checkInDate).toLocaleDateString('en-GB')}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600, paddingRight: '14px' }}>CHECK OUT</td>
                          <td style={{ fontWeight: 700, textAlign: 'right' }}>{new Date(folio.booking.checkOutDate).toLocaleDateString('en-GB')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Black rule under the address block */}
            <div style={{ borderBottom: '1.5px solid #000', margin: '4px 0 18px' }} />

            {/* Guest details */}
            <div style={{ marginBottom: '4px', fontSize: '10pt' }}>Guest Details:</div>
            <div style={{ marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
              {guest?.firstName} {guest?.lastName}
            </div>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '4px', height: '16px', marginBottom: '4px' }} />
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '4px', height: '16px', marginBottom: '24px' }} />

            {/* Charges table */}
            <table className="doc-table" style={{ marginBottom: '0' }}>
              <thead>
                <tr style={{ background: '#e8e8e8' }}>
                  <th style={{ width: '14%' }}>Date</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'right', width: '12%' }}>Qty.</th>
                  <th style={{ textAlign: 'right', width: '15%' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', width: '15%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {printDoc.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>{new Date(li.date).toLocaleDateString('en-GB')}</td>
                    <td>{li.description}</td>
                    <td style={{ textAlign: 'right' }}>{li.qty}{li.unit ? ` ${li.unit}${li.qty > 1 ? 's' : ''}` : ''}</td>
                    <td style={{ textAlign: 'right' }}>{li.unitPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{li.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals — right aligned */}
            <table className="totals" style={{ width: 'auto', marginLeft: 'auto', marginTop: '8px', fontSize: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Net total</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Discount</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.discount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>VAT</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.vat.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Total amount</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Paid amount</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.paidAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Balance Due</td>
                  <td style={{ textAlign: 'right', paddingLeft: '60px', fontWeight: 700 }}>{printDoc.balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '10pt' }}>
              {printDoc.type === 'RECEIPT'
                ? 'Thank you for staying with us, we hope to have you again with us.'
                : 'Please settle the balance due at your earliest convenience. Thank you.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
