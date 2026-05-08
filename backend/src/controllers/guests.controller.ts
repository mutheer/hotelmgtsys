import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';

export const getGuests = async (req: AuthRequest, res: Response) => {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGuestById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: { bookings: true, documents: true }
    });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGuest = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, phone, idNumber, idType, address } = req.body;
    
    // Check if phone exists
    const existing = await prisma.guest.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'A guest with this phone number already exists.' });
    }

    const guest = await prisma.guest.create({
      data: { firstName, lastName, email, phone, idNumber, idType, address }
    });

    await createAuditLog(req.user!.id, 'CREATE_GUEST', 'Guest', guest.id, null, guest);
    
    res.status(201).json(guest);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;
    
    const oldGuest = await prisma.guest.findUnique({ where: { id } });
    const guest = await prisma.guest.update({
      where: { id },
      data: updateData
    });

    await createAuditLog(req.user!.id, 'UPDATE_GUEST', 'Guest', guest.id, oldGuest, guest);
    
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
