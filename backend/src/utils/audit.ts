import prisma from './prisma';

export const createAuditLog = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  beforeValue?: any,
  afterValue?: any,
  reason?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        beforeValue: beforeValue ? JSON.stringify(beforeValue) : null,
        afterValue: afterValue ? JSON.stringify(afterValue) : null,
        reason,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
