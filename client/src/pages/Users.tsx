import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, UserPlus, Edit, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoleName, getRoleBadgeColor, type UserRole } from "@/hooks/use-permissions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isActive: string;
  createdAt: string;
  createdBy?: string;
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={user.isActive === "true" ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                  >
                    {user.isActive === "true" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
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
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="motorista">Motorista</SelectItem>
                </SelectContent>
              </Select>
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações de {user.firstName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="motorista">Motorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
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
