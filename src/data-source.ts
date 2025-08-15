import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Product } from './entity/Product';
dotenv.config();

const {
  DATABASE_URL,
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_USER = 'postgres',
  DB_PASS = 'postgres',
  DB_NAME = 'inventory',
  NODE_ENV = 'development',
} = process.env as Record<string, string>;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: DATABASE_URL || undefined,
  host: DATABASE_URL ? undefined : DB_HOST,
  port: DATABASE_URL ? undefined : parseInt(DB_PORT, 10),
  username: DATABASE_URL ? undefined : DB_USER,
  password: DATABASE_URL ? undefined : DB_PASS,
  database: DATABASE_URL ? undefined : DB_NAME,
  synchronize: true,
  logging: NODE_ENV !== 'production',
  entities: [Product]
});
