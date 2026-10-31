# Facturación y Mercado Pago

## Decisión

Hay una sola prueba gratuita y vive en esta base (`pruebas_profesionales`).
Un mes es un mes calendario en UTC: el 31 de enero más un mes cae en el último día de febrero.
No son 30 días fijos.

Mercado Pago no tiene una segunda prueba. Al autorizar la suscripción, `start_date`
del cobro recurrente es la fecha en que vence la prueba nuestra. Autorizar la tarjeta
no significa que el mes esté pago. Mercado Pago puede debitar un importe mínimo para
validar la tarjeta y devolverlo: ese monto, al ser menor al precio, no extiende la cobertura.

El acceso se calcula en `estado_acceso_comercial`:

| Estado | Significado |
| --- | --- |
| `prueba` | La prueba todavía no venció. |
| `activo` | Hay un cobro aprobado que cubre hasta `cobertura_hasta`. |
| `gracia` | Hubo un cobro rechazado y sigue el plazo de gracia desde el fin de la cobertura o de la prueba. |
| `vencido` | No hay prueba ni cobertura ni gracia. |
| `suspendido_admin` | El consultorio está suspendido por la administración. No es un rechazo de pago. |

Los pacientes siguen leyendo lo ya compartido. La suspensión no borra historias, turnos ni planes.
El profesional vencido no puede usar el panel clínico ni las acciones del servidor: queda en Facturación.

Cambiar la duración global no modifica pruebas ya concedidas. Ajustar una prueba existente
exige ser superadministrador, una fecha y un motivo, y queda en `registros_auditoria`.
Un mismo correo no obtiene otra prueba, aunque se borre la cuenta.

## Qué se prueba ahora y qué queda para el final

En local, con las credenciales de prueba, la tarjeta ya puede autorizar la suscripción
(`estado_mp = authorized`). Eso no extiende la cobertura: el primer cobro del plan
queda para cuando vence la prueba, y el aviso de Mercado Pago no llega a `localhost`.

El cobro de punta a punta se prueba **al final del recorrido**, cuando el resto del
producto esté listo y la app esté desplegada en Vercel:

1. `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio público.
2. `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY` cargadas en Vercel.
3. Webhook de Mercado Pago apuntando a `https://tu-dominio/api/facturacion/mercadopago`.
4. Recién ahí: pago aprobado (titular `APRO`), cobertura extendida y un rechazo (`OTHE`).

Sin el token, la clave pública, el secreto del webhook y `SUPABASE_SECRET_KEY`,
no se acepta un webhook. No se simula un cobro.

Los correos comerciales (aviso de vencimiento, cobro rechazado) no se envían todavía.
El aviso se muestra en Facturación. El correo de Auth sigue siendo solo el de la cuenta.

## Mercado Pago

1. Crear una aplicación en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app).
2. Copiar el access token de **prueba** y la clave pública a `.env.local`.
   Ese token es el vendedor. El pagador tiene que ser **otra** cuenta de prueba: el correo
   `test_user_…@testuser.com`, no el usuario que empieza con `TESTUSER`. Va en
   `MERCADOPAGO_CORREO_PAGADOR_PRUEBA`.
3. En Webhooks, la URL es `https://tu-dominio/api/facturacion/mercadopago`.
   Se configura al desplegar en Vercel, no en localhost. Eventos: `subscription_preapproval` y `subscription_authorized_payment`.
4. Copiar la clave secreta del webhook a `MERCADOPAGO_WEBHOOK_SECRETO`.
5. Definir el precio mensual en Administración → Suscripciones. Hasta entonces no se puede autorizar.

La firma del webhook se valida con HMAC-SHA256 del manifiesto oficial
`id:{data.id};request-id:{x-request-id};ts:{ts};`. Un evento repetido no vuelve a extender la cobertura.

No se usa el SDK de Node: son dos llamadas HTTP y la firma está documentada.
La pantalla de Facturación ya no pide la tarjeta. En la fase de pago, elegir el plan abre Mercado Pago.
