import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users as UsersIcon, UserPlus, Edit, XCircle, CheckCircle, DollarSign, Shield, Trash2 } from "lucide-react";
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
import { getRoleName, getRoleBadgeColor, AVAILABLE_PERMISSIONS, type UserRole } from "@/hooks/use-permissions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CustomPermissions } from "@shared/schema";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isActive: string;
  createdAt: string;
  createdBy?: string;
  comissaoFixa?: string | null;
  usarComissaoFixaGlobal?: string;
  customPermissions?: CustomPermissions;
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Buscar usuários
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Criar usuário
  const createUser = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName?: string; role: string; password: string }) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Usuário criado!",
        description: "O novo usuário foi adicionado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar usuário
  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: Partial<User> & { id: string }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Usuário atualizado!",
        description: "As informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleActive = (user: User) => {
    const newStatus = user.isActive === "true" ? "false" : "true";
    updateUser.mutate({
      id: user.id,
      isActive: newStatus,
    });
  };

  // Deletar usuário
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao remover usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
      toast({
        title: "Usuário removido!",
        description: "O usuário foi removido permanentemente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie os usuários e permissões da sua empresa
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Usuários da Empresa</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "usuário cadastrado" : "usuários cadastrados"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">
                      {user.firstName} {user.lastName || ""}
                    </h3>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleName(user.role)}
                    </Badge>
                    {user.isActive === "false" && (
                      <Badge variant="outline" className="text-red-600">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criado {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsEditDialogOpen(true);
                    }}
                    title="Editar usuário"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={user.isActive === "true" ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                    title={user.isActive === "true" ? "Desativar usuário" : "Ativar usuário"}
                  >
                    {user.isActive === "true" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserToDelete(user)}
                    title="Remover usuário permanentemente"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário cadastrado ainda.</p>
                <p className="text-sm mt-2">Clique em "Adicionar Usuário" para começar.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Adicionar Usuário */}
      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(data) => createUser.mutate(data)}
        isLoading={createUser.isPending}
      />

      {/* Dialog Editar Usuário */}
      {selectedUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={selectedUser}
          onSubmit={(data) => updateUser.mutate({ ...data, id: selectedUser.id })}
          isLoading={updateUser.isPending}
        />
      )}

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover permanentemente o usuário{" "}
              <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os dados associados a este usuário serão mantidos, 
              mas ele não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser.mutate(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteUser.isPending ? "Removendo..." : "Remover Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function AddUserDialog({ open, onOpenChange, onSubmit, isLoading }: AddUserDialogProps) {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "vendedor",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ email: "", firstName: "", lastName: "", role: "vendedor", password: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo funcionário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha Temporária *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Papel no Sistema *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprietario">Proprietário</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="motorista">Motorista</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === "financeiro" && "Acesso a relatórios, contas e custos. Sem acesso a leads e detalhes dos veículos."}
                {formData.role === "proprietario" && "Acesso total ao sistema."}
                {formData.role === "gerente" && "Acesso gerencial completo, exceto contas financeiras."}
                {formData.role === "vendedor" && "Acesso a veículos, leads e vendas."}
                {formData.role === "motorista" && "Acesso limitado para registro de custos e movimentações."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function EditUserDialog({ open, onOpenChange, user, onSubmit, isLoading }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName || "",
    role: user.role,
    usarComissaoFixaGlobal: user.usarComissaoFixaGlobal !== "false",
    comissaoFixa: user.comissaoFixa || "",
  });

  // Normalizar customPermissions: converter strings "true"/"false" para booleanos
  const normalizePermissions = (perms: any): CustomPermissions => {
    if (!perms) return {};
    const normalized: CustomPermissions = {};
    for (const key of Object.keys(perms)) {
      const value = perms[key];
      if (value === "true" || value === true) {
        normalized[key as keyof CustomPermissions] = true;
      } else if (value === "false" || value === false) {
        normalized[key as keyof CustomPermissions] = false;
      } else {
        normalized[key as keyof CustomPermissions] = value;
      }
    }
    return normalized;
  };

  const [customPermissions, setCustomPermissions] = useState<CustomPermissions>(
    normalizePermissions(user.customPermissions)
  );

  const [activeTab, setActiveTab] = useState("info");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Converter customPermissions para strings "true"/"false" para armazenamento
    const permissionsToSubmit: any = {};
    for (const [key, value] of Object.entries(customPermissions)) {
      permissionsToSubmit[key] = value === true ? "true" : value === false ? "false" : value;
    }
    const dataToSubmit = {
      ...formData,
      usarComissaoFixaGlobal: formData.usarComissaoFixaGlobal ? "true" : "false",
      comissaoFixa: formData.usarComissaoFixaGlobal ? null : (formData.comissaoFixa || null),
      customPermissions: permissionsToSubmit,
    };
    onSubmit(dataToSubmit);
  };

  const isVendedor = formData.role === "vendedor";

  const togglePermission = (key: keyof CustomPermissions) => {
    setCustomPermissions((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? true : !prev[key],
    }));
  };

  const resetPermissions = () => {
    setCustomPermissions({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações de {user.firstName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Gerenciar Acessos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName">Nome</Label>
                  <Input
                    id="edit-firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName">Sobrenome</Label>
                  <Input
                    id="edit-lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Papel no Sistema</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proprietario">Proprietário</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="motorista">Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.role === "financeiro" && "Acesso a relatórios, contas e custos. Sem acesso a leads e detalhes dos veículos."}
                    {formData.role === "proprietario" && "Acesso total ao sistema."}
                    {formData.role === "gerente" && "Acesso gerencial completo, exceto contas financeiras."}
                    {formData.role === "vendedor" && "Acesso a veículos, leads e vendas."}
                    {formData.role === "motorista" && "Acesso limitado para registro de custos e movimentações."}
                  </p>
                </div>

                {/* Campos de comissão (apenas para vendedores) */}
                {isVendedor && (
                  <div className="grid gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <Label className="text-base font-semibold">Configuração de Comissão</Label>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label htmlFor="usar-comissao-global" className="text-sm font-medium">
                          Usar comissão fixa global
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Quando ativado, usa o valor de comissão configurado nas configurações da empresa
                        </p>
                      </div>
                      <Switch
                        id="usar-comissao-global"
                        checked={formData.usarComissaoFixaGlobal}
                        onCheckedChange={(checked) => setFormData({ ...formData, usarComissaoFixaGlobal: checked })}
                        data-testid="switch-comissao-global"
                      />
                    </div>

                    {!formData.usarComissaoFixaGlobal && (
                      <div className="grid gap-2">
                        <Label htmlFor="comissao-fixa">Comissão Fixa Individual (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                          <Input
                            id="comissao-fixa"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-10"
                            value={formData.comissaoFixa}
                            onChange={(e) => setFormData({ ...formData, comissaoFixa: e.target.value })}
                            data-testid="input-comissao-fixa"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Este vendedor receberá este valor fixo por cada venda realizada
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      Permissões Personalizadas
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por padrão, as permissões seguem o papel do usuário. Ative permissões extras aqui.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetPermissions}
                  >
                    Resetar
                  </Button>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_PERMISSIONS.map((permission) => {
                    const isEnabled = customPermissions[permission.key as keyof CustomPermissions];
                    
                    return (
                      <div
                        key={permission.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-background border"
                      >
                        <div className="flex-1">
                          <Label className="text-sm font-medium">{permission.label}</Label>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled === true}
                          onCheckedChange={() => togglePermission(permission.key as keyof CustomPermissions)}
                          data-testid={`switch-${permission.key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
