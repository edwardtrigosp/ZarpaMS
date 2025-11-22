# 🔐 GUÍA DE CONFIGURACIÓN DE SEGURIDAD

## 🚨 ACCIÓN INMEDIATA REQUERIDA

Tu aplicación ha sido auditada y se han implementado correcciones de seguridad **CRÍTICAS**. Sigue estos pasos **AHORA**.

---

## 📋 PASO 1: GENERAR API KEY SEGURA

### Opción A: Usando OpenSSL (Recomendado)
```bash
# En tu terminal:
openssl rand -hex 32
```

### Opción B: Usando Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Opción C: Generador Online
Visita: https://www.uuidgenerator.net/guid

---

## 🔧 PASO 2: CONFIGURAR LA API KEY

1. **Abre el archivo `.env`** en la raíz del proyecto

2. **Reemplaza** esta línea:
```env
API_SECRET_KEY=your-secret-api-key-here-change-this-in-production-use-strong-random-value
```

3. **Con tu API key generada**:
```env
API_SECRET_KEY=abc123def456...tu-clave-generada...
```

**⚠️ IMPORTANTE:**
- La API key debe tener **mínimo 32 caracteres**
- Usa caracteres aleatorios (letras, números)
- **NUNCA** compartas esta clave
- **NUNCA** la subas a GitHub o repositorios públicos

---

## 🔑 PASO 3: USAR LA API KEY EN TUS PETICIONES

Desde ahora, **TODAS** las peticiones a la API deben incluir la API key.

### En el Frontend (JavaScript/TypeScript)
```javascript
// Guardar la API key en localStorage (una sola vez)
localStorage.setItem('api_key', 'tu-api-key-aqui');

// En cada petición, incluir el header
const apiKey = localStorage.getItem('api_key');

fetch('/api/whatsapp/config', {
  method: 'GET',
  headers: {
    'X-API-Key': apiKey  // ← IMPORTANTE
  }
})
```

### Usando cURL
```bash
curl -X GET http://localhost:3000/api/whatsapp/config \
  -H "X-API-Key: tu-api-key-aqui"
```

### Usando Postman
1. Abre Postman
2. En la pestaña **Headers**, agrega:
   - **Key**: `X-API-Key`
   - **Value**: `tu-api-key-aqui`

---

## ✅ PASO 4: VERIFICAR QUE FUNCIONA

### Test Manual
```bash
# Sin API key (debería fallar con 401)
curl http://localhost:3000/api/templates

# Con API key (debería funcionar)
curl -H "X-API-Key: tu-api-key" http://localhost:3000/api/templates
```

### Test Automático
Visita en tu navegador:
```
http://localhost:3000/api/security-test
```

Deberías ver un reporte JSON con:
- ✅ `Authentication Protection: PASS`
- ✅ `Rate Limiting: PASS`
- ✅ `Phone Number Validation: PASS`
- Score: 70%+ (Bueno)

---

## 📊 ENDPOINTS PROTEGIDOS

