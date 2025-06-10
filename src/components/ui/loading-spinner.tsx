import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullHeight?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  fullHeight = false,
  className,
}: LoadingSpinnerProps) {
  // Définir la taille du spinner en fonction de la prop size
  const spinnerSize = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  // Classe pour la hauteur complète si nécessaire
  const heightClass = fullHeight ? "h-screen" : "h-full min-h-[200px]";

  return (
    <div className={cn(
      "relative w-full", 
      heightClass,
      className
    )}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className={cn(spinnerSize, "animate-spin text-primary")} />
        {text && <span className="mt-2 text-muted-foreground text-center">{text}</span>}
      </div>
    </div>
  );
}