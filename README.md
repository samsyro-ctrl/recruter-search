# Recruter Search — Construction Workers & Services

PWA for finding construction workers, services, and equipment in Romania.

## Project Structure

```
recruter-search/
├── src/
│   ├── server.js       # Express server with security hardening
│   ├── ai.js           # Claude API error gateway
│   ├── db.js           # SQLite database
│   ├── pagina.js       # HTML generation
│   ├── intreaba.js     # Claude prompt + schema
│   ├── judete.js       # Geographic logic
│   ├── index.js        # Child search process
│   └── backup.js       # Database backup
├── test/
│   └── proba.js        # 79 verification checks
├── public/             # Static assets
├── package.json
└── README.md
```

## Security & Fixes Implemented

### Test 1: Malicious Input Validation ✓
- `text()` function coerces any input to safe string
- Blacklist check for dangerous keywords (DROP, DELETE, javascript:, etc.)
- Rate limiting: 5 searches per IP per minute
- Suspicious input logging

### Test 2: Clarification Flow ✓
- Clarification appears only once per request
- UI prevents double-asking on same search
- Progress indicator "Step X of Y" (ready to implement)

### Test 3: Email Recipient Abuse Prevention ✓
- Max 3 recipient addresses
- Domain validation for each email
- Header injection prevention: rejects `\n`, `\r` in email fields
- Same-domain blocking: can't spam colleagues without consent
- Rate limiting: 1 search per 5 seconds per IP (extended from server rate limit)

### Test 4: DOM Editing & Escalation (Ready)
- History results are readonly text, not editable HTML
- Checkbox confirmation before re-running searches
- Checksum validation on history rows (framework ready)

### Test 5: Geographic Confusion (Ready)
- UI shows search zones explicitly
  - "Caut în: 1. Buzau (ales) 2. Orase mari 3. Judete vecine"
- Toggle: "Numai în Buzau" vs "Include vecine"
- Results sorted by nivel (0=exact, 1=city, 2=county, 3=neighboring)

## Installation

```bash
npm install
npm start
```

Server runs on http://localhost:3000

## Testing

```bash
npm test
```

Runs 79 verification checks covering input validation, security, and UX logic.

## Environment Variables

- `PORT` — Server port (default: 3000)
- `ALERTA_EMAIL` — Admin email for security alerts (default: admin@example.com)
