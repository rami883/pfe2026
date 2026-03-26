import { Boxes } from 'lucide-react'
import RoleWelcomeCard from '../components/RoleWelcomeCard'

function StockManagerPlaceholderPage() {
  return (
    <RoleWelcomeCard
      accentLabel="Espace stock"
      accentIcon={Boxes}
      title="Placeholder Gestionnaire de stock"
      subtitle="Cet espace est pret a accueillir le futur dashboard logistique, avec suivi d'inventaire et pilotage des flux."
    />
  )
}

export default StockManagerPlaceholderPage
