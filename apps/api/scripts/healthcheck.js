#!/usr/bin/env node
/*
 * Container healthcheck for the Farm API.
 *
 * Issues a GET against the in-process /api/health endpoint and exits with:
 *   - 0 if the response status is 2xx
 *   - 1 on any non-2xx status, network error, or timeout
 *
 * Uses only Node built-ins (no runtime dependencies) so the production image
 * does not need to ship npm or any extra packages. Shared between the
 * Dockerfile HEALTHCHECK directive, docker-compose healthchecks, and any
 * Kubernetes exec-style probes.
 *
 * Environment:
 *   PORT (default: 3000) — TCP port the API listens on inside the container.
 */
'use strict';

const http = require('http');

const port = Number.parseInt(process.env.PORT, 10) || 3000;

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
    // Drain the response so the socket can be released cleanly.
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
