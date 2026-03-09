'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useToast } from '@/contexts/ToastContext'
import ConfirmDialog from '@/components/ConfirmDialog'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs'
import DashboardStats from '@/components/admin/DashboardStats'
import AdminOnboardingDialog from '@/components/admin/AdminOnboardingDialog'
import AdminVacanciesSection from '@/components/admin/sections/AdminVacanciesSection'
import AdminApplicationsSection from '@/components/admin/sections/AdminApplicationsSection'
import AdminContactsSection from '@/components/admin/sections/AdminContactsSection'
import AdminSettingsSection from '@/components/admin/sections/AdminSettingsSection'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { useMobileKeyboardAssist } from '@/hooks/useMobileKeyboardAssist'
import type { Vacancy } from '@/lib/api/vacancies'
import type { Application } from '@/lib/api/applications'
import { downloadApplicationsCsv } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import * as Sentry from '@sentry/nextjs'

const ONBOARDING_STORAGE_KEY = 'admin_onboarding_completed_v1'
type TourTarget =
  | 'tabs'
  | 'create-vacancy'
  | 'vacancy-modal'
  | 'vacancy-toggle-btn'
  | 'vacancy-edit-btn'
  | 'vacancy-delete-btn'
  | 'applications-filters'
  | 'application-view-btn'
  | 'application-detail-modal'
  | 'application-cv-btn'
  | 'contacts-table'
  | 'contact-view-btn'
  | 'contact-detail-modal'
type TutorialKind = 'vacancies' | 'applications' | 'contacts'
type NotificationLevel = 'info' | 'success' | 'warning'
type NotificationLevelApi = 'INFO' | 'SUCCESS' | 'WARNING'

interface AdminNotification {
  id: string
  title: string
  message: string
  level: NotificationLevel
  createdAt: string
  isRead: boolean
  action?: {
    label: string
    type: 'VACANCY' | 'APPLICATION' | 'CONTACT'
    resourceId: string
  }
}

const NOTIFICATIONS_PAGE_LIMIT = 50
const ADMIN_TABLE_STATE_STORAGE_KEY = 'admin_dashboard_table_state_v1'

type VacancySortKey = 'createdAt' | 'title' | 'location' | 'status'
type ApplicationSortKey = 'submittedAt' | 'candidateName' | 'status'
type ContactSortKey = 'createdAt' | 'name' | 'status'
type SortDirection = 'asc' | 'desc'
type ConfirmDialogConfig = {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  closeOnBackdropClick?: boolean
  type?: 'danger' | 'warning' | 'info'
}

type AdminSettingsResponse = {
  profile: {
    id: string
    email: string
    name: string
    role: string
  }
  preferences: {
    notificationsEnabled: boolean
    notifyNewApplications: boolean
    notifyNewContacts: boolean
    notifySecurityAlerts: boolean
  }
  updatedAt: string
}

type AdminAuditLogItem = {
  id: string
  actorEmail: string | null
  action: string
  resourceType: string
  resourceId: string | null
  outcome: 'SUCCESS' | 'DENIED' | 'ERROR'
  metadata: unknown
  createdAt: string
}

type AdminAuditResponse = {
  items: AdminAuditLogItem[]
  pagination: {
    page: number
    totalPages: number
    total: number
  }
  filters: {
    actorEmails: string[]
    actions: string[]
    resourceTypes: string[]
  }
}

type DomainStep = {
  target: TourTarget
  tab: AdminTab
  title: string
  body: string
  action?: 'open-create-modal' | 'open-edit-modal' | 'open-application-detail' | 'open-contact-detail'
}

const ONBOARDING_AREAS: Array<{
  kind: TutorialKind
  target: TourTarget
  tab: AdminTab
  title: string
  body: string
}> = [
  {
    kind: 'vacancies',
    target: 'tabs',
    tab: 'vacancies',
    title: 'Bienvenida',
    body: 'Este panel te permite gestionar vacantes, postulaciones y contactos desde un único lugar.'
  },
  {
    kind: 'vacancies',
    target: 'create-vacancy',
    tab: 'vacancies',
    title: 'Módulo de Vacantes',
    body: 'Desde "+ Nueva Vacante" se abre un panel modal para crear una búsqueda laboral completa y publicarla.'
  },
  {
    kind: 'applications',
    target: 'applications-filters',
    tab: 'applications',
    title: 'Módulo de Postulaciones',
    body: 'En esta sección usas filtros y buscador para priorizar revisión de candidatos por estado y vacante.'
  },
  {
    kind: 'contacts',
    target: 'contacts-table',
    tab: 'contacts',
    title: 'Módulo de Contactos',
    body: 'Aquí gestionas la bandeja de consultas. Al abrir un contacto puedes ver detalle y responder por email.'
  }
]

