# Runbook: Fallo Webhook Mercado Pago

## Síntomas
- Orden queda en `PENDING` aunque cliente pagó
- No llega webhook a `/api/webhooks/mercadopago`
- Logs: sin entrada en `webhooks_log` para `mp_payment_id`

## Diagnóstico
1. Verificar en MP Dashboard → Tu integración → Webhooks → Historial
   - ¿Se envió? ¿Código respuesta? (200 = OK, 4xx/5xx = fallo)
2. Verificar logs container: `docker logs ceramica-store-app | grep webhook`
3. Verificar `webhooks_log` table:
   ```sql
   SELECT * FROM webhooks_log WHERE mp_resource_id = 'PAYMENT_ID' ORDER BY created_at DESC;
   ```

## Causas Comunes
| Causa | Solución |
|-------|----------|
| MP no configurado webhook URL | Configurar en MP Dashboard: `https://dominio.com/api/webhooks/mercadopago` |
| Webhook URL incorrecta (staging vs prod) | Verificar `BASE_URL` env var |
| Firewall/Proxy bloquea | Coolify/Traefik permite tráfico entrante |
| Timeout handler (>30s) | Optimizar handler, MP espera < 10s |
| Firma inválida (`MP_WEBHOOK_SECRET` distinto) | Verificar secret en MP Dashboard = env var |

## Acciones Inmediatas

### 1. Sincronización Manual (Admin)
- Ir a `/admin/pedidos/:id`
- Click "Sincronizar con MP"
- Verifica estado actualizado

### 2. Reprocesar Webhook (Si Tienes Payload)
```bash
# Obtener payload de MP Dashboard (copiar JSON)
curl -X POST https://dominio.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=...,v1=..." \
  -H "x-request-id: ..." \
  -d '{"type":"payment.updated","data":{"id":"PAYMENT_ID"}}'
```

### 3. Verificar MP Directamente
```bash
curl -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  https://api.mercadopago.com/v1/payments/PAYMENT_ID
```

## Prevención
- Monitoreo: Alertar si `orders` en `PENDING` > 24h sin `mp_payment_id`
- Logs: `webhooks_log` siempre inserta (aunque falle procesamiento)
- Idempotencia: Reprocesar seguro (UNIQUE constraints)

## Escalación
- Si MP no envía webhooks por > 1h → Soporte MP (ticket)
- Si handler falla consistentemente → Deploy fix + reprocesar pendientes