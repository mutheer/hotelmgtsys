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

  // 2. Room Types (Melva Guest House — 5 rooms)
  const execType = await prisma.roomType.upsert({
    where: { name: 'Executive Room' },
    update: {},
    create: { name: 'Executive Room', basePrice: 870, capacity: 2 }
  });
  const jrExecType = await prisma.roomType.upsert({
    where: { name: 'Junior Executive Room' },
    update: {},
    create: { name: 'Junior Executive Room', basePrice: 770, capacity: 2 }
  });
  const standardType = await prisma.roomType.upsert({
    where: { name: 'Standard Room' },
    update: {},
    create: { name: 'Standard Room', basePrice: 670, capacity: 2 }
  });
  console.log('Created room types.');

  // 3. Physical Rooms — Melva Guest House: 9 rooms
  // 1 Executive, 4 Junior Executive, 4 Standard
  const roomsToCreate = [
    { number: '1', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },    // Junior Executive
    { number: '2', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },    // Junior Executive
    { number: '3', roomTypeId: standardType.id, status: 'VACANT_CLEAN' }, // Standard
    { number: '4', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },    // Junior Executive
    { number: '5', roomTypeId: standardType.id, status: 'VACANT_CLEAN' }, // Standard
    { number: '6', roomTypeId: jrExecType.id, status: 'VACANT_CLEAN' },    // Junior Executive
    { number: '7', roomTypeId: standardType.id, status: 'VACANT_CLEAN' }, // Standard
    { number: '8', roomTypeId: standardType.id, status: 'VACANT_CLEAN' }, // Standard
    { number: '9', roomTypeId: execType.id, status: 'VACANT_CLEAN' },      // Executive
  ];
  for (const r of roomsToCreate) {
    await prisma.room.upsert({ where: { number: r.number }, update: { roomTypeId: r.roomTypeId }, create: r as any });
  }
  console.log('Created/updated 9 rooms: Rooms 3,5,7,8 Standard | Rooms 1,2,4,6 Junior Executive | Room 9 Executive.');

  // 4. Settings
  const settingsData = [
    { key: 'PROPERTY_NAME', value: 'The Melva Elegant Guest House' },
    { key: 'SERVICE_BREAKFAST_PRICE', value: '100' },
    { key: 'SERVICE_LAUNDRY_PRICE', value: '80' },
    { key: 'SERVICE_AIRPORT_TRANSFER_PRICE', value: '150' },
    { key: 'DEPOSIT_PERCENTAGE', value: '20' },
    { key: 'LARGE_BOOKING_THRESHOLD_NIGHTS', value: '5' }
  ];
  for (const s of settingsData) {
    await prisma.settings.upsert({ where: { key: s.key }, update: {}, create: s });
  }
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
