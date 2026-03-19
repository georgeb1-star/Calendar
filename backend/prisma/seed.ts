import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Companies
  const acme = await prisma.company.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: { name: 'Acme Corp', color: '#3B82F6' },
  });

  const globex = await prisma.company.upsert({
    where: { name: 'Globex Industries' },
    update: {},
    create: { name: 'Globex Industries', color: '#10B981' },
  });

  console.log('Companies created:', acme.name, globex.name);

  // Admin user (Acme)
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      passwordHash: adminHash,
      name: 'Alice Admin',
      role: Role.ADMIN,
      companyId: acme.id,
    },
  });

  // Employees
  const empHash = await bcrypt.hash('password123', 10);

  const bob = await prisma.user.upsert({
    where: { email: 'bob@acme.com' },
    update: {},
    create: {
      email: 'bob@acme.com',
      passwordHash: empHash,
      name: 'Bob Smith',
      role: Role.EMPLOYEE,
      companyId: acme.id,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@globex.com' },
    update: {},
    create: {
      email: 'carol@globex.com',
      passwordHash: empHash,
      name: 'Carol Jones',
      role: Role.EMPLOYEE,
      companyId: globex.id,
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: 'dave@globex.com' },
    update: {},
    create: {
      email: 'dave@globex.com',
      passwordHash: empHash,
      name: 'Dave Wilson',
      role: Role.EMPLOYEE,
      companyId: globex.id,
    },
  });

  console.log('Users created:', admin.name, bob.name, carol.name, dave.name);

  // Rooms
  const rooms = [
    { name: 'Meeting Room 1', capacity: 6, amenities: ['whiteboard', 'tv-screen'] },
    { name: 'Meeting Room 2', capacity: 7, amenities: ['whiteboard', 'projector', 'video-conferencing'] },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
  }

  const createdRooms = await prisma.room.findMany();
  console.log('Rooms created:', createdRooms.map((r) => r.name).join(', '));

  // Sample bookings (future dates)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const roomA = createdRooms.find((r) => r.name === 'Meeting Room 1')!;
  const roomB = createdRooms.find((r) => r.name === 'Meeting Room 2')!;

  await prisma.booking.upsert({
    where: { id: 'seed-booking-1' },
    update: {},
    create: {
      id: 'seed-booking-1',
      title: '[Acme Corp] Q1 Planning',
      roomId: roomA.id,
      userId: bob.id,
      companyId: acme.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      durationHours: 2,
      status: 'ACTIVE',
      notes: 'Quarterly planning session',
    },
  });

  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(16, 0, 0, 0);

  await prisma.booking.upsert({
    where: { id: 'seed-booking-2' },
    update: {},
    create: {
      id: 'seed-booking-2',
      title: '[Globex Industries] Product Review',
      roomId: roomB.id,
      userId: carol.id,
      companyId: globex.id,
      startTime: dayAfter,
      endTime: dayAfterEnd,
      durationHours: 2,
      status: 'ACTIVE',
      notes: 'Monthly product review',
    },
  });

  console.log('Seed bookings created');
  console.log('');
  console.log('=== Seed Credentials ===');
  console.log('Admin: admin@acme.com / admin123');
  console.log('Employee (Acme): bob@acme.com / password123');
  console.log('Employee (Globex): carol@globex.com / password123');
  console.log('Employee (Globex): dave@globex.com / password123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
