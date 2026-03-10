import express from 'express';
const app = express();
app.get('/env', (req, res) => {
  res.json({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  });
});
app.listen(3001, () => console.log('listening on 3001'));
