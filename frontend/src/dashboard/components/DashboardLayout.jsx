import Sidebar from './Sidebar'
import TopHeader from './TopHeader'

function DashboardLayout({
  navItems,
  activeNavItem,
  onNavChange,
  onLogout,
  isLoggingOut,
  userEmail,
  title,
  subtitle,
  filters,
  onFiltersChange,
  onResetFilters,
  periodOptions,
  supplierOptions,
  originOptions,
  vehicleTypeOptions,
  notificationCount,
  onOpenAlerts,
  showHeader = true,
  showFilters = true,
  children,
}) {
  const shouldShowHeader = showHeader && activeNavItem !== 'reports'

  return (
    <div className="dashboard-root">
      <Sidebar
        items={navItems}
        activeItem={activeNavItem}
        onItemChange={onNavChange}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
        userEmail={userEmail}
      />

      <div className="dashboard-main">
        {shouldShowHeader ? (
          <TopHeader
            title={title}
            subtitle={subtitle}
            showFilters={showFilters}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onResetFilters={onResetFilters}
            periodOptions={periodOptions}
            supplierOptions={supplierOptions}
            originOptions={originOptions}
            vehicleTypeOptions={vehicleTypeOptions}
            notificationCount={notificationCount}
            onOpenAlerts={onOpenAlerts}
          />
        ) : null}

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
