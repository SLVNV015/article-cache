import { DataSource } from 'typeorm';
import { seedDatabase } from './seed';
import { User } from 'src/modules/users/user.entity';
import { Article } from 'src/modules/articles/article.entity';

/**
 * @description Функция для запуска сидера, env как в примере тут переход на сеть хоста localhost
 */
async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  const localUrl = databaseUrl.replace(/@postgres(?=:\d+)/, '@localhost');
  console.log('📦 Connecting to database...,', localUrl);

  const dataSource = new DataSource({
    type: 'postgres',
    url: localUrl,
    entities: [User, Article],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connection established');

    await seedDatabase(dataSource);

    await dataSource.destroy();
    console.log('👋 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

run();
