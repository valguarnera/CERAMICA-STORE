# ADR-007: EmailProvider Interface (Resend/SMTP/Console)

## Contexto
Envío de emails transaccionales (confirmación orden, notificaciones admin).

## Decisión
**Interface `EmailProvider`** con 3 implementaciones: Console (dev), Resend (staging/prod simple), SMTP genérico (control total).

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **EmailProvider interface** | Swap sin tocar código, testable, flexible | Abstracción extra |
| **Nodemailer directo** | Simple, control total | Coupling a SMTP, no testable fácil |
| **Solo Resend** | DX excelente, React Email | Vendor lock-in, costo alto volumen |
| **Solo Console** | Gratis, simple | No emails reales en prod |

## Justificación
- MVP: `ConsoleProvider` (logs) → zero config
- Staging: `ResendProvider` (3k gratis/mes, API simple)
- Prod: Usuario elige `ResendProvider` o `SMTPProvider` (Postfix/Exim en VPS)
- Interface mínima: `send(to, subject, html): Promise<void>`
- Testable: `MockEmailProvider` en tests

## Consecuencias
- `domain/email/EmailProvider.ts` interface
- `infrastructure/email/{Console,Resend,SMTP}Provider.ts`
- `EMAIL_PROVIDER=console|resend|smtp` env var
- Config SMTP: `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM`

## Estado
✅ Aprobado