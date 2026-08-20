# PayPal — configurar Sandbox

Guía para activar pagos de prueba. Nada de esto usa dinero real.

## 1. Cuenta y app en PayPal Developer

1. Crea o entra a una cuenta en https://www.paypal.com/business (Business, no Personal — la cuenta que recibirá los pagos reales más adelante).
2. Ve a https://developer.paypal.com/dashboard/ e inicia sesión con esa cuenta.
3. **Apps & Credentials** → pestaña **Sandbox** → **Create App**.
   - Nombre: por ejemplo `tarot-de-beto-sandbox`.
   - Tipo: **Merchant**.
4. Al crear la app verás:
   - **Client ID** → va en `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (no es secreto, se usa en el navegador).
   - **Secret** → va en `PAYPAL_CLIENT_SECRET` (nunca lo pongas en una variable `NEXT_PUBLIC_*` ni lo subas a git).

## 2. Variables de entorno

En `.env.local` (Next.js las lee) y también en `.env` (Prisma/scripts):

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID="el Client ID de sandbox"
PAYPAL_CLIENT_SECRET="el Secret de sandbox"
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_WEBHOOK_ID=""   # se completa en el paso 4
```

## 3. Cuentas de prueba (comprador)

PayPal Developer crea automáticamente cuentas sandbox de prueba (un comprador y un vendedor) al crear la app. Para verlas o crear más:

**Sandbox** → **Accounts**. Ahí puedes ver el email/contraseña de la cuenta "personal" (comprador) que vas a usar para pagar en las pruebas, y recargarle saldo de prueba si hace falta (**Funds**).

## 4. Webhook

1. En el dashboard de tu app (sandbox), sección **Webhooks** → **Add Webhook**.
2. URL: `https://<tu-dominio-o-túnel-público>/api/paypal/webhook` — en local necesitas exponer el puerto 3000 con algo como `ngrok http 3000` y usar esa URL (PayPal no puede llamar a `localhost`).
3. Eventos a suscribir (mínimo):
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
4. Guarda y copia el **Webhook ID** → `PAYPAL_WEBHOOK_ID`.

## 5. Probar una reserva completa

1. `npm run dev`, reserva una consulta hasta llegar a `/reservas/<id>` con estado "Pendiente de pago".
2. Si `NEXT_PUBLIC_PAYPAL_CLIENT_ID` está configurado, verás el botón oficial de PayPal.
3. Paga con la cuenta sandbox de comprador (login/contraseña del paso 3).
4. Verifica:
   - La reserva pasa a **Confirmada** / **Pagado** (`server/paypal-orders.ts` → `captureOrderForBooking`).
   - Se creó una fila en `PaypalTransaction` con `status = "COMPLETED"` y el `paypalCaptureId`.
   - Si tienes el webhook activo, también debería llegar un evento `PAYMENT.CAPTURE.COMPLETED` (revisa los logs del servidor) y quedar registrado en `PaypalWebhookEvent`.
5. **Reserva no pagada expira**: crea una reserva y no la pagues — pasado el tiempo configurado (`Setting.booking_payment_window_minutes`, 15 min por defecto) debe pasar a `EXPIRED` la próxima vez que se consulte disponibilidad o se abra la página de la reserva (verificación perezosa, sin cron), y el horario debe volver a aparecer libre en `/agenda`.
6. **Webhook duplicado**: reenvía el mismo evento desde el dashboard de PayPal (**Webhooks** → tu webhook → **Events** → reenviar uno). Debe responder `200` sin crear una segunda transacción ni volver a capturar el pago (la fila en `PaypalWebhookEvent` con ese `eventId` ya existe, así que el endpoint corta ahí).

## 6. Pasar a producción

1. Repite el paso 1 pero en la pestaña **Live** del dashboard (requiere que la cuenta Business esté verificada por PayPal).
2. Cambia en el entorno de producción:
   ```
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="Client ID de Live"
   PAYPAL_CLIENT_SECRET="Secret de Live"
   PAYPAL_ENVIRONMENT="production"
   PAYPAL_WEBHOOK_ID="Webhook ID configurado contra la URL real (HTTPS)"
   ```
3. Verifica que el dominio de producción sea HTTPS real — PayPal exige HTTPS válido para el webhook en producción.
4. No reutilices credenciales de sandbox en producción ni al revés.