Todos estos endpoints ahora requieren API key:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/whatsapp/config` | GET, POST | Configuración de WhatsApp |
| `/api/templates` | GET, POST | Plantillas de mensajes |
| `/api/templates/[id]` | GET, PUT, DELETE | Gestión de plantillas |
| `/api/messages/bulk` | POST | Envío masivo |
| `/api/messages/history` | GET | Historial |
| `/api/whatsapp/webhook-logs` | GET, POST, DELETE | Logs del webhook |

**⚠️ EXCEPCIÓN:** El webhook (`/api/whatsapp/webhook`) NO requiere API key (es llamado por Meta).

---

## 🛡️ MEJORAS DE SEGURIDAD IMPLEMENTADAS

### ✅ 1. Autenticación
- Todos los endpoints requieren API key
- Sin clave válida → Error 401 Unauthorized

### ✅ 2. Rate Limiting
- Límites de peticiones por minuto por endpoint
- Previene abuso y ataques DoS

### ✅ 3. Validación de Inputs
- Números de teléfono: Formato E.164 requerido (+código país)
- Plantillas: Máximo 1024 caracteres
- Sin scripts maliciosos (XSS prevention)

### ✅ 4. Sanitización
- Todos los inputs son limpiados
- Prevención de inyección SQL
- Eliminación de HTML/scripts

### ✅ 5. Headers de Seguridad
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### ✅ 6. Ocultación de Credenciales
- `accessToken` ya NO se devuelve en GET `/api/whatsapp/config`
- Solo se devuelven datos no sensibles

### ✅ 7. Logging de Seguridad
- Intentos de autenticación fallidos
- Excesos de rate limit
- Actividad sospechosa

---

## 🚀 INTEGRACIÓN CON EL FRONTEND

Actualiza tu código frontend para incluir la API key:

### Ejemplo: Fetch Config
```typescript
const fetchConfig = async () => {
  const apiKey = localStorage.getItem('api_key');
  
  const res = await fetch("/api/whatsapp/config", {
    headers: {
      'X-API-Key': apiKey || ''
    }
  });
  
  if (res.status === 401) {
    toast.error("API key inválida. Por favor configura tu clave.");
    return;
  }
  
  if (res.ok) {
    const data = await res.json();
    setConfig(data);
  }
}
```

### Ejemplo: Enviar Mensaje
```typescript
const sendMessage = async (data) => {
  const apiKey = localStorage.getItem('api_key');
  
  const res = await fetch("/api/messages/bulk", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || ''
    },
    body: JSON.stringify(data)
  });
  
  if (res.status === 401) {
    toast.error("No autorizado. Verifica tu API key.");
    return;
  }
  
  if (res.status === 429) {
    toast.error("Demasiadas peticiones. Espera un momento.");
    return;
  }
  
  // ... resto del código
}
```

---

## 📱 VALIDACIÓN DE NÚMEROS DE TELÉFONO

Los números deben usar **formato E.164**:

### ✅ CORRECTO
```
+5215551234567  (México)
+14155552671    (USA)
+447975777666   (UK)
```

### ❌ INCORRECTO
```
5551234567      (sin código país)
+52 55 5123 4567 (con espacios)
(555) 123-4567  (formato local)
```

---

## 🔒 PRODUCCIÓN

### Antes de Lanzar a Producción:

1. **Genera una nueva API key** diferente a la de desarrollo
2. **Nunca expongas la API key** en el frontend públicamente
3. **Usa HTTPS** siempre (no HTTP)
4. **Configura CORS** apropiadamente
5. **Habilita logs** de auditoría
6. **Monitorea** intentos de acceso no autorizado

### Variables de Entorno en Producción
```env
# .env.production
API_SECRET_KEY=clave-super-secreta-diferente-de-desarrollo
TURSO_CONNECTION_URL=tu-url-de-produccion
TURSO_AUTH_TOKEN=tu-token-de-produccion
```

---

## 🆘 TROUBLESHOOTING

### Error 401: Unauthorized
- ✅ Verifica que la API key esté en `.env`
- ✅ Verifica que el header sea exactamente `X-API-Key`
- ✅ Reinicia el servidor después de cambiar `.env`

### Error 429: Too Many Requests
- ⏰ Espera 1 minuto
- 🔄 Los límites se resetean automáticamente

### Los números no se validan
- 📞 Usa formato E.164: `+código_país + número`
- Ejemplo: `+5215551234567`

---

## 📞 SOPORTE

Si tienes problemas:
1. Lee el reporte completo en `SECURITY_AUDIT_REPORT.md`
2. Ejecuta el test: `http://localhost:3000/api/security-test`
3. Revisa los logs del servidor en la consola

---

## ⚠️ RECORDATORIO FINAL

**SIN la API key configurada:**
- ❌ La aplicación NO funcionará
- ❌ Todas las peticiones fallarán con 401
- ❌ El frontend no podrá acceder a la API

**CON la API key configurada:**
- ✅ Aplicación funcional
- ✅ Protegida contra accesos no autorizados
- ✅ Rate limiting activo
- ✅ Datos sensibles ocultos

---

**¡IMPLEMENTA ESTOS CAMBIOS AHORA!** 🚀