const DOMAIN_TUTORIALS_BASE: Record<TutorialKind, DomainStep[]> = {
  vacancies: [
    {
      target: 'tabs',
      tab: 'vacancies',
      title: 'Navegación principal',
      body: 'Puedes volver a esta pestaña desde cualquier módulo usando la barra superior.'
    },
    {
      target: 'create-vacancy',
      tab: 'vacancies',
      title: 'Botón Nueva Vacante',
      body: 'Al seleccionarlo se abre el panel modal de alta para definir título, modalidad, requisitos y beneficios.'
    },
    {
      target: 'vacancy-modal',
      tab: 'vacancies',
      title: 'Panel de creación de vacante',
      body: 'Este diálogo centraliza toda la configuración de la nueva búsqueda antes de guardarla.',
      action: 'open-create-modal'
    }
  ],
  applications: [
    {
      target: 'tabs',
      tab: 'applications',
      title: 'Acceso a postulaciones',
      body: 'Esta pestaña centraliza todo el flujo de revisión de candidatos.'
    },
    {
      target: 'applications-filters',
      tab: 'applications',
      title: 'Filtros y búsqueda',
      body: 'Estos controles te permiten segmentar por estado y encontrar rápido por nombre, email o vacante.'
    },
    {
      target: 'application-view-btn',
      tab: 'applications',
      title: 'Acción Ver postulación',
      body: 'Este botón abre el panel de detalle completo del candidato y su proceso.'
    },
    {
      target: 'application-detail-modal',
      tab: 'applications',
      title: 'Detalle de postulación',
      body: 'Aquí revisas información extendida del candidato antes de avanzar estado o decidir acciones.',
      action: 'open-application-detail'
    }
  ],
  contacts: [
    {
      target: 'tabs',
      tab: 'contacts',
      title: 'Acceso a contactos',
      body: 'Desde aquí administras consultas entrantes desde la web pública.'
    },
    {
      target: 'contacts-table',
      tab: 'contacts',
      title: 'Bandeja y acciones',
      body: 'En la tabla puedes abrir detalle, responder y actualizar el estado operativo del contacto.'
    },
    {
      target: 'contact-view-btn',
      tab: 'contacts',
      title: 'Acción Ver contacto',
      body: 'Este botón abre el panel de detalle del mensaje recibido y sus datos de contacto.'
    },
    {
      target: 'contact-detail-modal',
      tab: 'contacts',
      title: 'Detalle de contacto',
      body: 'Desde este panel puedes leer el mensaje, responder por email y actualizar el estado.',
      action: 'open-contact-detail'
    }
  ]
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showSuccess, showError, showInfo } = useToast()
  useMobileKeyboardAssist()
  
  // Usar el hook customizado para manejar datos y operaciones
  const {
    vacancies,
    applications,
    contacts,
    stats,
    isLoading,
    error,
    fetchDashboardData,
    createVacancy: createVacancyApi,
    updateVacancy: updateVacancyApi,
    deleteVacancy: deleteVacancyApi,
    toggleVacancyStatus,
    updateApplicationStatus,
    deleteApplication: deleteApplicationApi,
    updateContactStatus,
    deleteContact: deleteContactApi
  } = useAdminDashboard()
  
  const [activeTab, setActiveTab] = useState<AdminTab>('vacancies')
  const [lastNonSettingsTab, setLastNonSettingsTab] = useState<AdminTab>('vacancies')
  const [searchVacancies, setSearchVacancies] = useState<string>('')
  const [filterVacancyStatus, setFilterVacancyStatus] = useState<'all' | 'active' | 'closed'>('all')
  const [sortVacanciesBy, setSortVacanciesBy] = useState<VacancySortKey>('createdAt')
  const [sortVacanciesDirection, setSortVacanciesDirection] = useState<SortDirection>('desc')

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterApplicationsVacancyId, setFilterApplicationsVacancyId] = useState<string>('all')
  const [sortApplicationsBy, setSortApplicationsBy] = useState<ApplicationSortKey>('submittedAt')
  const [sortApplicationsDirection, setSortApplicationsDirection] = useState<SortDirection>('desc')

  const [filterContactStatus, setFilterContactStatus] = useState<string>('all')
  const [searchApplications, setSearchApplications] = useState<string>('')
  const [searchContacts, setSearchContacts] = useState<string>('')
  const [sortContactsBy, setSortContactsBy] = useState<ContactSortKey>('createdAt')
  const [sortContactsDirection, setSortContactsDirection] = useState<SortDirection>('desc')
  const [currentVacancyPage, setCurrentVacancyPage] = useState(1)
  const [currentApplicationPage, setCurrentApplicationPage] = useState(1)
  const [currentContactPage, setCurrentContactPage] = useState(1)
  const itemsPerPage = 10
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [pendingToggleVacancyId, setPendingToggleVacancyId] = useState<string | null>(null)
  const [pendingDeleteVacancyId, setPendingDeleteVacancyId] = useState<string | null>(null)
  const [pendingApplicationStatusId, setPendingApplicationStatusId] = useState<string | null>(null)
  const [pendingDeleteApplicationId, setPendingDeleteApplicationId] = useState<string | null>(null)
  const [isExportingApplicationsCsv, setIsExportingApplicationsCsv] = useState(false)
  const [pendingContactStatusId, setPendingContactStatusId] = useState<string | null>(null)
  const [pendingDeleteContactId, setPendingDeleteContactId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    workday: 'FULL_TIME',
    modality: 'ON_SITE',
    salary: '',
    requirements: '',
    benefits: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [activeTutorial, setActiveTutorial] = useState<TutorialKind | null>(null)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [onboardingReturnStep, setOnboardingReturnStep] = useState<number | null>(null)
  const [guideDialogPosition, setGuideDialogPosition] = useState<CSSProperties | undefined>(undefined)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [pendingNotificationDeleteIds, setPendingNotificationDeleteIds] = useState<Set<string>>(new Set())
  const [pendingNotificationBulkAction, setPendingNotificationBulkAction] = useState<
    'mark-all-read' | 'clear-read' | null
  >(null)
  const [settingsForm, setSettingsForm] = useState({
    notificationsEnabled: true,
    notifyNewApplications: true,
    notifyNewContacts: true,
    notifySecurityAlerts: true
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [auditTimeline, setAuditTimeline] = useState<AdminAuditLogItem[]>([])
  const [auditTimelineLoading, setAuditTimelineLoading] = useState(false)
  const [auditTimelineError, setAuditTimelineError] = useState<string | null>(null)
  const [auditTimelinePage, setAuditTimelinePage] = useState(1)
  const [auditTimelineTotalPages, setAuditTimelineTotalPages] = useState(1)
  const [auditTimelineTotal, setAuditTimelineTotal] = useState(0)
  const [auditFilterOptions, setAuditFilterOptions] = useState<{
    actorEmails: string[]
    actions: string[]
    resourceTypes: string[]
  }>({
    actorEmails: [],
    actions: [],
    resourceTypes: []
  })
  const [auditFilters, setAuditFilters] = useState({
    actorEmail: '',
    action: '',
    resourceType: '',
    dateFrom: '',
    dateTo: ''
  })
  const lastObservedStatsRef = useRef<{
    totalApplications: number
    pendingContacts: number
  } | null>(null)
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  )
  const orderedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications]
  )

  useEffect(() => {
    if (!showCreateModal && !showApplicationDetail && !showContactDetail) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (confirmDialog.isOpen) return

      if (showCreateModal) {
        setShowCreateModal(false)
        setEditingVacancy(null)
        setFormData({
          title: '',
          description: '',
          location: '',
          workday: 'FULL_TIME',
          modality: 'ON_SITE',
          salary: '',
          requirements: '',
          benefits: ''
        })
        return
      }

      if (showApplicationDetail) {
        setShowApplicationDetail(false)
        return
      }

      if (showContactDetail) {
        setShowContactDetail(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmDialog.isOpen, showApplicationDetail, showContactDetail, showCreateModal])

  const reloadNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/notifications?view=all&page=1&limit=${NOTIFICATIONS_PAGE_LIMIT}`,
        {
          cache: 'no-store'
        }
      )
      if (!response.ok) {
        throw new Error('No se pudieron obtener notificaciones')
      }

      const data = (await response.json()) as { items?: AdminNotification[] }
      setNotifications(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error('No se pudieron recargar notificaciones admin', error)
      showError('No se pudieron cargar notificaciones del panel.')
    }
  }, [showError])

  const createNotification = useCallback(
    async (
      title: string,
      message: string,
      level: NotificationLevel,
      action?: AdminNotification['action']
    ) => {
      const levelMap: Record<NotificationLevel, NotificationLevelApi> = {
        info: 'INFO',
        success: 'SUCCESS',
        warning: 'WARNING'
      }

      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          level: levelMap[level],
          action
        })
      })

      if (!response.ok) {
        throw new Error('No se pudo crear la notificación')
      }

      return (await response.json()) as AdminNotification
    },
    []
  )

  const addNotification = useCallback((
    title: string,
    message: string,
    level: NotificationLevel = 'info',
    action?: AdminNotification['action']
  ) => {
    if (!settingsForm.notificationsEnabled) return
    void (async () => {
      try {
        const created = await createNotification(title, message, level, action)
        setNotifications((prev) => [created, ...prev.filter((item) => item.id !== created.id)].slice(0, NOTIFICATIONS_PAGE_LIMIT))
      } catch (error) {
        console.error('No se pudo persistir notificación admin', error)
      }
    })()
  }, [createNotification, settingsForm.notificationsEnabled])

  const markAllNotificationsAsRead = () => {
    if (pendingNotificationBulkAction) return
    const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id)
    if (unreadIds.length === 0) return

    setPendingNotificationBulkAction('mark-all-read')
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
    void (async () => {
      try {
        const responses = await Promise.all(
          unreadIds.map((notificationId) =>
            fetch(`/api/admin/notifications/${notificationId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isRead: true })
            })
          )
        )
        const hasErrors = responses.some((response) => !response.ok)
        if (hasErrors) {
          throw new Error('No se pudieron marcar todas como leídas')
        }
        showSuccess('Todas las notificaciones fueron marcadas como leídas.')
      } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas', error)
        showError('No se pudieron actualizar todas las notificaciones.')
        await reloadNotifications()
      } finally {
        setPendingNotificationBulkAction(null)
      }
    })()
  }

  const clearReadNotifications = () => {
    if (pendingNotificationBulkAction) return
    const readIds = notifications.filter((notification) => notification.isRead).map((notification) => notification.id)
    if (readIds.length === 0) return

    openConfirmDialog({
      isOpen: true,
      title: 'Limpiar notificaciones leídas',
      message: 'Se eliminarán todas las notificaciones ya leídas. Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Sí, limpiar leídas',
      closeOnBackdropClick: false,
      onConfirm: async () => {
        setPendingNotificationBulkAction('clear-read')
        try {
          const response = await fetch('/api/admin/notifications?view=read', {
            method: 'DELETE'
          })
          if (!response.ok) {
            throw new Error('No se pudieron limpiar todas las notificaciones leídas')
          }
          setNotifications((prev) => prev.filter((notification) => !notification.isRead))
          showSuccess('Notificaciones leídas limpiadas.')
        } catch (error) {
          console.error('Error al limpiar notificaciones leídas', error)
          showError('No se pudieron limpiar todas las notificaciones leídas.')
          await reloadNotifications()
        } finally {
          setPendingNotificationBulkAction(null)
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const toggleNotificationRead = (notificationId: string) => {
    const target = notifications.find((notification) => notification.id === notificationId)
    if (!target) return
    const nextIsRead = !target.isRead

    let changedToRead = false
    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id !== notificationId) return notification
        changedToRead = !notification.isRead
        return { ...notification, isRead: !notification.isRead }
      })
    )
    showSuccess(changedToRead ? 'Notificacion marcada como leida.' : 'Notificacion marcada como no leida.')
    void (async () => {
      try {
        const response = await fetch(`/api/admin/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: nextIsRead })
        })
        if (!response.ok) {
          throw new Error('No se pudo actualizar la notificación')
        }
      } catch (error) {
        console.error('Error al actualizar estado de notificación', error)
        showError('No se pudo actualizar la notificación.')
        await reloadNotifications()
      }
    })()
  }

  const handleDeleteNotification = (notificationId: string) => {
    if (pendingNotificationDeleteIds.has(notificationId)) return
    const previousNotifications = notifications
    setPendingNotificationDeleteIds((prev) => new Set(prev).add(notificationId))
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))
    showSuccess('Notificación eliminada.')
    void (async () => {
      try {
        const response = await fetch(`/api/admin/notifications/${notificationId}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          throw new Error('No se pudo eliminar la notificación')
        }
      } catch (error) {
        console.error('Error al eliminar notificación', error)
        showError('No se pudo eliminar la notificación.')
        setNotifications(previousNotifications)
      } finally {
        setPendingNotificationDeleteIds((prev) => {
          const next = new Set(prev)
          next.delete(notificationId)
          return next
        })
      }
    })()
  }

  const loadAuditTimeline = useCallback(async () => {
    if (status !== 'authenticated') return

    setAuditTimelineLoading(true)
    setAuditTimelineError(null)
    try {
      const params = new URLSearchParams({
        page: String(auditTimelinePage),
        limit: '20'
      })

      if (auditFilters.actorEmail) params.set('actorEmail', auditFilters.actorEmail)
      if (auditFilters.action) params.set('action', auditFilters.action)
      if (auditFilters.resourceType) params.set('resourceType', auditFilters.resourceType)
      if (auditFilters.dateFrom) params.set('dateFrom', auditFilters.dateFrom)
      if (auditFilters.dateTo) params.set('dateTo', auditFilters.dateTo)

      const response = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('No se pudo cargar la auditoría operativa')
      }

      const data = (await response.json()) as AdminAuditResponse
      setAuditTimeline(Array.isArray(data.items) ? data.items : [])
      setAuditTimelinePage(data.pagination.page)
      setAuditTimelineTotalPages(data.pagination.totalPages)
      setAuditTimelineTotal(data.pagination.total)
      setAuditFilterOptions({
        actorEmails: data.filters.actorEmails ?? [],
        actions: data.filters.actions ?? [],
        resourceTypes: data.filters.resourceTypes ?? []
      })
    } catch (error) {
      console.error('Error al cargar timeline de auditoría', error)
      setAuditTimelineError('No se pudo cargar la auditoría operativa.')
    } finally {
      setAuditTimelineLoading(false)
    }
  }, [auditFilters.action, auditFilters.actorEmail, auditFilters.dateFrom, auditFilters.dateTo, auditFilters.resourceType, auditTimelinePage, status])

  const filteredVacancies = useMemo(() => {
    let next = [...vacancies]

    if (filterVacancyStatus !== 'all') {
      next = next.filter((vacancy) => vacancy.status === filterVacancyStatus)
    }

    if (searchVacancies.trim()) {
      const search = searchVacancies.toLowerCase()
      next = next.filter((vacancy) =>
        vacancy.title.toLowerCase().includes(search) || vacancy.location.toLowerCase().includes(search)
      )
    }

    next.sort((a, b) => {
      const factor = sortVacanciesDirection === 'asc' ? 1 : -1
      if (sortVacanciesBy === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor
      }
      if (sortVacanciesBy === 'status') {
        return a.status.localeCompare(b.status) * factor
      }
      return a[sortVacanciesBy].localeCompare(b[sortVacanciesBy], 'es', { sensitivity: 'base' }) * factor
    })

    return next
  }, [filterVacancyStatus, searchVacancies, sortVacanciesBy, sortVacanciesDirection, vacancies])

  const filteredApplications = useMemo(() => {
    let next = [...applications]

    if (filterStatus !== 'all') {
      next = next.filter((app) => app.status === filterStatus)
    }
    if (filterApplicationsVacancyId !== 'all') {
      next = next.filter((app) => app.vacancy?.id === filterApplicationsVacancyId)
    }
    if (searchApplications.trim()) {
      const search = searchApplications.toLowerCase()
      next = next.filter(
        (app) =>
          app.candidateName.toLowerCase().includes(search) ||
          app.email.toLowerCase().includes(search) ||
          (app.vacancy?.title ?? 'espontánea').toLowerCase().includes(search)
      )
    }

    next.sort((a, b) => {
      const factor = sortApplicationsDirection === 'asc' ? 1 : -1
      if (sortApplicationsBy === 'submittedAt') {
        return (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) * factor
      }
      if (sortApplicationsBy === 'status') {
        return a.status.localeCompare(b.status) * factor
      }
      return a.candidateName.localeCompare(b.candidateName, 'es', { sensitivity: 'base' }) * factor
    })

    return next
  }, [
    applications,
    filterStatus,
    filterApplicationsVacancyId,
    searchApplications,
    sortApplicationsBy,
    sortApplicationsDirection
  ])

  const filteredContacts = useMemo(() => {
    let next = [...contacts]

    if (filterContactStatus !== 'all') {
      next = next.filter((contact) => contact.status === filterContactStatus)
    }
    if (searchContacts.trim()) {
      const search = searchContacts.toLowerCase()
      next = next.filter(
        (contact) =>
          contact.name.toLowerCase().includes(search) ||
          contact.email.toLowerCase().includes(search) ||
          contact.subject.toLowerCase().includes(search)
      )
    }

    next.sort((a, b) => {
      const factor = sortContactsDirection === 'asc' ? 1 : -1
      if (sortContactsBy === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor
      }
      if (sortContactsBy === 'status') {
        return a.status.localeCompare(b.status) * factor
      }
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) * factor
    })

    return next
  }, [contacts, filterContactStatus, searchContacts, sortContactsBy, sortContactsDirection])

  const paginatedVacancies = useMemo(
    () => filteredVacancies.slice((currentVacancyPage - 1) * itemsPerPage, currentVacancyPage * itemsPerPage),
    [currentVacancyPage, filteredVacancies, itemsPerPage]
  )
  const paginatedApplications = useMemo(
    () => filteredApplications.slice((currentApplicationPage - 1) * itemsPerPage, currentApplicationPage * itemsPerPage),
    [currentApplicationPage, filteredApplications, itemsPerPage]
  )
  const paginatedContacts = useMemo(
    () => filteredContacts.slice((currentContactPage - 1) * itemsPerPage, currentContactPage * itemsPerPage),
    [currentContactPage, filteredContacts, itemsPerPage]
  )
  const firstVacancyId = useMemo(() => paginatedVacancies[0]?.id ?? null, [paginatedVacancies])
  const firstApplicationId = useMemo(() => paginatedApplications[0]?.id ?? null, [paginatedApplications])
  const firstApplicationWithCvId = useMemo(
    () => paginatedApplications.find((application) => Boolean(application.resumeUrl))?.id ?? null,
    [paginatedApplications]
  )
  const firstContactId = useMemo(() => paginatedContacts[0]?.id ?? null, [paginatedContacts])

  const tutorialStepsByKind = useMemo<Record<TutorialKind, DomainStep[]>>(() => {
    const vacancySteps = [...DOMAIN_TUTORIALS_BASE.vacancies]
    if (firstVacancyId) {
      vacancySteps.push(
        {
          target: 'vacancy-toggle-btn',
          tab: 'vacancies',
          title: 'Acción Cerrar/Activar',
          body: 'Este botón cambia visibilidad pública de la vacante (activa/cerrada).'
        },
        {
          target: 'vacancy-edit-btn',
          tab: 'vacancies',
          title: 'Acción Editar + diálogo',
          body: 'Al presionar editar se abrirá el diálogo con datos precargados para ajustar la vacante.'
        },
        {
          target: 'vacancy-modal',
          tab: 'vacancies',
          title: 'Diálogo de edición',
          body: 'Este panel se reutiliza para editar la vacante seleccionada.',
          action: 'open-edit-modal'
        },
        {
          target: 'vacancy-delete-btn',
          tab: 'vacancies',
          title: 'Acción Eliminar',
          body: 'El botón eliminar inicia confirmación y borra vacante junto con postulaciones asociadas.'
        }
      )
    } else {
      vacancySteps.push({
        target: 'create-vacancy',
        tab: 'vacancies',
        title: 'Sin vacantes cargadas',
        body: 'No hay vacantes disponibles en esta vista. El tutorial se adapta y te guía para crear tu primera vacante.'
      })
    }

    const applicationsSteps = firstApplicationId
      ? [...DOMAIN_TUTORIALS_BASE.applications]
      : DOMAIN_TUTORIALS_BASE.applications.filter(
          (step) => step.target !== 'application-view-btn' && step.target !== 'application-detail-modal'
        )
    if (!firstApplicationId) {
      applicationsSteps.push({
        target: 'applications-filters',
        tab: 'applications',
        title: 'Sin postulaciones registradas',
        body: 'Como no hay postulaciones en la tabla, el tutorial evita pasos de detalle y se centra en filtros y criterios de revisión.'
      })
    }
    if (firstApplicationWithCvId) {
      applicationsSteps.push({
        target: 'application-cv-btn',
        tab: 'applications',
        title: 'Acción CV',
        body: 'Este botón descarga el CV adjunto para revisión fuera del panel.'
      })
    }

    const contactsSteps = firstContactId
      ? [...DOMAIN_TUTORIALS_BASE.contacts]
      : DOMAIN_TUTORIALS_BASE.contacts.filter(
          (step) => step.target !== 'contact-view-btn' && step.target !== 'contact-detail-modal'
        )
    if (!firstContactId) {
      contactsSteps.push({
        target: 'contacts-table',
        tab: 'contacts',
        title: 'Sin contactos pendientes',
        body: 'Actualmente no hay contactos en la tabla. El tutorial te muestra solo controles relevantes hasta que ingresen nuevos mensajes.'
      })
    }

    return {
      vacancies: vacancySteps,
      applications: applicationsSteps,
      contacts: contactsSteps
    }
  }, [firstApplicationId, firstApplicationWithCvId, firstContactId, firstVacancyId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (activeTab !== 'settings') {
      setLastNonSettingsTab(activeTab)
    }
  }, [activeTab])

  useEffect(() => {
    if (status !== 'authenticated') return

    let shouldShow = false
    try {
      shouldShow = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true'
    } catch {
      shouldShow = true
    }

    if (shouldShow) {
      setOnboardingStep(0)
      setShowOnboarding(true)
      showInfo('Bienvenido al panel. Te mostramos un tutorial rápido.')
    }
  }, [status, showInfo])

  useEffect(() => {
    if (status !== 'authenticated') return
    void reloadNotifications()
  }, [status, reloadNotifications])

  useEffect(() => {
    if (status !== 'authenticated') return

    void (async () => {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('No se pudo cargar la configuración')
        }

        const data = (await response.json()) as AdminSettingsResponse
        setSettingsForm({
          notificationsEnabled: data.preferences.notificationsEnabled,
          notifyNewApplications: data.preferences.notifyNewApplications,
          notifyNewContacts: data.preferences.notifyNewContacts,
          notifySecurityAlerts: data.preferences.notifySecurityAlerts
        })
        setSettingsLoaded(true)
      } catch (error) {
        console.error('Error al cargar configuración admin', error)
        showError('No se pudo cargar la configuración del panel.')
      }
    })()
  }, [showError, status])

  useEffect(() => {
    if (status !== 'authenticated' || activeTab !== 'settings') return
    void loadAuditTimeline()
  }, [activeTab, loadAuditTimeline, status])

  useEffect(() => {
    if (status !== 'authenticated') return
    try {
      const raw = window.localStorage.getItem(ADMIN_TABLE_STATE_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as {
        vacancies?: {
          search?: string
          status?: 'all' | 'active' | 'closed'
          sortBy?: VacancySortKey
          sortDirection?: SortDirection
        }
        applications?: {
          search?: string
          status?: string
          vacancyId?: string
          sortBy?: ApplicationSortKey
          sortDirection?: SortDirection
        }
        contacts?: {
          search?: string
          status?: string
          sortBy?: ContactSortKey
          sortDirection?: SortDirection
        }
      }

      if (parsed.vacancies) {
        setSearchVacancies(parsed.vacancies.search ?? '')
        setFilterVacancyStatus(parsed.vacancies.status ?? 'all')
        setSortVacanciesBy(parsed.vacancies.sortBy ?? 'createdAt')
        setSortVacanciesDirection(parsed.vacancies.sortDirection ?? 'desc')
      }
      if (parsed.applications) {
        setSearchApplications(parsed.applications.search ?? '')
        setFilterStatus(parsed.applications.status ?? 'all')
        setFilterApplicationsVacancyId(parsed.applications.vacancyId ?? 'all')
        setSortApplicationsBy(parsed.applications.sortBy ?? 'submittedAt')
        setSortApplicationsDirection(parsed.applications.sortDirection ?? 'desc')
      }
      if (parsed.contacts) {
        setSearchContacts(parsed.contacts.search ?? '')
        setFilterContactStatus(parsed.contacts.status ?? 'all')
        setSortContactsBy(parsed.contacts.sortBy ?? 'createdAt')
        setSortContactsDirection(parsed.contacts.sortDirection ?? 'desc')
      }
    } catch {
      // ignore invalid persisted state
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    try {
      window.localStorage.setItem(
        ADMIN_TABLE_STATE_STORAGE_KEY,
        JSON.stringify({
          vacancies: {
            search: searchVacancies,
            status: filterVacancyStatus,
            sortBy: sortVacanciesBy,
            sortDirection: sortVacanciesDirection
          },
          applications: {
            search: searchApplications,
            status: filterStatus,
            vacancyId: filterApplicationsVacancyId,
            sortBy: sortApplicationsBy,
            sortDirection: sortApplicationsDirection
          },
          contacts: {
            search: searchContacts,
            status: filterContactStatus,
            sortBy: sortContactsBy,
            sortDirection: sortContactsDirection
          }
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [
    filterApplicationsVacancyId,
    filterContactStatus,
    filterStatus,
    filterVacancyStatus,
    searchApplications,
    searchContacts,
    searchVacancies,
    sortApplicationsBy,
    sortApplicationsDirection,
    sortContactsBy,
    sortContactsDirection,
    sortVacanciesBy,
    sortVacanciesDirection,
    status
  ])

  useEffect(() => {
    if (isLoading) return

    const lastObservedStats = lastObservedStatsRef.current
    if (!lastObservedStats) {
      lastObservedStatsRef.current = {
        totalApplications: stats.totalApplications,
        pendingContacts: stats.pendingContacts
      }
      return
    }

    if (
      settingsForm.notificationsEnabled &&
      settingsForm.notifyNewApplications &&
      stats.totalApplications > lastObservedStats.totalApplications
    ) {
      const diff = stats.totalApplications - lastObservedStats.totalApplications
      addNotification(
        'Nuevas postulaciones',
        `Ingresaron ${diff} nueva(s) postulación(es) desde tu última revisión.`,
        'success',
        applications[0]
          ? {
              label: 'Ver postulaciones',
              type: 'APPLICATION',
              resourceId: applications[0].id
            }
          : undefined
      )
    }

    if (
      settingsForm.notificationsEnabled &&
      settingsForm.notifyNewContacts &&
      stats.pendingContacts > lastObservedStats.pendingContacts
    ) {
      const diff = stats.pendingContacts - lastObservedStats.pendingContacts
      addNotification(
        'Nuevos contactos pendientes',
        `Se detectaron ${diff} nuevo(s) contacto(s) pendiente(s).`,
        'warning',
        contacts[0]
          ? {
              label: 'Ver contactos',
              type: 'CONTACT',
              resourceId: contacts[0].id
            }
          : undefined
      )
    }

    lastObservedStatsRef.current = {
      totalApplications: stats.totalApplications,
      pendingContacts: stats.pendingContacts
    }
  }, [
    addNotification,
    applications,
    contacts,
    isLoading,
    settingsForm.notificationsEnabled,
    settingsForm.notifyNewApplications,
    settingsForm.notifyNewContacts,
    stats.pendingContacts,
    stats.totalApplications
  ])

  const currentOnboardingArea = ONBOARDING_AREAS[onboardingStep]
  const currentTutorialSteps = activeTutorial ? tutorialStepsByKind[activeTutorial] : null
  const currentTutorialItem = currentTutorialSteps?.[tutorialStep]
  const currentGuidedTarget =
    showOnboarding && onboardingStep === 0
      ? undefined
      : activeTutorial
        ? currentTutorialItem?.target
        : currentOnboardingArea?.target
  const isGuidedMode = showOnboarding || activeTutorial !== null
  const onboardingDialogPosition: CSSProperties | undefined =
    showOnboarding && onboardingStep === 0
      ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      : guideDialogPosition

  const getGuideDialogPosition = (targetElement: Element): CSSProperties => {
    const targetRect = targetElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const dialogWidth = Math.min(420, viewportWidth - 32)
    const dialogHeight = 280
    const margin = 16

    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetCenterY = targetRect.top + targetRect.height / 2

    const placeRight = targetCenterX < viewportWidth / 2
    const placeBottom = targetCenterY < viewportHeight / 2

    const left = placeRight ? viewportWidth - dialogWidth - margin : margin
    const top = placeBottom ? viewportHeight - dialogHeight - margin : margin

    return { left: Math.max(margin, left), top: Math.max(margin, top) }
  }

  useEffect(() => {
    if (!isGuidedMode) return

    const targetTab = activeTutorial ? currentTutorialItem?.tab : currentOnboardingArea?.tab
    const targetSelector = activeTutorial ? currentTutorialItem?.target : currentOnboardingArea?.target
    if (!targetTab || !targetSelector) return

    setActiveTab(targetTab)
    const targetElement = document.querySelector(`[data-tour="${targetSelector}"]`)
    if (targetElement) {
      setGuideDialogPosition(getGuideDialogPosition(targetElement))
    }

    const timeout = window.setTimeout(() => {
      const targetElement = document.querySelector(`[data-tour="${targetSelector}"]`)
      if (!targetElement) {
        setGuideDialogPosition(undefined)
        return
      }

      targetElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const recalculatedTarget = document.querySelector(`[data-tour="${targetSelector}"]`)
      if (recalculatedTarget) {
        setGuideDialogPosition(getGuideDialogPosition(recalculatedTarget))
      }
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [isGuidedMode, activeTutorial, tutorialStep, onboardingStep, currentTutorialItem, currentOnboardingArea])

  useEffect(() => {
    if (!activeTutorial || !currentTutorialItem?.action) return

    const timeout = window.setTimeout(() => {
      switch (currentTutorialItem.action) {
        case 'open-create-modal':
          handleOpenCreateModal()
          break
        case 'open-edit-modal':
          if (paginatedVacancies[0]) {
            handleOpenEditModal(paginatedVacancies[0])
          }
          break
        case 'open-application-detail':
          if (paginatedApplications[0]) {
            setSelectedApplication(paginatedApplications[0])
            setShowApplicationDetail(true)
          }
          break
        case 'open-contact-detail':
          if (paginatedContacts[0]) {
            setSelectedContact(paginatedContacts[0])
            setShowContactDetail(true)
          }
          break
      }
    }, 160)

    return () => window.clearTimeout(timeout)
  }, [activeTutorial, currentTutorialItem, paginatedApplications, paginatedContacts, paginatedVacancies])

  useEffect(() => {
    if (!activeTutorial || !currentTutorialItem) return

    const target = currentTutorialItem.target

    if (target !== 'vacancy-modal' && showCreateModal) {
      setShowCreateModal(false)
      setEditingVacancy(null)
    }
    if (target !== 'application-detail-modal' && showApplicationDetail) {
      setShowApplicationDetail(false)
      setSelectedApplication(null)
    }
    if (target !== 'contact-detail-modal' && showContactDetail) {
      setShowContactDetail(false)
      setSelectedContact(null)
    }
  }, [activeTutorial, currentTutorialItem, showApplicationDetail, showContactDetail, showCreateModal])

  useEffect(() => {
    if (!isGuidedMode) return

    // Evita que un control previo quede enfocado y dispare acciones por teclado.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [isGuidedMode, tutorialStep, onboardingStep])

  // Resetear páginas cuando cambian los filtros
  useEffect(() => {
    setCurrentVacancyPage(1)
  }, [searchVacancies, filterVacancyStatus, sortVacanciesBy, sortVacanciesDirection])

  useEffect(() => {
    setCurrentApplicationPage(1)
  }, [filterStatus, filterApplicationsVacancyId, searchApplications, sortApplicationsBy, sortApplicationsDirection])

  useEffect(() => {
    setCurrentContactPage(1)
  }, [filterContactStatus, searchContacts, sortContactsBy, sortContactsDirection])

  const handleDeleteVacancy = async (id: string, title: string) => {
    openConfirmDialog({
      isOpen: true,
      title: 'Eliminar vacante',
      message: `¿Estás seguro de eliminar la vacante "${title}"?\n\nEsta acción también eliminará todas las postulaciones asociadas y no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar vacante',
      onConfirm: async () => {
        setPendingDeleteVacancyId(id)
        try {
          await deleteVacancyApi(id)
          showSuccess('Vacante eliminada exitosamente')
          addNotification('Vacante eliminada', `Se eliminó la vacante "${title}".`, 'warning')
        } catch (error) {
          console.error('Error deleting vacancy:', error)
          showError('Error al eliminar la vacante')
        } finally {
          setPendingDeleteVacancyId(null)
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleStatusToggle = async (vacancy: Vacancy) => {
    if (pendingToggleVacancyId) return

    const isClosing = vacancy.status === 'active'
    openConfirmDialog({
      isOpen: true,
      title: isClosing ? 'Cerrar vacante' : 'Activar vacante',
      message: isClosing
        ? `¿Deseas cerrar la vacante "${vacancy.title}"?\n\nAl cerrarla dejará de mostrarse en la página pública.`
        : `¿Deseas activar la vacante "${vacancy.title}"?\n\nAl activarla volverá a mostrarse en la página pública.`,
      type: 'danger',
      confirmText: isClosing ? 'Sí, cerrar vacante' : 'Sí, activar vacante',
      onConfirm: async () => {
        setPendingToggleVacancyId(vacancy.id)
        try {
          await toggleVacancyStatus(vacancy)
          showSuccess(`Vacante ${isClosing ? 'cerrada' : 'activada'} exitosamente`)
          addNotification(
            'Estado de vacante actualizado',
            `La vacante "${vacancy.title}" fue ${isClosing ? 'cerrada' : 'activada'}.`,
            'info',
            {
              label: 'Ver vacantes',
              type: 'VACANCY',
              resourceId: vacancy.id
            }
          )
        } catch (error) {
          console.error('Error toggling status:', error)
          showError('Error al cambiar el estado de la vacante')
        } finally {
          setPendingToggleVacancyId(null)
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      workday: 'FULL_TIME',
      modality: 'ON_SITE',
      salary: '',
      requirements: '',
      benefits: ''
    })
    setEditingVacancy(null)
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (vacancy: Vacancy) => {
    setFormData({
      title: vacancy.title,
      description: vacancy.description || '',
      location: vacancy.location,
      workday: vacancy.workday,
      modality: vacancy.modality,
      salary: vacancy.salary || '',
      requirements: vacancy.requirements || '',
      benefits: vacancy.benefits || ''
    })
    setEditingVacancy(vacancy)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingVacancy(null)
    setFormData({
      title: '',
      description: '',
      location: '',
      workday: 'FULL_TIME',
      modality: 'ON_SITE',
      salary: '',
      requirements: '',
      benefits: ''
    })
  }

  const handleSubmitVacancy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (editingVacancy) {
        await updateVacancyApi(editingVacancy.id, formData)
        showSuccess('Vacante actualizada exitosamente')
        addNotification('Vacante actualizada', `Se actualizó "${formData.title}".`, 'success', {
          label: 'Ver vacante',
          type: 'VACANCY',
          resourceId: editingVacancy.id
        })
      } else {
        const createdVacancy = await createVacancyApi(formData)
        showSuccess('Vacante creada exitosamente')
        addNotification('Nueva vacante', `Se creó la vacante "${formData.title}".`, 'success', {
          label: 'Ver vacante',
          type: 'VACANCY',
          resourceId: createdVacancy.id
        })
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving vacancy:', error)
      showError(error instanceof Error ? error.message : 'Error al guardar la vacante')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (applicationId: string, newStatus: Application['status']) => {
    if (pendingApplicationStatusId) return
    setPendingApplicationStatusId(applicationId)
    try {
      await updateApplicationStatus(applicationId, newStatus)
      showSuccess('Estado actualizado exitosamente')
      addNotification('Postulación actualizada', `Se cambió el estado a ${statusLabels[newStatus]}.`, 'info', {
        label: 'Ver postulación',
        type: 'APPLICATION',
        resourceId: applicationId
      })
    } catch (error) {
      console.error('Error updating application status:', error)
      showError('Error al actualizar el estado')
    } finally {
      setPendingApplicationStatusId(null)
    }
  }

  const handleDeleteApplication = async (applicationId: string, candidateName: string) => {
    if (pendingDeleteApplicationId) return
    openConfirmDialog({
      isOpen: true,
      title: 'Eliminar postulación',
      message: `¿Estás seguro de eliminar la postulación de "${candidateName}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar postulación',
      onConfirm: async () => {
        setPendingDeleteApplicationId(applicationId)
        try {
          await deleteApplicationApi(applicationId)
          showSuccess('Postulación eliminada exitosamente')
          addNotification('Postulación eliminada', `Se eliminó la postulación de "${candidateName}".`, 'warning')
          if (selectedApplication?.id === applicationId) {
            setShowApplicationDetail(false)
            setSelectedApplication(null)
          }
        } catch (error) {
          console.error('Error deleting application:', error)
          showError('Error al eliminar la postulación')
        } finally {
          setPendingDeleteApplicationId(null)
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleDownloadCV = (application: Application) => {
    if (!application.resumeUrl) {
      showError('No hay CV disponible para esta postulación')
      return
    }

    const link = document.createElement('a')
    link.href = application.resumeUrl
    link.download = application.resumeFileName || `CV-${application.candidateName}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showInfo('Descarga de CV iniciada')
  }

  const handleViewApplicationDetails = (application: Application) => {
    setSelectedApplication(application)
    setShowApplicationDetail(true)
  }

  const handleExportApplicationsCsv = async () => {
    if (isExportingApplicationsCsv) return
    setIsExportingApplicationsCsv(true)
    try {
      await downloadApplicationsCsv({
        search: searchApplications.trim() || undefined,
        status: filterStatus,
        vacancyId: filterApplicationsVacancyId,
        sortBy: sortApplicationsBy,
        sortDirection: sortApplicationsDirection
      })
      showSuccess('CSV de postulaciones exportado correctamente.')
    } catch (error) {
      console.error('Error exportando postulaciones CSV', error)
      showError('No se pudo exportar el CSV de postulaciones.')
    } finally {
      setIsExportingApplicationsCsv(false)
    }
  }

  const handleContactStatusChange = async (contactId: string, newStatus: Contact['status']) => {
    if (pendingContactStatusId) return
    setPendingContactStatusId(contactId)
    try {
      await updateContactStatus(contactId, newStatus)
      showSuccess('Estado del contacto actualizado')
      addNotification(
        'Contacto actualizado',
        `Se cambió el estado del contacto a ${contactStatusLabels[newStatus]}.`,
        'info',
        {
          label: 'Ver contacto',
          type: 'CONTACT',
          resourceId: contactId
        }
      )
    } catch (error) {
      console.error('Error al actualizar estado del contacto:', error)
      showError('Error al actualizar el estado del contacto')
    } finally {
      setPendingContactStatusId(null)
    }
  }

  const handleViewContactDetails = (contact: Contact) => {
    setSelectedContact(contact)
    setShowContactDetail(true)
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    openConfirmDialog({
      isOpen: true,
      title: 'Eliminar contacto',
      message: `¿Estás seguro de eliminar el contacto de "${contactName}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar contacto',
      onConfirm: async () => {
        setPendingDeleteContactId(contactId)
        try {
          await deleteContactApi(contactId)
          showSuccess('Contacto eliminado exitosamente')
          addNotification('Contacto eliminado', `Se eliminó el contacto de "${contactName}".`, 'warning')
        } catch (error) {
          console.error('Error al eliminar contacto:', error)
          showError('Error al eliminar el contacto')
        } finally {
          setPendingDeleteContactId(null)
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const closeGuidedDialogs = () => {
    setShowCreateModal(false)
    setEditingVacancy(null)
    setShowApplicationDetail(false)
    setSelectedApplication(null)
    setShowContactDetail(false)
    setSelectedContact(null)
  }

  const blockGuidedDialogInteractions = (event: React.SyntheticEvent) => {
    if (!isGuidedMode) return
    event.preventDefault()
    event.stopPropagation()
  }

  const openConfirmDialog = (config: ConfirmDialogConfig) => {
    setIsConfirmLoading(false)
    setConfirmDialog(config)
  }

  const handleSignOut = () => {
    openConfirmDialog({
      isOpen: true,
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar sesión del panel administrativo ahora?',
      type: 'danger',
      confirmText: 'Sí, cerrar sesión',
      cancelText: 'Permanecer',
      closeOnBackdropClick: true,
      onConfirm: async () => {
        try {
          const callbackUrl = `${window.location.origin}/admin/signin`
          await signOut({
            callbackUrl,
            redirect: false
          })
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          router.replace('/admin/signin')
          router.refresh()
        } catch (error) {
          console.error('Error al cerrar sesión', error)
          showError('No se pudo cerrar la sesión. Reintentá en unos segundos.')
        }
      }
    })
  }

  const handleOpenHelp = () => {
    closeGuidedDialogs()
    setActiveTutorial(null)
    setOnboardingStep(0)
    setTutorialStep(0)
    setOnboardingReturnStep(null)
    setShowOnboarding(true)
  }

  const handleOpenSectionTutorial = () => {
    const tutorialByTab: Record<AdminTab, TutorialKind> = {
      vacancies: 'vacancies',
      applications: 'applications',
      contacts: 'contacts',
      settings: 'vacancies'
    }
    openDomainTutorial(tutorialByTab[activeTab], false)
  }

  const handleOpenNotifications = () => {
    void reloadNotifications()
  }

  const handleOpenSettings = () => {
    setActiveTab('settings')
  }

  const handleBackFromSettings = () => {
    setActiveTab(lastNonSettingsTab)
  }

  const handleAuditFilterChange = (
    key: 'actorEmail' | 'action' | 'resourceType' | 'dateFrom' | 'dateTo',
    value: string
  ) => {
    setAuditFilters((prev) => ({ ...prev, [key]: value }))
    setAuditTimelinePage(1)
  }

  const handleAuditPageChange = (page: number) => {
    if (page < 1 || page > auditTimelineTotalPages) return
    setAuditTimelinePage(page)
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      })

      if (!response.ok) {
        throw new Error('No se pudo guardar la configuración')
      }

      const data = (await response.json()) as AdminSettingsResponse
      setSettingsForm({
        notificationsEnabled: data.preferences.notificationsEnabled,
        notifyNewApplications: data.preferences.notifyNewApplications,
        notifyNewContacts: data.preferences.notifyNewContacts,
        notifySecurityAlerts: data.preferences.notifySecurityAlerts
      })
      showSuccess('Configuración guardada correctamente.')
    } catch (error) {
      console.error('Error al guardar configuración admin', error)
      showError('No se pudo guardar la configuración.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleNotificationAction = (notification: AdminNotification) => {
    if (!notification.action) return

    const action = notification.action

    if (action.type === 'VACANCY') {
      setActiveTab('vacancies')
      const totalPages = Math.max(1, Math.ceil(filteredVacancies.length / itemsPerPage))
      const foundIndex = filteredVacancies.findIndex((vacancy) => vacancy.id === action.resourceId)
      if (foundIndex >= 0) {
        setCurrentVacancyPage(Math.floor(foundIndex / itemsPerPage) + 1)
      } else {
        setCurrentVacancyPage(totalPages)
      }
      showInfo('Te llevamos al módulo de vacantes.')
    }

    if (action.type === 'APPLICATION') {
      setActiveTab('applications')
      const foundIndex = filteredApplications.findIndex((application) => application.id === action.resourceId)
      if (foundIndex >= 0) {
        setCurrentApplicationPage(Math.floor(foundIndex / itemsPerPage) + 1)
        const targetApplication = filteredApplications[foundIndex]
        setSelectedApplication(targetApplication)
        setShowApplicationDetail(true)
      }
      showInfo('Te llevamos al módulo de postulaciones.')
    }

    if (action.type === 'CONTACT') {
      setActiveTab('contacts')
      const foundIndex = filteredContacts.findIndex((contact) => contact.id === action.resourceId)
      if (foundIndex >= 0) {
        setCurrentContactPage(Math.floor(foundIndex / itemsPerPage) + 1)
        const targetContact = filteredContacts[foundIndex]
        setSelectedContact(targetContact)
        setShowContactDetail(true)
      }
      showInfo('Te llevamos al módulo de contactos.')
    }

    if (!notification.isRead) {
      toggleNotificationRead(notification.id)
    }
  }

  const handleCompleteOnboarding = () => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    } catch {
      // No-op if storage is unavailable.
    }
    closeGuidedDialogs()
    setGuideDialogPosition(undefined)
    setActiveTutorial(null)
    setShowOnboarding(false)
    showSuccess('Tutorial completado. Puedes reabrirlo desde "Ayuda".')
  }

  const handleSkipOnboarding = () => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    } catch {
      // No-op if storage is unavailable.
    }
    closeGuidedDialogs()
    setGuideDialogPosition(undefined)
    setActiveTutorial(null)
    setShowOnboarding(false)
    setOnboardingReturnStep(null)
    showInfo('Tutorial cerrado. Puedes retomarlo desde "Ayuda".')
  }

  const handleNextOnboardingStep = () => {
    setOnboardingStep((prev) => Math.min(prev + 1, ONBOARDING_AREAS.length - 1))
  }

  const handlePrevOnboardingStep = () => {
    setOnboardingStep((prev) => Math.max(prev - 1, 0))
  }

  const openDomainTutorial = (kind: TutorialKind, fromOnboarding: boolean) => {
    closeGuidedDialogs()
    setCurrentVacancyPage(1)
    setCurrentApplicationPage(1)
    setCurrentContactPage(1)
    setSearchVacancies('')
    setFilterVacancyStatus('all')
    setSortVacanciesBy('createdAt')
    setSortVacanciesDirection('desc')
    setFilterStatus('all')
    setFilterApplicationsVacancyId('all')
    setSortApplicationsBy('submittedAt')
    setSortApplicationsDirection('desc')
    setFilterContactStatus('all')
    setSearchApplications('')
    setSearchContacts('')
    setSortContactsBy('createdAt')
    setSortContactsDirection('desc')
    if (fromOnboarding) {
      setOnboardingReturnStep(onboardingStep)
    } else {
      setOnboardingReturnStep(null)
    }
    setShowOnboarding(false)
    setActiveTutorial(kind)
    setTutorialStep(0)
  }

  const handleNextTutorialStep = () => {
    if (!currentTutorialSteps) return
    setTutorialStep((prev) => Math.min(prev + 1, currentTutorialSteps.length - 1))
  }

  const handlePrevTutorialStep = () => {
    setTutorialStep((prev) => Math.max(prev - 1, 0))
  }

  const handleFinishTutorial = () => {
    closeGuidedDialogs()
    if (onboardingReturnStep !== null) {
      setOnboardingStep(onboardingReturnStep)
      setActiveTutorial(null)
      setTutorialStep(0)
      setOnboardingReturnStep(null)
      setShowOnboarding(true)
      showInfo('Volviste al onboarding para continuar con la siguiente sección.')
      return
    }

    setActiveTutorial(null)
    setTutorialStep(0)
    setGuideDialogPosition(undefined)
    showSuccess('Tutorial de sección completado.')
  }

  const handleBackToOnboarding = () => {
    if (onboardingReturnStep === null) return
    closeGuidedDialogs()
    setOnboardingStep(onboardingReturnStep)
    setActiveTutorial(null)
    setTutorialStep(0)
    setOnboardingReturnStep(null)
    setShowOnboarding(true)
  }

  const getTourClass = (
    key: TourTarget
  ) =>
    isGuidedMode && currentGuidedTarget === key
      ? 'relative z-[72] ring-4 ring-primary-300 ring-offset-2 shadow-2xl transition-all duration-300'
      : ''
  const guidedModalZClass = isGuidedMode ? 'z-[73]' : 'z-50'

  const contactStatusLabels = {
    'PENDING': 'Pendiente',
    'RESPONDED': 'Respondido',
    'ARCHIVED': 'Archivado'
  }

  const contactStatusColors = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'RESPONDED': 'bg-green-100 text-green-800',
    'ARCHIVED': 'bg-gray-100 text-gray-800'
  }

const handleTestSentry = () => {
  try {
    throw new Error('Test Error - Sentry está funcionando correctamente')
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        component: 'AdminDashboard',
        user_role: 'admin'
      },
      extra: {
        timestamp: new Date().toISOString(),
        userId: session?.user?.id,
        totalVacancies: stats.totalVacancies,
        totalApplications: stats.totalApplications
      },
      level: 'info'
    })
    showSuccess('Error de prueba enviado a Sentry. Revisa tu dashboard en Sentry.io')
  }
}

  const statusLabels = {
    'PENDING': 'Pendiente',
    'REVIEWING': 'En Revisión',
    'INTERVIEWED': 'Entrevistado',
    'ACCEPTED': 'Aceptado',
    'REJECTED': 'Rechazado'
  }

  const statusColors = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'REVIEWING': 'bg-blue-100 text-blue-800',
    'INTERVIEWED': 'bg-purple-100 text-purple-800',
    'ACCEPTED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        activeTab={activeTab}
        userEmail={session.user?.email ?? undefined}
        onSignOut={handleSignOut}
        onBackFromSettings={handleBackFromSettings}
        onOpenFullTutorial={handleOpenHelp}
        onOpenSectionTutorial={handleOpenSectionTutorial}
        onOpenNotifications={handleOpenNotifications}
        onOpenSettings={handleOpenSettings}
        notifications={orderedNotifications}
        pendingNotificationDeleteIds={[...pendingNotificationDeleteIds]}
        isNotificationBulkLoading={pendingNotificationBulkAction !== null}
        onDeleteNotification={handleDeleteNotification}
        onToggleNotificationRead={toggleNotificationRead}
        onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
        onClearReadNotifications={clearReadNotifications}
        onNotificationAction={handleNotificationAction}
        unreadNotifications={unreadNotifications}
      />

      {isGuidedMode && (
        <div className="pointer-events-none fixed inset-0 z-[71] bg-gray-900/35 backdrop-blur-[2px]" />
      )}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-28 sm:pb-32 md:pt-6 md:py-8 ${isGuidedMode ? 'pointer-events-none' : ''}`}>
        <DashboardStats
          totalVacancies={stats.totalVacancies}
          activeVacancies={stats.activeVacancies}
          totalApplications={stats.totalApplications}
          pendingContacts={stats.pendingContacts}
        />

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-red-800">Ocurrió un error al cargar datos del panel</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => void fetchDashboardData()}
                className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
              >
                Reintentar carga
              </button>
            </div>
          </div>
        )}

        {/* Botón de Test de Sentry - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Test de Monitoreo</h3>
                  <p className="text-xs text-blue-700">Verifica que Sentry esté capturando errores correctamente</p>
                </div>
              </div>
              <button
                onClick={handleTestSentry}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🧪 Probar Sentry
              </button>
            </div>
          </div>
        )}

        <AdminTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className={getTourClass('tabs')}
          stats={{
            activeVacancies: stats.activeVacancies,
            pendingApplications: applications.filter(a => a.status === 'PENDING').length,
            pendingContacts: stats.pendingContacts
          }}
        />

        {/* Vacancies Tab */}
        {activeTab === 'vacancies' && (
          <AdminVacanciesSection
            filteredVacancies={filteredVacancies}
            paginatedVacancies={paginatedVacancies}
            currentVacancyPage={currentVacancyPage}
            itemsPerPage={itemsPerPage}
            setCurrentVacancyPage={setCurrentVacancyPage}
            searchVacancies={searchVacancies}
            setSearchVacancies={setSearchVacancies}
            filterVacancyStatus={filterVacancyStatus}
            setFilterVacancyStatus={setFilterVacancyStatus}
            sortVacanciesBy={sortVacanciesBy}
            setSortVacanciesBy={setSortVacanciesBy}
            sortVacanciesDirection={sortVacanciesDirection}
            setSortVacanciesDirection={setSortVacanciesDirection}
            getTourClass={getTourClass}
            onOpenCreateModal={handleOpenCreateModal}
            onToggleStatus={handleStatusToggle}
            onOpenEditModal={handleOpenEditModal}
            onDeleteVacancy={handleDeleteVacancy}
            pendingToggleVacancyId={pendingToggleVacancyId}
            pendingDeleteVacancyId={pendingDeleteVacancyId}
          />
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <AdminApplicationsSection
            applications={applications}
            vacancies={vacancies}
            filteredApplications={filteredApplications}
            paginatedApplications={paginatedApplications}
            currentApplicationPage={currentApplicationPage}
            itemsPerPage={itemsPerPage}
            setCurrentApplicationPage={setCurrentApplicationPage}
            searchApplications={searchApplications}
            setSearchApplications={setSearchApplications}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterApplicationsVacancyId={filterApplicationsVacancyId}
            setFilterApplicationsVacancyId={setFilterApplicationsVacancyId}
            sortApplicationsBy={sortApplicationsBy}
            setSortApplicationsBy={setSortApplicationsBy}
            sortApplicationsDirection={sortApplicationsDirection}
            setSortApplicationsDirection={setSortApplicationsDirection}
            firstApplicationId={firstApplicationId}
            firstApplicationWithCvId={firstApplicationWithCvId}
            getTourClass={getTourClass}
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewApplicationDetails}
            onDownloadCv={handleDownloadCV}
            onDeleteApplication={handleDeleteApplication}
            pendingApplicationStatusId={pendingApplicationStatusId}
            pendingDeleteApplicationId={pendingDeleteApplicationId}
            onExportCsv={() => {
              void handleExportApplicationsCsv()
            }}
            isExportingCsv={isExportingApplicationsCsv}
          />
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <AdminContactsSection
            contacts={contacts}
            filteredContacts={filteredContacts}
            paginatedContacts={paginatedContacts}
            currentContactPage={currentContactPage}
            itemsPerPage={itemsPerPage}
            setCurrentContactPage={setCurrentContactPage}
            searchContacts={searchContacts}
            setSearchContacts={setSearchContacts}
            filterContactStatus={filterContactStatus}
            setFilterContactStatus={setFilterContactStatus}
            sortContactsBy={sortContactsBy}
            setSortContactsBy={setSortContactsBy}
            sortContactsDirection={sortContactsDirection}
            setSortContactsDirection={setSortContactsDirection}
            firstContactId={firstContactId}
            getTourClass={getTourClass}
            onStatusChange={handleContactStatusChange}
            onViewDetails={handleViewContactDetails}
            onDeleteContact={handleDeleteContact}
            pendingContactStatusId={pendingContactStatusId}
            pendingDeleteContactId={pendingDeleteContactId}
          />
        )}

        {activeTab === 'settings' && (
          <AdminSettingsSection
            email={session.user?.email}
            settingsForm={settingsForm}
            setSettingsForm={(updater) => setSettingsForm(updater)}
            settingsSaving={settingsSaving}
            settingsLoaded={settingsLoaded}
            onSaveSettings={() => void handleSaveSettings()}
            auditTimeline={{
              items: auditTimeline,
              loading: auditTimelineLoading,
              error: auditTimelineError,
              pagination: {
                page: auditTimelinePage,
                totalPages: auditTimelineTotalPages,
                total: auditTimelineTotal
              },
              filterOptions: auditFilterOptions,
              filters: auditFilters
            }}
            onAuditFilterChange={handleAuditFilterChange}
            onAuditPageChange={handleAuditPageChange}
            onReloadAuditTimeline={() => void loadAuditTimeline()}
          />
        )}
      </main>

      {/* Contact Detail Modal */}
      {showContactDetail && selectedContact && (
        <div
          className={`fixed inset-0 ${guidedModalZClass} flex items-center justify-center p-4 ${isGuidedMode ? 'bg-black/40' : 'bg-black/55 backdrop-blur-sm'}`}
          onClick={(event) => {
            if (!isGuidedMode && event.target === event.currentTarget) {
              setShowContactDetail(false)
            }
          }}
        >
          <div
            data-tour="contact-detail-modal"
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ${getTourClass('contact-detail-modal')}`}
            onClickCapture={blockGuidedDialogInteractions}
            onChangeCapture={blockGuidedDialogInteractions}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {selectedContact.name}
                  </h3>
                  <p className="text-gray-600">{selectedContact.email}</p>
                </div>
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="rounded-md px-2 text-2xl text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Cerrar detalle de contacto"
                >
                  ×
                </button>
              </div>

              {/* Información de contacto */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</p>
                  <p className="text-gray-900">{selectedContact.phone}</p>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Asunto</p>
                  <p className="text-gray-900">{selectedContact.subject}</p>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${contactStatusColors[selectedContact.status]}`}>
                    {contactStatusLabels[selectedContact.status]}
                  </span>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Fecha</p>
                  <p className="text-gray-900">
                    {new Date(selectedContact.createdAt).toLocaleString('es-AR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              {/* Mensaje */}
              <div className="mb-6">
                <p className="block text-sm font-semibold text-gray-700 mb-2">Mensaje</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-line">{selectedContact.message}</p>
                </div>
              </div>

              {/* Botón para contactar */}
              <div className="mb-6">
                <a
                  href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject}`}
                  className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  📧 Responder por Email
                </a>
              </div>

              {/* Cambiar estado */}
              <div className="border-t pt-6">
                <p className="block text-sm font-semibold text-gray-700 mb-2">Cambiar Estado</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'PENDING')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'RESPONDED')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium"
                  >
                    ✅ Respondido
                  </button>
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'ARCHIVED')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    📦 Archivar
                  </button>
                </div>
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {showApplicationDetail && selectedApplication && (
        <div
          className={`fixed inset-0 ${guidedModalZClass} flex items-center justify-center p-4 ${isGuidedMode ? 'bg-black/40' : 'bg-black/55 backdrop-blur-sm'}`}
          onClick={(event) => {
            if (!isGuidedMode && event.target === event.currentTarget) {
              setShowApplicationDetail(false)
            }
          }}
        >
          <div
            data-tour="application-detail-modal"
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ${getTourClass('application-detail-modal')}`}
            onClickCapture={blockGuidedDialogInteractions}
            onChangeCapture={blockGuidedDialogInteractions}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {selectedApplication.candidateName}
                  </h3>
                  <p className="text-gray-600">
                    Postulación para: <span className="font-semibold text-primary-500">{selectedApplication.vacancy?.title ?? 'Espontánea'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowApplicationDetail(false)}
                  className="rounded-md px-2 text-2xl text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Cerrar detalle de postulación"
                >
                  ×
                </button>
              </div>

              {/* Información de contacto */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Email</p>
                  <p className="text-gray-900">{selectedApplication.email}</p>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</p>
                  <p className="text-gray-900">{selectedApplication.phone || 'No proporcionado'}</p>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedApplication.status]}`}>
                    {statusLabels[selectedApplication.status]}
                  </span>
                </div>

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Postulación</p>
                  <p className="text-gray-900">
                    {new Date(selectedApplication.submittedAt).toLocaleString('es-AR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              {/* Carta de presentación */}
              {selectedApplication.coverLetter && (
                <div className="mb-6">
                  <p className="block text-sm font-semibold text-gray-700 mb-2">Carta de Presentación</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-line">{selectedApplication.coverLetter}</p>
                  </div>
                </div>
              )}

              {/* CV */}
              {selectedApplication.resumeUrl && (
                <div className="mb-6">
                  <p className="block text-sm font-semibold text-gray-700 mb-2">Curriculum Vitae</p>
                  <button
                    onClick={() => handleDownloadCV(selectedApplication)}
                    className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    📄 Descargar {selectedApplication.resumeFileName || 'CV'}
                  </button>
                </div>
              )}

              {/* Cambiar estado */}
              <div className="border-t pt-6">
                <p className="block text-sm font-semibold text-gray-700 mb-2">Cambiar Estado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'PENDING')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'REVIEWING')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    En Revisión
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'INTERVIEWED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  >
                    Entrevistado
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'ACCEPTED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium"
                  >
                    ✅ Aceptar
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'REJECTED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    ❌ Rechazar
                  </button>
                  <button
                    onClick={() => setShowApplicationDetail(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div
          className={`fixed inset-0 ${guidedModalZClass} flex items-center justify-center p-4 ${isGuidedMode ? 'bg-black/40' : 'bg-black/55 backdrop-blur-sm'}`}
          onClick={(event) => {
            if (!isGuidedMode && event.target === event.currentTarget) {
              handleCloseModal()
            }
          }}
        >
          <div
            data-tour="vacancy-modal"
            className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ${getTourClass('vacancy-modal')}`}
            onClickCapture={blockGuidedDialogInteractions}
            onChangeCapture={blockGuidedDialogInteractions}
          >
            <form
              onSubmit={(event) => {
                if (isGuidedMode) {
                  event.preventDefault()
                  return
                }
                handleSubmitVacancy(event)
              }}
              className="p-4 sm:p-6"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {editingVacancy ? 'Editar Vacante' : 'Nueva Vacante'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md px-2 text-2xl text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Cerrar formulario de vacante"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título de la vacante *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    autoComplete="off"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Desarrollador Full Stack"
                  />
                </div>

                {/* Ubicación, Jornada y Modalidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación *
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      autoComplete="off"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      placeholder="Ej: Las Varillas, Córdoba"
                    />
                  </div>

                  <div>
                    <label htmlFor="workday" className="block text-sm font-medium text-gray-700 mb-1">
                      Jornada *
                    </label>
                    <select
                      id="workday"
                      required
                      value={formData.workday}
                      onChange={(e) => setFormData({ ...formData, workday: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    >
                      <option value="FULL_TIME">Jornada Completa</option>
                      <option value="PART_TIME">Media Jornada</option>
                      <option value="PROJECT_BASED">Por Proyecto</option>
                      <option value="INTERNSHIP">Pasantía</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modality" className="block text-sm font-medium text-gray-700 mb-1">
                      Modalidad *
                    </label>
                    <select
                      id="modality"
                      required
                      value={formData.modality}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    >
                      <option value="ON_SITE">Presencial</option>
                      <option value="REMOTE">Remoto</option>
                      <option value="HYBRID">Híbrido</option>
                    </select>
                  </div>
                </div>

                {/* Salario */}
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                    Salario
                  </label>
                  <input
                    type="text"
                    id="salary"
                    name="salary"
                    autoComplete="off"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: $1,500,000 - $2,000,000 o A convenir"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    autoComplete="off"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Describe la vacante, responsabilidades principales, etc."
                  />
                </div>

                {/* Requisitos */}
                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                    Requisitos
                  </label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    autoComplete="off"
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Experiencia, habilidades técnicas, educación requerida, etc."
                  />
                </div>

                {/* Beneficios */}
                <div>
                  <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                    Beneficios
                  </label>
                  <textarea
                    id="benefits"
                    name="benefits"
                    autoComplete="off"
                    rows={3}
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Trabajo remoto, capacitaciones, días libres, etc."
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Guardando...' : (editingVacancy ? 'Actualizar' : 'Crear Vacante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          closeOnBackdropClick={isConfirmLoading ? false : confirmDialog.closeOnBackdropClick}
          isLoading={isConfirmLoading}
          onConfirm={async () => {
            if (isConfirmLoading) return
            setIsConfirmLoading(true)
            try {
              await confirmDialog.onConfirm()
            } finally {
              setIsConfirmLoading(false)
            }
          }}
          onCancel={() => {
            if (isConfirmLoading) return
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          }}
        />
      )}

      <AdminOnboardingDialog
        isOpen={showOnboarding}
        stepIndex={onboardingStep}
        totalSteps={ONBOARDING_AREAS.length}
        modeLabel="Onboarding"
        title={currentOnboardingArea?.title || 'Onboarding'}
        body={currentOnboardingArea?.body || ''}
        secondaryActionLabel={currentOnboardingArea ? `Ver tutorial de ${currentOnboardingArea.kind === 'vacancies' ? 'Vacantes' : currentOnboardingArea.kind === 'applications' ? 'Postulaciones' : 'Contactos'}` : undefined}
        onSecondaryAction={currentOnboardingArea ? () => openDomainTutorial(currentOnboardingArea.kind, true) : undefined}
        primaryLabel={onboardingStep === ONBOARDING_AREAS.length - 1 ? 'Finalizar onboarding' : 'Siguiente módulo'}
        skipLabel="Cerrar onboarding"
        onNext={handleNextOnboardingStep}
        onPrev={handlePrevOnboardingStep}
        onSkip={handleSkipOnboarding}
        onFinish={handleCompleteOnboarding}
        positionStyle={onboardingDialogPosition}
      />

      <AdminOnboardingDialog
        isOpen={activeTutorial !== null}
        stepIndex={tutorialStep}
        totalSteps={currentTutorialSteps?.length || 1}
        modeLabel={`Tutorial ${activeTutorial === 'vacancies' ? 'Vacantes' : activeTutorial === 'applications' ? 'Postulaciones' : 'Contactos'}`}
        title={currentTutorialItem?.title || 'Tutorial'}
        body={currentTutorialItem?.body || ''}
        backActionLabel={onboardingReturnStep !== null ? 'Volver al onboarding' : undefined}
        onBackAction={onboardingReturnStep !== null ? handleBackToOnboarding : undefined}
        skipLabel="Cerrar tutorial"
        primaryLabel={
          currentTutorialSteps && tutorialStep === currentTutorialSteps.length - 1 ? 'Finalizar tutorial' : 'Siguiente'
        }
        onNext={handleNextTutorialStep}
        onPrev={handlePrevTutorialStep}
        onSkip={() => {
          closeGuidedDialogs()
          setActiveTutorial(null)
          setTutorialStep(0)
          setOnboardingReturnStep(null)
          setGuideDialogPosition(undefined)
        }}
        onFinish={handleFinishTutorial}
        positionStyle={guideDialogPosition}
      />
    </div>
  )
}
