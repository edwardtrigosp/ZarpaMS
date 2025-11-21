# 📱 Guía de Uso - WhatsApp Business API

## 🚀 Cómo Enviar tu Primer Mensaje de Prueba

### Paso 1: Preparar tu CSV de Contactos

1. Ve a la página **Mensajes** (`/messages`)
2. Selecciona una plantilla del dropdown (ej: "recordatorio_cita")
3. Haz clic en **"Descargar CSV de Ejemplo"**
4. Se descargará un archivo CSV con las columnas correctas para esa plantilla

**Ejemplo de CSV:**
```csv
phoneNumber,name,date,time
+5215551234567,Juan Pérez,25 de enero,10:00 AM
+5215559876543,María García,26 de enero,2:30 PM
```

### Paso 2: Cargar Contactos

1. Haz clic en el botón **"Elegir archivo"** en la sección "2. Carga Contactos (CSV)"
2. Selecciona tu archivo CSV
3. Verás el mensaje: "X contactos cargados exitosamente"
4. Podrás ver un preview de los primeros 5 contactos

### Paso 3: Enviar Mensajes

1. **(Opcional)** Si quieres programar el envío, selecciona fecha y hora
2. Haz clic en el botón verde **"Enviar Mensajes"**
3. Los mensajes se guardarán en la base de datos con estado:
   - **SENT**: Si se enviaron inmediatamente
   - **QUEUED**: Si están programados para después

### Paso 4: Verificar en el Historial

1. Ve a la página **Historial** (`/history`)
2. Verás todos los mensajes enviados con su estado
3. Puedes filtrar por:
   - Estado (SENT, DELIVERED, QUEUED, FAILED)
   - Número de teléfono
   - Rango de fechas
   - Búsqueda de texto
4. Exporta el historial en CSV si lo necesitas

---

## 📊 Estado Actual del Sistema

### ✅ Lo que YA funciona:

- ✅ **Gestión de Plantillas**: Crear, editar, eliminar plantillas
- ✅ **Variables Dinámicas**: Reemplazo automático de {{variables}} en mensajes
- ✅ **Carga Masiva CSV**: Cargar múltiples contactos desde archivo
- ✅ **Programación**: Agendar mensajes para envío futuro
- ✅ **Historial Completo**: Registro de todos los mensajes con filtros
- ✅ **Base de Datos**: Todo se guarda en Turso (SQLite cloud)
- ✅ **Límites**: Control de 1,000 diarios / 10,000 pico

### ⚠️ Pendiente para Producción:

Para enviar mensajes REALES a WhatsApp, necesitas:

1. **Cuenta de WhatsApp Business** verificada en Meta
2. **Credenciales de API**:
   - Phone Number ID
   - Access Token
   - Business Account ID
3. **Integración activa** con la API de WhatsApp

**📝 Nota**: Actualmente el sistema guarda los mensajes en la base de datos pero NO los envía realmente a WhatsApp. Para producción, necesitas conectar las credenciales de Meta en el Dashboard.

---

## 🔧 Configuración de WhatsApp Business API (Para Producción)

### Requisitos Previos:

1. Cuenta de **Meta for Developers** (https://developers.facebook.com)
2. **WhatsApp Business Account** verificado
3. **Número de teléfono** validado por Meta

### Obtener Credenciales:

1. Ve a **Meta for Developers Console**
2. Crea o selecciona tu app
3. Agrega el producto **WhatsApp**
4. Obtén:
   - `Phone Number ID` (ID del número de WhatsApp)
   - `Access Token` (Token de acceso permanente)
   - `Business Account ID` (ID de la cuenta de negocio)
   - `Webhook Verify Token` (Token personalizado para webhooks)

### Configurar en la Plataforma:

1. Ve al **Dashboard** (`/`)
2. En la pestaña **"Configuración"**:
   - Pega tu **Phone Number ID**
   - Pega tu **Access Token**
   - Pega tu **Business Account ID**
   - Crea un **Webhook Verify Token** (cualquier texto seguro)
3. Haz clic en **"Guardar Configuración"**
4. Haz clic en **"Verificar Conexión"**
5. Si todo está correcto, verás: "Conexión verificada exitosamente"

---

## 📖 Casos de Uso Comunes

### 1. Recordatorios de Citas

**Plantilla**: `recordatorio_cita`
**Variables**: `{{name}}`, `{{date}}`, `{{time}}`

```csv
phoneNumber,name,date,time
+5215551234567,Juan Pérez,25 de enero,10:00 AM
```

### 2. Promociones Especiales

**Plantilla**: `promocion_especial`
**Variables**: `{{name}}`, `{{discount}}`

```csv
phoneNumber,name,discount
+5215551234567,María García,20%
```

### 3. Confirmación de Pedidos

**Plantilla**: `confirmacion_pedido`
**Variables**: `{{name}}`, `{{order_number}}`

```csv
phoneNumber,name,order_number
+5215551234567,Carlos López,ORD-12345
```

---

## 💡 Consejos y Buenas Prácticas

### Formato de Números:

- ✅ **Correcto**: `+5215551234567` (código de país + número)
- ❌ **Incorrecto**: `5551234567` (sin código de país)
- ❌ **Incorrecto**: `+52 55 5123 4567` (con espacios)

### Límites de Envío:

- **Límite Diario**: 1,000 mensajes por día
- **Límite Pico**: 10,000 mensajes máximo
- Se resetean automáticamente a medianoche

### Variables en Plantillas:

- Usa el formato: `{{nombre_variable}}`
- No uses espacios: `{{mi variable}}` ❌
- Solo letras y números: `{{nombre_cliente}}` ✅

### CSV Encoding:

- Guarda tus CSV con encoding **UTF-8**
- Incluye acentos y caracteres especiales sin problema
- Excel puede causar problemas - usa Google Sheets o LibreOffice

---

## 🐛 Solución de Problemas

### "No se encontraron plantillas"
- Ve a **Plantillas** y crea al menos una
- Asegúrate de que el estado sea **APPROVED**

### "Error al leer el archivo CSV"
- Verifica que el CSV tenga la columna `phoneNumber`
- Verifica que el encoding sea UTF-8
- Revisa que no haya filas vacías al final

### "Error al enviar mensajes"
- Verifica que hayas seleccionado una plantilla
- Verifica que hayas cargado contactos
- Revisa el console del navegador para más detalles

### Los mensajes no aparecen en el historial
- Actualiza la página
- Verifica los filtros aplicados
- Revisa que el envío haya sido exitoso

---

## 📞 Soporte

Para más información sobre WhatsApp Business API:
- 📚 [Documentación oficial de Meta](https://developers.facebook.com/docs/whatsapp)
- 🎓 [Guía de inicio rápido](https://developers.facebook.com/docs/whatsapp/getting-started)
- 🔐 [Obtener credenciales](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started)

---

## 🎯 Próximos Pasos

1. ✅ **Ya hecho**: Base de datos y plantillas configuradas
2. 📱 **Siguiente**: Obtener credenciales de WhatsApp Business API
3. 🔌 **Después**: Conectar las credenciales en el Dashboard
4. 🚀 **Finalmente**: ¡Enviar mensajes reales!

---

**¿Listo para empezar?** Ve a `/messages` y envía tu primer mensaje de prueba. 🎉
