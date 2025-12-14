/**
 * Dashboard Stats Component
 * Muestra las estadísticas principales del panel admin
 */

interface StatsCardProps {
  title: string
  value: number
  icon: string
  bgColor: string
  textColor: string
}

function StatsCard({ title, value, icon, bgColor, textColor }: StatsCardProps) {
  return (
    <div className={`${bgColor} rounded-xl shadow-md p-6 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textColor} mb-1`}>{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

interface DashboardStatsProps {
  totalVacancies: number
  activeVacancies: number
  totalApplications: number
  pendingContacts: number
}

export default function DashboardStats({
  totalVacancies,
  activeVacancies,
  totalApplications,
  pendingContacts
}: DashboardStatsProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Total Vacantes"
        value={totalVacancies}
        icon="💼"
        bgColor="bg-blue-50"
        textColor="text-blue-700"
      />
      <StatsCard
        title="Vacantes Activas"
        value={activeVacancies}
        icon="✅"
        bgColor="bg-green-50"
        textColor="text-green-700"
      />
      <StatsCard
        title="Postulaciones"
        value={totalApplications}
        icon="📝"
        bgColor="bg-purple-50"
        textColor="text-purple-700"
      />
      <StatsCard
        title="Contactos Pendientes"
        value={pendingContacts}
        icon="📧"
        bgColor="bg-yellow-50"
        textColor="text-yellow-700"
      />
    </div>
  )
}
