# 🔴 REDIS CACHE OPERATIONS

## Configuration

In `.env`:
```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=secret
```

## Caching Strategy

| Endpoint | TTL | Invalidation Triggers |
|----------|-----|-----------------------|
| `GET /api/dashboard` | 60s | Tx Create/Update/Delete, Account changes |
| `GET /api/analytics/summary` | 5m | Tx Create/Update/Delete |
| `GET /api/categories` | 10m | Category changes (not yet auto-invalidated) |
| `GET /api/data/bootstrap` | 2m | Any major data change |

## Monitoring

Check logs for cache hits:
```bash
grep "Cache hit" logs/combined.log
```

## Disaster Recovery

If Redis goes down:
1. Backend logs error but continues working (Graceful Degradation).
2. Performance will drop (direct DB hits).
3. To disable completely: set `REDIS_ENABLED=false` in `.env` and restart.

## Cache Invalidation

Programmatic invalidation:
```javascript
const cacheService = require('../services/cacheService');
await cacheService.invalidateAfterDataChange(userId);
```
