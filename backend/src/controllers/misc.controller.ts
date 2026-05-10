import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

// ─── Quick search ────────────────────────────────────────────────────────
// Finds guests by name/phone/email/id, and bookings by id-prefix.
// Used by the top-bar search bar — keeps each list short so the dropdown
// stays readable.
export const quickSearch = async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ guests: [], bookings: [] });

    const guests = await prisma.guest.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { idNumber: { contains: q } }
        ]
      },
      take: 6
    });

    const bookings = await prisma.booking.findMany({
      where: { id: { startsWith: q } },
      include: { guest: true, room: true },
      take: 6
    });

    res.json({ guests, bookings });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Audit log viewer ────────────────────────────────────────────────────
// OWNER-only paginated view of every audited action.
export const listAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const offset = parseInt(String(req.query.offset || '0'), 10) || 0;
    const action = req.query.action ? String(req.query.action) : undefined;
    const entity = req.query.entity ? String(req.query.entity) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;

    const where: any = {};
    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit,
        include: { user: { select: { id: true, username: true, name: true, role: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);
    res.json({ items, total, limit, offset });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Daily shift report ──────────────────────────────────────────────────
// Hand-over summary for a given date (defaults to today).
export const dailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const dateStr = String(req.query.date || '');
    const start = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    const [checkedIn, checkedOut, createdToday, paymentsToday] = await Promise.all([
      prisma.booking.findMany({
        where: { status: 'CHECKED_IN', updatedAt: { gte: start, lt: end } },
        include: { guest: true, room: true, user: { select: { username: true, name: true } } }
      }),
      prisma.booking.findMany({
        where: { status: 'CHECKED_OUT', updatedAt: { gte: start, lt: end } },
        include: { guest: true, room: true }
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { guest: true, room: true, user: { select: { username: true, name: true } } }
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { user: { select: { username: true, name: true } }, folio: { include: { booking: { include: { guest: true } } } } }
      })
    ]);

    const byMethod: Record<string, number> = {};
    for (const p of paymentsToday) {
      byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
    }
    const totalRevenue = paymentsToday.reduce((s, p) => s + p.amount, 0);
    const cashOnHand = byMethod['CASH'] || 0;

    res.json({
      date: start.toISOString().slice(0, 10),
      checkedIn, checkedOut, createdToday, paymentsToday,
      summary: {
        checkedInCount: checkedIn.length,
        checkedOutCount: checkedOut.length,
        bookingsCreated: createdToday.length,
        totalRevenue, byMethod, cashOnHand
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
