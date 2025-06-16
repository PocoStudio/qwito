"use client"

import { XIcon, PencilIcon } from "lucide-react"
import { useFileUpload } from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { getFullAvatarUrl } from "@/utils/imageUtils"

interface AvatarUploadProps {
  initialAvatar?: string | null
  onAvatarChange?: (dataUrl: string | null) => void
  onAvatarRemove?: () => void
  size?: "sm" | "md" | "lg"
  username?: string
  isEditing?: boolean 
}

export function AvatarUpload({ 
  initialAvatar, 
  onAvatarChange, 
  onAvatarRemove,
  size = "md",
  username = "",
  isEditing = false
}: AvatarUploadProps) {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps}] = 
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024, // 5MB
    })

  const previewUrl = files[0]?.preview || (initialAvatar ? getFullAvatarUrl(initialAvatar) : null)
  const fileName = files[0]?.file.name || null

  // Tailles du bouton en fonction de la prop size
  const sizeClasses = {
    sm: "size-12",
    md: "size-16",
    lg: "size-24",
  }

  // const iconSizes = {
  //   sm: "size-3",
  //   md: "size-4",
  //   lg: "size-6",
  // }

  // const fontSizes = {
  //   sm: "text-xs",
  //   md: "text-sm",
  //   lg: "text-lg",
  // }

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  useEffect(() => {
    if (files[0]?.preview) {
      onAvatarChange?.(files[0].preview)
    }
    
    // Transmettre les erreurs au composant parent
    if (errors.length > 0) {
      // Si l'erreur concerne la taille du fichier
      if (errors.some(error => error.includes("taille maximale"))) {
        onAvatarChange?.(null); // Réinitialiser l'aperçu
      }
    }
  }, [files, errors, onAvatarChange])

  const handleRemove = () => {
    if (files[0]) {
      removeFile(files[0].id)
    }
    onAvatarRemove?.()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex">
        <Button
          variant="outline"
          className={`relative ${sizeClasses[size]} overflow-hidden p-0 shadow-none`}
          onClick={openFileDialog}
          aria-label={previewUrl ? "Changer l'image" : "Télécharger une image"}
        >
          {previewUrl ? (
            <img
              className="size-full object-cover"
              src={previewUrl}
              alt="Aperçu de l'image téléchargée"
              width={size === "lg" ? 96 : size === "md" ? 64 : 48}
              height={size === "lg" ? 96 : size === "md" ? 64 : 48}
            />
          ) : (
            <div aria-hidden="true" className="flex items-center justify-center bg-muted w-full h-full rounded-md">
              <span className={`text-muted-foreground font-medium ${size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-base"}`}>
                {getInitials(username)}
              </span>
            </div>
          )}
        </Button>
        {previewUrl && !isEditing && (
          <Button
            onClick={handleRemove}
            size="icon"
            className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none"
            aria-label="Supprimer l'image"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
        {!previewUrl && (
          <Button
            onClick={openFileDialog}
            size="icon"
            className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none bg-blue-500 hover:bg-blue-600"
            aria-label="Modifier l'image"
          >
            <PencilIcon className="size-3.5" />
          </Button>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Télécharger un fichier image"
          tabIndex={-1}
        />
      </div>
      {fileName && <p className="text-muted-foreground text-xs">{fileName}</p>}
      {errors.length > 0 && (
        <p className="text-red-500 text-xs mt-1">{errors[0]}</p>
      )}
    </div>
  )
}