import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';

export const getFolio = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // bookingId or FolioId
    const folio = await prisma.folio.findFirst({
      where: { bookingId: id },
      include: { services: true, payments: true, discounts: true, booking: { include: { guest: true, room: { include: { type: true } } } } }
    }) as any;
    if(!folio) return res.status(404).json({ error: 'Folio not found' });
    
    const checkIn = new Date(folio.booking.checkInDate);
    const checkOut = new Date(folio.booking.checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const ratePerNight = folio.booking.room?.type?.basePrice ?? 0;
    const roomBaseCharge = nights * ratePerNight;

    const totalServices = (folio.services || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const totalPayments = (folio.payments || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const totalDiscounts = (folio.discounts || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const calculatedBalance = roomBaseCharge + totalServices - totalPayments - totalDiscounts;

    res.json({ ...folio, calculatedBalance, roomBaseCharge, nights, ratePerNight, totalServices, totalPayments, totalDiscounts });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addServiceCharge = async (req: AuthRequest, res: Response) => {
  try {
    const { folioId, description, amount, quantity, unitPrice } = req.body;
    // Two ways to call:
    //   1. { amount: 20 }                       — legacy / simple total
    //   2. { quantity: 2, unitPrice: 10 }       — structured (LEVY-style)
    let qty = quantity != null ? parseFloat(quantity) : 1;
    let unit = unitPrice != null ? parseFloat(unitPrice) : NaN;
    let total = amount != null ? parseFloat(amount) : NaN;
    if (isNaN(unit) && !isNaN(total) && qty > 0) unit = total / qty;
    if (isNaN(total) && !isNaN(unit)) total = unit * qty;
    if (isNaN(total) || isNaN(unit)) return res.status(400).json({ error: 'Need amount or unitPrice' });

    const charge = await prisma.serviceCharge.create({
      data: { folioId, description, quantity: qty, unitPrice: unit, amount: total }
    });

    await createAuditLog(req.user!.id, 'ADD_SERVICE_CHARGE', 'ServiceCharge', charge.id, null, charge);
    res.status(201).json(charge);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const { folioId, amount, reason } = req.body;
    if (!folioId || !amount || !reason) {
      return res.status(400).json({ error: 'folioId, amount and reason are required' });
    }
    const value = parseFloat(amount);
    if (!isFinite(value) || value <= 0) {
      return res.status(400).json({ error: 'Discount amount must be greater than zero' });
    }
    const discount = await prisma.discount.create({
      data: { folioId, userId: req.user!.id, amount: value, reason }
    });

    await createAuditLog(req.user!.id, 'ADD_DISCOUNT', 'Discount', discount.id, null, discount);
    res.status(201).json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { folioId, amount, method, reference } = req.body;
    const payment = await prisma.payment.create({
      data: { folioId, userId: req.user!.id, amount: parseFloat(amount), method, reference }
    });
    
    await createAuditLog(req.user!.id, 'ADD_PAYMENT', 'Payment', payment.id, null, payment);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteServiceCharge = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const charge = await prisma.serviceCharge.findUnique({
      where: { id },
      include: { folio: true }
    });
    if (!charge) return res.status(404).json({ error: 'Charge not found' });
    if (charge.folio.status !== 'OPEN') {
      return res.status(400).json({ error: 'Cannot remove charges from a closed folio' });
    }
    await prisma.serviceCharge.delete({ where: { id } });
    await createAuditLog(req.user!.id, 'DELETE_SERVICE_CHARGE', 'ServiceCharge', id, charge, null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { folio: true }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.folio.status !== 'OPEN') {
      return res.status(400).json({ error: 'Cannot remove payments from a closed folio' });
    }
    await prisma.payment.delete({ where: { id } });
    await createAuditLog(req.user!.id, 'DELETE_PAYMENT', 'Payment', id, payment, null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: { folio: true }
    });
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    if (discount.folio.status !== 'OPEN') {
      return res.status(400).json({ error: 'Cannot remove discounts from a closed folio' });
    }
    await prisma.discount.delete({ where: { id } });
    await createAuditLog(req.user!.id, 'DELETE_DISCOUNT', 'Discount', id, discount, null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Issue a strict accounting document (RECEIPT if balance == 0, otherwise INVOICE)
// Each call creates a NEW document with a sequential number. Past documents
// are kept verbatim in their own rows so they remain valid records.
export const issueDocument = async (req: AuthRequest, res: Response) => {
  try {
    const folioId = req.params.folioId as string;
    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: {
        services: true,
        payments: true,
        discounts: true,
        booking: { include: { guest: true, room: { include: { type: true } } } }
      }
    }) as any;
    if (!folio) return res.status(404).json({ error: 'Folio not found' });

    // Compute current totals
    const checkIn = new Date(folio.booking.checkInDate);
    const checkOut = new Date(folio.booking.checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const ratePerNight = folio.booking.room?.type?.basePrice ?? 0;
    const roomBaseCharge = nights * ratePerNight;
    const totalServices = (folio.services || []).reduce((a: number, c: any) => a + c.amount, 0);
    const totalDiscounts = (folio.discounts || []).reduce((a: number, c: any) => a + c.amount, 0);
    const totalPayments = (folio.payments || []).reduce((a: number, c: any) => a + c.amount, 0);
    const subtotal = roomBaseCharge + totalServices;
    const totalAmount = subtotal - totalDiscounts;
    const balanceDue = totalAmount - totalPayments;

    // Determine type strictly: RECEIPT only if fully paid (balance <= 0)
    const type = balanceDue <= 0.0001 ? 'RECEIPT' : 'INVOICE';

    // Generate document number: YYMMDDNNN  (NNN = global counter within the year)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yearPrefix = yy; // 2-digit year
    const datePart = `${yy}${mm}${dd}`;

    const yearDocs = await prisma.invoice.findMany({
      where: { invoiceNum: { startsWith: yearPrefix } },
      orderBy: { invoiceNum: 'desc' },
      take: 1
    });
    let nextSeq = 1;
    if (yearDocs.length) {
      const last = yearDocs[0].invoiceNum;
      const lastSeq = parseInt(last.slice(-3), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const invoiceNum = `${datePart}${String(nextSeq).padStart(3, '0')}`;

    // Snapshot line items so this document is stable even if folio is edited
    const lineItems = [
      {
        date: folio.booking.checkInDate,
        description: `Room: ROOM ${folio.booking.room?.number ?? ''}`.trim(),
        qty: nights,
        unit: 'Night',
        unitPrice: ratePerNight,
        amount: roomBaseCharge
      },
      ...folio.services.map((s: any) => ({
        date: s.date,
        description: s.description,
        qty: s.quantity || 1,
        unit: '',
        unitPrice: s.unitPrice || s.amount,
        amount: s.amount
      }))
    ];

    const doc = await prisma.invoice.create({
      data: {
        folioId,
        invoiceNum,
        type,
        subtotal,
        discount: totalDiscounts,
        vat: 0,
        totalAmount,
        paidAmount: totalPayments,
        balanceDue: Math.max(0, balanceDue),
        lineItems: JSON.stringify(lineItems),
        issuedById: req.user!.id
      }
    });

    await createAuditLog(req.user!.id, `ISSUE_${type}`, 'Invoice', doc.id, null, doc);
    res.status(201).json({ ...doc, lineItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all previously issued documents for a folio
export const listDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const folioId = req.params.folioId as string;
    const docs = await prisma.invoice.findMany({
      where: { folioId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs.map(d => ({ ...d, lineItems: JSON.parse(d.lineItems || '[]') })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkoutFolio = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // folio ID

    const folio = await prisma.folio.findUnique({ where: { id }, include: { booking: true } }) as any;
    if(!folio) return res.status(404).json({ error: 'Folio not found' });

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
       const updatedFolio = await tx.folio.update({
         where: { id },
         data: { status: 'CLOSED' }
       });

       await tx.booking.update({
         where: { id: folio.bookingId },
         data: { status: 'CHECKED_OUT' }
       });

       if (folio.booking && folio.booking.roomId) {
         await tx.room.update({
           where: { id: folio.booking.roomId },
           data: { status: 'VACANT_DIRTY' }
         });

         await tx.roomStatusHistory.create({
            data: { roomId: folio.booking.roomId, status: 'VACANT_DIRTY', changedBy: req.user!.id, reason: 'Guest Checkout' }
         });
       }

       return updatedFolio;
    });

    await createAuditLog(req.user!.id, 'CHECKOUT_FOLIO', 'Folio', id, folio, result);
    
    // PDF generation trigger would happen here. Returning SUCCESS.
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

