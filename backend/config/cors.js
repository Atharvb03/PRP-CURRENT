const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://project-review-platform.vercel.app',
];

function normalizeOrigin(origin) {
  return origin ? origin.replace(/\/+$/, '') : origin;
}

function getAllowedOrigins() {
  const envOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
    .split(',')
    .map(origin => normalizeOrigin(origin.trim()))
    .filter(Boolean);

  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin),
    ...envOrigins,
  ]);
}

function getRequestOrigin(req) {
  const requestOrigin = normalizeOrigin(req.headers.origin);
  return requestOrigin && getAllowedOrigins().has(requestOrigin)
    ? requestOrigin
    : normalizeOrigin(process.env.CORS_ORIGIN || DEFAULT_ALLOWED_ORIGINS[0]);
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalized = normalizeOrigin(origin);
    if (getAllowedOrigins().has(normalized)) {
      return callback(null, normalized);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = {
  corsOptions,
  getRequestOrigin,
};
