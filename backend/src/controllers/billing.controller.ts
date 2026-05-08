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
    const { folioId, description, amount } = req.body;
    const charge = await prisma.serviceCharge.create({
      data: { folioId, description, amount: parseFloat(amount) }
    });
    
    await createAuditLog(req.user!.id, 'ADD_SERVICE_CHARGE', 'ServiceCharge', charge.id, null, charge);
    res.status(201).json(charge);
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

