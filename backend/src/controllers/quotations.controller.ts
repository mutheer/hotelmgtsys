import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';

function genQuoteNumber(): Promise<string> {
  // Format: ME + YYMM + 3-digit sequence within the month
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `ME${yy}${mm}`;
  return prisma.quotation
    .findMany({ where: { quoteNumber: { startsWith: prefix } }, orderBy: { quoteNumber: 'desc' }, take: 1 })
    .then(rows => {
      let seq = 1;
      if (rows.length) {
        const last = rows[0].quoteNumber;
        const n = parseInt(last.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
      }
      return `${prefix}${String(seq).padStart(3, '0')}`;
    });
}

function totalsFor(lineItems: any[], vatPct: number, discount: number = 0) {
  const subtotal = lineItems.reduce((s, li) => s + (Number(li.total) || 0), 0);
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal); // never go negative
  const taxable = subtotal - disc;
  const vatAmount = +(taxable * (vatPct / 100)).toFixed(2);
  const total = +(taxable + vatAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discount: +disc.toFixed(2), vatAmount, total };
}

export const listQuotations = async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.quotation.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rows.map(r => ({ ...r, lineItems: JSON.parse(r.lineItems || '[]'), bankDetails: r.bankDetails ? JSON.parse(r.bankDetails) : null })));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const q = await prisma.quotation.findUnique({ where: { id } });
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    res.json({ ...q, lineItems: JSON.parse(q.lineItems || '[]'), bankDetails: q.bankDetails ? JSON.parse(q.bankDetails) : null });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      date, clientName, clientTel, clientEmail, clientAddress,
      lineItems = [], notes, bankDetails, vatPct = 12, discount = 0, quoteNumber
    } = req.body;
    if (!clientName) return res.status(400).json({ error: 'clientName is required' });

    const number = quoteNumber || await genQuoteNumber();
    const { subtotal, discount: appliedDiscount, vatAmount, total } = totalsFor(lineItems, vatPct, discount);

    const q = await prisma.quotation.create({
      data: {
        quoteNumber: number,
        date: date ? new Date(date) : new Date(),
        clientName,
        clientTel, clientEmail, clientAddress,
        lineItems: JSON.stringify(lineItems),
        notes,
        bankDetails: bankDetails ? JSON.stringify(bankDetails) : null,
        subtotal, discount: appliedDiscount, vatPct, vatAmount, total,
        createdById: req.user!.id
      }
    });
    res.status(201).json({ ...q, lineItems: JSON.parse(q.lineItems), bankDetails: q.bankDetails ? JSON.parse(q.bankDetails) : null });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Quote number already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      date, clientName, clientTel, clientEmail, clientAddress,
      lineItems, notes, bankDetails, vatPct, discount, quoteNumber
    } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    const items = lineItems !== undefined ? lineItems : JSON.parse(existing.lineItems);
    const vp = vatPct !== undefined ? vatPct : existing.vatPct;
    const dc = discount !== undefined ? discount : existing.discount;
    const { subtotal, discount: appliedDiscount, vatAmount, total } = totalsFor(items, vp, dc);

    const q = await prisma.quotation.update({
      where: { id },
      data: {
        ...(quoteNumber !== undefined && { quoteNumber }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(clientName !== undefined && { clientName }),
        ...(clientTel !== undefined && { clientTel }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(clientAddress !== undefined && { clientAddress }),
        ...(lineItems !== undefined && { lineItems: JSON.stringify(lineItems) }),
        ...(notes !== undefined && { notes }),
        ...(bankDetails !== undefined && { bankDetails: bankDetails ? JSON.stringify(bankDetails) : null }),
        vatPct: vp, subtotal, discount: appliedDiscount, vatAmount, total
      }
    });
    res.json({ ...q, lineItems: JSON.parse(q.lineItems), bankDetails: q.bankDetails ? JSON.parse(q.bankDetails) : null });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Quote number already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.quotation.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const nextQuoteNumber = async (_req: AuthRequest, res: Response) => {
  try {
    const n = await genQuoteNumber();
    res.json({ quoteNumber: n });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
