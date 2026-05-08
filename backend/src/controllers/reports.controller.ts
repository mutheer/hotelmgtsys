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

export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to as string) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { folio: { include: { booking: { include: { guest: true, room: true } } } } },
      orderBy: { createdAt: 'asc' }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const byMethod = payments.reduce((acc: Record<string, number>, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {});

    res.json({ totalRevenue, byMethod, payments, from: start, to: end });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getOccupancyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to as string) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const totalRooms = await prisma.room.count();
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { lte: end },
        checkOutDate: { gte: start }
      },
      include: { guest: true, room: { include: { type: true } } }
    });

    const totalNights = bookings.reduce((sum, b) => {
      const effectiveIn = b.checkInDate > start ? b.checkInDate : start;
      const effectiveOut = b.checkOutDate < end ? b.checkOutDate : end;
      const nights = Math.max(0, Math.round((effectiveOut.getTime() - effectiveIn.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + nights;
    }, 0);

    const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const availableRoomNights = totalRooms * periodDays;
    const occupancyRate = availableRoomNights > 0 ? ((totalNights / availableRoomNights) * 100).toFixed(1) : '0.0';

    const repeatGuests = await prisma.guest.count({ where: { isRepeat: true } });
    const totalGuests = await prisma.guest.count();

    res.json({ totalRooms, totalNights, availableRoomNights, occupancyRate, bookings: bookings.length, repeatGuests, totalGuests, from: start, to: end });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
