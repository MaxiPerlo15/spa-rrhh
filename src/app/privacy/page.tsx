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
          <p className="mb-4 text-sm text-gray-500">Última actualización: 13 de febrero de 2026</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Responsable del tratamiento</h2>
              <p>
                Meinardi&Perlo RRHH es responsable del tratamiento de los datos personales recabados
                a través de este sitio web. Para consultas sobre privacidad puedes escribir a{' '}
                <a className="text-primary-500 hover:text-primary-600" href="mailto:mperloing@gmail.com">
                  mperloing@gmail.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Datos personales que tratamos</h2>
              <p>
                Dependiendo de la interacción, podemos tratar:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Datos de identificación y contacto: nombre, email, teléfono.</li>
                <li>Datos profesionales aportados en postulaciones: CV y antecedentes laborales.</li>
                <li>Datos de consultas: asunto y mensaje enviados desde el formulario de contacto.</li>
                <li>Datos técnicos mínimos de seguridad y operación del panel administrativo.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Finalidades del tratamiento</h2>
              <p>
                Tratamos datos personales para:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Gestionar procesos de selección, preselección y contacto con candidatos.</li>
                <li>Responder consultas comerciales y operativas enviadas por el formulario de contacto.</li>
                <li>Administrar y proteger el panel interno de gestión de vacantes, postulaciones y contactos.</li>
                <li>Cumplir obligaciones legales y atender requerimientos administrativos o regulatorios.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Bases legales</h2>
              <p>
                Las bases legales aplicables son: consentimiento del titular al enviar formularios, ejecución de
                acciones precontractuales vinculadas a oportunidades laborales, interés legítimo en seguridad
                operativa del servicio y cumplimiento de obligaciones legales.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Conservación de datos</h2>
              <p>
                Conservamos los datos durante el tiempo necesario para cumplir las finalidades indicadas y por el
                plazo que exijan obligaciones legales o de defensa de derechos. Una vez vencidos esos plazos,
                aplicamos medidas de eliminación o anonimización cuando corresponda.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Destinatarios y encargados</h2>
              <p>
                No comercializamos datos personales. Podemos compartir información con proveedores tecnológicos
                estrictamente necesarios para operar el servicio (por ejemplo: correo transaccional, almacenamiento
                de CV, monitoreo de errores y hosting), bajo obligaciones de confidencialidad y seguridad.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Seguridad de la información</h2>
              <p>
                Aplicamos medidas técnicas y organizativas razonables para proteger los datos frente a accesos no
                autorizados, alteración, pérdida o divulgación indebida. Ningún sistema es absolutamente invulnerable,
                pero revisamos y mejoramos los controles de forma continua.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Derechos de los titulares</h2>
              <p className="mb-4">
                Puedes solicitar acceso, rectificación, actualización, supresión y, cuando corresponda, oposición o
                limitación del tratamiento. También puedes revocar el consentimiento otorgado para finalidades basadas
                en consentimiento.
              </p>
              <p>
                Para ejercer estos derechos, escríbenos a{' '}
                <a className="text-primary-500 hover:text-primary-600" href="mailto:mperloing@gmail.com">
                  mperloing@gmail.com
                </a>{' '}
                indicando tu solicitud y un medio de contacto para responder.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Cookies y tecnologías similares</h2>
              <p className="mb-4">
                Usamos cookies técnicas/esenciales para autenticación y seguridad del panel administrativo. No
                utilizamos actualmente cookies de marketing ni perfilado.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Cookie</th>
                      <th className="px-4 py-3 font-semibold">Finalidad</th>
                      <th className="px-4 py-3 font-semibold">Categoría</th>
                      <th className="px-4 py-3 font-semibold">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    <tr>
                      <td className="px-4 py-3 font-medium">__Secure-next-auth.session-token / next-auth.session-token</td>
                      <td className="px-4 py-3">Mantener sesión autenticada de administradores.</td>
                      <td className="px-4 py-3">Esencial</td>
                      <td className="px-4 py-3">Hasta 8 horas (según configuración de sesión).</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">next-auth.csrf-token</td>
                      <td className="px-4 py-3">Protección CSRF en flujos de autenticación.</td>
                      <td className="px-4 py-3">Esencial</td>
                      <td className="px-4 py-3">Sesión/rotación automática.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">next-auth.callback-url</td>
                      <td className="px-4 py-3">Recordar URL de retorno durante login.</td>
                      <td className="px-4 py-3">Esencial</td>
                      <td className="px-4 py-3">Sesión.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Cambios en esta política</h2>
              <p>
                Podemos actualizar esta política para reflejar cambios normativos, operativos o tecnológicos.
                Publicaremos la fecha de última actualización al inicio del documento.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
