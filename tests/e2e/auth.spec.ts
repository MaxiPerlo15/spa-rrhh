import { test, expect } from '@playwright/test';

test.describe('Autenticación Admin', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpiar cookies y storage antes de cada test
    await context.clearCookies();
    await page.goto('/admin/signin');
  });

  test('debe mostrar la página de login correctamente', async ({ page }) => {
    // Verificar que los elementos estén presentes
    await expect(page.locator('h1')).toContainText('Panel Administrativo');
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    // Llenar formulario con credenciales incorrectas
    await page.fill('input[name="email"], input[type="email"]', 'usuario@invalido.com');
    await page.fill('input[name="password"], input[type="password"]', 'passwordIncorrecto');
    
    // Submit el formulario
    await page.click('button[type="submit"]');
    
    // Esperar mensaje de error
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible({ timeout: 5000 });
    
    // Verificar que sigue en la página de login
    await expect(page).toHaveURL(/\/admin\/signin/);
  });

  test('debe iniciar sesión exitosamente con credenciales válidas', async ({ page }) => {
    // Usar las credenciales del seed
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sparrhh.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    // Llenar formulario
    await page.fill('input[name="email"], input[type="email"]', adminEmail);
    await page.fill('input[name="password"], input[type="password"]', adminPassword);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Esperar redirección al panel admin
    await expect(page).toHaveURL('/admin', { timeout: 10000 });
    
    // Verificar que se muestra el panel de admin
    await expect(page.locator('text=Panel de Administración')).toBeVisible();
  });

  test('debe redirigir a /admin si ya está autenticado', async ({ page }) => {
    // Primero hacer login
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sparrhh.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    await page.fill('input[name="email"], input[type="email"]', adminEmail);
    await page.fill('input[name="password"], input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin', { timeout: 10000 });
    
    // Ahora intentar ir a /admin/signin de nuevo (sin limpiar cookies)
    await page.goto('/admin/signin');
    
    // Debe redirigir automáticamente a /admin o quedarse en /admin
    // Nota: Esto depende de la implementación del middleware
    await page.waitForTimeout(1000);
    const currentURL = page.url();
    
    // Verificar que NO está en signin (o que fue redirigido a /admin)
    expect(currentURL).not.toContain('/signin');
  });

  test('debe validar que el email sea requerido', async ({ page }) => {
    // Intentar submit sin email
    await page.fill('input[name="password"], input[type="password"]', 'alguPassword');
    await page.click('button[type="submit"]');
    
    // Verificar validación HTML5
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('debe validar formato de email', async ({ page }) => {
    // Llenar email con formato inválido
    await page.fill('input[name="email"], input[type="email"]', 'no-es-un-email');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Verificar validación HTML5
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });
});
