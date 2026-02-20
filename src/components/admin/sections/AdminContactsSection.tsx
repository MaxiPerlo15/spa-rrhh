import Pagination from '@/components/Pagination'
import type { Contact } from '@/lib/api/contacts'

interface AdminContactsSectionProps {
  contacts: Contact[]
  filteredContacts: Contact[]
  paginatedContacts: Contact[]
  currentContactPage: number
  itemsPerPage: number
  setCurrentContactPage: (page: number) => void
  searchContacts: string
  setSearchContacts: (value: string) => void
  filterContactStatus: string
  setFilterContactStatus: (value: string) => void
  sortContactsBy: 'createdAt' | 'name' | 'status'
  setSortContactsBy: (value: 'createdAt' | 'name' | 'status') => void
  sortContactsDirection: 'asc' | 'desc'
  setSortContactsDirection: (value: 'asc' | 'desc') => void
  firstContactId: string | null
  getTourClass: (key: 'contacts-table' | 'contact-view-btn') => string
  onStatusChange: (contactId: string, newStatus: Contact['status']) => void
  onViewDetails: (contact: Contact) => void
  onDeleteContact: (contactId: string, contactName: string) => void
  pendingContactStatusId: string | null
  pendingDeleteContactId: string | null
}

export default function AdminContactsSection({
  contacts,
  filteredContacts,
  paginatedContacts,
  currentContactPage,
  itemsPerPage,
  setCurrentContactPage,
  searchContacts,
  setSearchContacts,
  filterContactStatus,
  setFilterContactStatus,
  sortContactsBy,
  setSortContactsBy,
  sortContactsDirection,
  setSortContactsDirection,
  firstContactId,
  getTourClass,
  onStatusChange,
  onViewDetails,
  onDeleteContact,
  pendingContactStatusId,
  pendingDeleteContactId
}: AdminContactsSectionProps) {
  const contactStatusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RESPONDED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="ds-surface p-4 bg-yellow-50 border-yellow-200">
          <div className="text-xs font-medium text-yellow-700 mb-1">Pendientes</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-800">{contacts.filter((c) => c.status === 'PENDING').length}</div>
        </div>
        <div className="ds-surface p-4 bg-green-50 border-green-200">
          <div className="text-xs font-medium text-green-700 mb-1">Respondidos</div>
          <div className="text-xl sm:text-2xl font-bold text-green-800">{contacts.filter((c) => c.status === 'RESPONDED').length}</div>
        </div>
        <div className="ds-surface p-4 bg-gray-50 border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-1">Archivados</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800">{contacts.filter((c) => c.status === 'ARCHIVED').length}</div>
        </div>
      </div>

      <div className="ds-surface p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email o asunto..."
              value={searchContacts}
              onChange={(e) => setSearchContacts(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
            <select value={filterContactStatus} onChange={(e) => setFilterContactStatus(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="all">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="RESPONDED">Respondidos</option>
              <option value="ARCHIVED">Archivados</option>
            </select>
            <select value={sortContactsBy} onChange={(event) => setSortContactsBy(event.target.value as 'createdAt' | 'name' | 'status')} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="createdAt">Ordenar por fecha</option>
              <option value="name">Ordenar por nombre</option>
              <option value="status">Ordenar por estado</option>
            </select>
            <select value={sortContactsDirection} onChange={(event) => setSortContactsDirection(event.target.value as 'asc' | 'desc')} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
            <span className="text-sm text-gray-600 text-center sm:text-left">{filteredContacts.length} contactos</span>
          </div>
        </div>
      </div>

      <div data-tour="contacts-table" className={`ds-surface overflow-hidden ${getTourClass('contacts-table')}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay contactos {filterContactStatus !== 'all' ? 'con este estado' : 'disponibles'}
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => {
                  const isStatusUpdating = pendingContactStatusId === contact.id
                  const isDeleting = pendingDeleteContactId === contact.id
                  const isRowBusy = isStatusUpdating || isDeleting
                  return (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{contact.email}</td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{contact.subject}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <select disabled={isRowBusy} value={contact.status} onChange={(e) => onStatusChange(contact.id, e.target.value as Contact['status'])} className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${contactStatusColors[contact.status]}`}>
                        <option value="PENDING">Pendiente</option>
                        <option value="RESPONDED">Respondido</option>
                        <option value="ARCHIVED">Archivado</option>
                      </select>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(contact.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-right">
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
                        <button disabled={isRowBusy} onClick={() => onViewDetails(contact)} data-tour={contact.id === firstContactId ? 'contact-view-btn' : undefined} className={`text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${contact.id === firstContactId ? getTourClass('contact-view-btn') : ''}`}>
                          👁️ Ver
                        </button>
                        <button disabled={isRowBusy} onClick={() => onDeleteContact(contact.id, contact.name)} className="text-red-600 hover:text-red-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                          {isDeleting ? 'Eliminando...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentContactPage} totalItems={filteredContacts.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentContactPage} />
      </div>
    </>
  )
}
