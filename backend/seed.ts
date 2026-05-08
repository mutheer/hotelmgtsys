import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Owner User
  const ownerPassword = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      passwordHash: ownerPassword,
      name: 'The Melva Owner',
      role: 'OWNER',
    },
  });
  console.log('Created owner user.');

  // 2. Room Types
  const execType = await prisma.roomType.create({
    data: { name: 'Executive Room', basePrice: 870, capacity: 2 }
  });
  const jrExecType = await prisma.roomType.create({
    data: { name: 'Junior Executive Room', basePrice: 770, capacity: 2 }
  });
  const standardType = await prisma.roomType.create({
    data: { name: 'Standard Room', basePrice: 670, capacity: 2 }
  });
  console.log('Created room types.');

  // 3. Physical Rooms
  await prisma.room.createMany({
    data: [
      { number: '101', roomTypeId: execType.id, status: 'VACANT_CLEAN' },
      { number: '102', roomTypeId: execType.id, status: 'VACANT_CLEAN' },
      { number: '103', roomTypeId: execType.id, status: 'VACANT_CLEAN' },
      { number: '201', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },
      { number: '202', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },
      { number: '203', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },
      { number: '301', roomTypeId: standardType.id, status: 'VACANT_CLEAN' },
      { number: '302', roomTypeId: standardType.id, status: 'VACANT_CLEAN' },
      { number: '303', roomTypeId: standardType.id, status: 'VACANT_CLEAN' },
    ]
  });
  console.log('Created 9 rooms.');

  // 4. Settings
  await prisma.settings.createMany({
    data: [
      { key: 'SERVICE_BREAKFAST_PRICE', value: '100' },
      { key: 'SERVICE_AIRPORT_TRANSFER_PRICE', value: '100' },
      { key: 'DEPOSIT_PERCENTAGE', value: '20' },
      { key: 'LARGE_BOOKING_THRESHOLD_NIGHTS', value: '5' }
    ]
  });
  console.log('Created settings.');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
