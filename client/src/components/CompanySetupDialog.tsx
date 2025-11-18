import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateCompany, type Company } from "../hooks/use-company";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";

const companySchema = z.object({
  nomeFantasia: z.string().min(1, "Nome fantasia é obrigatório"),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  telefone2: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  corPrimaria: z.string().default("#8B5CF6"),
  corSecundaria: z.string().default("#10B981"),
  whatsappNumero: z.string().optional(),
  locaisComuns: z.string().optional(),
  alertaDiasParado: z.number().default(7),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompanySetupDialog({ open, onOpenChange, onSuccess }: CompanySetupDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCompany = useCreateCompany();
  const { toast } = useToast();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      corPrimaria: "#8B5CF6",
      corSecundaria: "#10B981",
      alertaDiasParado: 7,
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      const locaisArray = data.locaisComuns
        ? data.locaisComuns.split(",").map((l) => l.trim()).filter(Boolean)
        : ["Matriz", "Filial", "Pátio Externo", "Oficina"];

      await createCompany.mutateAsync({
        ...data,
        locaisComuns: locaisArray,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Empresa</DialogTitle>
          <DialogDescription>
            Configure os dados da sua empresa para começar a usar o AutoFlow
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
              <Input
                id="nomeFantasia"
                {...form.register("nomeFantasia")}
                placeholder="Ex: Capoeiras Automóveis"
              />
              {form.formState.errors.nomeFantasia && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nomeFantasia.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                {...form.register("razaoSocial")}
                placeholder="Ex: Capoeiras Automóveis LTDA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...form.register("cnpj")}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...form.register("telefone")}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone2">Telefone 2</Label>
              <Input
                id="telefone2"
                {...form.register("telefone2")}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappNumero">WhatsApp</Label>
              <Input
                id="whatsappNumero"
                {...form.register("whatsappNumero")}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                {...form.register("endereco")}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="corPrimaria">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="corPrimaria"
                  type="color"
                  {...form.register("corPrimaria")}
                  className="h-10 w-20"
                />
                <Input
                  {...form.register("corPrimaria")}
                  placeholder="#dc2626"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="corSecundaria">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="corSecundaria"
                  type="color"
                  {...form.register("corSecundaria")}
                  className="h-10 w-20"
                />
                <Input
                  {...form.register("corSecundaria")}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertaDiasParado">Alerta Dias Parado</Label>
              <Input
                id="alertaDiasParado"
                type="number"
                {...form.register("alertaDiasParado", { valueAsNumber: true })}
                placeholder="7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locaisComuns">Locais Comuns (separados por vírgula)</Label>
            <Input
              id="locaisComuns"
              {...form.register("locaisComuns")}
              placeholder="Matriz, Filial, Pátio Externo, Oficina"
            />
            <p className="text-xs text-muted-foreground">
              Ex: Matriz, Filial, Pátio Externo, Oficina
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
