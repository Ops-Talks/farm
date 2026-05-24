#!/usr/bin/env node
/*
 * Container healthcheck for the Farm Web (Next.js standalone) service.
 *
 * Issues a GET against the in-process /api/health route and exits with:
 *   - 0 if the response status is 2xx
 *   - 1 on any non-2xx status, network error, or timeout
 *
 * Uses only Node built-ins so the production image does not need npm or any
 * extra packages.
 *
 * Environment:
 *   PORT (default: 3001) — TCP port Next.js listens on inside the container.
 */
'use strict';

const http = require('http');

const port = Number.parseInt(process.env.PORT, 10) || 3001;

const req = http.request(
  {
    hostname: 'localhost',
    port,
    path: '/api/health',
    method: 'GET',
    timeout: 5000,
  },
  (res) => {
    const ok = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300;
    res.resume();
    process.exit(ok ? 0 : 1);
  },
);

req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
