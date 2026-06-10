import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
const localUrl = DATABASE_URL.replace(/@postgres(?=:\d+)/, '@localhost');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: localUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
