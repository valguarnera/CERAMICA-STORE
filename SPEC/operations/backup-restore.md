# Operaciones — Backup & Restore Procedure

## Backup Automático (Cron en Container)

### Configuración
```bash
# Crontab (usuario nextjs)
*/5 * * * * /usr/bin/sqlite3 /app/data/ceramica.db ".backup /app/backups/ceramica-$(date +\%Y\%m\%d-\%H\%M\%S).db"
0 3 * * * /app/scripts/prune-backups.sh
0 4 1 * * /app/scripts/verify-backup.sh >> /var/log/backup-verify.log 2>&1
```

### Volumes Requeridos
```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data          # SQLite + backups
  - ./backups:/app/backups    # Backups (montado en host para off-container access)
```

## Verificación Mensual (Obligatoria)

### Ejecución Manual
```bash
docker exec ceramica-store /app/scripts/verify-backup.sh
```

### Resultado Esperado
```
✅ Backup verificado correctamente: /app/backups/ceramica-20250115-030000.db
```

### Si Falla
1. Revisar `/var/log/backup-verify.log`
2. Verificar integridad manual: `sqlite3 backup.db "PRAGMA integrity_check;"`
3. Si corruption: restaurar backup anterior válido
4. Alertar (Coolify notification / email)

## Procedimiento de Restore

### 1. Identificar Backup Objetivo
```bash
ls -la /app/backups/
# Elegir timestamp: ceramica-20250115-030000.db
```

### 2. Detener Aplicación (Coolify)
- Scale to 0 replicas
- O: `docker compose stop app`

### 3. Restaurar
```bash
# Backup actual (por si acaso)
cp /app/data/ceramica.db /app/data/ceramica.db.pre-restore-$(date +%s)

# Restaurar
cp /app/backups/ceramica-20250115-030000.db /app/data/ceramica.db

# Verificar
sqlite3 /app/data/ceramica.db "PRAGMA integrity_check;"
# Debe retornar: ok
```

### 4. Reiniciar Aplicación
- Scale to 1 replica
- Verificar health check: `curl -f http://localhost:3000/api/health`

### 5. Validación Post-Restore
- Login admin funciona
- Últimas órdenes visibles
- Productos listados
- Carrito funcional

## Pruebas Periódicas de Restore (Trimestrales)

### Checklist
- [ ] Ejecutar restore en ambiente staging
- [ ] Verificar integridad completa
- [ ] Verificar datos: usuarios, órdenes, productos
- [ ] Verificar funcionalidad: login, checkout, admin
- [ ] Documentar tiempo RTO real
- [ ] Actualizar runbook si hay cambios

## Métricas Objetivo

| Métrica | Target MVP | Medición |
|---------|------------|----------|
| RPO | ≤ 5 min | Cron interval |
| RTO | ≤ 10 min | Restore test trimestral |
| Backup Success Rate | 100% | Logs cron + verify mensual |
| Verify Success Rate | 100% | Monthly script exit code |

## Escalación Futura: Litestream

### Cuándo Migrar
- DB > 200 MB
- RPO < 5 min requerido
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
        endpoint: https://s3.us-east-1.amazonaws.com
        access-key-id: ${LITESTREAM_ACCESS_KEY}
        secret-access-key: ${LITESTREAM_SECRET_KEY}
    retention: 7d
    checkpoint-interval: 1m
```

### Deploy
```yaml
# docker-compose.yml addon
services:
  litestream:
    image: litestream/litestream:latest
    command: replicate
    volumes:
      - ./data:/app/data
      - ./etc/litestream.yml:/etc/litestream.yml:ro
    environment:
      - LITESTREAM_ACCESS_KEY
      - LITESTREAM_SECRET_KEY
    depends_on:
      - app
```