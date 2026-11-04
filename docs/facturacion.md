# Facturación y Mercado Pago

Estado revisado el **3 de noviembre de 2026**: aplicación en `localhost:3000`,
Supabase hospedado de desarrollo y ningún despliegue de producción. El usuario completó
la autorización en el checkout externo con el comprador de prueba y confirmó que
aparece en **Tus suscripciones** de Mercado Pago y como **Autorizada** en Nutrisfera.
Todavía no se validó un cobro mensual acreditado de punta a punta. El dominio de la
pasarela no determina si el cobro usa cuentas reales o cuentas de prueba.

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

En local, elegir el plan crea una suscripción `pending` y abre el checkout alojado
en Mercado Pago (`init_point`). Los datos de tarjeta se ingresan allí. Si se vuelve
sin completar el pago, el botón retoma ese enlace en lugar de crear otra suscripción.
Una autorización existente impide crear una segunda suscripción. La pantalla consulta
también su estado actual en Mercado Pago para reflejar cancelaciones recientes,
aunque el webhook aún no haya actualizado la base. Esa lectura no acredita cobertura.

El primer cobro empieza al terminar la prueba o la cobertura ya pagada. Si ambas
vencieron, no se envía una fecha futura de inicio y se puede completar el pago.
Mercado Pago no acepta `localhost` como retorno: en desarrollo se usa su página
como respaldo. Para volver a Nutrisfera y recibir notificaciones hace falta el dominio público.

El cobro de punta a punta se prueba **al final del recorrido**, cuando el resto del
producto esté listo y la app tenga un despliegue público HTTPS de pruebas (por ejemplo, Vercel):

1. `NEXT_PUBLIC_SITIO_URL` en `https://` del dominio público.
2. `MERCADOPAGO_WEBHOOK_SECRETO` y `SUPABASE_SECRET_KEY` cargadas en Vercel.
3. Webhook de Mercado Pago apuntando a `https://tu-dominio/api/facturacion/mercadopago`.
4. La migración de checkout quedó aplicada y verificada en Supabase hospedado el 4/11/2026.
5. Recién ahí: pago aprobado (titular `APRO`), historial actualizado, cobertura extendida,
   rechazo (`OTHE`) y repetición de notificaciones sin extender dos veces la cobertura.

Sin el token, el secreto del webhook y `SUPABASE_SECRET_KEY`, no se acepta un webhook.
La clave pública y el SDK de tarjeta ya no son necesarios. No se simula un cobro.

Los correos comerciales (aviso de vencimiento, cobro rechazado) no se envían todavía.
El aviso se muestra en Facturación. El correo de Auth sigue siendo solo el de la cuenta.

## Mercado Pago

1. Crear una aplicación en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app).
2. Para este flujo de **Suscripciones sin plan asociado, con estado `pending`**,
   usar dos cuentas de prueba argentinas: una vendedora y otra compradora.
   Ingresar con la **vendedora de prueba**, crear su aplicación y copiar el Access
   Token de sus credenciales de producción a `MERCADOPAGO_ACCESS_TOKEN`.
   Puede empezar con `APP_USR`: esto no convierte la cuenta de prueba en una cuenta real.
   No usar el token de la cuenta personal real. El correo `test_user_…@testuser.com`
   del **comprador** va en `MERCADOPAGO_CORREO_PAGADOR_PRUEBA`; ese campo no lleva el
   nombre de usuario `TESTUSER…`.
3. En Webhooks, la URL es `https://tu-dominio/api/facturacion/mercadopago`.
   Se configura al desplegar en Vercel, no en localhost. Eventos: `subscription_preapproval`, `subscription_authorized_payment` y `payment`.
4. Copiar la clave secreta del webhook a `MERCADOPAGO_WEBHOOK_SECRETO`.
5. Definir el precio mensual en Administración → Suscripciones. Hasta entonces no se puede autorizar.
6. Aplicar la migración `20261103220000_checkout_suscripciones.sql` antes de habilitar el flujo nuevo.

La firma del webhook se valida con HMAC-SHA256 del manifiesto oficial
`id:{data.id};request-id:{x-request-id};ts:{ts};`. Un evento repetido no vuelve a extender la cobertura.

No se usa el SDK de Node: la integración usa la API HTTP y la firma documentada.
La pantalla de Facturación ya no pide la tarjeta. En la fase de pago, elegir el plan abre Mercado Pago.

## Confirmación y permisos

El retorno del navegador y sus parámetros nunca acreditan pagos. El webhook consulta
la API autenticada, comprueba la referencia del consultorio, el precio y la moneda,
y sincroniza la autorización. Para una factura recurrente consulta su `payment.id`:
ese mismo identificador deduplica las notificaciones de factura y de pago.

Los errores de proveedor o base devuelven HTTP 500. Un evento fallido se puede
reintentar, aunque su identificador ya esté registrado. La transición de pendiente
a aprobado acredita una sola vez; otra moneda o un monto menor no extienden cobertura.

RLS mantiene las lecturas dentro del consultorio. El titular solo puede preparar
un checkout pendiente al precio vigente. No puede escribir cobertura ni confirmar
una autorización desde el cliente: eso corresponde al servidor verificado.

Referencias: [suscripciones con pago pendiente](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments),
[datos de factura](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-authorized-payment/get)
y [webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks).

## Cómo repetir la autorización alojada en local

