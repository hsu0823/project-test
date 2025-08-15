import express, { Request, Response } from 'express';
import products from './routes/products';
import authRoutes from './routes/auth';

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.use('/api/products', products);
app.use('/api/auth', authRoutes);

// 衝突轉 409 + 500 fallback
app.use((err: any, _req: Request, res: Response, _next: Function) => {
  if (err?.code === '23505') {
    return res.status(409).json({ message: '唯一性衝突（可能是 name 重複）' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;