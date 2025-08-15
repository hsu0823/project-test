import { AppDataSource } from './data-source';
import app from './app';
import dotenv from 'dotenv';
import { initRedis } from './lib/cache';
dotenv.config();

const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    await initRedis(); // 啟動 Redis 連線

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();