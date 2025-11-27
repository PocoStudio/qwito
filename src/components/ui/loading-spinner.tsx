import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullHeight?: boolean;
  className?: string;
  compact?: boolean; // Nouvelle prop pour un affichage compact
}

export function LoadingSpinner({
  size = "md",
  text,
  fullHeight = false,
  className,
  compact = false, // Par défaut, non compact
}: LoadingSpinnerProps) {
  // Définir la taille du spinner en fonction de la prop size
  const spinnerSize = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  // Classe pour la hauteur complète si nécessaire
  // Si compact est true, on utilise une hauteur minimale plus petite
  const heightClass = fullHeight 
    ? "h-screen" 
    : compact 
      ? "h-auto min-h-0" // Mode compact sans hauteur minimale
      : "h-full min-h-[200px]";

  return (
    <div className={cn(
      "relative w-full", 
      heightClass,
      className
    )}>
      <div className={cn(
        "flex flex-col items-center justify-center",
        compact ? "p-0" : "absolute inset-0" // Si compact, pas de positionnement absolu
      )}>
        <Loader2 className={cn(spinnerSize, "animate-spin text-primary")} />
        {text && <span className="mt-2 text-muted-foreground text-center">{text}</span>}
      </div>
    </div>
  );
}