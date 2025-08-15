// src/routes/auth.ts
import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// 簡單登入，直接產生 token
router.post('/login', (req, res) => {
    const { username } = req.body || {};
    if (!username) {
        return res.status(400).json({ message: 'username is required' });
    }
    // 產生 token（有效期 1 小時）
    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
});

export default router;