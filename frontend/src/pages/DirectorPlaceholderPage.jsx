import { LayoutDashboard } from 'lucide-react'
import RoleWelcomeCard from '../components/RoleWelcomeCard'

function DirectorPlaceholderPage() {
  return (
    <RoleWelcomeCard
      accentLabel="Espace direction"
      accentIcon={LayoutDashboard}
      title="Placeholder Directeur"
      subtitle="Cet espace est pret a accueillir le futur dashboard de direction, avec indicateurs de pilotage et vues strategiques."
    />
  )
}

export default DirectorPlaceholderPage
