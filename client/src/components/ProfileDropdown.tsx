import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Settings, 
  LogOut, 
  Camera, 
  Mail, 
  Lock, 
  ChevronDown,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
});

const emailSchema = z.object({
  newEmail: z.string().email("Email inválido"),
  confirmEmail: z.string().email("Email inválido"),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Os emails não coincidem",
  path: ["confirmEmail"],
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter letra maiúscula")
    .regex(/[a-z]/, "Deve conter letra minúscula")
    .regex(/[0-9]/, "Deve conter número"),
  confirmPassword: z.string().min(1, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const bugReportSchema = z.object({
  message: z.string().min(10, "Descreva o problema com pelo menos 10 caracteres"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type BugReportFormData = z.infer<typeof bugReportSchema>;

export function ProfileDropdown() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportFilesRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const bugReportForm = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      message: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram salvos com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      return apiRequest("PATCH", "/api/profile/email", { email: data.newEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      emailForm.reset();
      toast({
        title: "Email atualizado",
        description: "Seu email foi alterado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar email",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return apiRequest("PATCH", "/api/profile/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada. Você será redirecionado para fazer login novamente.",
      });
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Verifique a senha atual e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar foto");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsUploadingPhoto(false);
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      setIsUploadingPhoto(false);
      toast({
        title: "Erro ao enviar foto",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/profile/photo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover foto",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const submitBugReportMutation = useMutation({
    mutationFn: async (data: BugReportFormData) => {
      const formData = new FormData();
      formData.append("message", data.message);
      supportFiles.forEach(file => {
        formData.append("attachments", file);
      });

      const response = await fetch("/api/bug-reports", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar relatório");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Relatório enviado",
        description: "Obrigado pelo feedback! Nosso time analisará em breve.",
      });
      bugReportForm.reset();
      setSupportFiles([]);
      setIsSupportDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar relatório",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A foto deve ter no máximo 2MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Validar tipo de arquivo
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Use apenas JPEG, PNG, GIF ou WebP.",
          variant: "destructive",
        });
        return;
      }
      
      setIsUploadingPhoto(true);
      uploadPhotoMutation.mutate(file);
    }
  };

  const getInitials = () => {
    const first = user?.firstName?.[0] || user?.email?.[0] || "U";
    const last = user?.lastName?.[0] || "";
    return (first + last).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email?.split("@")[0] || "Usuário";
  };

  const getRoleLabel = () => {
    const roles: Record<string, string> = {
      proprietario: "Proprietário",
      gerente: "Gerente",
      financeiro: "Financeiro",
      vendedor: "Vendedor",
      motorista: "Motorista",
    };
    return roles[user?.role || ""] || "Usuário";
  };

  const newPassword = passwordForm.watch("newPassword");
  const passwordRequirements = {
    length: newPassword?.length >= 8,
    uppercase: /[A-Z]/.test(newPassword || ""),
    lowercase: /[a-z]/.test(newPassword || ""),
    number: /[0-9]/.test(newPassword || ""),
  };
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-2 sm:px-3"
            data-testid="button-profile-dropdown"
          >
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
              {getUserDisplayName()}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              <p className="text-xs leading-none text-muted-foreground mt-1">{getRoleLabel()}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              setActiveTab("profile");
              setIsDialogOpen(true);
            }}
            data-testid="menu-item-edit-profile"
          >
            <User className="mr-2 h-4 w-4" />
            Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              setActiveTab("email");
              setIsDialogOpen(true);
            }}
            data-testid="menu-item-change-email"
          >
            <Mail className="mr-2 h-4 w-4" />
            Alterar Email
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              setActiveTab("password");
              setIsDialogOpen(true);
            }}
            data-testid="menu-item-change-password"
          >
            <Lock className="mr-2 h-4 w-4" />
            Alterar Senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setIsSupportDialogOpen(true)}
            data-testid="menu-item-support"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Suporte
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => window.location.href = "/api/logout"}
            className="text-destructive focus:text-destructive"
            data-testid="menu-item-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurações da Conta</DialogTitle>
            <DialogDescription>
              Gerencie suas informações pessoais e preferências de segurança.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" data-testid="tab-profile">Perfil</TabsTrigger>
              <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
              <TabsTrigger value="password" data-testid="tab-password">Senha</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    data-testid="button-change-photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    data-testid="input-photo-upload"
                  />
                </div>
                {user?.profileImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhotoMutation.mutate()}
                    disabled={removePhotoMutation.isPending}
                    className="text-muted-foreground text-xs"
                    data-testid="button-remove-photo"
                  >
                    {removePhotoMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Remover foto
                  </Button>
                )}
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu nome" 
                            {...field} 
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu sobrenome" 
                            {...field} 
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Salvar alterações
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="rounded-md bg-muted p-3">
                <Label className="text-xs text-muted-foreground">Email atual</Label>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>

              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit((data) => updateEmailMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Novo email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="novo@email.com" 
                            {...field} 
                            data-testid="input-new-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="confirmEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar novo email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="novo@email.com" 
                            {...field} 
                            data-testid="input-confirm-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={updateEmailMutation.isPending}
                      data-testid="button-save-email"
                    >
                      {updateEmailMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Alterar email
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 mt-4">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha atual</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Digite sua senha atual" 
                              {...field} 
                              data-testid="input-current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Digite a nova senha" 
                              {...field} 
                              data-testid="input-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-md bg-muted p-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Requisitos da senha:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordRequirements.length ? "text-green-600" : "text-muted-foreground"}`}>
                        {passwordRequirements.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        8 caracteres
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.uppercase ? "text-green-600" : "text-muted-foreground"}`}>
                        {passwordRequirements.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Letra maiúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.lowercase ? "text-green-600" : "text-muted-foreground"}`}>
                        {passwordRequirements.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Letra minúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.number ? "text-green-600" : "text-muted-foreground"}`}>
                        {passwordRequirements.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Número
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nova senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme a nova senha" 
                              {...field} 
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending || !allRequirementsMet}
                      data-testid="button-save-password"
                    >
                      {updatePasswordMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Alterar senha
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bug Report Dialog */}
      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report Problem</DialogTitle>
            <DialogDescription>
              Help us improve! Describe the problem you found.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-900 dark:text-amber-100">
              <strong>Beta System:</strong> Bugs and failures can happen. Your reports are essential to improve VeloStock!
            </p>
          </div>

          <Form {...bugReportForm}>
            <form onSubmit={bugReportForm.handleSubmit((data) => submitBugReportMutation.mutate(data))} className="space-y-4">
              <FormField
                control={bugReportForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the problem</FormLabel>
                    <FormControl>
                      <textarea 
                        placeholder="Ex: The dashboard doesn't load when..."
                        className="w-full min-h-32 px-3 py-2 border border-input rounded-md text-sm"
                        {...field}
                        data-testid="textarea-bug-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Attach files (up to 5)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition"
                  onClick={() => supportFilesRef.current?.click()}
                  data-testid="dropzone-bug-attachments"
                >
                  {supportFiles.length === 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">Click or drag files here</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF - max 5MB each</p>
                    </>
                  ) : (
                    <p className="text-sm text-green-600">{supportFiles.length} file(s) selected</p>
                  )}
                </div>
                <input
                  ref={supportFilesRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    setSupportFiles(files);
                  }}
                  data-testid="input-bug-attachments"
                />
                {supportFiles.length > 0 && (
                  <div className="space-y-1">
                    {supportFiles.map((file, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between items-center">
                        <span>{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSupportFiles(supportFiles.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsSupportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={submitBugReportMutation.isPending}
                  data-testid="button-submit-bug-report"
                >
                  {submitBugReportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Send Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
