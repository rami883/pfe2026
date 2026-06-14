import Sidebar from './Sidebar'
import TopHeader from './TopHeader'

function DashboardLayout({
  navItems,
  activeNavItem,
  onNavChange,
  onLogout,
  isLoggingOut,
  userEmail,
  user,
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
  isDarkMode = false,
  onToggleDarkMode,
  showHeader = true,
  showFilters = true,
  children,
}) {
  const shouldShowHeader = showHeader && activeNavItem !== 'reports'

  return (
    <div className={`dashboard-root ${isDarkMode ? 'dashboard-root--dark' : ''}`}>
      <Sidebar
        items={navItems}
        activeItem={activeNavItem}
        onItemChange={onNavChange}
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
            user={user}
            userEmail={userEmail}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            isDarkMode={isDarkMode}
            onToggleDarkMode={onToggleDarkMode}
          />
        ) : null}

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
