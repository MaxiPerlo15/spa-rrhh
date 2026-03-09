# 14. Prototipos de Interfaz (Wireframes de arquitectura)

## 1. Mapa de navegación

```mermaid
flowchart LR
  HOME[/\//] --> NOS[#nosotros]
  HOME --> SERV[#servicios]
  HOME --> EMP[#empresas]
  HOME --> CONT[#contacto]
  HOME --> OFF[/ofertas-laborales]
  OFF --> POST[Modal Postulación]
  HOME --> SIGNIN[/admin/signin]
  SIGNIN --> ADMIN[/admin]
  ADMIN --> VAC[Tab Vacantes]
  ADMIN --> APP[Tab Postulaciones]
  ADMIN --> CON[Tab Contactos]
  ADMIN --> SET[Tab Configuración]
  SIGNIN --> FORGOT[/admin/forgot-password]
  FORGOT --> RESET[/admin/reset-password]
```

## 2. Prototipo estructural Landing

```mermaid
flowchart TB
  N[Navbar]
  H[Hero + CTA]
  S[Servicios]
  E[Empresas Carrusel]
  V[Vacantes destacadas]
  C[Contacto]
  F[Footer]
  N --> H --> S --> E --> V --> C --> F
```

## 3. Prototipo estructural Admin Mobile

```mermaid
flowchart TB
  HM[Header fijo mobile]
  ST[Stats cards]
  NT[Panel notificaciones]
  TB[Tabs módulos]
  FIL[Filtros]
  LST[Listado cards swipe]
  DLG[Dialogs confirmación]

  HM --> ST --> NT --> TB --> FIL --> LST
  LST --> DLG
```

## 4. Prototipo estructural Admin Desktop

```mermaid
flowchart TB
  HD[Header desktop]
  SD[Stats dashboard]
  TAB[Tabs de dominio]
  GRID[Tabla + filtros + acciones]
  MOD[Modales detalle/edición]

  HD --> SD --> TAB --> GRID
  GRID --> MOD
```
