import { MembershipType, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default system settings (Setting table, §3.12). Idempotent upsert.
const DEFAULT_SETTINGS: { key: string; value: string; description: string }[] = [
  { key: 'default_loan_period_days', value: '14', description: 'Default loan period in days' },
  { key: 'fine_rate_per_day', value: '0.50', description: 'Fine charged per overdue day' },
  { key: 'max_renewals', value: '2', description: 'Maximum renewals per loan' },
  {
    key: 'reservation_ready_window_hours',
    value: '48',
    description: 'Hours a READY hold is held before it expires',
  },
  {
    key: 'fine_block_threshold',
    value: '10.00',
    description: 'Outstanding fine amount that blocks borrowing',
  },
  { key: 'borrowing_limit_student', value: '5', description: 'Borrowing limit for STUDENT members' },
  { key: 'borrowing_limit_faculty', value: '10', description: 'Borrowing limit for FACULTY members' },
  { key: 'borrowing_limit_public', value: '3', description: 'Borrowing limit for PUBLIC members' },
  { key: 'due_soon_reminder_days', value: '2', description: 'Days before due date to send reminder' },
];

async function main() {
  for (const s of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { description: s.description },
      create: s,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${DEFAULT_SETTINGS.length} settings`);

  await seedUsers();
  await seedCategories();
  await seedCatalog();
}

interface SeedBook {
  isbn: string;
  title: string;
  description: string;
  publicationYear: number;
  category: string;
  publisher: string;
  authors: string[];
  copies: number;
}

const SEED_BOOKS: SeedBook[] = [
  {
    isbn: '9780132350884',
    title: 'Clean Code',
    description: 'A Handbook of Agile Software Craftsmanship.',
    publicationYear: 2008,
    category: 'Software Engineering',
    publisher: 'Prentice Hall',
    authors: ['Robert C. Martin'],
    copies: 3,
  },
  {
    isbn: '9780201616224',
    title: 'The Pragmatic Programmer',
    description: 'Your Journey to Mastery.',
    publicationYear: 1999,
    category: 'Software Engineering',
    publisher: 'Addison-Wesley',
    authors: ['Andrew Hunt', 'David Thomas'],
    copies: 2,
  },
  {
    isbn: '9780262033848',
    title: 'Introduction to Algorithms',
    description: 'The classic CLRS algorithms reference.',
    publicationYear: 2009,
    category: 'Computer Science',
    publisher: 'MIT Press',
    authors: ['Thomas H. Cormen', 'Charles E. Leiserson'],
    copies: 4,
  },
  {
    isbn: '9781491950296',
    title: 'Designing Data-Intensive Applications',
    description: 'The big ideas behind reliable, scalable systems.',
    publicationYear: 2017,
    category: 'Computer Science',
    publisher: "O'Reilly Media",
    authors: ['Martin Kleppmann'],
    copies: 2,
  },
  {
    isbn: '9780743273565',
    title: 'The Great Gatsby',
    description: 'A novel of the Jazz Age.',
    publicationYear: 1925,
    category: 'Fiction',
    publisher: 'Scribner',
    authors: ['F. Scott Fitzgerald'],
    copies: 5,
  },
];

/**
 * Subject areas for a science and technology university library.
 *
 * Categories used to exist only as a by-product of seeding books, so a fresh
 * database offered three of them and every new title had to invent its own.
 * Seeding the taxonomy separately gives the catalogue form something real to
 * choose from on day one.
 */
const SEED_CATEGORIES = [
  'Computer Science',
  'Software Engineering',
  'Information Technology',
  'Electrical & Electronic Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Materials Science',
  'Architecture & Planning',
  'Agriculture & Natural Resources',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biological Sciences',
  'Medicine & Health Sciences',
  'Pharmacy',
  'Business & Management',
  'Economics',
  'Law',
  'Social Sciences',
  'Education',
  'African Studies',
  'History',
  'Literature',
  'Fiction',
  'Reference',
];

async function seedCategories() {
  let created = 0;
  for (const name of SEED_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) continue;
    await prisma.category.create({ data: { name } });
    created += 1;
  }
  console.log(`Categories: ${created} created, ${SEED_CATEGORIES.length - created} already present`);
}

async function seedCatalog() {
  let created = 0;
  for (const b of SEED_BOOKS) {
    if (await prisma.book.findUnique({ where: { isbn: b.isbn } })) continue;

    const category = await prisma.category.upsert({
      where: { name: b.category },
      update: {},
      create: { name: b.category },
    });
    const publisher = await prisma.publisher.upsert({
      where: { name: b.publisher },
      update: {},
      create: { name: b.publisher },
    });
    const authorIds: string[] = [];
    for (const name of b.authors) {
      const author = await prisma.author.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      authorIds.push(author.id);
    }

    const book = await prisma.book.create({
      data: {
        isbn: b.isbn,
        title: b.title,
        description: b.description,
        publicationYear: b.publicationYear,
        categoryId: category.id,
        publisherId: publisher.id,
        authors: { connect: authorIds.map((id) => ({ id })) },
      },
    });

    for (let i = 1; i <= b.copies; i++) {
      await prisma.bookCopy.create({
        data: {
          bookId: book.id,
          accessionNumber: `${b.isbn}-${String(i).padStart(2, '0')}`,
          shelfLocation: `${b.category.slice(0, 3).toUpperCase()}-${i}`,
          acquiredDate: new Date(),
        },
      });
    }
    created++;
  }
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${created} books with copies`);
}

async function settingNumber(key: string): Promise<number> {
  const s = await prisma.setting.findUniqueOrThrow({ where: { key } });
  return Number(s.value);
}

async function seedUsers() {
  const loanPeriod = await settingNumber('default_loan_period_days');
  const limitByType: Record<MembershipType, number> = {
    STUDENT: await settingNumber('borrowing_limit_student'),
    FACULTY: await settingNumber('borrowing_limit_faculty'),
    PUBLIC: await settingNumber('borrowing_limit_public'),
  };

  const accounts: {
    fullName: string;
    email: string;
    identifier: string;
    password: string;
    role: Role;
    membershipType: MembershipType;
  }[] = [
    {
      fullName: 'Library Admin',
      email: 'admin@bibliohub.local',
      identifier: 'STAFF-0001',
      password: 'Admin123!',
      role: Role.ADMIN,
      membershipType: MembershipType.FACULTY,
    },
    {
      fullName: 'Front Desk Librarian',
      email: 'librarian@bibliohub.local',
      identifier: 'STAFF-0002',
      password: 'Librarian123!',
      role: Role.LIBRARIAN,
      membershipType: MembershipType.FACULTY,
    },
    {
      fullName: 'Sample Member',
      email: 'member@bibliohub.local',
      identifier: 'STU-100245',
      password: 'Member123!',
      role: Role.MEMBER,
      membershipType: MembershipType.STUDENT,
    },
  ];

  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role, identifier: a.identifier },
      create: {
        fullName: a.fullName,
        email: a.email,
        identifier: a.identifier,
        passwordHash: await bcrypt.hash(a.password, 10),
        role: a.role,
        membershipType: a.membershipType,
        borrowingLimit: limitByType[a.membershipType],
        loanPeriodDays: loanPeriod,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${accounts.length} users (admin / librarian / member)`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
