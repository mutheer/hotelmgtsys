import { Response } from 'express';
import { Prisma } from '@prisma/client';
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
    
    const room = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const tasks = await prisma.housekeepingTask.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { room: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, notes } = req.body;
    const task = await prisma.housekeepingTask.create({
      data: { roomId, notes, status: 'PENDING', assignedTo: req.user!.id },
      include: { room: true }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const task = await prisma.housekeepingTask.update({
      where: { id },
      data: { status },
      include: { room: true }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

