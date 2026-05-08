import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';
import { RoomStatus } from '@prisma/client';

// Room Types
export const getRoomTypes = async (req: AuthRequest, res: Response) => {
  try {
    const space = await prisma.roomType.findMany({ include: { rooms: true } });
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoomType = async (req: AuthRequest, res: Response) => {
  try {
    const { name, basePrice, capacity } = req.body;
    const rt = await prisma.roomType.create({ data: { name, basePrice: parseFloat(basePrice), capacity: parseInt(capacity) } });
    
    await createAuditLog(req.user!.id, 'CREATE_ROOM_TYPE', 'RoomType', rt.id, null, rt);
    res.status(201).json(rt);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rooms
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({ include: { type: true } });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { number, roomTypeId, status } = req.body;
    const room = await prisma.room.create({ data: { number, roomTypeId, status } });
    
    await createAuditLog(req.user!.id, 'CREATE_ROOM', 'Room', room.id, null, room);
    res.status(201).json(room);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Room number already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableRooms = async (req: AuthRequest, res: Response) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates are required' });

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    // Find all bookings that overlap with the requested range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'] },
        AND: [
            { checkInDate: { lt: endDate } },
            { checkOutDate: { gt: startDate } }
        ]
      },
      select: { roomId: true }
    });

    const bookedRoomIds = overlappingBookings
      .map(b => b.roomId)
      .filter((id): id is string => id !== null);

    // Find rooms that ARE NOT in that list
    const availableRooms = await prisma.room.findMany({
      where: {
        id: { notIn: bookedRoomIds },
        status: { not: 'OUT_OF_ORDER' }
      },
      include: { type: true }
    });

    res.json(availableRooms);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
