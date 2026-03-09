# Configuración de Base de Datos

## Seed de Datos Iniciales

El proyecto incluye un script de seed que inicializa la base de datos con datos esenciales.

### Contenido del Seed

1. **Usuario Administrador inicial**: Crea/actualiza un admin base para acceder al panel de administración
2. **Vacantes de Ejemplo**: Crea 5 vacantes de muestra (opcional, solo en desarrollo)

### Ejecutar el Seed

#### Desarrollo Local

```bash
# Ejecutar seed (requiere DATABASE_URL en .env)
npm run db:seed

# Verificar que el admin fue creado
npm run db:verify

# Reset completo de DB + seed
npm run db:reset
```

#### Variables de Entorno

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/spa_rrhh_db"

# Opcional: Personalizar admin inicial
ADMIN_EMAIL="admin@tuempresa.com"    # Default: admin@sparrhh.com
ADMIN_PASSWORD="TuPasswordSegura123"  # Default: ChangeMe123!
```

### Admins adicionales

Para agregar administradores extra sin UI de gestión:

```bash
npm run admin:create -- --email admin2@tuempresa.com --password "TuPasswordSegura123!" --name "Admin Dos"
```

Notas:
- cualquier usuario con `role = ADMIN` en base puede iniciar sesión;
- `ADMIN_EMAIL` ya no limita el acceso a una única cuenta;
- el seed sigue creando solo un admin inicial por compatibilidad operativa.

### Credenciales por Defecto

**⚠️ SOLO para desarrollo/testing:**

- **Email**: `admin@sparrhh.com`
- **Password**: `ChangeMe123!`

### Producción

**IMPORTANTE**: En producción **SIEMPRE** define `ADMIN_PASSWORD` en las variables de entorno:

```bash
# Producción (Vercel, Railway, etc.)
ADMIN_PASSWORD="UnPasswordMuySeguroYComplejo123!"
ADMIN_EMAIL="admin@tudominio.com"
```

### Verificación

1. Ejecuta el seed:
   ```bash
   npm run db:seed
   ```

2. Deberías ver:
   ```
   🌱 Iniciando seed de la base de datos...
   ✅ Usuario admin creado/actualizado: admin@sparrhh.com
   ✅ Creadas 5 vacantes
   🎉 Seed completado exitosamente!
   ```

3. Inicia sesión en `/admin/signin` con cualquiera de las credenciales admin configuradas

### Troubleshooting

#### Error: "DATABASE_URL environment variable is required"

Asegúrate de tener el archivo `.env` con `DATABASE_URL` configurado.

#### Error de conexión a PostgreSQL

Verifica que PostgreSQL esté ejecutándose:

```bash
# macOS
brew services list | grep postgresql

# Iniciar PostgreSQL si está detenido
brew services start postgresql@16
```

#### El admin ya existe

El seed usa `createOrUpdateAdminUser`, por lo que:
- Si el admin inicial existe: actualiza la contraseña
- Si no existe: lo crea

### CI/CD

En GitHub Actions, el seed se ejecuta automáticamente después de las migraciones de Prisma cuando se configura en `package.json` con:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Seguridad

- ✅ Las contraseñas se hashean con bcrypt (10 salt rounds)
- ✅ El seed valida que exista `DATABASE_URL`
- ✅ Muestra advertencia si se usa contraseña por defecto
- ⚠️ Nunca commitees contraseñas en el código
- ⚠️ Usa secrets/variables de entorno en producción
