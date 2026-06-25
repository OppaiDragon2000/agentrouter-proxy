const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.raw({ type: '*/*' }));

app.all('*', async (req, res) => {
  const base = req.headers['x-target-base'];
  if (!base) return res.status(400).send('missing target');

  const url = new URL(req.url);
  const target = base.replace(/\/+$/, '') + url.pathname + url.search;

  const headers = { ...req.headers };
  delete headers['x-target-base'];
  delete headers['host'];
  delete headers['accept-encoding'];

  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual',
    });

    const responseHeaders = { ...response.headers };
    delete responseHeaders['content-encoding'];
    delete responseHeaders['content-length'];
    delete responseHeaders['transfer-encoding'];

    res.status(response.status);
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });
    response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(502).json({ error: 'proxy_failed', message: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
