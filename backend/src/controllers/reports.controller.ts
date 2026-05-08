import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Total Guests
    const totalGuests = await prisma.guest.count();
    
    // Today's Check-ins
    const todaysCheckIns = await prisma.booking.count({
      where: {
        checkInDate: { gte: today, lt: new Date(today.getTime() + 86400000) }
      }
    });

    // Rooms status distribution
    const rooms = await prisma.room.findMany();
    const cleanRooms = rooms.filter(r => r.status === 'VACANT_CLEAN').length;
    const occupiedRooms = rooms.filter(r => r.status.startsWith('OCCUPIED')).length;

    // Total Payments today (Revenue)
    const todaysPayments = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: today } }
    });

    res.json({
        totalGuests,
        todaysCheckIns,
        occupancy: {
            total: rooms.length,
            occupied: occupiedRooms,
            clean: cleanRooms,
            rate: rooms.length > 0 ? ((occupiedRooms / rooms.length) * 100).toFixed(0) + '%' : '0%'
        },
        revenueToday: todaysPayments._sum.amount || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
