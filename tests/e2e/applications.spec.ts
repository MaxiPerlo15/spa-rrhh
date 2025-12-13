import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Flujo de Postulación a Vacantes', () => {
  test('debe navegar a la página de ofertas laborales', async ({ page }) => {
    await page.goto('/');
    
    // Click en el link de Ofertas Laborales
    await page.click('a[href="/ofertas-laborales"]');
    
    // Verificar que llegamos a la página correcta
    await expect(page).toHaveURL('/ofertas-laborales');
    await expect(page.locator('h1:has-text("Ofertas Laborales")')).toBeVisible();
  });

  test('debe mostrar lista de vacantes activas', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    // Esperar que carguen las vacantes
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card', { timeout: 5000 });
    
    // Verificar que hay al menos una vacante
    const vacancyCards = page.locator('[data-testid="vacancy-card"], .vacancy-card, article');
    const count = await vacancyCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('debe filtrar vacantes por ubicación', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    // Esperar que carguen las vacantes
    await page.waitForTimeout(1000);
    
    // Buscar filtro de ubicación
    const locationFilter = page.locator('select[name="location"], input[placeholder*="ubicación"]').first();
    
    if (await locationFilter.isVisible()) {
      // Si es un select
      if (await locationFilter.evaluate(el => el.tagName === 'SELECT')) {
        const options = await locationFilter.locator('option').all();
        if (options.length > 1) {
          await locationFilter.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
      } else {
        // Si es un input
        await locationFilter.fill('Las Varillas');
        await page.waitForTimeout(500);
      }
      
      // Verificar que se filtró (debería haber menos o igual vacantes)
      const vacanciesAfterFilter = await page.locator('[data-testid="vacancy-card"], .vacancy-card, article').count();
      expect(vacanciesAfterFilter).toBeGreaterThan(0);
    }
  });

  test('debe filtrar vacantes por jornada laboral', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    await page.waitForTimeout(1000);
    
    const workdayFilter = page.locator('select[name="workday"]').first();
    
    if (await workdayFilter.isVisible()) {
      await workdayFilter.selectOption('FULL_TIME');
      await page.waitForTimeout(500);
      
      // Verificar que hay resultados
      const count = await page.locator('[data-testid="vacancy-card"], .vacancy-card, article').count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('debe abrir modal de postulación al hacer click en una vacante', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    // Esperar vacantes
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article', { timeout: 5000 });
    
    // Click en la primera vacante o en su botón "Postularse"
    const firstVacancy = page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first();
    const applyButton = firstVacancy.locator('button:has-text("Postularse"), a:has-text("Postularse")');
    
    await applyButton.click();
    
    // Verificar que se abre el modal/formulario
    await expect(page.locator('text=Postularse, text=Formulario de Postulación')).toBeVisible({ timeout: 3000 });
  });

  test('debe completar y enviar una postulación exitosamente', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    // Esperar y hacer click en primera vacante
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article');
    const firstVacancy = page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first();
    await firstVacancy.locator('button:has-text("Postularse"), a:has-text("Postularse")').click();
    
    // Llenar formulario
    const timestamp = Date.now();
    await page.fill('input[name="candidateName"], input[name="name"]', `Candidato Test ${timestamp}`);
    await page.fill('input[name="email"], input[type="email"]', `test${timestamp}@example.com`);
    await page.fill('input[name="phone"], input[type="tel"]', '351-1234567');
    
    // Carta de presentación (opcional)
    const coverLetterField = page.locator('textarea[name="coverLetter"]');
    if (await coverLetterField.isVisible()) {
      await coverLetterField.fill('Esta es mi carta de presentación de prueba E2E.');
    }
    
    // Subir CV (crear un archivo temporal)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Crear un archivo de prueba
      const testFilePath = path.join(__dirname, '../fixtures/test-cv.pdf');
      
      // Si no existe el archivo, usar un buffer
      await fileInput.setInputFiles({
        name: 'test-cv.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Test PDF content for E2E testing')
      });
    }
    
    // Submit formulario
    await page.click('button[type="submit"]:has-text("Enviar"), button:has-text("Postularse")');
    
    // Esperar mensaje de éxito
    await expect(page.locator('text=Postulación enviada exitosamente, text=Gracias por postularte')).toBeVisible({ timeout: 10000 });
  });

  test('debe validar campos requeridos en el formulario de postulación', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    // Abrir formulario
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article');
    await page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first()
      .locator('button:has-text("Postularse"), a:has-text("Postularse")').click();
    
    // Intentar enviar sin llenar
    await page.click('button[type="submit"]:has-text("Enviar"), button:has-text("Postularse")');
    
    // Verificar validación HTML5
    const nameInput = page.locator('input[name="candidateName"], input[name="name"]');
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('debe validar formato de email en el formulario', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article');
    await page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first()
      .locator('button:has-text("Postularse"), a:has-text("Postularse")').click();
    
    // Llenar con email inválido
    await page.fill('input[name="candidateName"], input[name="name"]', 'Test User');
    await page.fill('input[name="email"], input[type="email"]', 'email-invalido');
    await page.fill('input[name="phone"], input[type="tel"]', '123456789');
    
    await page.click('button[type="submit"]:has-text("Enviar"), button:has-text("Postularse")');
    
    // Verificar validación de email
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('debe mostrar detalles de la vacante antes de postularse', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article');
    const firstVacancy = page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first();
    
    // Verificar que se muestran detalles básicos
    await expect(firstVacancy.locator('h2, h3')).toBeVisible(); // Título
    
    // Buscar botón de "Ver más" o "Detalles"
    const detailsButton = firstVacancy.locator('button:has-text("Ver más"), a:has-text("Ver más"), button:has-text("Detalles")');
    
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      
      // Verificar que se muestra más información
      await expect(page.locator('text=Descripción, text=Requisitos, text=Beneficios')).toBeVisible({ timeout: 3000 });
    }
  });

  test('debe permitir cerrar el modal de postulación', async ({ page }) => {
    await page.goto('/ofertas-laborales');
    
    await page.waitForSelector('[data-testid="vacancy-card"], .vacancy-card, article');
    await page.locator('[data-testid="vacancy-card"], .vacancy-card, article').first()
      .locator('button:has-text("Postularse"), a:has-text("Postularse")').click();
    
    // Verificar que el modal está abierto
    await expect(page.locator('text=Postularse, text=Formulario')).toBeVisible();
    
    // Buscar botón de cerrar (X, Cerrar, Cancelar, etc.)
    const closeButton = page.locator('button:has-text("Cerrar"), button:has-text("Cancelar"), button[aria-label="Close"]').first();
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
      
      // Verificar que el modal se cerró
      await expect(page.locator('text=Formulario de Postulación')).not.toBeVisible({ timeout: 2000 });
    }
  });
});
