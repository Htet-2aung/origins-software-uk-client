import postgres from 'postgres';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

try {
  const db = postgres(url, { prepare: false });

  const result = await db`select current_database(), current_user, now()`;

  console.log('DATABASE CONNECTION OK');
  console.log(result);

  await db.end();
} catch (error) {
  console.error('DATABASE CONNECTION FAILED');
  console.error(error);
}
