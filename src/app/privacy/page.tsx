import type { Metadata } from 'next'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Privacidad | Meinardi&Perlo RRHH',
  description: 'Conoce cómo tratamos, almacenamos y protegemos tus datos personales en Meinardi&Perlo RRHH.'
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="section-padding">
        <section className="container-custom max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">Política de Privacidad</h1>
          <p className="mb-4 text-sm text-gray-500">Última actualización: 11 de febrero de 2026</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Datos que recopilamos</h2>
              <p>
                Podemos recopilar datos de identificación y contacto (nombre, email, teléfono), información
                profesional compartida en postulaciones (incluyendo CV) y el contenido de mensajes enviados
                mediante formularios del sitio.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Finalidad del tratamiento</h2>
              <p>
                Tratamos tus datos para gestionar procesos de selección, responder consultas, mejorar la calidad
                del servicio y cumplir obligaciones legales o contractuales asociadas a nuestra actividad.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Base legal y conservación</h2>
              <p>
                La base legal del tratamiento es tu consentimiento al enviar formularios y/o la ejecución de
                acciones precontractuales relacionadas con búsquedas laborales. Conservamos los datos solo durante
                el tiempo necesario para dichas finalidades o para cumplir obligaciones legales.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Compartición de datos</h2>
              <p>
                No vendemos datos personales. Podemos compartirlos con proveedores tecnológicos que operan como
                encargados de tratamiento (por ejemplo, servicios de correo, monitoreo y almacenamiento) bajo
                medidas de seguridad adecuadas.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Seguridad</h2>
              <p>
                Aplicamos controles técnicos y organizativos para proteger los datos contra accesos no autorizados,
                alteraciones, pérdida o divulgación indebida.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Tus derechos</h2>
              <p>
                Puedes solicitar acceso, rectificación, actualización o eliminación de tus datos personales, así
                como revocar tu consentimiento cuando corresponda.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Contacto</h2>
              <p>
                Para consultas sobre privacidad o ejercicio de derechos, contáctanos en{' '}
                <a className="text-primary-500 hover:text-primary-600" href="mailto:mperloing@gmail.com">
                  mperloing@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
