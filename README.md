# Playwright Service for n8n

API service để sử dụng Playwright với n8n.

## Endpoints

### 1. Health Check
- **URL**: `GET /health`
- **Response**: `{ "status": "ok", "service": "playwright-service" }`

### 2. Scrape Page
- **URL**: `POST /scrape`
- **Body**:
```json
{
  "url": "https://example.com",
  "waitFor": 1000,  // optional, ms
  "selector": "#content"  // optional
}
```

### 3. Screenshot
- **URL**: `POST /screenshot`
- **Body**:
```json
{
  "url": "https://example.com",
  "fullPage": true,
  "type": "png"  // png or jpeg
}
```

### 4. Generate PDF
- **URL**: `POST /pdf`
- **Body**:
```json
{
  "url": "https://example.com",
  "format": "A4"
}
```

### 5. Execute Script
- **URL**: `POST /execute`
- **Body**:
```json
{
  "url": "https://example.com",
  "script": "() => document.title",
  "waitFor": 1000
}
```

### 6. Fill Form
- **URL**: `POST /fill-form`
- **Body**:
```json
{
  "url": "https://example.com/form",
  "fields": [
    { "selector": "#name", "value": "John Doe", "type": "fill" },
    { "selector": "#email", "value": "john@example.com", "type": "fill" }
  ],
  "submitSelector": "#submit",
  "waitAfterSubmit": 2000
}
```
