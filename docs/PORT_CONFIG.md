# Port Configuration

## Development Ports

| App      | Port | URL                   |
| -------- | ---- | --------------------- |
| Landing  | 3003 | http://localhost:3003 |
| Main App | 3000 | http://localhost:3000 |
| API      | 3001 | http://localhost:3001 |
| Admin    | 3002 | http://localhost:3002 |

## Production Domains

| App      | Domain              |
| -------- | ------------------- |
| Landing  | landing.docita.work |
| Main App | app.docita.work     |
| API      | api.docita.work     |
| Admin    | admin.docita.work   |

## Running Apps

```bash
# All apps together
pnpm dev

# Individual apps
pnpm dev:landing    # Port 3003
pnpm dev:app        # Port 3000 + API on 3001
pnpm dev:admin      # Port 3002 + API on 3001
```
