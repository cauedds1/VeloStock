import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

export function ImageUpload({ onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = files.length + selectedFiles.length;

    if (totalFiles > maxImages) {
      alert(`Você pode adicionar no máximo ${maxImages} imagens`);
      return;
    }

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    onImagesChange(newFiles);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newFiles = files.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    setFiles(newFiles);
    onImagesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-card-foreground">
          Fotos do Veículo
        </label>
        <span className="text-xs text-muted-foreground">
          {files.length}/{maxImages} fotos
        </span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-video overflow-hidden rounded-lg border border-border">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover-elevate"
                data-testid={`button-remove-image-${index}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxImages && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 md:p-8 transition-colors hover-elevate active:scale-[0.98]">
          <input
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-upload-images"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">
                <span className="hidden sm:inline">Clique para adicionar fotos</span>
                <span className="sm:hidden">Tocar para tirar foto ou escolher da galeria</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG até 10MB cada
              </p>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
