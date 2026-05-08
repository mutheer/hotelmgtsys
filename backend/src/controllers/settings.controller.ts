import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { createAuditLog } from '../utils/audit';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = settings.reduce((acc, current) => {
      acc[current.key] = current.value;
      return acc;
    }, {} as Record<string, string>);
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    
    const existing = await prisma.settings.findUnique({ where: { key } });
    
    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    await createAuditLog(
      req.user!.id, 
      'UPDATE_SETTING', 
      'Settings', 
      setting.id, 
      existing, 
      setting
    );

    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
