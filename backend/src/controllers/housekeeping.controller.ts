import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';

export const getRoomStatuses = async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      include: { type: true },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, reason } = req.body;

    const oldRoom = await prisma.room.findUnique({ where: { id } });
    
    const room = await prisma.$transaction(async (tx) => {
        const updated = await tx.room.update({
            where: { id },
            data: { status }
        });

        await tx.roomStatusHistory.create({
            data: { roomId: id, status, changedBy: req.user!.id, reason }
        });

        return updated;
    });

    await createAuditLog(req.user!.id, 'UPDATE_ROOM_STATUS', 'Room', id, oldRoom as any, room);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

