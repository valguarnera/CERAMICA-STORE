# Estrategia de Backup — CERAMICA-STORE

## Decisión MVP: Cron `.backup` + Verificación Mensual Obligatoria

### Por Qué No Litestream (MVP)
- Litestream requiere: S3/B2/GCS credenciales, sidecar process, config adicional
- Para DB < 200MB: cron `.backup` cada 5 min = RPO ≤ 5 min, suficiente
- Litestream se evalúa cuando: DB > 200MB **O** RPO < 5 min requisito negocio

## Especificación Cron Backup

### Cron Job (En Container)
```bash
# /etc/crontab o crontab -u nextjs
# Cada 5 minutos
*/5 * * * * /usr/bin/sqlite3 /app/data/ceramica.db ".backup /app/backups/ceramica-$(date +\%Y\%m\%d-\%H\%M\%S).db"

# Limpieza: retener 288 (24h) + 30 dailies (1 por día a las 03:00)
0 3 * * * /app/scripts/prune-backups.sh
```

### Script Prune (`/app/scripts/prune-backups.sh`)
```bash
#!/bin/sh
set -eu
BACKUP_DIR="/app/backups"
cd "$BACKUP_DIR"

# Mantener últimos 288 (5min × 288 = 24h)
ls -t ceramica-*.db | tail -n +289 | xargs -r rm -f

# Mantener 1 por día (últimos 30 días) basado en fecha en nombre
# ceramica-20250115-030000.db → keep one per day
for i in {1..30}; do
  date=$(date -d "-$i days" +%Y%m%d 2>/dev/null || date -v-${i}d +%Y%m%d)
  keep=$(ls -t ceramica-${date}*.db 2>/dev/null | head -1)
  [ -n "$keep" ] && echo "Keep daily: $keep"
done | sort -u > /tmp/keep-list
ls ceramica-*.db | grep -v -f /tmp/keep-list | xargs -r rm -f
```

## Métricas de Backup

| Métrica | Valor MVP | Objetivo Futuro (Litestream) |
|---------|-----------|------------------------------|
| **RPO** (Pérdida máxima) | ≤ 5 min | ~1 seg (continuo) |
| **RTO** (Tiempo recuperación) | ~5 min (copia + restart) | ~1 min (PITR) |
| **Retención** | 24h granular + 30 dailies | Configurable (semanas/meses) |
| **Destino** | Volume local `/app/backups` (montado en host) | S3/B2/GCS (off-site) |
| **Verificación** | **Mensual obligatoria** | Automática (litestream verify) |

## Verificación Mensual Obligatoria

### Script (`/app/scripts/verify-backup.sh`)
```bash
#!/bin/sh
set -eu
LATEST=$(ls -t /app/backups/ceramica-*.db | head -1)
TEST_DIR="/tmp/backup-verify-$(date +%s)"
mkdir -p "$TEST_DIR"

echo "Verificando: $LATEST"
cp "$LATEST" "$TEST_DIR/test.db"

# 1. Integrity check
sqlite3 "$TEST_DIR/test.db" "PRAGMA integrity_check;" | grep -q "ok" || {
  echo "❌ INTEGRITY CHECK FAILED"
  exit 1
}

# 2. Schema check (tablas esperadas)
sqlite3 "$TEST_DIR/test.db" ".tables" | grep -q "users" || exit 1
sqlite3 "$TEST_DIR/test.db" ".tables" | grep -q "orders" || exit 1
sqlite3 "$TEST_DIR/test.db" ".tables" | grep -q "products" || exit 1

# 3. Data sanity (conteo básico)
sqlite3 "$TEST_DIR/test.db" "SELECT COUNT(*) FROM users;" | grep -q "^[0-9]*$" || exit 1

# 4. WAL checkpoint (si aplica)
sqlite3 "$TEST_DIR/test.db" "PRAGMA wal_checkpoint(FULL);"

echo "✅ Backup verificado correctamente: $LATEST"
rm -rf "$TEST_DIR"
```

### Cron Verificación
```bash
# Mensual, día 1 a las 04:00 (después del prune 03:00)
0 4 1 * * /app/scripts/verify-backup.sh >> /var/log/backup-verify.log 2>&1
```

### Regla de Oro
> **Un backup no existe hasta que se ha restaurado y verificado.**
> - Log en `/var/log/backup-verify.log`
> - Alerta si falla (configurar en Coolify / syslog)
> - Documentar en runbook

## Procedimiento de Restore (Documentado en Runbook)

```bash
# 1. Detener app (Coolify: scale to 0)
# 2. Identificar backup objetivo (timestamp)
cp /app/backups/ceramica-20250115-030000.db /app/data/ceramica.db
# 3. Verificar integridad
sqlite3 /app/data/ceramica.db "PRAGMA integrity_check;"
# 4. Reiniciar app (Coolify: scale to 1)
# 5. Verificar health check /api/health
# 6. Verificar datos críticos (últimas órdenes, usuarios)
```

## Migración Futura a Litestream

### Cuándo
- DB > 200 MB
- RPO < 5 min requerido por negocio
- Necesidad PITR (point-in-time recovery)

### Configuración Litestream
```yaml
# /etc/litestream.yml
dbs:
  - path: /app/data/ceramica.db
    replicas:
      - type: s3
        bucket: ceramica-backups
        path: prod/
        region: us-east-1
        endpoint: https://s3.us-east-1.amazonaws.com  # o Backblaze B2
        access-key-id: ${LITESTREAM_ACCESS_KEY}
        secret-access-key: ${LITESTREAM_SECRET_KEY}
    retention: 7d
    checkpoint-interval: 1m
```

### Deploy
- Sidecar en Docker Compose: `litestream replicate`
- O process manager (supervisord) en mismo container
- Health check: `litestream databases` status

## Resumen de Decisión
| Criterio | Cron `.backup` (MVP) | Litestream (Futuro) |
|----------|---------------------|---------------------|
| Complejidad | Baja (1 línea cron + 2 scripts) | Media (sidecar + creds cloud) |
| Costo | $0 (volume local) | ~$1-5/mes (B2/S3) |
| RPO | 5 min | ~1 seg |
| RTO | 5 min | 1 min |
| Verificación | Manual mensual (obligatoria) | Automática |
| Off-site | No (salvo montar host backup) | Sí (cloud) |

**Decisión**: Cron `.backup` MVP. Litestream cuando se cumplan disparadores.