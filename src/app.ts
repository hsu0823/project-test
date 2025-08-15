import express from 'express';
import products from './routes/products';
import { initRedis } from './lib/cache';

const app = express();
app.use(express.json());

// 初始化 Redis
initRedis();

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/products', products);

// 衝突轉 409 + 500
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.code === '23505') {
    return res.status(409).json({ message: '唯一性衝突（可能是 name 重複）' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;