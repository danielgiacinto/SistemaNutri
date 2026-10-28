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

## Qué no está conectado hasta cargar credenciales

Sin `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRETO`,
`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` y `SUPABASE_SECRET_KEY`, no se crea una suscripción
ni se acepta un webhook. No se simula un cobro.

Los correos comerciales (aviso de vencimiento, cobro rechazado) no se envían todavía.
El aviso se muestra en Facturación. El correo de Auth sigue siendo solo el de la cuenta.

## Mercado Pago

1. Crear una aplicación en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app).
2. Copiar el access token de **prueba** y la clave pública a `.env.local`.
3. En Webhooks, la URL de prueba es `https://tu-dominio/api/facturacion/mercadopago`.
   En local hace falta una URL pública (por ejemplo un túnel). Eventos: `subscription_preapproval` y `subscription_authorized_payment`.
4. Copiar la clave secreta del webhook a `MERCADOPAGO_WEBHOOK_SECRETO`.
5. Definir el precio mensual en Administración → Suscripciones. Hasta entonces no se puede autorizar.

La firma del webhook se valida con HMAC-SHA256 del manifiesto oficial
`id:{data.id};request-id:{x-request-id};ts:{ts};`. Un evento repetido no vuelve a extender la cobertura.

No se usa el SDK de Node: son dos llamadas HTTP y la firma está documentada. El formulario
de tarjeta usa el SDK de navegador de Mercado Pago, con campos en iframe.
