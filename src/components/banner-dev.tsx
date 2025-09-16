import { useState, useEffect } from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function BannerDev() {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Vérifier si la bannière a déjà été fermée
    const bannerClosed = localStorage.getItem("devBannerClosed")
    
    if (!bannerClosed) {
      // Ajouter un délai pour l'animation d'entrée
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [])
  
  const handleClose = () => {
    setIsVisible(false)
    // Enregistrer que la bannière a été fermée
    localStorage.setItem("devBannerClosed", "true")
  }
  
  const handleReportClick = () => {
    window.location.href = "mailto:contact@capiomont.fr?subject=Signalement de bug"
  }
  
  if (!isVisible) return null
  
  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-card p-4 shadow-md transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Info className="size-5 text-blue-500" />
        </div>
        
        <div className="flex-1">
          <h4 className="mb-1 text-sm font-medium">Site en développement</h4>
          <p className="text-xs text-muted-foreground">
            Cette application est en cours de développement. Si vous rencontrez un problème, 
            <button 
              onClick={handleReportClick}
              className="ml-1 text-blue-500 hover:underline focus:outline-none"
            >
              signalez-le ici
            </button>.
          </p>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="-mr-1 -mt-1 h-6 w-6" 
          onClick={handleClose}
          aria-label="Fermer"
        >
          <X className="size-3" />
        </Button>
      </div>
    </div>
  )
}