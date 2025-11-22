# 🔗 Configuración del Webhook de WhatsApp Business API

## 📋 Resumen

El webhook permite recibir actualizaciones en tiempo real de Meta sobre el estado de tus mensajes de WhatsApp. Esta guía te ayudará a configurarlo correctamente.

---

## ✅ ¿Qué hace el Webhook?

### Funcionalidades Implementadas:

1. **✓ Verificación de Webhook** - Meta valida tu endpoint con un challenge/verify token
2. **✓ Actualizaciones de Estado** - Recibe notificaciones cuando los mensajes son:
   - `sent` - Mensaje enviado
   - `delivered` - Mensaje entregado al destinatario
   - `read` - Mensaje leído por el destinatario
   - `failed` - Mensaje falló (con detalles del error)
3. **✓ Manejo de Errores** - Captura y registra errores de entrega automáticamente
4. **✓ Respuestas de Usuarios** - Registra cuando usuarios responden (logs en consola)
5. **✓ Actualización Automática del Historial** - Sincroniza el estado en la base de datos

---

## 🚀 Configuración Paso a Paso

### 1. Configura tus Credenciales en el Dashboard

1. Ve a `/` (Dashboard)
2. En la pestaña **"Configuración"**:
   - Ingresa tu **Phone Number ID**
   - Ingresa tu **Access Token**
   - Ingresa tu **Business Account ID**
   - **IMPORTANTE**: Crea un **Webhook Verify Token** único y seguro
     - Ejemplo: `mi_token_super_secreto_2024`
     - Guárdalo, lo necesitarás en Meta
3. Haz clic en **"Guardar Configuración"**
4. Haz clic en **"Verificar Conexión"** para validar tus credenciales

### 2. Obtén la URL del Webhook

1. Ve a la pestaña **"Webhook"** en el Dashboard
2. Copia la **URL del Webhook** que aparece
3. Copia el **Verify Token** que configuraste

**Ejemplo de URL:**
```
https://tu-dominio.com/api/whatsapp/webhook
```

**Para desarrollo local (con tunneling):**
```
https://tu-tunnel-url.ngrok.io/api/whatsapp/webhook
```

### 3. Configura el Webhook en Meta Developer Console

1. **Abre Meta Developer Console**
   - Haz clic en "Abrir Meta Developer Console" en el Dashboard
   - O ve a: https://developers.facebook.com/apps

2. **Navega a tu App**
   - Selecciona tu aplicación de WhatsApp Business

3. **Ve a WhatsApp > Configuration**
   - En el menú lateral: WhatsApp > Configuration
   - Busca la sección "Webhook"

4. **Edita la Configuración del Webhook**
   - Haz clic en "Edit" o "Configure"
   - **Callback URL**: Pega la URL del webhook copiada
   - **Verify Token**: Pega el token que configuraste
   - Haz clic en **"Verify and Save"**

5. **Suscríbete a los Eventos**
   - En "Webhook fields", asegúrate de suscribirte a:
     - ✅ **messages** (obligatorio)
   - Haz clic en "Subscribe"

---

## 🔐 Seguridad del Webhook

### Webhook Verify Token

- Este token es usado para verificar que las peticiones vienen de Meta
- **NUNCA lo compartas públicamente**
- Usa un token largo y aleatorio (mínimo 12 caracteres)
- Ejemplo: `mi_super_token_secreto_whatsapp_2024_xyz789`

### Proceso de Verificación

Cuando Meta configura tu webhook, envía una petición GET con:
```
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=RANDOM_STRING
```

Tu webhook verifica:
1. ✓ Que `hub.mode` sea "subscribe"
2. ✓ Que `hub.verify_token` coincida con tu token guardado
3. ✓ Responde con el `hub.challenge` si todo es correcto

---

## 📊 Flujo de Actualización de Estado

### 1. Envías un Mensaje
```
Tu App → Meta API → WhatsApp → Usuario
```

### 2. Meta Notifica Estado via Webhook
```
Meta → Webhook → Tu Base de Datos
```

### 3. Actualizaciones Automáticas

El webhook actualiza automáticamente:
- **Status del mensaje**: `sent`, `delivered`, `read`, `failed`
- **Timestamp de entrega**: Cuando se entrega el mensaje
- **Timestamp de envío**: Cuando Meta confirma el envío
- **Mensajes de error**: Si el mensaje falla

---

## 🧪 Probando el Webhook

### Webhook de Verificación (GET)

Meta envía esta petición para verificar tu webhook:
```bash
curl "https://tu-dominio.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test123"
```

**Respuesta esperada:**
```
test123
```

### Webhook de Estado (POST)