1. En Nutrisfera abrir **Plan y facturación → Elegir este plan**, o **Continuar con el pago**.
2. El enlace oficial `init_point` abre `www.mercadopago.com.ar/subscriptions/checkout`.
   Es el dominio esperado también al probar este producto. No cambiarlo por un dominio
   de sandbox ni reemplazar manualmente el enlace devuelto por la API.
3. En el menú de cuenta de la pasarela, comprobar el correo con el que se inició sesión.
   Debe ser el comprador de `MERCADOPAGO_CORREO_PAGADOR_PRUEBA`, nunca el vendedor.
   La sesión de Nutrisfera, la del vendedor que configura la integración y la del
   comprador que paga son sesiones distintas.
4. Si aparece el vendedor o una cuenta real, elegir **Cambiar de cuenta** y completar
   el ingreso con el comprador. Si solicita un código, buscar el código de verificación
   de esa cuenta en **Cuentas de prueba**. Las contraseñas y códigos se ingresan
   solamente en Mercado Pago.
5. Elegir **Nueva tarjeta** y probar con una tarjeta de crédito de la documentación
   de Suscripciones. Ejemplo publicado: Mastercard `5031 7557 3453 0604`, vencimiento
   `11/30`, código `123`, titular `APRO` y DNI `12345678`. Para un rechazo se usa `OTHE`.
   No se necesitan tarjetas ni documentos personales.
6. Avanzar hasta la revisión. La confirmación final de la autorización la realiza
   la persona que prueba. El primer cobro mensual respeta la fecha de fin de la prueba.
7. Volver a Nutrisfera y pulsar **Actualizar estado**. La consulta autenticada puede
   mostrar `authorized` aunque el webhook todavía no llegue a local. Esto no acredita un mes.

### Diagnóstico del bloqueo observado

El desajuste de cuentas descrito a continuación corresponde a la configuración
anterior y quedó resuelto en la prueba manual posterior. Ya se verificó el nuevo vendedor de prueba y el correo del comprador,
que pertenecen a cuentas distintas. Al cambiar de token, el checkout pendiente
anterior dejó de ser consultable por el nuevo vendedor.

En desarrollo se puede reemplazar ese pendiente sin cobertura si la API devuelve
403/404, o el error 400 específico `the preapprovalId is not valid for callerId`,
y se verifica que el nuevo token pertenece a `test_user`. Este reemplazo
no se habilita en producción, ante fallos de red, ni sobre autorizaciones o cobertura existentes.

- En el diagnóstico se comprobó el token con `/users/me`: pertenecía a una cuenta con la etiqueta
  `test_user`, del país `MLA` (Argentina).
- La suscripción pendiente tenía otro comprador de prueba argentino asociado.
- La cuenta dueña del token estaba identificada como **Comprador** en el panel del
  usuario. Al usar su token en el servidor, la integración la puso a recibir los
  cobros. El correo pagador de `.env.local` apuntaba a una tercera cuenta distinta
  de las dos mostradas en ese panel. Esa configuración se corrigió posteriormente.
- En la pasarela estaba iniciada la **misma cuenta dueña del token**. Por eso
  no alcanzaba con que el encabezado dijera “Test”: el comprador que paga debe ser otra cuenta.
- El botón **Confirmar** permaneció deshabilitado tanto con el saldo seleccionado
  como al elegir una tarjeta de prueba dentro de esa sesión vendedora. No se confirmó
  la autorización en ese intento. La autorización posterior con el comprador correcto sí se completó.
- Un mensaje sobre mezclar cuentas reales y de prueba requiere revisar ambas cuentas
  y el medio de pago; cambiar el dominio no corrige esa mezcla.

La autorización anterior del formulario interno fue cancelada. El checkout nuevo
ya se completó con el comprador correcto, según la prueba manual del usuario.
**Autorizada** confirma el permiso de cobro recurrente; no demuestra que se haya
cobrado la mensualidad ni acreditado cobertura. Esto último sigue pendiente de validar.

### Qué sigue pendiente

- `20261103220000_checkout_suscripciones.sql` quedó aplicada en una transacción y registrada
  el 4/11/2026. Se verificaron el trigger, la función de acreditación idempotente y los permisos.
  Persisten diferencias de versiones antiguas en el historial; ver `despliegue.md` antes de `db push`.
- Mantener alineados el Access Token del vendedor y el correo del comprador.
  La configuración actual ya está verificada; no deducir esta correspondencia por el prefijo del token.
- Para acreditar y probar un cobro de punta a punta: URL pública HTTPS, secreto del
  webhook y clave de servicio de Supabase. La clave de Supabase quedó validada en local
  el 4/11/2026; faltan su configuración en Vercel y el secreto del webhook.
  La app puede seguir en desarrollo; una URL pública de pruebas no implica lanzarla a producción.

El endpoint `/api/facturacion/mercadopago` ya valida la firma, consulta la API del
proveedor y procesa eventos con deduplicación y reintentos. Lo pendiente es la
configuración externa y su validación real, no desarrollar el webhook desde cero.
Los criterios de cierre están en [`avances.md`](avances.md).

Fuentes oficiales para este flujo: [prueba de Suscripciones `pending`](https://www.mercadopago.com.ar/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--#Suscripciones),
[compra de prueba de Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-test/payment-approval)
y [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards).

Para consultar quién es realmente dueño del token, sin imprimirlo ni crear pagos:

```bash
node --env-file=.env.local scripts/diagnosticar-mercadopago.mjs
```
