"use client"

import type React from "react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from "react"
import { compressImage } from '@/utils/imageUtils';

export type FileMetadata = {
  name: string
  size: number
  type: string
  url: string
  id: string
}

export type FileWithPreview = {
  file: File | FileMetadata
  id: string
  preview?: string
}

export type FileUploadOptions = {
  maxFiles?: number // Only used when multiple is true, defaults to Infinity
  maxSize?: number // in bytes
  accept?: string
  multiple?: boolean // Defaults to false
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void // Callback when files change
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void // Callback when new files are added
  onError?: (errors: string[]) => void 
}

export type FileUploadState = {
  files: FileWithPreview[]
  isDragging: boolean
  errors: string[]
  isProcessing: boolean
}

export type FileUploadActions = {
  addFiles: (files: FileList | File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  clearErrors: () => void
  handleDragEnter: (e: DragEvent<HTMLElement>) => void
  handleDragLeave: (e: DragEvent<HTMLElement>) => void
  handleDragOver: (e: DragEvent<HTMLElement>) => void
  handleDrop: (e: DragEvent<HTMLElement>) => void
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  openFileDialog: () => void
  getInputProps: (
    props?: InputHTMLAttributes<HTMLInputElement>
  ) => InputHTMLAttributes<HTMLInputElement> & {
    ref: React.Ref<HTMLInputElement>
  }
}

export const useFileUpload = (
  options: FileUploadOptions = {}
): [FileUploadState, FileUploadActions] => {
  const {
    maxFiles = Infinity,
    maxSize = Infinity,
    accept = "*/*",
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
    onError
  } = options

  const [state, setState] = useState<FileUploadState>({
    files: initialFiles.map((file) => ({
      file,
      id: file.id,
      preview: file.url,
    })),
    isDragging: false,
    errors: [],
    isProcessing: false, // Initialiser à false
  })

  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File | FileMetadata): string | null => {
      if (file instanceof File) {
        if (file.size > maxSize) {
          return `Le fichier "${file.name}" dépasse la taille maximale de ${Math.round(maxSize / (1024 * 1024))}MB.`
        }
        
        // Vérifier si le fichier est une image si accept est image/*
        if (accept === "image/*" && !file.type.startsWith("image/")) {
          return `Le fichier "${file.name}" n'est pas une image.`
        }
      }
      return null
    },
    [maxSize, accept]
  )

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      // Utiliser compressImage avec les dimensions 220x220
      compressImage(file, 220, 220)
        .then(dataUrl => {
          resolve(dataUrl);
        })
        .catch(() => {
          // Fallback au comportement original en cas d'erreur
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    });
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files.length) return
  
      setState(prev => ({ ...prev, isProcessing: true }))
  
      const fileArray = Array.from(files)
      const newErrors: string[] = []
      const filesToAdd: FileWithPreview[] = []
  
      // Si multiple est false, on ne garde que le premier fichier
      const filesToProcess = multiple ? fileArray : fileArray.slice(0, 1)
  
      // Si on a déjà atteint le nombre maximum de fichiers
      if (state.files.length + filesToProcess.length > maxFiles) {
        newErrors.push(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichier(s) avec ce message.`)
        
        setState((prev) => ({
          ...prev,
          errors: [...prev.errors, ...newErrors],
          isProcessing: false
        }))
        
        // Appeler onError pour informer le composant parent qu'il y a des erreurs
        if (onError && newErrors.length > 0) {
          onError(newErrors);
        }
        
        return
      }

      for (const file of filesToProcess) {
        const error = validateFile(file)
        if (error) {
          newErrors.push(error)
          continue
        }

        const preview = await createPreview(file)
        const id = Math.random().toString(36).substring(2, 11)

        filesToAdd.push({
          file,
          id,
          preview,
        })
      }

      if (filesToAdd.length > 0) {
        const updatedFiles = multiple
          ? [...state.files, ...filesToAdd]
          : filesToAdd

          setState((prev) => ({
            ...prev,
            files: updatedFiles,
            errors: [...prev.errors, ...newErrors],
            isProcessing: false, 
          }))

        onFilesChange?.(updatedFiles)
        onFilesAdded?.(filesToAdd)
      } else if (newErrors.length > 0) {
        setState((prev) => ({
          ...prev,
          errors: [...prev.errors, ...newErrors],
          isProcessing: false 
        }))
        
        // Appeler onError pour informer le composant parent qu'il y a des erreurs
        if (onError && newErrors.length > 0) {
          onError(newErrors);
        }
      } else {
        setState((prev) => ({
          ...prev,
          isProcessing: false
        }))
      }
    },
    [state.files, multiple, maxFiles, validateFile, createPreview, onFilesChange, onFilesAdded, onError]
  )

  const removeFile = useCallback(
    (id: string) => {
      const updatedFiles = state.files.filter((file) => file.id !== id)
      setState((prev) => ({
        ...prev,
        files: updatedFiles,
      }))
      onFilesChange?.(updatedFiles)
    },
    [state.files, onFilesChange]
  )

  const clearFiles = useCallback(() => {
    setState((prev) => ({
      ...prev,
      files: [],
    }))
    onFilesChange?.([])
  }, [onFilesChange])

  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: [],
    }))
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState((prev) => ({
      ...prev,
      isDragging: true,
    }))
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState((prev) => ({
      ...prev,
      isDragging: false,
    }))
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setState((prev) => ({
        ...prev,
        isDragging: false,
      }))

      const { files } = e.dataTransfer
      if (files && files.length > 0) {
        addFiles(files)
      }
    },
    [addFiles]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      
      if (!files || files.length === 0) {
        setState(prev => ({
          ...prev,
          isProcessing: false
        }))
        return
      }
      
      if (files && files.length > 0) {
        addFiles(files)
      }
    },
    [addFiles]
  )

  const openFileDialog = useCallback(() => {
    // Variable pour suivre si le dialogue de fichier est ouvert
    let fileDialogOpen = false
    
    // Fonction pour vérifier si le dialogue a été fermé sans sélection
    const checkFileDialogClose = () => {
      setTimeout(() => {
        if (fileDialogOpen) {
          fileDialogOpen = false
          // Émettre un événement personnalisé quand l'explorateur est fermé sans sélection
          window.dispatchEvent(new CustomEvent('fileDialogCancelled'))
          setState(prev => ({
            ...prev,
            isProcessing: false
          }))
        }
      }, 300)
    }
    
    // Marquer le dialogue comme ouvert quand on clique sur l'input
    fileDialogOpen = true
    
    // Ajouter un écouteur d'événement pour détecter quand la fenêtre reprend le focus
    setTimeout(() => {
      if (fileDialogOpen) {
        window.addEventListener('focus', checkFileDialogClose, { once: true })
      }
    }, 100)
    
    // Réinitialiser quand l'input change (un fichier a été sélectionné)
    const handleChange = () => {
      fileDialogOpen = false
    }
    
    // Ajouter temporairement l'écouteur d'événement
    inputRef.current?.addEventListener('change', handleChange, { once: true })
    
    // Ouvrir le dialogue de fichier
    inputRef.current?.click()
  }, [])

  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => {
      return {
        accept,
        multiple,
        type: "file",
        onChange: handleFileChange,
        style: { display: "none" },
        ref: inputRef,
        ...props,
      }
    },
    [accept, multiple, handleFileChange]
  )

  // Ajouter cet useEffect dans le hook useFileUpload, juste avant le return
    useEffect(() => {
        const handleResetUpload = () => {
        setState(prev => ({
            ...prev,
            files: [],
            errors: []
        }));
    };

    window.addEventListener('resetAvatarUpload', handleResetUpload);
    
    return () => {
      window.removeEventListener('resetAvatarUpload', handleResetUpload);
    };
  }, []);

  return [
    state,
    {
      addFiles,
      removeFile,
      clearFiles,
      clearErrors,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      getInputProps,
    },
  ]
}
