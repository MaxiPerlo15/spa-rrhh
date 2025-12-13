import { test, expect } from '@playwright/test';

// Helper para hacer login antes de tests que requieren autenticación
async function loginAsAdmin(page: unknown) {
  await page.goto('/admin/signin');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sparrhh.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  
  await page.fill('input[name="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin', { timeout: 10000 });
}

test.describe('CRUD de Vacantes - Panel Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await loginAsAdmin(page);
  });

  test('debe mostrar la lista de vacantes en el panel admin', async ({ page }) => {
    // Verificar que estamos en el panel admin
    await expect(page.locator('text=Panel de Administración')).toBeVisible();
    
    // Click en tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Verificar que se muestra la tabla de vacantes
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Título")')).toBeVisible();
    await expect(page.locator('th:has-text("Ubicación")')).toBeVisible();
    await expect(page.locator('th:has-text("Estado")')).toBeVisible();
  });

  test('debe crear una nueva vacante', async ({ page }) => {
    // Ir a tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Click en botón Nueva Vacante
    await page.click('button:has-text("Nueva Vacante")');
    
    // Verificar que se muestra el formulario
    await expect(page.locator('text=Crear Nueva Vacante')).toBeVisible();
    
    // Llenar formulario
    const timestamp = Date.now();
    const vacancyTitle = `Test Vacancy ${timestamp}`;
    
    await page.fill('input[name="title"]', vacancyTitle);
    await page.fill('textarea[name="description"]', 'Descripción de prueba para vacante E2E');
    await page.fill('input[name="location"]', 'Las Varillas, Córdoba');
    
    // Seleccionar opciones
    await page.selectOption('select[name="workday"]', 'FULL_TIME');
    await page.selectOption('select[name="modality"]', 'HYBRID');
    
    await page.fill('input[name="salary"]', '$1,000,000 - $1,500,000');
    await page.fill('textarea[name="requirements"]', 'Requisitos de prueba');
    await page.fill('textarea[name="benefits"]', 'Beneficios de prueba');
    
    // Submit formulario
    await page.click('button[type="submit"]:has-text("Crear")');
    
    // Esperar mensaje de éxito
    await expect(page.locator('text=Vacante creada exitosamente')).toBeVisible({ timeout: 5000 });
    
    // Verificar que aparece en la lista
    await expect(page.locator(`text=${vacancyTitle}`)).toBeVisible();
  });

  test('debe editar una vacante existente', async ({ page }) => {
    // Ir a tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Esperar que cargue la tabla
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Click en botón Editar de la primera vacante
    await page.click('table tbody tr:first-child button:has-text("Editar")');
    
    // Verificar que se muestra el formulario de edición
    await expect(page.locator('text=Editar Vacante')).toBeVisible();
    
    // Modificar el título
    const newTitle = `Vacante Editada ${Date.now()}`;
    await page.fill('input[name="title"]', newTitle);
    
    // Submit
    await page.click('button[type="submit"]:has-text("Actualizar")');
    
    // Esperar mensaje de éxito
    await expect(page.locator('text=Vacante actualizada exitosamente')).toBeVisible({ timeout: 5000 });
    
    // Verificar que el nuevo título aparece
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
  });

  test('debe cambiar el estado de una vacante (ACTIVE ↔ CLOSED)', async ({ page }) => {
    // Ir a tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Esperar tabla
    await page.waitForSelector('table tbody tr');
    
    // Obtener el estado actual de la primera vacante
    const firstRow = page.locator('table tbody tr:first-child');
    const currentStatusBadge = firstRow.locator('span.badge');
    const currentStatus = await currentStatusBadge.textContent();
    
    // Click en botón de cambio de estado
    const toggleButton = currentStatus?.includes('Activa') 
      ? 'button:has-text("Cerrar")' 
      : 'button:has-text("Activar")';
    
    await firstRow.locator(toggleButton).click();
    
    // Confirmar en el diálogo
    page.on('dialog', dialog => dialog.accept());
    
    // Esperar cambio (el badge debe cambiar)
    await page.waitForTimeout(1000); // Pequeña espera para ver el cambio
    
    const newStatus = await currentStatusBadge.textContent();
    expect(newStatus).not.toBe(currentStatus);
  });

  test('debe eliminar una vacante con confirmación', async ({ page }) => {
    // Primero crear una vacante para eliminar
    await page.click('button:has-text("Vacantes")');
    await page.click('button:has-text("Nueva Vacante")');
    
    const vacancyToDelete = `Vacante a Eliminar ${Date.now()}`;
    await page.fill('input[name="title"]', vacancyToDelete);
    await page.fill('textarea[name="description"]', 'Esta vacante será eliminada');
    await page.fill('input[name="location"]', 'Test Location');
    await page.selectOption('select[name="workday"]', 'FULL_TIME');
    await page.selectOption('select[name="modality"]', 'REMOTE');
    
    await page.click('button[type="submit"]:has-text("Crear")');
    await expect(page.locator(`text=${vacancyToDelete}`)).toBeVisible();
    
    // Ahora eliminarla
    const rowWithVacancy = page.locator(`tr:has-text("${vacancyToDelete}")`);
    
    // Setup para aceptar el diálogo de confirmación
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('eliminar');
      dialog.accept();
    });
    
    await rowWithVacancy.locator('button:has-text("Eliminar")').click();
    
    // Esperar mensaje de éxito
    await expect(page.locator('text=Vacante eliminada exitosamente')).toBeVisible({ timeout: 5000 });
    
    // Verificar que ya no está en la lista
    await expect(page.locator(`text=${vacancyToDelete}`)).not.toBeVisible();
  });

  test('debe paginar correctamente la lista de vacantes', async ({ page }) => {
    // Ir a tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Esperar tabla
    await page.waitForSelector('table tbody tr');
    
    // Contar filas en página 1
    const rowsPage1 = await page.locator('table tbody tr').count();
    expect(rowsPage1).toBeGreaterThan(0);
    expect(rowsPage1).toBeLessThanOrEqual(10); // Máximo 10 por página
    
    // Si hay paginación, probar navegación
    const nextButton = page.locator('button:has-text("Siguiente")');
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      
      // Esperar que cambie el contenido
      await page.waitForTimeout(500);
      
      // Verificar que hay filas en página 2
      const rowsPage2 = await page.locator('table tbody tr').count();
      expect(rowsPage2).toBeGreaterThan(0);
      
      // Volver a página 1
      await page.click('button:has-text("Anterior")');
      await page.waitForTimeout(500);
    }
  });

  test('debe buscar vacantes por título', async ({ page }) => {
    // Ir a tab de Vacantes
    await page.click('button:has-text("Vacantes")');
    
    // Si hay input de búsqueda
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    if (await searchInput.isVisible()) {
      // Obtener el título de la primera vacante
      const firstVacancyTitle = await page.locator('table tbody tr:first-child td:first-child').textContent();
      
      // Buscar por ese título
      await searchInput.fill(firstVacancyTitle || '');
      await page.waitForTimeout(500); // Esperar debounce
      
      // Verificar que se muestra ese resultado
      await expect(page.locator(`text=${firstVacancyTitle}`)).toBeVisible();
    }
  });
});
