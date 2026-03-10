import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin, ViteDevServer } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// KEY INSIGHT: canva-editor uses a custom `apiClient` (services/base-request.ts)
// with a response interceptor that does: `return response.data`
//
// So in the component, `response` IS already the body.
// When component does `response.data.map(...)`, body must be { data: [...] }
//
//   fetchUserImages  GET  → body must be: { data: [{id, documentId, img:{url,mime}}] }
//   uploadUserImage  POST → body must be: { data: [{id, documentId, img:{url,mime}}] }
//   removeUserImage  DELETE /{id} → any 200
//   searchImages     GET  → body: { data: [], total: 0 }
//     (ImageCollectionTab uses plain axios, so res.data = body → res.data.data.length)

interface StoredImage {
  id: string;
  documentId: string;
  img: { url: string; mime: string; };
  width: number;
  height: number;
  name: string;
}

const imageStore: Map<string, StoredImage> = new Map();

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function getImageDimensions(dataUrl: string): { width: number; height: number } {
  const base64 = dataUrl.split(',')[1] ?? '';
  const buf = Buffer.from(base64, 'base64');
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] === 0xff) {
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      } else { i++; }
    }
  } catch { /* ignore */ }
  return { width: 800, height: 600 };
}

function parseMultipart(body: Buffer, contentType: string) {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1];
  const bodyStr = body.toString('binary');
  const parts = bodyStr.split('--' + boundary);
  for (const part of parts) {
    if (!part.includes('Content-Disposition') || !part.includes('filename=')) continue;
    const nameMatch = part.match(/filename="([^"]+)"/);
    const fileName = nameMatch ? nameMatch[1] : 'image.png';
    const mimeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
    const mimeType = mimeMatch ? mimeMatch[1].trim() : 'image/png';
    const dataStart = part.indexOf('\r\n\r\n');
    if (dataStart === -1) continue;
    const rawData = part.slice(dataStart + 4, part.lastIndexOf('\r\n'));
    return { fileBuffer: Buffer.from(rawData, 'binary'), fileName, mimeType };
  }
  return null;
}

function mockUploadPlugin(): Plugin {
  return {
    name: 'mock-upload-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        const method = req.method ?? '';

        if (method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' });
          res.end();
          return;
        }

        // POST /your-uploads/upload
        if (method === 'POST' && url.includes('/your-uploads/upload')) {
          try {
            const body = await readBody(req);
            const contentType = req.headers['content-type'] ?? '';
            let fileBuffer: Buffer | null = null;
            let fileName = 'image.png';
            let mimeType = 'image/png';

            if (contentType.includes('multipart/form-data')) {
              const parsed = parseMultipart(body, contentType);
              if (parsed) { fileBuffer = parsed.fileBuffer; fileName = parsed.fileName; mimeType = parsed.mimeType; }
            } else {
              fileBuffer = body;
              if (body[0] === 0x89 && body[1] === 0x50) mimeType = 'image/png';
              else if (body[0] === 0xff && body[1] === 0xd8) mimeType = 'image/jpeg';
              else if (body[0] === 0x47 && body[1] === 0x49) mimeType = 'image/gif';
              else if (body[0] === 0x52 && body[1] === 0x49) mimeType = 'image/webp';
            }

            if (!fileBuffer || fileBuffer.length === 0) {
              return json(res, 400, { error: 'No file data received' });
            }

            const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            const dims = getImageDimensions(dataUrl);

            const image: StoredImage = {
              id,
              documentId: id,
              img: { url: dataUrl, mime: mimeType },
              width: dims.width,
              height: dims.height,
              name: fileName,
            };
            imageStore.set(id, image);
            console.log(`[mock-upload] Stored: ${id} | ${fileName} | ${dims.width}x${dims.height}`);

            return json(res, 200, { data: [image] });
          } catch (err) {
            console.error('[mock-upload] Upload error:', err);
            return json(res, 500, { error: 'Upload failed' });
          }
        }

        // GET /your-uploads/get-user-images
        if (method === 'GET' && url.includes('/your-uploads/get-user-images')) {
          const images = Array.from(imageStore.values());
          console.log(`[mock-upload] GET images: ${images.length}`);
          return json(res, 200, { data: images });
        }

        // DELETE /your-uploads/remove/{id}
        if (method === 'DELETE' && url.includes('/your-uploads/remove')) {
          const parts = url.split('/');
          const id = parts[parts.length - 1]?.split('?')[0];
          if (id && imageStore.has(id)) {
            imageStore.delete(id);
            console.log(`[mock-upload] Removed: ${id}`);
            return json(res, 200, { success: true });
          }
          return json(res, 404, { error: 'Image not found' });
        }

        // All search/suggestion endpoints → empty results
        const emptyRoutes = [
          '/search-images', '/search-templates', '/search-texts',
          '/search-shapes', '/search-frames', '/search-fonts',
          '/template-suggestion', '/text-suggestion', '/image-suggestion',
          '/shape-suggestion', '/frame-suggestion',
        ];
        if (method === 'GET' && emptyRoutes.some(r => url.includes(r))) {
          return json(res, 200, { data: [], total: 0 });
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
    mockUploadPlugin(),
  ],
  resolve: {
    alias: {
      // Resolve `canva-editor/*` imports used throughout the source
      // to the local src/ directory so they work when running standalone
      'canva-editor': resolve(__dirname, 'src'),
    },
  },
  // Vite middleware plugins (defined separately to keep config clean)
  // We pass mockUploadPlugin inline so the mock API always runs in dev
  server: { port: 3000, open: true },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'hoist-non-react-statics',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/css',
    ],
  },
});
