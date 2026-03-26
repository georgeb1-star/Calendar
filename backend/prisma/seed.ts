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

  // ── Resolve all office locations ──────────────────────────────────────────
  const officeNames = [
    'Borough',
    'Waterloo',
    'St James',
    'Chelsea Fulham Road',
    'Chelsea Kings Road',
    'Fulham',
    'Mayfair',
    'Esher',
    'Kingston Apple Market Hub',
    'Kingston Rivermead',
    'Kingston Crown Passage',
    'Epsom',
    'Cobham Grosvenor House',
    'Cobham Anyards Road',
  ];

  const officeMap: Record<string, string> = {}; // officeName → locationId

  for (const name of officeNames) {
    const loc = await prisma.location.findFirst({ where: { name } });
    if (loc) officeMap[name] = loc.id;
    else console.warn(`Office not found in DB: "${name}" — companies for this office will be skipped`);
  }

  const boroughId = officeMap['Borough'];
  if (!boroughId) throw new Error('Borough location not found — run migrations first');

  // ── Borough companies (existing 12) ──────────────────────────────────────
  const boroughCompanySeed = [
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

  // ── Other office companies ────────────────────────────────────────────────
  const otherOfficeSeed: { officeName: string; companies: { name: string; color: string; slug: string }[] }[] = [
    {
      officeName: 'Waterloo',
      companies: [
        { name: 'Apex Digital Consulting',  color: '#3B82F6', slug: 'apex-digital' },
        { name: 'Southbank Media Group',    color: '#10B981', slug: 'southbank-media' },
        { name: 'Nexus Architecture Ltd',   color: '#F59E0B', slug: 'nexus-arch' },
        { name: 'Riva Financial Services',  color: '#8B5CF6', slug: 'riva-financial' },
        { name: 'Orbit Engineering',        color: '#EF4444', slug: 'orbit-eng' },
        { name: 'Clearwater Legal',         color: '#06B6D4', slug: 'clearwater-legal' },
        { name: 'Prestige Talent Agency',   color: '#F97316', slug: 'prestige-talent' },
      ],
    },
    {
      officeName: 'St James',
      companies: [
        { name: 'Belgravia Capital Partners', color: '#3B82F6', slug: 'belgravia-capital' },
        { name: 'Crown Estate Advisory',      color: '#10B981', slug: 'crown-advisory' },
        { name: 'Imperial Consulting Group',  color: '#F59E0B', slug: 'imperial-consulting' },
        { name: 'Heritage Asset Management',  color: '#8B5CF6', slug: 'heritage-assets' },
        { name: 'Mayfair Legal Associates',   color: '#EF4444', slug: 'mayfair-legal' },
        { name: 'St James Wealth Management', color: '#06B6D4', slug: 'stjames-wealth' },
      ],
    },
    {
      officeName: 'Chelsea Fulham Road',
      companies: [
        { name: 'Chelsea Creative Agency',  color: '#3B82F6', slug: 'chelsea-creative' },
        { name: 'Fulham Road Interiors',    color: '#10B981', slug: 'fulhamroad-interiors' },
        { name: 'Sage Health & Wellness',   color: '#F59E0B', slug: 'sage-health' },
        { name: 'Blueprint Property Group', color: '#8B5CF6', slug: 'blueprint-property' },
        { name: 'Artisan Photography Studio', color: '#EF4444', slug: 'artisan-photo' },
        { name: 'Sloane Square Media',      color: '#06B6D4', slug: 'sloane-media' },
      ],
    },
    {
      officeName: 'Chelsea Kings Road',
      companies: [
        { name: 'Kings Road Fashion House',   color: '#3B82F6', slug: 'kingsroad-fashion' },
        { name: 'Chelsea Lifestyle Brand',    color: '#10B981', slug: 'chelsea-lifestyle' },
        { name: 'Boutique Events Co',         color: '#F59E0B', slug: 'boutique-events' },
        { name: 'Curated Design Studio',      color: '#8B5CF6', slug: 'curated-design' },
        { name: 'Royal Quarter Consulting',   color: '#EF4444', slug: 'royal-quarter' },
        { name: 'Lacey & Partners',           color: '#06B6D4', slug: 'lacey-partners' },
      ],
    },
    {
      officeName: 'Fulham',
      companies: [
        { name: 'Riverside Digital',        color: '#3B82F6', slug: 'riverside-digital' },
        { name: 'Fulham Analytics',         color: '#10B981', slug: 'fulham-analytics' },
        { name: 'Thames Valley Media',      color: '#F59E0B', slug: 'thamesvalley-media' },
        { name: 'Harbour Point Consulting', color: '#8B5CF6', slug: 'harbour-point' },
        { name: 'Westbourne Group',         color: '#EF4444', slug: 'westbourne-group' },
      ],
    },
    {
      officeName: 'Mayfair',
      companies: [
        { name: 'Park Lane Holdings',         color: '#3B82F6', slug: 'parklane-holdings' },
        { name: 'Mayfair Private Equity',     color: '#10B981', slug: 'mayfair-pe' },
        { name: 'Grosvenor Strategy Group',   color: '#F59E0B', slug: 'grosvenor-strategy' },
        { name: 'Berkeley Square Ventures',   color: '#8B5CF6', slug: 'berkeley-sq' },
        { name: 'Bond Street Advisors',       color: '#EF4444', slug: 'bond-street' },
        { name: 'Mount Street Media',         color: '#06B6D4', slug: 'mountstreet-media' },
      ],
    },
    {
      officeName: 'Esher',
      companies: [
        { name: 'Esher Green Consulting',   color: '#3B82F6', slug: 'esher-green' },
        { name: 'Surrey Digital Solutions', color: '#10B981', slug: 'surrey-digital' },
        { name: 'Molesey Creative Studio',  color: '#F59E0B', slug: 'molesey-creative' },
        { name: 'Claremont Analytics',      color: '#8B5CF6', slug: 'claremont-analytics' },
        { name: 'Sandown Business Group',   color: '#EF4444', slug: 'sandown-biz' },
      ],
    },
    {
      officeName: 'Kingston Apple Market Hub',
      companies: [
        { name: 'Kingston Tech Hub',        color: '#3B82F6', slug: 'kingston-tech' },
        { name: 'Apple Market Digital',     color: '#10B981', slug: 'applemarket-digital' },
        { name: 'Thames Valley Startups',   color: '#F59E0B', slug: 'thamesvalley-startups' },
        { name: 'Surrey Innovation Labs',   color: '#8B5CF6', slug: 'surrey-innovation' },
        { name: 'Landmark Media Group',     color: '#EF4444', slug: 'landmark-media' },
      ],
    },
    {
      officeName: 'Kingston Rivermead',
      companies: [
        { name: 'Rivermead Consulting',     color: '#3B82F6', slug: 'rivermead-consulting' },
        { name: 'Kingston River Studios',   color: '#10B981', slug: 'kingston-river' },
        { name: 'Tidal Analytics',          color: '#F59E0B', slug: 'tidal-analytics' },
        { name: 'Hampton Wick Designs',     color: '#8B5CF6', slug: 'hamptonwick-designs' },
        { name: 'Surbiton Solutions',       color: '#EF4444', slug: 'surbiton-solutions' },
      ],
    },
    {
      officeName: 'Kingston Crown Passage',
      companies: [
        { name: 'Crown Passage Media',        color: '#3B82F6', slug: 'crownpassage-media' },
        { name: 'Kingston Law Group',          color: '#10B981', slug: 'kingston-law' },
        { name: 'Royal Borough Consulting',   color: '#F59E0B', slug: 'royalborough-consulting' },
        { name: 'Passage Marketing Agency',   color: '#8B5CF6', slug: 'passage-marketing' },
        { name: 'Charter Digital',            color: '#EF4444', slug: 'charter-digital' },
      ],
    },
    {
      officeName: 'Epsom',
      companies: [
        { name: 'Epsom Business Centre',    color: '#3B82F6', slug: 'epsom-biz' },
        { name: 'Racecourse Digital',       color: '#10B981', slug: 'racecourse-digital' },
        { name: 'Downs Consulting Group',   color: '#F59E0B', slug: 'downs-consulting' },
        { name: 'Surrey Techworks',         color: '#8B5CF6', slug: 'surrey-techworks' },
        { name: 'Clocktower Media',         color: '#EF4444', slug: 'clocktower-media' },
      ],
    },
    {
      officeName: 'Cobham Grosvenor House',
      companies: [
        { name: 'Grosvenor House Media',    color: '#3B82F6', slug: 'grosvenor-media' },
        { name: 'Cobham Digital',           color: '#10B981', slug: 'cobham-digital' },
        { name: 'Surrey Hills Consulting',  color: '#F59E0B', slug: 'surreyhills-consulting' },
        { name: 'Pine Ridge Partners',      color: '#8B5CF6', slug: 'pineridge-partners' },
        { name: 'Downside Analytics',       color: '#EF4444', slug: 'downside-analytics' },
      ],
    },
    {
      officeName: 'Cobham Anyards Road',
      companies: [
        { name: 'Anyards Digital Studio',   color: '#3B82F6', slug: 'anyards-digital' },
        { name: 'Cobham Capital Group',     color: '#10B981', slug: 'cobham-capital' },
        { name: 'Brook Street Consulting',  color: '#F59E0B', slug: 'brookstreet-consulting' },
        { name: 'Tilt Creative Agency',     color: '#8B5CF6', slug: 'tilt-creative' },
        { name: 'Cobham Tech Solutions',    color: '#EF4444', slug: 'cobham-tech' },
      ],
    },
  ];

  // ── Upsert all companies ──────────────────────────────────────────────────
  const companies: Record<string, { id: string; name: string }> = {};

  for (const c of boroughCompanySeed) {
    const company = await prisma.company.upsert({
      where: { name: c.name },
      update: { officeLocationId: boroughId },
      create: { name: c.name, color: c.color, officeLocationId: boroughId },
    });
    companies[c.slug] = company;
  }

  for (const office of otherOfficeSeed) {
    const officeId = officeMap[office.officeName];
    if (!officeId) continue;

    for (const c of office.companies) {
      const company = await prisma.company.upsert({
        where: { name: c.name },
        update: { officeLocationId: officeId },
        create: { name: c.name, color: c.color, officeLocationId: officeId },
      });
      companies[c.slug] = company;
    }
  }

  console.log('Companies created/updated:', Object.keys(companies).length);

  // ── Seed users ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const empHash   = await bcrypt.hash('password123', 10);

  // Borough users (existing 12 companies)
  const boroughUserSeed = [
    { email: 'admin@websedge.com',            name: 'Alex Websedge',     role: Role.COMPANY_ADMIN, companySlug: 'websedge' },
    { email: 'user@websedge.com',             name: 'Sam Websedge',      role: Role.EMPLOYEE,      companySlug: 'websedge' },
    { email: 'admin@bodymove.com',            name: 'Alex Bodymove',     role: Role.COMPANY_ADMIN, companySlug: 'bodymove' },
    { email: 'user@bodymove.com',             name: 'Sam Bodymove',      role: Role.EMPLOYEE,      companySlug: 'bodymove' },
    { email: 'admin@citipost.com',            name: 'Alex Citipost',     role: Role.COMPANY_ADMIN, companySlug: 'citipost' },
    { email: 'user@citipost.com',             name: 'Sam Citipost',      role: Role.EMPLOYEE,      companySlug: 'citipost' },
    { email: 'admin@talkingsolution.com',     name: 'Alex Talking',      role: Role.COMPANY_ADMIN, companySlug: 'talking-solution' },
    { email: 'user@talkingsolution.com',      name: 'Sam Talking',       role: Role.EMPLOYEE,      companySlug: 'talking-solution' },
    { email: 'admin@pochpac.com',             name: 'Alex Pochpac',      role: Role.COMPANY_ADMIN, companySlug: 'pochpac' },
    { email: 'user@pochpac.com',              name: 'Sam Pochpac',       role: Role.EMPLOYEE,      companySlug: 'pochpac' },
    { email: 'admin@teletch.com',             name: 'Alex Teletch',      role: Role.COMPANY_ADMIN, companySlug: 'teletch' },
    { email: 'user@teletch.com',              name: 'Sam Teletch',       role: Role.EMPLOYEE,      companySlug: 'teletch' },
    { email: 'admin@studio2000.com',          name: 'Alex Studio',       role: Role.COMPANY_ADMIN, companySlug: 'studio2000' },
    { email: 'user@studio2000.com',           name: 'Sam Studio',        role: Role.EMPLOYEE,      companySlug: 'studio2000' },
    { email: 'admin@alleycats.tv',            name: 'Alex Alleycats',    role: Role.COMPANY_ADMIN, companySlug: 'alleycats' },
    { email: 'user@alleycats.tv',             name: 'Sam Alleycats',     role: Role.EMPLOYEE,      companySlug: 'alleycats' },
    { email: 'admin@streamforge.com',         name: 'Alex Streamforge',  role: Role.COMPANY_ADMIN, companySlug: 'streamforge' },
    { email: 'user@streamforge.com',          name: 'Sam Streamforge',   role: Role.EMPLOYEE,      companySlug: 'streamforge' },
    { email: 'admin@londoncitytherapy.com',   name: 'Alex London City',  role: Role.COMPANY_ADMIN, companySlug: 'london-city-therapy' },
    { email: 'user@londoncitytherapy.com',    name: 'Sam London City',   role: Role.EMPLOYEE,      companySlug: 'london-city-therapy' },
    { email: 'admin@jolly.com',               name: 'Alex Jolly',        role: Role.COMPANY_ADMIN, companySlug: 'jolly' },
    { email: 'user@jolly.com',                name: 'Sam Jolly',         role: Role.EMPLOYEE,      companySlug: 'jolly' },
    { email: 'admin@londonbridgetherapy.com', name: 'Alex LBT',          role: Role.COMPANY_ADMIN, companySlug: 'lbt' },
    { email: 'user@londonbridgetherapy.com',  name: 'Sam LBT',           role: Role.EMPLOYEE,      companySlug: 'lbt' },
  ];

  for (const u of boroughUserSeed) {
    const hash = u.role === Role.COMPANY_ADMIN ? adminHash : empHash;
    await prisma.user.upsert({
      where: { email: u.email },
      update: { locationId: boroughId },
      create: {
        email:        u.email,
        passwordHash: hash,
        name:         u.name,
        role:         u.role,
        companyId:    companies[u.companySlug].id,
        locationId:   boroughId,
        status:       'ACTIVE',
      },
    });
  }

  // Users for other office companies
  for (const office of otherOfficeSeed) {
    const officeId = officeMap[office.officeName];
    if (!officeId) continue;

    for (const c of office.companies) {
      if (!companies[c.slug]) continue;
      const baseEmail = c.slug.replace(/[^a-z0-9]/g, '');

      await prisma.user.upsert({
        where: { email: `admin@${baseEmail}.com` },
        update: { locationId: officeId },
        create: {
          email:        `admin@${baseEmail}.com`,
          passwordHash: adminHash,
          name:         `Admin ${c.name}`,
          role:         Role.COMPANY_ADMIN,
          companyId:    companies[c.slug].id,
          locationId:   officeId,
          status:       'ACTIVE',
        },
      });

      await prisma.user.upsert({
        where: { email: `user@${baseEmail}.com` },
        update: { locationId: officeId },
        create: {
          email:        `user@${baseEmail}.com`,
          passwordHash: empHash,
          name:         `User ${c.name}`,
          role:         Role.EMPLOYEE,
          companyId:    companies[c.slug].id,
          locationId:   officeId,
          status:       'ACTIVE',
        },
      });
    }
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
  console.log('Borough company admins: admin@<slug>.com / admin123');
  console.log('Borough employees:      user@<slug>.com  / password123');
  console.log('Other offices:          admin@<slug>.com / admin123  |  user@<slug>.com / password123');
  console.log('');
  console.log('Example logins:');
  console.log('  admin@websedge.com / admin123  (Borough)');
  console.log('  admin@apexdigital.com / admin123  (Waterloo)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
