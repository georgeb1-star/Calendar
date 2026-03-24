import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Wipe old seed data ────────────────────────────────────────────────────
  const oldCompanyNames = ['Acme Corp', 'Globex Industries'];
  const oldCompanies = await prisma.company.findMany({
    where: { name: { in: oldCompanyNames } },
  });
  const oldCompanyIds = oldCompanies.map((c) => c.id);

  if (oldCompanyIds.length > 0) {
    await prisma.bookingInvite.deleteMany({ where: { booking: { companyId: { in: oldCompanyIds } } } });
    await prisma.booking.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
    await prisma.recurringBooking.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
    await prisma.user.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
    await prisma.companyDailyTokens.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
    await prisma.subscription.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    console.log('Removed old companies: Acme Corp, Globex Industries');
  }

  // ── Companies ─────────────────────────────────────────────────────────────
  const companySeed = [
    { name: 'Websedge',                          color: '#3B82F6', slug: 'websedge' },
    { name: 'Bodymove Osteopathy Clinic',         color: '#10B981', slug: 'bodymove' },
    { name: 'Citipost Global',                    color: '#F59E0B', slug: 'citipost' },
    { name: 'The Talking Solution',               color: '#8B5CF6', slug: 'talking-solution' },
    { name: 'Pochpac Studio',                     color: '#EF4444', slug: 'pochpac' },
    { name: 'Teletch Partner',                    color: '#06B6D4', slug: 'teletch' },
    { name: 'Studio 2000',                        color: '#F97316', slug: 'studio2000' },
    { name: 'Alleycats TV',                       color: '#EC4899', slug: 'alleycats' },
    { name: 'Streamforge',                        color: '#14B8A6', slug: 'streamforge' },
    { name: 'London City Therapy Clinic',         color: '#84CC16', slug: 'london-city-therapy' },
    { name: 'Jolly Psychotherapy & Psychology',   color: '#A855F7', slug: 'jolly' },
    { name: 'London Bridge Therapy',              color: '#6366F1', slug: 'lbt' },
  ];

  const companies: Record<string, { id: string; name: string }> = {};

  for (const c of companySeed) {
    const company = await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, color: c.color },
    });
    companies[c.slug] = company;
  }

  console.log('Companies created:', Object.values(companies).map((c) => c.name).join(', '));

  // ── Seed users ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const empHash   = await bcrypt.hash('password123', 10);

  const userSeed = [
    // Websedge
    { email: 'admin@websedge.com',       name: 'Alex Websedge',        role: Role.COMPANY_ADMIN, companySlug: 'websedge' },
    { email: 'user@websedge.com',        name: 'Sam Websedge',         role: Role.EMPLOYEE,      companySlug: 'websedge' },
    // Bodymove Osteopathy Clinic
    { email: 'admin@bodymove.com',       name: 'Alex Bodymove',        role: Role.COMPANY_ADMIN, companySlug: 'bodymove' },
    { email: 'user@bodymove.com',        name: 'Sam Bodymove',         role: Role.EMPLOYEE,      companySlug: 'bodymove' },
    // Citipost Global
    { email: 'admin@citipost.com',       name: 'Alex Citipost',        role: Role.COMPANY_ADMIN, companySlug: 'citipost' },
    { email: 'user@citipost.com',        name: 'Sam Citipost',         role: Role.EMPLOYEE,      companySlug: 'citipost' },
    // The Talking Solution
    { email: 'admin@talkingsolution.com',name: 'Alex Talking',         role: Role.COMPANY_ADMIN, companySlug: 'talking-solution' },
    { email: 'user@talkingsolution.com', name: 'Sam Talking',          role: Role.EMPLOYEE,      companySlug: 'talking-solution' },
    // Pochpac Studio
    { email: 'admin@pochpac.com',        name: 'Alex Pochpac',         role: Role.COMPANY_ADMIN, companySlug: 'pochpac' },
    { email: 'user@pochpac.com',         name: 'Sam Pochpac',          role: Role.EMPLOYEE,      companySlug: 'pochpac' },
    // Teletch Partner
    { email: 'admin@teletch.com',        name: 'Alex Teletch',         role: Role.COMPANY_ADMIN, companySlug: 'teletch' },
    { email: 'user@teletch.com',         name: 'Sam Teletch',          role: Role.EMPLOYEE,      companySlug: 'teletch' },
    // Studio 2000
    { email: 'admin@studio2000.com',     name: 'Alex Studio',          role: Role.COMPANY_ADMIN, companySlug: 'studio2000' },
    { email: 'user@studio2000.com',      name: 'Sam Studio',           role: Role.EMPLOYEE,      companySlug: 'studio2000' },
    // Alleycats TV
    { email: 'admin@alleycats.tv',       name: 'Alex Alleycats',       role: Role.COMPANY_ADMIN, companySlug: 'alleycats' },
    { email: 'user@alleycats.tv',        name: 'Sam Alleycats',        role: Role.EMPLOYEE,      companySlug: 'alleycats' },
    // Streamforge
    { email: 'admin@streamforge.com',    name: 'Alex Streamforge',     role: Role.COMPANY_ADMIN, companySlug: 'streamforge' },
    { email: 'user@streamforge.com',     name: 'Sam Streamforge',      role: Role.EMPLOYEE,      companySlug: 'streamforge' },
    // London City Therapy Clinic
    { email: 'admin@londoncitytherapy.com', name: 'Alex London City',  role: Role.COMPANY_ADMIN, companySlug: 'london-city-therapy' },
    { email: 'user@londoncitytherapy.com',  name: 'Sam London City',   role: Role.EMPLOYEE,      companySlug: 'london-city-therapy' },
    // Jolly Psychotherapy & Psychology
    { email: 'admin@jolly.com',          name: 'Alex Jolly',           role: Role.COMPANY_ADMIN, companySlug: 'jolly' },
    { email: 'user@jolly.com',           name: 'Sam Jolly',            role: Role.EMPLOYEE,      companySlug: 'jolly' },
    // London Bridge Therapy (covers Southwark Room, Thames Room, Shard Room)
    { email: 'admin@londonbridgetherapy.com', name: 'Alex LBT',        role: Role.COMPANY_ADMIN, companySlug: 'lbt' },
    { email: 'user@londonbridgetherapy.com',  name: 'Sam LBT',         role: Role.EMPLOYEE,      companySlug: 'lbt' },
  ];

  for (const u of userSeed) {
    const hash = u.role === Role.COMPANY_ADMIN ? adminHash : empHash;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email:        u.email,
        passwordHash: hash,
        name:         u.name,
        role:         u.role,
        companyId:    companies[u.companySlug].id,
        status:       'ACTIVE',
      },
    });
  }

  console.log('Seed users created (COMPANY_ADMIN + EMPLOYEE per company)');

  // ── Rooms (scoped to Borough location) ───────────────────────────────────
  const boroughLocation = await prisma.location.findFirst({ where: { name: 'Borough' } });
  if (!boroughLocation) {
    console.warn('Borough location not found — skipping room seed. Run migrations first.');
  } else {
    const roomDefs = [
      { name: 'Meeting Room 1', capacity: 6,  amenities: ['whiteboard', 'tv-screen'] },
      { name: 'Meeting Room 2', capacity: 7,  amenities: ['whiteboard', 'projector', 'video-conferencing'] },
    ];

    for (const room of roomDefs) {
      const existing = await prisma.room.findFirst({
        where: { name: room.name, locationId: boroughLocation.id },
      });
      if (!existing) {
        await prisma.room.create({
          data: { ...room, locationId: boroughLocation.id },
        });
      }
    }

    const createdRooms = await prisma.room.findMany({ where: { locationId: boroughLocation.id } });
    console.log('Rooms (Borough):', createdRooms.map((r) => r.name).join(', '));
  }

  console.log('');
  console.log('=== Seed Credentials ===');
  console.log('All company admins:    admin@<slug>.com / admin123');
  console.log('All employees:         user@<slug>.com  / password123');
  console.log('');
  console.log('Example logins:');
  console.log('  admin@websedge.com / admin123');
  console.log('  admin@londonbridgetherapy.com / admin123  (covers Southwark, Thames & Shard rooms)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
