import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

type ImportStep = "upload" | "preview" | "importing" | "result";

interface ImportResult {
  success: boolean;
  line: number;
  data?: any;
  error?: string;
}

interface ParsedVehicle {
  line: number;
  brand: string;
  model: string;
  year: string;
  color: string;
  plate: string;
  vehicleType: string;
  status: string;
  purchasePrice: string;
  salePrice: string;
  kmOdometer: string;
  fuelType: string;
  physicalLocation: string;
  physicalLocationDetail: string;
  notes: string;
  errors: string[];
  selected: boolean;
}

export function ImportVehiclesDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedVehicle[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const { toast } = useToast();
  const { t } = useI18n();

  const resetDialog = () => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setImportProgress(0);
    setImportResults([]);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetDialog, 300);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Marca: "Toyota",
        Modelo: "Corolla",
        Ano: 2021,
        Cor: "Prata",
        Placa: "ABC-1234",
        Tipo: "Carro",
        Status: "Entrada",
        "Preço Compra": 85000,
        "Preço Venda": 98000,
        KM: 35000,
        Combustível: "Flex",
        Localização: "Matriz",
        Detalhes: "",
        Observações: "Revisão em dia",
      },
      {
        Marca: "Honda",
        Modelo: "CB 500",
        Ano: 2022,
        Cor: "Vermelho",
        Placa: "DEF-5678",
        Tipo: "Moto",
        Status: "Pronto para Venda",
        "Preço Compra": 25000,
        "Preço Venda": 32000,
        KM: 8000,
        Combustível: "Gasolina",
        Localização: "Loja",
        Detalhes: "Vitrine",
        Observações: "",
      },
      {
        Marca: "Chevrolet",
        Modelo: "Onix",
        Ano: 2020,
        Cor: "Branco",
        Placa: "GHI-9012",
        Tipo: "Carro",
        Status: "Em Reparos",
        "Preço Compra": 52000,
        "Preço Venda": 65000,
        KM: 48000,
        Combustível: "Flex",
        Localização: "Oficina",
        Detalhes: "Box 3",
        Observações: "Troca de pneus",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Veículos");

    ws["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 6 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
    ];

    XLSX.writeFile(wb, "template_veiculos.xlsx");
  };

  const validateRow = (row: any, line: number): ParsedVehicle => {
    const errors: string[] = [];
    const currentYear = new Date().getFullYear();

    const brand = String(row.Marca || row.marca || row.MARCA || "").trim();
    const model = String(row.Modelo || row.modelo || row.MODELO || "").trim();
    const year = String(row.Ano || row.ano || row.ANO || "").trim();
    const color = String(row.Cor || row.cor || row.COR || "").trim();
    const plate = String(row.Placa || row.placa || row.PLACA || "").toUpperCase().trim();
    const vehicleType = String(row.Tipo || row.tipo || row.TIPO || "Carro").trim();
    const status = String(row.Status || row.status || row.STATUS || "Entrada").trim();
    const purchasePrice = String(row["Preço Compra"] || row["Preco Compra"] || row["preco compra"] || "").trim();
    const salePrice = String(row["Preço Venda"] || row["Preco Venda"] || row["preco venda"] || "").trim();
    const kmOdometer = String(row.KM || row.km || row.Quilometragem || row.quilometragem || "").trim();
    const fuelType = String(row.Combustível || row.Combustivel || row.combustivel || "").trim();
    const physicalLocation = String(row.Localização || row.Localizacao || row.localizacao || "").trim();
    const physicalLocationDetail = String(row.Detalhes || row.detalhes || row["Detalhes Localização"] || "").trim();
    const notes = String(row.Observações || row.Observacoes || row.observacoes || row.Notas || "").trim();

    if (!brand) errors.push("Marca obrigatória");
    if (!model) errors.push("Modelo obrigatório");
    if (!year) errors.push("Ano obrigatório");
    if (!color) errors.push("Cor obrigatória");
    if (!plate) errors.push("Placa obrigatória");

    const plateRegex = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i;
    if (plate && !plateRegex.test(plate)) {
      errors.push("Placa inválida");
    }

    const yearNum = parseInt(year);
    if (year && (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1)) {
      errors.push("Ano inválido");
    }

    const allowedTypes = ["Carro", "Moto"];
    if (vehicleType && !allowedTypes.includes(vehicleType)) {
      errors.push("Tipo inválido");
    }

    const allowedStatuses = ["Entrada", "Em Reparos", "Em Higienização", "Pronto para Venda"];
    if (status && !allowedStatuses.includes(status)) {
      errors.push("Status inválido");
    }

    return {
      line,
      brand,
      model,
      year,
      color,
      plate,
      vehicleType,
      status,
      purchasePrice,
      salePrice,
      kmOdometer,
      fuelType,
      physicalLocation,
      physicalLocationDetail,
      notes,
      errors,
      selected: errors.length === 0,
    };
  };

  const parseFile = useCallback(async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast({
          title: t("import.emptySpreadsheet"),
          description: t("import.emptySpreadsheetDesc"),
          variant: "destructive",
        });
        return;
      }

      if (jsonData.length > 500) {
        toast({
          title: t("import.limitExceeded"),
          description: t("import.limitExceededDesc"),
          variant: "destructive",
        });
        return;
      }

      const seenPlates = new Set<string>();
      const parsed = jsonData.map((row, index) => {
        const vehicle = validateRow(row, index + 2);
        
        const normalizedPlate = vehicle.plate.replace("-", "");
        if (normalizedPlate && seenPlates.has(normalizedPlate)) {
          vehicle.errors.push("Placa duplicada");
          vehicle.selected = false;
        }
        if (normalizedPlate) {
          seenPlates.add(normalizedPlate);
        }

        return vehicle;
      });

      setParsedData(parsed);
      setStep("preview");
    } catch (error) {
      toast({
        title: t("import.readError"),
        description: t("import.readErrorDesc"),
        variant: "destructive",
      });
    }
  }, [toast]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        parseFile(selectedFile);
      }
    },
    [parseFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/vehicles/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao importar");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data.details || []);
      setImportProgress(100);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("import.importError"),
        description: error.message,
        variant: "destructive",
      });
      setStep("preview");
    },
  });

  const handleImport = async () => {
    if (!file) return;
    
    setStep("importing");
    setImportProgress(10);

    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await importMutation.mutateAsync(file);
    } finally {
      clearInterval(interval);
    }
  };

  const toggleSelectAll = (selected: boolean) => {
    setParsedData((prev) =>
      prev.map((v) => ({
        ...v,
        selected: v.errors.length === 0 ? selected : false,
      }))
    );
  };

  const toggleSelect = (line: number) => {
    setParsedData((prev) =>
      prev.map((v) =>
        v.line === line && v.errors.length === 0
          ? { ...v, selected: !v.selected }
          : v
      )
    );
  };

  const validCount = parsedData.filter((v) => v.errors.length === 0).length;
  const errorCount = parsedData.filter((v) => v.errors.length > 0).length;
  const selectedCount = parsedData.filter((v) => v.selected).length;

  const successCount = importResults.filter((r) => r.success).length;
  const failedCount = importResults.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-import-vehicles">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("import.downloadTemplate").replace("Baixar ", "").replace("Download ", "")}</span>
          <span className="sm:hidden">{t("import.downloadTemplate").replace("Baixar Template de Exemplo", "Importar").replace("Download Example Template", "Import")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t("import.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && t("import.uploadDescription")}
            {step === "preview" && t("import.previewDescription", { valid: validCount.toString(), error: errorCount.toString() })}
            {step === "importing" && t("import.importing")}
            {step === "result" && t("import.resultDescription", { success: successCount.toString(), failed: failedCount.toString() })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
              >
                <input {...getInputProps()} data-testid="input-file-upload" />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg font-medium">{t("import.dropFile")}</p>
                ) : (
                  <>
                    <p className="text-lg font-medium">
                      {t("import.dragOrClick")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("import.acceptedFormats")}
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("import.downloadTemplate")}
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("import.templateFields")}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-primary">{t("import.mandatory")}</span>
                    <ul className="text-muted-foreground">
                      <li>{t("import.brand")}</li>
                      <li>{t("import.model")}</li>
                      <li>{t("import.year")}</li>
                      <li>Cor</li>
                      <li>{t("import.plate")}</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">{t("import.optional")}</span>
                    <ul className="text-muted-foreground">
                      <li>Tipo (Carro/Moto)</li>
                      <li>{t("import.status")}</li>
                      <li>Preço Compra</li>
                      <li>Preço Venda</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">{t("import.optional")}</span>
                    <ul className="text-muted-foreground">
                      <li>KM</li>
                      <li>Combustível</li>
                      <li>Localização</li>
                      <li>Detalhes</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">{t("import.validStatuses")}</span>
                    <ul className="text-muted-foreground">
                      <li>Entrada</li>
                      <li>Em Reparos</li>
                      <li>Em Higienização</li>
                      <li>Pronto para Venda</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {file && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setFile(null);
                      setParsedData([]);
                      setStep("upload");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{validCount} {t("import.valid")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{errorCount} {t("import.withErrors")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <span>{selectedCount} {t("import.selected")}</span>
                </div>
              </div>

              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={validCount > 0 && selectedCount === validCount}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4"
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead className="w-12">{t("import.line")}</TableHead>
                      <TableHead>{t("import.brand")}</TableHead>
                      <TableHead>{t("import.model")}</TableHead>
                      <TableHead>{t("import.year")}</TableHead>
                      <TableHead>{t("import.plate")}</TableHead>
                      <TableHead>{t("import.status")}</TableHead>
                      <TableHead>{t("import.errorCol")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((vehicle) => (
                      <TableRow
                        key={vehicle.line}
                        className={
                          vehicle.errors.length > 0
                            ? "bg-destructive/5"
                            : vehicle.selected
                            ? "bg-green-500/5"
                            : ""
                        }
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={vehicle.selected}
                            disabled={vehicle.errors.length > 0}
                            onChange={() => toggleSelect(vehicle.line)}
                            className="h-4 w-4"
                            data-testid={`checkbox-vehicle-${vehicle.line}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {vehicle.line}
                        </TableCell>
                        <TableCell className="font-medium">{vehicle.brand}</TableCell>
                        <TableCell>{vehicle.model}</TableCell>
                        <TableCell>{vehicle.year}</TableCell>
                        <TableCell className="font-mono">{vehicle.plate}</TableCell>
                        <TableCell>{vehicle.status}</TableCell>
                        <TableCell>
                          {vehicle.errors.length > 0 ? (
                            <span className="text-destructive text-sm">
                              {vehicle.errors.join(", ")}
                            </span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">{t("import.importing")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("import.importingDesc")}
                </p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={importProgress} />
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8 py-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-500">{successCount}</div>
                  <div className="text-sm text-muted-foreground">{t("import.imported")}</div>
                </div>
                {failedCount > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-2">
                      <XCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                    <div className="text-sm text-muted-foreground">{t("import.errors")}</div>
                  </div>
                )}
              </div>

              {failedCount > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    <h4 className="font-medium text-destructive">{t("import.errors")} encontrados:</h4>
                    {importResults
                      .filter((r) => !r.success)
                      .map((result) => (
                        <div
                          key={result.line}
                          className="text-sm flex items-start gap-2 text-muted-foreground"
                        >
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <span>
                            <span className="font-medium">{t("import.line")} {result.line}:</span>{" "}
                            {result.error}
                          </span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setStep("upload");
                }}
              >
                {t("common.back")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0}
                data-testid="button-confirm-import"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t("import.title").split(" em Massa")[0].split(" in Bulk")[0]} {selectedCount} {selectedCount === 1 ? "veículo" : "veículos"}
              </Button>
            </>
          )}

          {step === "result" && (
            <Button onClick={handleClose} data-testid="button-close-import">
              {t("common.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
