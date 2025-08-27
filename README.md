
# URL Shortener Service (Node.js + MongoDB)

A backend application that shortens URLs and tracks analytics (clicks by time, country, and referrer). Includes duplicate URL handling, validation, anonymous rate limiting, JWT auth, bulk shortening, and QR code generation.

## Features
- Short code generation with collision checks
- Duplicate URL handling per-user (anonymous included)
- Analytics tracking: daily/weekly/monthly clicks, countries, referrers
- URL validation (http/https)
- Rate limiting for anonymous users
- Optional expiration per URL (returns HTTP 410 when expired)
- **Extras**: Bulk URL shortening, QR code generation for each short link
- JWT auth: register/login to create user-owned links

## Tech
- Node.js, Express
- MongoDB with Mongoose
- JWT, bcrypt
- express-rate-limit, helmet, cors, morgan
- geoip-lite (best-effort country detection)
- qrcode (PNG generation)
- Joi (for user validation)

---

## Getting Started

### 1) Clone & Install
```bash
npm install
cp .env.example .env
```

### 2) Configure Environment
Edit `.env` if needed. Ensure MongoDB is running and `MONGO_URI` is correct.

### 3) Run
```bash
npm run dev
# or
npm start
```

The API listens on `PORT` (default `3000`). If you set `BASE_URL`, it will be used to build short links and QR codes.

---

## Data Models

### User
```js
{
  email: String (unique),
  phone: String (unique),
  name: String (),
  password: String (hashed),
  role: 'user' | 'admin'
}
```

### Url
```js
{
  originalUrl: String,
  shortCode: String (unique),
  user: ObjectId | null,
  clickCount: Number,
  expiresAt: Date | null
}
```

### Click
```js
{
  url: ObjectId,
  timestamp: Date,
  country: String,
  referrer: String,
  userAgent: String,
  ip: String
}
```

---

## API

Base path for most endpoints: `/api`

### Auth
- `POST /api/auth/register` → `{ email, password }`
- `POST /api/auth/login` → `{ email, password }` → `{ token }`

Use `Authorization: Bearer <token>` for authenticated requests.

### URL Shortening
- `POST /api/urls` → `{ originalUrl, expiresAt? }`
  Anonymous allowed (rate-limited by IP). Returns existing short if duplicate for the same user.
- `POST /api/urls/bulk` → `{ urls: [{ originalUrl, expiresAt? }, ...] }`
  Anonymous allowed (rate-limited).

### Redirect + Tracking
- `GET /:code` → Redirects to original URL, records a click with country/referrer/UA/IP.
  - 404 if code does not exist
  - 410 if expired

### Analytics
- `GET /api/urls/:code/analytics` →
  ```json
  {
    "url": { "originalUrl", "shortCode", "createdAt", "clickCount" },
    "clicks": { "daily": [...], "weekly": [...], "monthly": [...] },
    "countries": [{ "_id": "IN", "count": 10 }, ...],
    "referrers": [{ "_id": "Direct", "count": 5 }, ...]
  }
  ```

### QR Code
- `GET /api/urls/:code/qr` → PNG image of QR for the short link

---

## Rate Limiting
Anonymous create endpoints (`POST /api/urls` and `/api/urls/bulk`) are limited by IP. Configure via `.env`:
```
WINDOW_MS=900000   # 15 minutes
MAX_RETRIES=2      # 2 requests for anonymous / window and unlimited for loggedin users
```

---

## Duplicate URL Handling
A unique index across `(originalUrl, user)` ensures a user (or anonymous user group) gets the same short link for the same original URL.

---

## Expiration (Optional)
Set `expiresAt` when creating a short URL. After that date, the redirect returns **410 Gone**.

To auto-clean old Clicks or expired Urls, you can create MongoDB TTL indexes if desired.

---

## Postman Collection
Import `postman_collection.json` and set a collection variable `baseUrl` (default: `http://localhost:3000`).

Order to test:
1. **Shorten a URL anonymously** → `POST /api/urls`
2. **Register + Login** → save `token` as auth
3. **Shorten a URL as user** → `POST /api/urls` with Bearer token
4. **Access shortened URL** → `GET /:code` should redirect
5. **Fetch Analytics** → `GET /api/urls/:code/analytics`
6. **Invalid code** → `GET /doesnotexist` → 404
7. **Rate limit** → hammer `POST /api/urls` anonymously and observe 429

---

## Notes
- Country detection is best-effort using `geoip-lite`, which may not recognize private/local IPs; in that case, `Unknown` is stored.
- Behind proxies/load balancers, make sure to configure `trust proxy` in Express and pass `X-Forwarded-For` to capture client IPs.
- Consider enabling HTTPS and stricter CORS in production.
- ⭐⭐ URL expiration with cleanup jobs is not done yet because of only one things have to be completed
