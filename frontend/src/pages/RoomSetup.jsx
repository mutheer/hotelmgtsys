import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RoomSetup = () => {
    const [rooms, setRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);

    const [newType, setNewType] = useState({ name: '', basePrice: '', capacity: '2' });
    const [newRoom, setNewRoom] = useState({ number: '', roomTypeId: '' });

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [typesRes, roomsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/rooms/types', { headers }),
                axios.get('http://localhost:5000/api/rooms', { headers })
            ]);
            setRoomTypes(typesRes.data);
            setRooms(roomsRes.data);
            if(typesRes.data.length > 0) setNewRoom(prev => ({...prev, roomTypeId: typesRes.data[0].id}));
        } catch(err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateType = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/rooms/types', newType, { headers: { Authorization: `Bearer ${token}` } });
            setNewType({ name: '', basePrice: '', capacity: '2' });
            fetchData();
        } catch(err) { alert('Error creating type'); }
    }

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/rooms', newRoom, { headers: { Authorization: `Bearer ${token}` } });
            setNewRoom({ ...newRoom, number: '' });
            fetchData();
        } catch(err) { alert('Error creating room'); }
    }

    return (
        <div className="animate-fade-in">
            <h2 className="page-title">Room configuration</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px' }}>1. Create Room Types</h3>
                    <form onSubmit={handleCreateType} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input type="text" className="input-field" placeholder="Name (e.g. Standard)" value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} required style={{flex: 2}} />
                        <input type="number" className="input-field" placeholder="Rate" value={newType.basePrice} onChange={e => setNewType({...newType, basePrice: e.target.value})} required style={{flex: 1}} />
                        <button type="submit" className="btn btn-primary">Add</button>
                    </form>
                    
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {roomTypes.map(t => (
                            <li key={t.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.name} (Cap: {t.capacity})</span>
                                <span style={{ color: 'var(--accent-gold)' }}>P{t.basePrice}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px' }}>2. Add Physical Rooms</h3>
                    <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input type="text" className="input-field" placeholder="Room No (e.g. 101)" value={newRoom.number} onChange={e => setNewRoom({...newRoom, number: e.target.value})} required style={{flex: 1}} />
                        <select className="input-field" value={newRoom.roomTypeId} onChange={e => setNewRoom({...newRoom, roomTypeId: e.target.value})} required style={{flex: 2, background: 'var(--bg-dark)'}}>
                            {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button type="submit" className="btn btn-primary">Add</button>
                    </form>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
                        {rooms.map(r => (
                            <div key={r.id} style={{ padding: '10px', textAlign: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px' }}>
                                <div style={{ fontWeight: 'bold' }}>#{r.number}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.type?.name.substring(0,6)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomSetup;
