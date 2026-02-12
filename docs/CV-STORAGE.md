# Almacenamiento de CVs con UploadThing

Sistema de subida y almacenamiento seguro de currículums implementado con [UploadThing](https://uploadthing.com).

## 📦 Características

- **Subida segura**: Presigned URLs generadas por UploadThing
- **Validación automática**: Solo archivos PDF, máximo 4MB
- **URLs públicas**: Accesibles vía CDN con alta disponibilidad
- **Componente React**: Upload button con preview y estados
- **CTA visible**: estilos base de UploadThing cargados globalmente
- **Integración completa**: Desde formulario hasta descarga en admin panel

## 🚀 Configuración

### 1. Crear cuenta en UploadThing

1. Visita [https://uploadthing.com](https://uploadthing.com)
2. Sign up con GitHub o email
3. Crea un nuevo proyecto
4. Ve al dashboard

### 2. Obtener Token de API (SDK v7+)

1. En el dashboard, ve a **API Keys**
2. Copia tu **Token** (empieza con `eyJ...`)
3. **No uses** las credenciales legacy (App ID + Secret)

### 3. Configurar variables de entorno

Agrega en tu archivo `.env`:

```bash
# File Upload - UploadThing
UPLOADTHING_TOKEN=eyJhcGlLZXkiOiJ0dV90b2tlbl9hcXVp...
```

### 4. Reiniciar servidor

```bash
npm run dev
```

## 📁 Estructura de Archivos

```
src/
├── app/
│   └── api/
│       └── uploadthing/
│           ├── core.ts          # Configuración del file router
│           └── route.ts         # Route handler (GET, POST)
├── components/
│   └── PostularForm.tsx         # Componente con UploadButton
└── lib/
    ├── uploadthing.ts           # Cliente de UploadThing (helpers)
    └── uploadPolicy.ts          # Política centralizada de upload
```

## 🔧 Configuración Técnica

### File Router (`src/app/api/uploadthing/core.ts`)

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 }
  })
    .onUploadComplete(async ({ file }) => {
      console.log("📄 CV subido:", file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

**Configuración:**
- **Tipo de archivo**: Solo PDF
- **Tamaño máximo**: 4MB
- **Cantidad**: 1 archivo por upload
- **Callback**: `onUploadComplete` se ejecuta cuando termina la subida
- **Fuente de verdad**: `src/lib/uploadPolicy.ts`

### Estilos base requeridos

Para asegurar que el botón de UploadThing sea visible en todos los navegadores soportados, importar en el layout raíz:

```tsx
import "@uploadthing/react/styles.css";
```

### Route Handler (`src/app/api/uploadthing/route.ts`)

```typescript
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

Expone los endpoints:
- **POST** `/api/uploadthing`: Para subir archivos
- **GET** `/api/uploadthing`: Para polling de estado

### Cliente (`src/lib/uploadthing.ts`)

```typescript
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
```

Genera componentes React type-safe basados en tu router.

## 🎨 Uso en Componentes

### En el Formulario de Postulación

```typescript
import { UploadButton } from '@/lib/uploadthing'

export default function PostularForm() {
  const [resumeInfo, setResumeInfo] = useState<{
    url: string
    name: string
    key: string
  } | null>(null)

  return (
    <UploadButton
      endpoint="resumeUploader"
      onClientUploadComplete={(res) => {
        if (res && res[0]) {
          setResumeInfo({
            url: res[0].url,      // URL pública del archivo
            name: res[0].name,    // Nombre original
            key: res[0].key       // Key de UploadThing (para eliminar)
          })
          showSuccess('CV subido exitosamente')
        }
      }}
      onUploadError={(error: Error) => {
        showError(getResumeUploadErrorMessage(error.message))
      }}
    />
  )
}
```

### En el Panel Admin

```typescript
const handleDownloadCV = (application: Application) => {
  if (!application.resumeUrl) return
  
  const link = document.createElement('a')
  link.href = application.resumeUrl
  link.download = application.resumeFileName || 'cv.pdf'
  link.target = '_blank'
  link.click()
}
```

## 💾 Almacenamiento en Base de Datos

### Schema de Prisma

```prisma
model Application {
  id              String   @id @default(cuid())
  // ...otros campos
  resumeUrl       String?   // URL pública del CV
  resumeFileName  String?   // Nombre original del archivo
  resumeKey       String?   // Key de UploadThing (para eliminar)
  // ...
}
```

### Datos Guardados

```typescript
{
  resumeUrl: "https://utfs.io/f/abc123def456.pdf",
  resumeFileName: "CV_Juan_Perez.pdf",
  resumeKey: "abc123def456"
}
```

## 📊 Formato de URLs

Las URLs generadas por UploadThing tienen este formato:

```
https://utfs.io/f/{fileKey}
```

**Características:**
- ✅ Públicas (sin autenticación requerida)
- ✅ Permanentes (no expiran)
- ✅ CDN (alta velocidad de descarga)
- ✅ HTTPS (conexión segura)

## 🔒 Seguridad

### Validaciones Implementadas

1. **Tipo de archivo**: Solo PDF permitido
2. **Tamaño máximo**: 4MB por archivo
3. **Cantidad**: Máximo 1 archivo por upload
4. **Server-side**: Validación en el file router
5. **Feedback UX**: Mensajes claros para tipo inválido y exceso de tamaño

### Mejores Prácticas

- ✅ **No almacenar en base64**: Usa URLs en su lugar
- ✅ **Guardar el key**: Para poder eliminar archivos después
- ✅ **Validar en frontend**: Mejora UX antes de subir
- ✅ **Validar en backend**: Nunca confiar solo en el frontend
- ✅ **Manejar errores**: Informar al usuario si falla la subida

## 📈 Límites del Plan Gratuito

| Recurso | Límite |
|---------|--------|
| Almacenamiento | 2 GB |
| Uploads/mes | 2 GB |
| Tamaño máx. archivo | 16 MB |
| Requests/mes | Ilimitado |

Para mayor capacidad, ver [planes de pago](https://uploadthing.com/pricing).

## 🧪 Testing

### Modo Desarrollo (sin token)

Si no configuras `UPLOADTHING_TOKEN`, verás un error al intentar subir:

```
Error: Missing token
```

### Testing con Token

1. Configura tu token en `.env`
2. Reinicia el servidor
3. Ve a `/` (landing page)
4. Haz clic en "Postularme" en cualquier vacante
5. Sube un PDF de prueba
6. Verifica que:
   - ✅ El archivo se sube correctamente
   - ✅ Aparece el preview con nombre
   - ✅ Se guarda en la base de datos
   - ✅ Puedes descargarlo desde el admin panel

## 🔧 Troubleshooting

### Error: "Missing token"

```
Error: Missing token. Pass it to the constructor
```

**Solución:**
1. Verifica que `UPLOADTHING_TOKEN` esté en `.env`
2. Reinicia el servidor de desarrollo
3. Asegúrate de usar el token v7 (no App ID/Secret legacy)

### Error: "File too large"

```
Error: File size exceeds maximum of 4MB
```

**Solución:**
- El archivo excede 4MB
- Comprime el PDF o ajusta `maxFileSize` en `core.ts`

### Error: "Invalid file type"

```
Error: File type not allowed
```

**Solución:**
- Solo se permiten archivos PDF
- Verifica que el archivo tenga extensión `.pdf`

### El archivo se sube pero no se guarda en BD

**Posibles causas:**
1. Error en el API route de applications
2. Validación fallando en el backend
3. resumeUrl no se está enviando correctamente

**Solución:**
- Revisa los logs del servidor
- Verifica que `resumeUrl` esté en `CreateApplicationData`
- Asegúrate de que Prisma tenga los campos correctos

## 📚 Recursos

- [Documentación de UploadThing](https://docs.uploadthing.com)
- [SDK v7 Migration Guide](https://docs.uploadthing.com/migration-guides/v7)
- [Next.js App Router Setup](https://docs.uploadthing.com/getting-started/appdir)
- [API Reference](https://docs.uploadthing.com/api-reference)

## 🔄 Próximas Mejoras

- [ ] Eliminar archivos cuando se borra una postulación
- [ ] Soporte para más formatos (DOC, DOCX)
- [ ] Compresión automática de archivos grandes
- [ ] Preview de PDF en el admin panel
- [ ] Historial de versiones de CV
- [ ] Limpieza automática de archivos huérfanos
