/**
 * Dashboard Stats Component
 * Muestra las estadísticas principales del panel admin
 */
import AppIcon from '@/components/ui/AppIcon'

interface StatsCardProps {
  title: string
  value: number
  icon: Parameters<typeof AppIcon>[0]['name']
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
        <div className={`rounded-xl p-2.5 ${bgColor} ${textColor}`}>
          <AppIcon name={icon} className="h-6 w-6" />
        </div>
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
        icon="briefcase"
        bgColor="bg-blue-50"
        textColor="text-blue-700"
      />
      <StatsCard
        title="Vacantes Activas"
        value={activeVacancies}
        icon="check-circle"
        bgColor="bg-green-50"
        textColor="text-green-700"
      />
      <StatsCard
        title="Postulaciones"
        value={totalApplications}
        icon="file"
        bgColor="bg-purple-50"
        textColor="text-purple-700"
      />
      <StatsCard
        title="Contactos Pendientes"
        value={pendingContacts}
        icon="mail"
        bgColor="bg-yellow-50"
        textColor="text-yellow-700"
      />
    </div>
  )
}
