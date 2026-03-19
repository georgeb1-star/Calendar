import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating to 2-room setup...');

  // Remove old rooms (cascade: delete their booking logs + bookings first)
  const oldRooms = await prisma.room.findMany();
  for (const room of oldRooms) {
    const roomBookings = await prisma.booking.findMany({ where: { roomId: room.id } });
    for (const booking of roomBookings) {
      await prisma.bookingLog.deleteMany({ where: { bookingId: booking.id } });
    }
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
    console.log(`Deleted room: ${room.name}`);
  }

  // Create the 2 correct rooms
  const r1 = await prisma.room.create({
    data: { name: 'Meeting Room 1', capacity: 6, amenities: ['whiteboard', 'tv-screen'] },
  });
  const r2 = await prisma.room.create({
    data: { name: 'Meeting Room 2', capacity: 7, amenities: ['whiteboard', 'projector', 'video-conferencing'] },
  });

  console.log(`Created: ${r1.name} (cap ${r1.capacity})`);
  console.log(`Created: ${r2.name} (cap ${r2.capacity})`);
  console.log('Done. Run `npx prisma db seed` to add sample bookings.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
