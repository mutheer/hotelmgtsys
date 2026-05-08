import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, Search, Edit } from 'lucide-react';
import GuestModal from '../components/GuestModal';

const Guests = () => {
  const [guests, setGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/guests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(res.data);
    } catch (err) {
      console.error("Failed to fetch guests", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

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
                    <button 
                       onClick={() => handleEdit(guest)}
                       style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
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
    </div>
  );
};

export default Guests;
