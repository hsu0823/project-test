import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { Product } from '../entity/Product';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { getCache, setCache, delCacheByPrefix } from '../lib/cache';
import { requireAuth } from '../middleware/auth';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

const router = Router();
const repo = () => AppDataSource.getRepository(Product);

// 將 class-validator 結果轉 400 訊息
function validateOr400(res: Response, obj: object) {
  const errors = validateSync(obj as any, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    const msgs = errors.flatMap(e => Object.values(e.constraints || {}));
    res.status(400).json({ message: 'Validation failed', errors: msgs });
    return false;
  }
  return true;
}

// 建立商品（Body 驗證、重名要回 409）
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = plainToInstance(CreateProductDto, req.body ?? {});
    if (!validateOr400(res, dto)) return;

    const normName = String(dto.name).trim();
    const dup = await repo().findOne({ where: { name: normName } });
    if (dup) return res.status(409).json({ message: 'name 已存在（重名）' });

    const saved = await repo().save({ name: normName, price: String(dto.price), stock: dto.stock });

    await Promise.all([
      delCacheByPrefix('products:list:'),
      delCacheByPrefix(`products:byId:${saved.id}`)
    ]);

    return res.status(201).json(saved);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ message: '衝突（name 已存在）' });
    next(err);
  }
});

// 查詢單筆
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const cacheKey = `products:byId:${id}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const item = await repo().findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'not found' });

    await setCache(cacheKey, item, 60);
    return res.json(item);
  } catch (err) { next(err); }
});

// 部分更新（至少要能改 price、stock）
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const item = await repo().findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'not found' });

    const dto = plainToInstance(UpdateProductDto, req.body ?? {}, { exposeDefaultValues: false });
    const errors = validateSync(dto as any, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      const msgs = errors.flatMap(e => Object.values(e.constraints || {}));
      return res.status(400).json({ message: 'Validation failed', errors: msgs });
    }

    const { name, price, stock } = dto;

    if (name !== undefined) {
      const nextName = String(name).trim();
      if (nextName !== item.name) {
        const dup = await repo().findOne({ where: { name: nextName } });
        if (dup) return res.status(409).json({ message: 'name 已存在（重名）' });
      }
      item.name = nextName;
    }

    if (price !== undefined) item.price = String(Number(price));
    if (stock !== undefined) item.stock = Number(stock);

    const saved = await repo().save(item);

    await Promise.all([
      delCacheByPrefix('products:list:'),
      delCacheByPrefix(`products:byId:${id}`)
    ]);

    return res.json(saved);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ message: '衝突（name 已存在）' });
    next(err);
  }
});

// 刪除
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const item = await repo().findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'not found' });

    await repo().remove(item);

    await Promise.all([
      delCacheByPrefix('products:list:'),
      delCacheByPrefix(`products:byId:${id}`)
    ]);

    return res.status(204).send();
  } catch (err) { next(err); }
});

// 列表查詢
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const sizeRaw = Number(req.query.size ?? 10);
    const size = Math.min(50, Math.max(1, Number.isFinite(sizeRaw) ? sizeRaw : 10));
    const skip = (page - 1) * size;
    const take = size;

    const sortRaw = String(req.query.sort ?? 'updatedAt,desc');
    const [fieldRaw, dirRaw] = sortRaw.split(',');
    const allowedSort: Record<string, true> = { updatedAt: true, createdAt: true, price: true, name: true, stock: true };
    const field = allowedSort[fieldRaw] ? fieldRaw : 'updatedAt';
    const direction = (dirRaw?.toLowerCase() === 'asc' || dirRaw?.toLowerCase() === 'desc')
      ? (dirRaw as 'asc' | 'desc') : 'desc';

    const minPrice = req.query.minPrice != null ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice != null ? Number(req.query.maxPrice) : undefined;

    const cacheKey = `products:list:page=${page}&size=${size}&sort=${field},${direction}&min=${minPrice ?? ''}&max=${maxPrice ?? ''}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const where: any = {};
    if (minPrice != null && maxPrice != null) where.price = Between(String(minPrice), String(maxPrice));
    else if (minPrice != null) where.price = MoreThanOrEqual(String(minPrice));
    else if (maxPrice != null) where.price = LessThanOrEqual(String(maxPrice));

    const [items, total] = await repo().findAndCount({
      where,
      order: { [field]: direction.toUpperCase() as 'ASC' | 'DESC' },
      skip,
      take,
    });

    const payload = { page, size, total, totalPages: Math.ceil(total / size), items };
    await setCache(cacheKey, payload, 30);
    return res.json(payload);
  } catch (err) { next(err); }
});

export default router;