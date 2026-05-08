import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, AlertCircle, PlayCircle, Ban } from 'lucide-react';

const Housekeeping = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/housekeeping', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/housekeeping/${id}`, 
        { status: newStatus, reason: 'Manual Housekeeping Update' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRooms(); // refresh
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'VACANT_CLEAN': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <Sparkles size={16} /> };
      case 'VACANT_DIRTY': return { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', icon: <AlertCircle size={16} /> };
      case 'OCCUPIED_CLEAN': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <PlayCircle size={16} /> };
      case 'OCCUPIED_DIRTY': return { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', icon: <AlertCircle size={16} /> };
      case 'OUT_OF_ORDER': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: <Ban size={16} /> };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', text: '#fff', icon: null };
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Housekeeping Dashboard</h2>
        <p style={{ color: 'var(--text-muted)' }}>Real-time physical room states</p>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {rooms.map(room => {
            const style = getStatusColor(room.status);
            return (
              <div key={room.id} className="glass-panel" style={{ padding: '20px', borderTop: `3px solid ${style.text}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '1.4rem' }}>{room.number}</h3>
                  <span style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: style.bg, color: style.text, 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' 
                  }}>
                    {style.icon} {room.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Type: {room.type?.name}</p>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => updateStatus(room.id, 'VACANT_CLEAN')} className="btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '8px 12px' }}>Mark Clean</button>
                  <button onClick={() => updateStatus(room.id, 'VACANT_DIRTY')} className="btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '8px 12px' }}>Mark Dirty</button>
                  <button onClick={() => updateStatus(room.id, 'OUT_OF_ORDER')} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', padding: '8px 12px' }}>O.O.O</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Housekeeping;
