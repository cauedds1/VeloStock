import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { FileText, Upload, Download, Trash2, FileCheck, FileWarning, FileBadge } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "CRLV", labelKey: "documents.typeCRLV", descKey: "documents.typeCRLVDesc", icon: FileCheck },
  { value: "Nota Fiscal", labelKey: "documents.typeInvoice", descKey: "documents.typeInvoiceDesc", icon: FileBadge },
  { value: "Laudo Cautelar", labelKey: "documents.typeCautionary", descKey: "documents.typeCautionaryDesc", icon: FileWarning },
  { value: "Contrato de Compra", labelKey: "documents.typePurchase", descKey: "documents.typePurchaseDesc", icon: FileText },
  { value: "Transferência", labelKey: "documents.typeTransfer", descKey: "documents.typeTransferDesc", icon: FileText },
];

interface VehicleDocumentsProps {
  vehicleId: string;
}

export function VehicleDocuments({ vehicleId }: VehicleDocumentsProps) {
  const { t } = useI18n();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; docId: string | null }>({ 
    open: false, 
    docId: null 
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/vehicles/${vehicleId}/documents`],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", type);

      const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("documents.errorSending"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/documents`] });
      setSelectedFile(null);
      setSelectedType("");
      toast({
        title: t("documents.documentSent"),
        description: t("documents.documentSentDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("documents.errorSending"),
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await fetch(`/api/vehicles/${vehicleId}/documents/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t("documents.errorRemoving"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/documents`] });
      toast({
        title: t("documents.documentRemoved"),
        description: t("documents.documentRemovedDesc"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("documents.errorRemoving"),
        description: t("documents.errorRemovingDesc"),
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          variant: "destructive",
          title: t("documents.invalidFile"),
          description: t("documents.onlyPdf"),
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t("documents.fileTooLarge"),
          description: t("documents.maxSize"),
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedType) {
      toast({
        variant: "destructive",
        title: t("documents.invalidFile"),
        description: t("documents.selectType"),
      });
      return;
    }

    uploadMutation.mutate({ file: selectedFile, type: selectedType });
  };

  const handleDownload = (docId: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/vehicles/${vehicleId}/documents/${docId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (docId: string) => {
    setDeleteDialog({ open: true, docId });
  };

  const confirmDelete = () => {
    if (deleteDialog.docId) {
      deleteMutation.mutate(deleteDialog.docId);
    }
    setDeleteDialog({ open: false, docId: null });
  };

  const groupedDocuments = DOCUMENT_TYPES.map(docType => ({
    ...docType,
    documents: documents.filter(doc => doc.documentType === docType.value),
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Upload className="h-5 w-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-card-foreground">
            {t("documents.uploadTitle")}
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("documents.documentType")}
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder={t("documents.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("documents.pdfFile")}
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90 cursor-pointer"
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !selectedType || uploadMutation.isPending}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? t("common.loading") : t("documents.sendDocument")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-card-foreground">
            {t("documents.vehicleDocuments")}
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>{t("documents.noDocuments")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedDocuments.map(group => {
              if (group.documents.length === 0) return null;
              
              const Icon = group.icon;
              
              return (
                <div key={group.value}>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Icon className="h-4 w-4 mr-1" />
                    {t(group.labelKey)}
                  </h4>
                  <div className="space-y-2">
                    {group.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded hover:bg-accent"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {doc.originalFileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.id, doc.originalFileName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, docId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("documents.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("documents.confirmDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
