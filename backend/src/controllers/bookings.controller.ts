import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';

export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { guest: true, room: true },
      orderBy: { checkInDate: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

  export const createBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { guestId, roomId, roomTypeId, source, checkInDate, checkOutDate, depositPaid, notes } = req.body;
  
      // 24-month rolling window validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxFutureDate = new Date(today);
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 24);

      if (new Date(checkInDate) < today) {
         return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
      }
      if (new Date(checkOutDate) > maxFutureDate) {
         return res.status(400).json({ error: 'Bookings can only be made up to a rolling 24 months in advance.' });
      }

      // Basic availability logic: If a specific room is requested, check if it overlaps
      if (roomId) {
        const overlapping = await prisma.booking.findFirst({
          where: {
            roomId,
            status: { notIn: ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'] },
            OR: [
              { checkInDate: { lt: new Date(checkOutDate) }, checkOutDate: { gt: new Date(checkInDate) } }
            ]
          }
        });
        if (overlapping) return res.status(400).json({ error: 'Room is not available for these dates.' });
      }
  
      const booking = await prisma.booking.create({
        data: {
          guestId,
          userId: req.user!.id,
          roomId,
          roomTypeId,
          source,
          checkInDate: new Date(checkInDate),
          checkOutDate: new Date(checkOutDate),
          depositPaid: depositPaid ? parseFloat(depositPaid) : 0,
          notes,
          status: 'CONFIRMED'
        }
      });
  
      await createAuditLog(req.user!.id, 'CREATE_BOOKING', 'Booking', booking.id, null, booking);
      res.status(201).json(booking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

export const checkIn = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { roomId } = req.body; // In case they were just assigned a type and need a room assigned NOW

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'CONFIRMED') return res.status(400).json({ error: `Cannot check in a booking with status ${booking.status}` });

        const finalRoomId = roomId || booking.roomId;
        if (!finalRoomId) return res.status(400).json({ error: 'A specific room must be assigned to check in.' });

        // Update the booking status and room status transactionally, and create a Folio
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const updatedBooking = await tx.booking.update({
                where: { id },
                data: { status: 'CHECKED_IN', roomId: finalRoomId }
            });

            await tx.room.update({
                where: { id: finalRoomId },
                data: { status: 'OCCUPIED_CLEAN' }
            });

            const folio = await tx.folio.create({
                data: {
                    bookingId: id,
                    status: 'OPEN',
                    balanceDue: 0 // Will build logic to calc room rate later
                }
            });

            // Create room status history
            await tx.roomStatusHistory.create({
                data: {
                    roomId: finalRoomId,
                    status: 'OCCUPIED_CLEAN',
                    changedBy: req.user!.id,
                    reason: 'Guest Checked In'
                }
            });

            return { updatedBooking, folio };
        });

        await createAuditLog(req.user!.id, 'CHECK_IN_GUEST', 'Booking', id, booking, result.updatedBooking);

        res.json(result);
    } catch(err) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const cancelBooking = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { reason } = req.body;

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(booking.status)) {
            return res.status(400).json({ error: `Cannot cancel a booking with status ${booking.status}` });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const updated = await tx.booking.update({
                where: { id },
                data: { status: 'CANCELLED' }
            });

            await tx.cancellation.create({
                data: { bookingId: id, reason: reason || 'No reason provided', feeCharged: 0 }
            });

            if (booking.roomId) {
                await tx.room.update({ where: { id: booking.roomId }, data: { status: 'VACANT_CLEAN' } });
            }

            return updated;
        });

        await createAuditLog(req.user!.id, 'CANCEL_BOOKING', 'Booking', id, booking, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { checkOutDate, notes } = req.body;

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot modify a completed or cancelled booking' });
        }

        const updated = await prisma.booking.update({
            where: { id },
            data: {
                ...(checkOutDate && { checkOutDate: new Date(checkOutDate) }),
                ...(notes !== undefined && { notes })
            }
        });

        await createAuditLog(req.user!.id, 'UPDATE_BOOKING', 'Booking', id, booking, updated);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

