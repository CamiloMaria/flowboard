import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://flowboard:flowboard_dev@localhost:5432/flowboard';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/** Bot users per D-16 with DESIGN.md palette colors */
const BOT_USERS = [
  { name: 'Maria', email: 'maria@flowboard.bot', color: '#F472B6' }, // user-2: Phosphor Pink
  { name: 'Carlos', email: 'carlos@flowboard.bot', color: '#4ADE80' }, // user-3: Biolume Green
  { name: 'Ana', email: 'ana@flowboard.bot', color: '#A78BFA' }, // user-4: Plasma Violet
];

/** Stable demo board ID for seed idempotency */
const DEMO_BOARD_ID = 'demo-board-00000000-0000-0000-0000';

const LISTS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

/** 17 cards total: 3 + 4 + 3 + 4 + 3 — realistic software project titles */
const CARDS: Record<string, string[]> = {
  Backlog: [
    'Research WebSocket scaling patterns',
    'Evaluate CRDT libraries for comments',
    'Design mobile responsive layout',
  ],
  'To Do': [
    'Build profile settings page',
    'API: user preferences endpoint',
    'Add keyboard shortcuts documentation',
    'Set up error tracking (Sentry)',
  ],
  'In Progress': [
    'Implement drag-and-drop card reordering',
    'Design system: Button variants',
    'API: card search with full-text',
  ],
  Review: [
    'Fix WebSocket reconnection on deploy',
    'Add loading skeleton screens',
    'Optimize board query (N+1 fix)',
    'Update onboarding flow copy',
  ],
  Done: [
    'Set up CI/CD pipeline',
    'Database schema v1 migration',
    'Implement JWT auth with refresh tokens',
  ],
};

async function main() {
  console.log('🌱 Seeding FlowBoard database...');

  // 1. Create bot users (bots never login — dummy password hash)
  const botHash = await bcrypt.hash('bot-no-login', 12);
  const bots = await Promise.all(
    BOT_USERS.map((bot) =>
      prisma.user.upsert({
        where: { email: bot.email },
        update: {},
        create: {
          email: bot.email,
          passwordHash: botHash,
          name: bot.name,
          color: bot.color,
          isBot: true,
        },
      }),
    ),
  );
  console.log(`  ✓ Created ${bots.length} bot users`);

  // 2. Create demo board (owned by Maria) per D-16
  const board = await prisma.board.upsert({
    where: { id: DEMO_BOARD_ID },
    update: {},
    create: {
      id: DEMO_BOARD_ID,
      name: 'FlowBoard Sprint 24',
      isDemo: true,
      createdById: bots[0].id,
    },
  });
  console.log(`  ✓ Created demo board: ${board.name}`);

  // 3. Delete existing lists/cards for this board (idempotent re-seed)
  await prisma.card.deleteMany({ where: { list: { boardId: board.id } } });
  await prisma.list.deleteMany({ where: { boardId: board.id } });

  // 4. Create lists with fractional positions (1000-based spacing)
  const createdLists = await Promise.all(
    LISTS.map((name, index) =>
      prisma.list.create({
        data: {
          boardId: board.id,
          name,
          position: (index + 1) * 1000,
        },
      }),
    ),
  );
  console.log(`  ✓ Created ${createdLists.length} lists`);

  // 5. Create cards distributed across lists, cycling bot assignment
  let totalCards = 0;
  for (const list of createdLists) {
    const cardTitles = CARDS[list.name] || [];
    await Promise.all(
      cardTitles.map((title, index) =>
        prisma.card.create({
          data: {
            listId: list.id,
            title,
            position: (index + 1) * 1000,
            createdById: bots[index % bots.length].id,
          },
        }),
      ),
    );
    totalCards += cardTitles.length;
  }
  console.log(`  ✓ Created ${totalCards} cards`);

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
