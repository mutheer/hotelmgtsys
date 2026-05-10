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
        const { reason, feeCharged } = req.body;
        const fee = feeCharged ? Math.max(0, parseFloat(feeCharged)) : 0;

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
                data: { bookingId: id, reason: reason || 'No reason provided', feeCharged: fee }
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

// Create a BookingGroup with one Booking per room.  All rooms share the same
// dates, source, and organizer guest. Availability is checked per-room before
// any rows are written; if any room is unavailable the whole thing is rolled
// back so you never end up with a half-created group.
export const createGroupBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      groupName, organizerId, source, notes,
      checkInDate, checkOutDate, totalDeposit,
      rooms  // [{ roomId, roomTypeId }]
    } = req.body;

    if (!groupName) return res.status(400).json({ error: 'Group name is required' });
    if (!organizerId) return res.status(400).json({ error: 'Organizer guest is required' });
    if (!Array.isArray(rooms) || rooms.length < 2) {
      return res.status(400).json({ error: 'A group booking needs at least 2 rooms' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxFuture = new Date(today); maxFuture.setMonth(maxFuture.getMonth() + 24);
    if (new Date(checkInDate) < today) return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
    if (new Date(checkOutDate) > maxFuture) return res.status(400).json({ error: 'Bookings can only be made up to 24 months in advance.' });

    // Check each room for overlap up front
    for (const r of rooms) {
      const overlap = await prisma.booking.findFirst({
        where: {
          roomId: r.roomId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'] },
          OR: [{ checkInDate: { lt: new Date(checkOutDate) }, checkOutDate: { gt: new Date(checkInDate) } }]
        },
        include: { room: true }
      });
      if (overlap) {
        return res.status(400).json({ error: `Room ${overlap.room?.number || r.roomId} is not available for these dates.` });
      }
    }

    const depositPerRoom = (parseFloat(totalDeposit) || 0) / rooms.length;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const group = await tx.bookingGroup.create({
        data: {
          name: groupName,
          organizerId,
          source,
          notes: notes || null,
          createdById: req.user!.id
        }
      });

      const created = [];
      for (const r of rooms) {
        const b = await tx.booking.create({
          data: {
            guestId: organizerId,
            userId: req.user!.id,
            roomId: r.roomId,
            roomTypeId: r.roomTypeId,
            source,
            status: 'CONFIRMED',
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            depositPaid: depositPerRoom,
            notes: notes || null,
            groupId: group.id
          }
        });
        created.push(b);
      }
      return { group, bookings: created };
    });

    await createAuditLog(req.user!.id, 'CREATE_GROUP_BOOKING', 'BookingGroup', result.group.id, null, result);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listGroupBookings = async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.bookingGroup.findMany({ orderBy: { createdAt: 'desc' } });
    // Pull all child bookings in one query to avoid N+1
    const groupIds = groups.map(g => g.id);
    const bookings = await prisma.booking.findMany({
      where: { groupId: { in: groupIds } },
      include: { room: true, guest: true }
    });
    const byGroup: Record<string, any[]> = {};
    for (const b of bookings) {
      if (!b.groupId) continue;
      (byGroup[b.groupId] ||= []).push(b);
    }
    const organizerIds = [...new Set(groups.map(g => g.organizerId))];
    const organizers = await prisma.guest.findMany({ where: { id: { in: organizerIds } } });
    const orgMap = Object.fromEntries(organizers.map(o => [o.id, o]));

    res.json(groups.map(g => ({
      ...g,
      organizer: orgMap[g.organizerId] || null,
      bookings: byGroup[g.id] || []
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel every still-confirmable booking in a group in one shot.
export const cancelGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const { reason, feeCharged } = req.body;
    const fee = feeCharged ? Math.max(0, parseFloat(feeCharged)) : 0;

    const bookings = await prisma.booking.findMany({ where: { groupId } });
    const cancellable = bookings.filter(b => !['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(b.status));
    if (cancellable.length === 0) return res.status(400).json({ error: 'No cancellable bookings in this group.' });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const b of cancellable) {
        await tx.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } });
        await tx.cancellation.create({ data: { bookingId: b.id, reason: reason || 'Group cancellation', feeCharged: fee / cancellable.length } });
        if (b.roomId) await tx.room.update({ where: { id: b.roomId }, data: { status: 'VACANT_CLEAN' } });
      }
    });

    await createAuditLog(req.user!.id, 'CANCEL_GROUP', 'BookingGroup', groupId, bookings, null);
    res.json({ ok: true, cancelled: cancellable.length });
  } catch (error) {
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

