import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getChecklistCategories, type VehicleType } from "@shared/checklistUtils";

interface ChecklistCategory {
  id: string;
  empresaId: string;
  name: string;
  vehicleType: string;
  order: number;
  isActive: string;
  createdAt: string;
}

interface ChecklistCustomItem {
  id: string;
  empresaId: string;
  categoryId: string | null;
  categoryKey: string | null;
  itemName: string;
  vehicleType: string;
  order: number;
  isActive: string;
  createdAt: string;
}

interface AddChecklistItemDialogProps {
  vehicleType?: VehicleType;
  onItemAdded?: () => void;
}

export function AddChecklistItemDialog({ vehicleType = "Carro", onItemAdded }: AddChecklistItemDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: customCategories = [] } = useQuery<ChecklistCategory[]>({
    queryKey: ["/api/checklist-categories"],
  });

  const { data: customItems = [] } = useQuery<ChecklistCustomItem[]>({
    queryKey: ["/api/checklist-items"],
  });

  const defaultCategories = getChecklistCategories(vehicleType);
  const defaultCategoryKeys = Object.keys(defaultCategories) as Array<keyof typeof defaultCategories>;

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; vehicleType: string }) => {
      const response = await apiRequest("POST", "/api/checklist-categories", data);
      return await response.json() as ChecklistCategory;
    },
    onSuccess: (newCategory: ChecklistCategory) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-categories"] });
      toast({ title: t("checklist.categoryCreated") });
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setSelectedCategory(`custom:${newCategory.id}`);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: { itemName: string; categoryId?: string; categoryKey?: string; vehicleType: string }) => {
      const response = await apiRequest("POST", "/api/checklist-items", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items"] });
      toast({ title: t("checklist.itemAdded") });
      setItemName("");
      setSelectedCategory("");
      setOpen(false);
      onItemAdded?.();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/checklist-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items"] });
      toast({ title: t("checklist.itemDeleted") });
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({ name: newCategoryName, vehicleType });
  };

  const handleAddItem = () => {
    if (!itemName.trim() || !selectedCategory) return;

    const isCustomCategory = selectedCategory.startsWith("custom:");
    const data = {
      itemName,
      vehicleType,
      ...(isCustomCategory 
        ? { categoryId: selectedCategory.replace("custom:", "") }
        : { categoryKey: selectedCategory }
      ),
    };

    createItemMutation.mutate(data);
  };

  const getCategoryDisplayName = (item: ChecklistCustomItem) => {
    if (item.categoryKey) {
      const key = item.categoryKey as keyof typeof defaultCategories;
      return defaultCategories[key] || item.categoryKey;
    }
    if (item.categoryId) {
      const cat = customCategories.find(c => c.id === item.categoryId);
      return cat?.name || "Custom";
    }
    return "N/A";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-checklist-item">
          <Plus className="h-4 w-4 mr-1" />
          {t("checklist.addItem")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("checklist.addItemTitle")}</DialogTitle>
          <DialogDescription>{t("checklist.addItemDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">{t("checklist.itemName")}</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={t("checklist.itemNamePlaceholder")}
              data-testid="input-checklist-item-name"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("checklist.selectCategory")}</Label>
            {!isCreatingCategory ? (
              <div className="space-y-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-checklist-category">
                    <SelectValue placeholder={t("checklist.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {t("checklist.existingCategories")}
                    </div>
                    {defaultCategoryKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {defaultCategories[key]}
                      </SelectItem>
                    ))}
                    {customCategories.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1">
                          {t("checklist.customItems")}
                        </div>
                        {customCategories.map((cat) => (
                          <SelectItem key={cat.id} value={`custom:${cat.id}`}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingCategory(true)}
                  className="w-full"
                  data-testid="button-create-new-category"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("checklist.createNewCategory")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t("checklist.newCategoryPlaceholder")}
                  data-testid="input-new-category-name"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    data-testid="button-confirm-create-category"
                  >
                    {t("common.create")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {customItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-muted-foreground">{t("checklist.customItems")}</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {customItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/50 rounded">
                    <span>{item.itemName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{getCategoryDisplayName(item)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        data-testid={`button-delete-item-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleAddItem}
            disabled={!itemName.trim() || !selectedCategory || createItemMutation.isPending}
            data-testid="button-confirm-add-item"
          >
            {t("checklist.addItem")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
