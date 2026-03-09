# Configuración de Notificaciones por Email

Sistema de notificaciones automáticas implementado con [Resend](https://resend.com).

## 📧 Características

- **Notificaciones al Admin:**
  - Nueva postulación a vacante
  - Nuevo mensaje de contacto

- **Templates HTML profesionales:**
  - Diseño responsive
  - Colores de marca (azul para postulaciones, verde para contactos)
  - Información detallada del candidato/contacto
  - Botón de acceso directo al panel administrativo

- **Modo desarrollo:**
  - Sin API key configurada, los emails se simulan en consola
  - Útil para desarrollo sin configurar servicio externo

## 🚀 Configuración

### 1. Crear cuenta en Resend

1. Visita [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita (100 emails/día)
3. Verifica tu dominio o usa el dominio de prueba

### 2. Obtener API Key

1. Ve a **API Keys** en el dashboard de Resend
2. Crea una nueva API key
3. Copia la clave generada

### 3. Configurar variables de entorno

Agrega en tu archivo `.env`:

```bash
# Email Configuration - Resend
RESEND_API_KEY=re_tu_api_key_aqui
ADMIN_EMAIL=admin@tudominio.com
FROM_EMAIL=noreply@tudominio.com
```

**Variables:**
- `RESEND_API_KEY`: Tu API key de Resend
- `ADMIN_EMAIL`: Email donde se recibirán las notificaciones (default: admin@sparrhh.com)
- `FROM_EMAIL`: Email remitente que aparecerá en los emails (default: noreply@sparrhh.com)

### 4. Verificar dominio (Producción)

Para producción, necesitas verificar tu dominio en Resend:

1. Ve a **Domains** en el dashboard
2. Agrega tu dominio
3. Configura los registros DNS (SPF, DKIM, DMARC)
4. Espera la verificación

> **Nota**: En desarrollo puedes usar el dominio de prueba de Resend, pero los emails solo llegarán a direcciones verificadas.

## 📝 Tipos de Notificaciones

### Nueva Postulación

Se envía cuando un candidato se postula a una vacante.

**Información incluida:**
- Título de la vacante
- Nombre del candidato
- Email de contacto
- Teléfono
- LinkedIn (opcional)
- Carta de presentación (opcional)
- Enlace al panel administrativo

**Subject:** `📝 Nueva postulación para: [Título de Vacante]`

### Nuevo Contacto

Se envía cuando alguien usa el formulario de contacto.

**Información incluida:**
- Nombre
- Email de contacto
- Teléfono (opcional)
- Empresa/Asunto
- Mensaje
- Enlace al panel administrativo

**Subject:** `💬 Nuevo mensaje de contacto de: [Nombre]`

## 🧪 Testing

### Modo Desarrollo (sin API key)

Si no configuras `RESEND_API_KEY`, los emails se simularán:

```bash
# Console output
📧 Email no enviado (RESEND_API_KEY no configurada): {
  to: 'admin@sparrhh.com',
  subject: 'Nueva postulación: Desarrollador Full Stack',
  from: 'Juan Pérez'
}
```

### Probar con API key

1. Configura tu `.env` con la API key de Resend
2. Reinicia el servidor de desarrollo
3. Envía una postulación o mensaje de contacto
4. Verifica tu email

## 📊 Límites y Consideraciones

### Plan Gratuito de Resend

- **100 emails/día**
- **1 dominio verificado**
- **API key ilimitada**

Para mayor volumen, considera planes pagos.

### Mejores Prácticas

1. **No commits de API keys:** Nunca incluyas tu API key en el código
2. **Variables de entorno:** Siempre usa `.env` local y variables en producción
3. **Rate limiting:** Implementa validaciones para evitar spam
4. **Logs:** Monitorea los logs para detectar fallos en envío
5. **Testing:** Usa el modo desarrollo para evitar consumir cuota

## 🔧 Troubleshooting

### Los emails no llegan

1. Verifica que `RESEND_API_KEY` esté configurada correctamente
2. Revisa los logs de la consola para errores
3. Confirma que el dominio esté verificado (producción)
4. Verifica que `ADMIN_EMAIL` sea válida

### Error de autenticación

```
Error: Invalid API key
```

- Verifica que la API key sea correcta
- Asegúrate de que no tenga espacios extra
- Genera una nueva API key si es necesario

### Emails van a spam

- Verifica tu configuración de DNS (SPF, DKIM, DMARC)
- Usa un dominio profesional verificado
- Evita palabras spam en subject y contenido

## 📚 Recursos

- [Documentación de Resend](https://resend.com/docs)
- [Verificación de dominios](https://resend.com/docs/dashboard/domains/introduction)
- [Mejores prácticas](https://resend.com/docs/best-practices)
- [Status de Resend](https://status.resend.com)

## 🔄 Próximas Mejoras

- [ ] Email de confirmación al candidato
- [ ] Email de confirmación al contacto
- [ ] Templates personalizables desde el admin
- [ ] Notificaciones por cambio de estado
- [ ] Resumen diario de actividad
