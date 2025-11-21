# WhatsApp Business API Platform

Plataforma completa para gestionar y enviar mensajes automatizados vía WhatsApp Business API de Meta.

## 🚀 Características

- ✅ **Dashboard**: Visualiza estadísticas de envío y estado de conexión
- ✅ **Gestión de Plantillas**: Crea y administra plantillas de mensajes con variables dinámicas
- ✅ **Envío Masivo**: Envía mensajes a hasta 10,000 contactos en modo pico
- ✅ **Control de Límites**: Sistema de rate limiting (1,000 diarios / 10,000 pico)
- ✅ **Historial Completo**: Rastrea todos los mensajes con filtros y exportación a CSV
- ✅ **Programación**: Programa mensajes para envío futuro
- ✅ **Carga CSV**: Importa contactos masivamente desde archivos CSV

## 📋 Requisitos Previos

Para usar esta plataforma, necesitas obtener credenciales de Meta:

1. **Cuenta de Meta Business**: Crea una cuenta en [Meta Business Suite](https://business.facebook.com/)
2. **WhatsApp Business API**: Registra tu número en [Meta for Developers](https://developers.facebook.com/)
3. **Credenciales Requeridas**:
   - Phone Number ID
   - Access Token
   - Business Account ID
   - Webhook Verify Token

### Guía de Configuración en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación
3. Agrega el producto "WhatsApp"
4. Sigue el proceso de verificación de tu número de teléfono
5. Obtén tus credenciales del panel de WhatsApp

**IMPORTANTE**: Meta requiere que tu número sea verificado antes de poder enviar mensajes. El proceso puede tomar 24-48 horas.

## 🛠️ Instalación

```bash
# Las dependencias ya están instaladas
npm install
```

## 🔧 Configuración Inicial

### 1. Variables de Entorno

Las credenciales de la base de datos ya están configuradas en `.env`:

```
TURSO_CONNECTION_URL=libsql://db-2916233b-39a6-435e-86fe-5d07189f92f7-orchids.aws-us-west-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
```

### 2. Base de Datos

La base de datos ya está configurada con:
- ✅ Tabla de configuración de WhatsApp
- ✅ Tabla de plantillas de mensajes
- ✅ Tabla de contactos
- ✅ Tabla de logs de mensajes
- ✅ Tabla de seguimiento de límites
- ✅ Datos de ejemplo para pruebas

### 3. Configurar WhatsApp Business API

1. Accede al dashboard en `http://localhost:3000`
2. Ve a la sección "Configuración"
3. Ingresa tus credenciales de Meta:
   - **Phone Number ID**: ID de tu número de WhatsApp Business
   - **Access Token**: Token de acceso de la API
   - **Business Account ID**: ID de tu cuenta de negocio
   - **Webhook Verify Token**: Token para verificar webhooks
   - **Límite Diario**: 1,000 (por defecto)
   - **Límite Pico**: 10,000 (por defecto)
4. Haz clic en "Guardar Configuración"
5. Haz clic en "Verificar Conexión"

## 📱 Uso de la Plataforma

### Dashboard
- Visualiza estadísticas en tiempo real
- Verifica el estado de conexión con WhatsApp
- Accede rápidamente a todas las funciones

### Plantillas
1. Ve a la página "Plantillas"
2. Haz clic en "Nueva Plantilla"
3. Define:
   - Nombre único (ej: `recordatorio_cita`)
   - Contenido con variables (ej: `Hola {{name}}, tu cita es el {{date}}`)
   - Categoría (Marketing, Utilidad, Autenticación)
   - Estado (Borrador, Pendiente, Aprobado)
4. Las variables se detectan automáticamente

**Nota**: Meta requiere aprobar plantillas antes de usarlas en producción.

### Envío Masivo
1. Ve a la página "Mensajes"
2. Selecciona una plantilla aprobada
3. Descarga el CSV de ejemplo o prepara tu archivo con:
   ```csv
   phoneNumber,name,variable1,variable2
   +5215551234567,Juan Pérez,valor1,valor2
   +5215559876543,María García,valor1,valor2
   ```
4. Carga el archivo CSV
5. (Opcional) Programa la fecha de envío
6. Haz clic en "Enviar Mensajes"

### Historial
1. Ve a la página "Historial"
2. Usa los filtros para buscar:
   - Por estado (Enviado, Entregado, Leído, etc.)
   - Por número de teléfono
   - Por rango de fechas
   - Por contenido
3. Exporta los resultados a CSV

## 📊 Estructura de la Base de Datos

### whatsapp_config
Configuración de la API de WhatsApp

### message_templates
Plantillas de mensajes con variables

### contacts
Base de datos de contactos

### message_logs
Registro de todos los mensajes enviados

### rate_limit_tracking
Seguimiento de límites de envío

## 🔒 Rate Limiting

El sistema implementa dos tipos de límites:

- **Límite Diario**: 1,000 mensajes por día (configurable)
- **Límite Pico**: 10,000 mensajes en modo ráfaga (configurable)

Los límites se resetean automáticamente cada día.

## 🎯 API Endpoints

### WhatsApp Configuration
- `GET /api/whatsapp/config` - Obtener configuración
- `POST /api/whatsapp/config` - Guardar configuración
- `POST /api/whatsapp/verify` - Verificar conexión

### Templates
- `GET /api/templates` - Listar plantillas
- `POST /api/templates` - Crear plantilla
- `PUT /api/templates/[id]` - Actualizar plantilla
- `DELETE /api/templates/[id]` - Eliminar plantilla

### Messages
- `POST /api/messages/bulk` - Envío masivo
- `GET /api/messages/history` - Historial con filtros
- `GET /api/messages/stats` - Estadísticas de uso

### Contacts
- `POST /api/contacts/upload` - Cargar contactos desde CSV

## 🚨 Requisitos de Meta

Para enviar mensajes en producción, Meta requiere:

1. ✅ Número de teléfono verificado
2. ✅ Cuenta de negocio verificada
3. ✅ Plantillas aprobadas por Meta
4. ✅ Webhooks configurados (opcional)
5. ✅ Cumplir con políticas de WhatsApp Business

### Proceso de Verificación

1. **Verificar tu Número** (24-48 horas)
   - Sube documentos de la empresa
   - Verifica propiedad del número
   
2. **Aprobar Plantillas** (24 horas por plantilla)
   - Envía plantillas para revisión
   - Espera aprobación de Meta
   
3. **Configurar Webhooks** (Opcional)
   - Recibe notificaciones de estado
   - Actualiza logs automáticamente

## 📝 Formato del CSV

El archivo CSV debe seguir este formato:

```csv
phoneNumber,name,variable1,variable2,variable3
+5215551234567,Juan Pérez,valor1,valor2,valor3
+5215559876543,María García,valor1,valor2,valor3
```

- `phoneNumber`: REQUERIDO, formato internacional (+52...)
- `name`: Opcional, nombre del contacto
- Otras columnas: Valores para variables de la plantilla

## 🎨 Categorías de Plantillas

### MARKETING
Para promociones y ofertas comerciales

### UTILITY
Para notificaciones transaccionales (confirmaciones, recordatorios)

### AUTHENTICATION
Para códigos de verificación y autenticación

## 📈 Estados de Mensajes

- **QUEUED**: En cola, programado para envío futuro
- **SENT**: Enviado a WhatsApp
- **DELIVERED**: Entregado al destinatario
- **READ**: Leído por el destinatario
- **FAILED**: Error en el envío

## 🔍 Troubleshooting

### Error: "WhatsApp configuration not found"
Solución: Configura tus credenciales en el Dashboard

### Error: "Template not found"
Solución: Asegúrate de que la plantilla existe y está aprobada

### Error: "Invalid phone number"
Solución: Verifica que los números tengan formato internacional (+52...)

### Error: "Rate limit exceeded"
Solución: Espera a que se reseteen los límites o aumenta el límite diario/pico

### Mensajes no se envían
Posibles causas:
1. Credenciales incorrectas
2. Número no verificado en Meta
3. Plantilla no aprobada
4. Límites excedidos

## 📚 Recursos Adicionales

- [Meta for Developers - WhatsApp API](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Policies](https://www.whatsapp.com/legal/business-policy/)

## 🆘 Soporte

Si necesitas ayuda con la configuración de Meta:
1. Visita [Meta Business Help Center](https://www.facebook.com/business/help)
2. Contacta al soporte de Meta for Developers
3. Revisa la documentación oficial de WhatsApp Business API

---

**¡Importante!**: Esta plataforma está lista para uso en desarrollo. Para producción, asegúrate de completar todos los requisitos de verificación de Meta.
