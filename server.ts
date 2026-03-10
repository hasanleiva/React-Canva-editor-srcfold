import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

  // --- R2 Configuration ---
  let s3ClientInstance: S3Client | null = null;

  function getS3Client() {
    if (!s3ClientInstance) {
      const r2AccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!r2AccountId) {
        throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
      }
      s3ClientInstance = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });
    }
    return s3ClientInstance;
  }

  const getR2BucketName = () => process.env.R2_BUCKET_NAME || '';
  const getR2PublicUrl = () => process.env.R2_PUBLIC_URL || '';

  const upload = multer({ storage: multer.memoryStorage() });

  // Helper to query Cloudflare D1
  async function queryD1(sql: string, params: any[] = []) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const dbId = process.env.CLOUDFLARE_DATABASE_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !dbId || !token) {
      throw new Error("Cloudflare D1 credentials are not fully configured in environment variables.");
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Database query failed");
    }

    return data.result[0].results;
  }

  // --- API Routes ---

  app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existing = await queryD1('SELECT * FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const role = 'user'; // Default role is user

    await queryD1(
      'INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, email, passwordHash, role, now]
    );

    const token = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id, email, role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await queryD1('SELECT * FROM users WHERE email = ?', [email]);
    const user = users?.[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id: user.id, email: user.email, role: user.role || 'user' } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ success: true });
});

app.post('/api/auth/change-password', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, email: string };
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }

    const users = await queryD1('SELECT * FROM users WHERE id = ?', [decoded.id]);
    const user = users?.[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await queryD1('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, decoded.id]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to change password' });
  }
});

// --- R2 Storage Routes ---

// Middleware to check if user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/templates', requireAdmin, async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Name and data are required' });

    const key = `templates/${Date.now()}_${name}.json`;
    await getS3Client().send(new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }));

    res.json({ success: true, key });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: getR2BucketName(),
      Prefix: 'templates/',
    });
    const response = await getS3Client().send(command);
    const templates = (response.Contents || []).map(item => ({
      key: item.Key,
      name: item.Key?.split('_').slice(1).join('_').replace('.json', '') || item.Key,
      lastModified: item.LastModified,
    }));
    res.json({ templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates/*key', async (req, res) => {
  try {
    const key = req.params.key;
    const command = new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
    
    // Fetch the JSON and return it
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/images/admin', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const ext = req.file.originalname.split('.').pop();
    const key = `admin_images/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    await getS3Client().send(new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const r2PublicUrl = getR2PublicUrl();
    const url = r2PublicUrl ? `${r2PublicUrl}/${key}` : `/api/images/download/${key}`;
    res.json({ success: true, url, key });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/images/admin', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: getR2BucketName(),
      Prefix: 'admin_images/',
    });
    const response = await getS3Client().send(command);
    
    const r2PublicUrl = getR2PublicUrl();
    const images = await Promise.all((response.Contents || []).map(async (item) => {
      let url = r2PublicUrl ? `${r2PublicUrl}/${item.Key}` : `/api/images/download/${item.Key}`;
      return {
        key: item.Key,
        url,
        lastModified: item.LastModified,
      };
    }));
    
    res.json({ images });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/images/download/*key', async (req, res) => {
  try {
    const key = req.params.key;
    const command = new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
    res.redirect(url);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/images/admin/*key', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    await getS3Client().send(new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    }));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
