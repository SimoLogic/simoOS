const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const t1 = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'dim_branch'
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `);

  const t2 = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'dim_employee'
    AND table_schema = 'public'
    AND column_name LIKE '%branch%';
  `);

  const t3 = await prisma.$queryRawUnsafe(`
    SELECT role_title, COUNT(*) as total
    FROM dim_employee
    WHERE role_title IN (
      'Branch Manager',
      'Non-Producing Branch Manager', 
      'Producing Branch Manager',
      'Market Leader'
    )
    GROUP BY role_title;
  `);

  console.log("=== dim_branch columns ===");
  console.table(t1);

  console.log("=== dim_employee branch columns ===");
  console.table(t2);

  console.log("=== role_title counts ===");
  console.log(JSON.stringify(t3, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