Meta envía actualizaciones de estado así:
```bash
curl -X POST https://tu-dominio.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "BUSINESS_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "1234567890",
            "phone_number_id": "PHONE_NUMBER_ID"
          },
          "statuses": [{
            "id": "wamid.MESSAGE_ID",
            "status": "delivered",
            "timestamp": "1700000000",
            "recipient_id": "521234567890"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

**Respuesta esperada:**
```json
{ "status": "ok" }
```

---

## 🐛 Troubleshooting

### Problema: "Verificación fallida" en Meta Console

**Causas posibles:**
- ❌ El Verify Token no coincide
- ❌ La URL del webhook no es accesible desde internet
- ❌ No guardaste la configuración antes de verificar

**Solución:**
1. Verifica que guardaste la configuración con "Guardar Configuración"
2. Asegúrate de copiar exactamente el mismo token
3. Si estás en desarrollo local, usa ngrok o similar para exponer tu servidor

### Problema: No recibo actualizaciones de estado

**Causas posibles:**
- ❌ No te suscribiste al evento "messages"
- ❌ El webhook no está guardado en Meta
- ❌ Hay errores en los logs del servidor

**Solución:**
1. Ve a Meta Console > WhatsApp > Configuration
2. Verifica que "messages" esté suscrito
3. Revisa los logs del servidor para ver si llegan peticiones

### Problema: Los estados no se actualizan en el historial

**Causas posibles:**
- ❌ El `metaMessageId` no coincide en la base de datos
- ❌ Hay errores en el procesamiento del webhook

**Solución:**
1. Revisa los logs del servidor: `check_server_logs`
2. Verifica que los mensajes se estén enviando correctamente
3. Asegúrate de que el `metaMessageId` se guarda al enviar mensajes

---

## 📝 Logs y Monitoreo

### Ver Logs del Webhook

Los eventos del webhook se registran en la consola del servidor:

```bash
# Verificación
Webhook verification attempt: { mode: 'subscribe', token: '***', challenge: 'xxx' }
Webhook verified successfully

# Actualización de estado
Webhook event received: { object: 'whatsapp_business_account', ... }
Processing status update: { messageId: 'wamid.xxx', status: 'delivered', ... }
Message wamid.xxx status updated to: delivered
```

### Estados de Mensaje

| Estado | Descripción |
|--------|-------------|
| `pending` | Mensaje en cola, esperando envío |
| `sent` | Mensaje enviado a Meta API |
| `delivered` | Mensaje entregado al dispositivo del usuario |
| `read` | Usuario leyó el mensaje |
| `failed` | Mensaje falló (ver `errorMessage`) |

---

## 🔄 Desarrollo Local

Para probar el webhook en desarrollo local:

### Opción 1: ngrok (Recomendado)

```bash
# Instala ngrok
npm install -g ngrok

# Expone tu puerto 3000
ngrok http 3000

# Copia la URL HTTPS que te da
# Ejemplo: https://abc123.ngrok.io
```

Luego en Meta Console usa:
```
https://abc123.ngrok.io/api/whatsapp/webhook
```

### Opción 2: localtunnel

```bash
# Instala localtunnel
npm install -g localtunnel

# Expone tu puerto 3000
lt --port 3000

# Usa la URL que te proporciona
```

---

## 📚 Estructura del Webhook

### Endpoint: `/api/whatsapp/webhook`

#### GET (Verificación)
- **Propósito**: Meta verifica que tu webhook es válido
- **Parámetros**:
  - `hub.mode`: "subscribe"
  - `hub.verify_token`: Tu token configurado
  - `hub.challenge`: String aleatorio de Meta
- **Respuesta**: El `hub.challenge` si la verificación es exitosa

#### POST (Eventos)
- **Propósito**: Meta envía actualizaciones de estado
- **Body**: JSON con estructura de evento de WhatsApp
- **Respuesta**: `{ "status": "ok" }` (siempre 200 para evitar reintentos)

---

## ✨ Próximos Pasos

Una vez configurado el webhook:

1. ✅ **Envía mensajes de prueba** desde `/messages`
2. ✅ **Observa las actualizaciones en tiempo real** en `/history`
3. ✅ **Revisa los estados** (sent → delivered → read)
4. ✅ **Monitorea errores** en mensajes fallidos

---

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs del servidor** para ver los eventos que llegan
2. **Verifica la configuración** en el Dashboard
3. **Consulta la documentación de Meta**: https://developers.facebook.com/docs/whatsapp/webhooks

---

## 🎉 ¡Listo!

Tu webhook está configurado y listo para recibir actualizaciones en tiempo real de WhatsApp Business API. Los estados de tus mensajes se actualizarán automáticamente en el historial.
