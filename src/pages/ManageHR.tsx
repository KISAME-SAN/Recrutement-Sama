import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UserPlus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

type HRProfile = {
  id: string;
  full_name: string;
  first_name: string;
  phone: string;
  email: string;
  is_hr: boolean;
  created_at: string;
};

const ManageHR = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newHR, setNewHR] = useState({
    fullName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Rediriger si l'utilisateur n'est pas admin
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      return;
    }
  }, [isAdmin, user, navigate]);

  const { data: hrProfiles, isLoading, error } = useQuery({
    queryKey: ["hr-profiles"],
    queryFn: async () => {
      console.log("Fetching HR profiles...");
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            first_name,
            phone,
            is_hr,
            created_at,
            auth_user:auth.users!inner(email)
          `)
          .eq("is_hr", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching profiles:", error);
          throw error;
        }

        if (!profiles) {
          console.log("No profiles found");
          return [];
        }

        console.log("Fetched profiles:", profiles);

        return profiles.map(profile => ({
          ...profile,
          email: profile.auth_user?.email || "",
        })) as HRProfile[];
      } catch (error) {
        console.error("Error in query function:", error);
        throw error;
      }
    },
    enabled: !!user && isAdmin,
  });

  const toggleHRMutation = useMutation({
    mutationFn: async ({ profileId, isHR }: { profileId: string; isHR: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_hr: isHR })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-profiles"] });
      toast.success("Le statut du RH a été mis à jour");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    },
  });

  const createHRMutation = useMutation({
    mutationFn: async (values: typeof newHR) => {
      const { error } = await supabase.rpc("create_hr_user", {
        p_email: values.email,
        p_password: values.password,
        p_full_name: values.fullName,
        p_first_name: values.firstName,
        p_phone: values.phone,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-profiles"] });
      setIsCreateDialogOpen(false);
      setNewHR({
        fullName: "",
        firstName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      toast.success("Le RH a été créé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création du RH");
    },
  });

  const handleToggleHR = (profileId: string, currentStatus: boolean) => {
    toggleHRMutation.mutate({ profileId, isHR: !currentStatus });
  };

  const handleCreateHR = () => {
    if (newHR.password !== newHR.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    createHRMutation.mutate(newHR);
  };

  // Protection contre les accès non autorisés
  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  if (error) {
    console.error("Error in component:", error);
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erreur!</strong>
              <span className="block sm:inline"> Une erreur est survenue lors du chargement des données.</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">
              Gestion des Ressources Humaines
            </h1>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <UserPlus className="h-5 w-5 mr-2" />
              Créer un RH
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrProfiles?.map((hr) => (
                  <TableRow key={hr.id}>
                    <TableCell className="font-medium">{hr.full_name}</TableCell>
                    <TableCell>{hr.first_name}</TableCell>
                    <TableCell>{hr.email}</TableCell>
                    <TableCell>{hr.phone}</TableCell>
                    <TableCell>
                      {hr.is_hr ? (
                        <span className="text-green-600 font-medium">Actif</span>
                      ) : (
                        <span className="text-gray-500 font-medium">Inactif</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(hr.created_at), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleHR(hr.id, hr.is_hr)}
                          title={hr.is_hr ? "Désactiver" : "Activer"}
                        >
                          {hr.is_hr ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau RH</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour créer un nouveau compte RH
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={newHR.fullName}
                onChange={(e) =>
                  setNewHR({ ...newHR, fullName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={newHR.firstName}
                onChange={(e) =>
                  setNewHR({ ...newHR, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={newHR.phone}
                onChange={(e) => setNewHR({ ...newHR, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newHR.email}
                onChange={(e) => setNewHR({ ...newHR, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={newHR.password}
                onChange={(e) =>
                  setNewHR({ ...newHR, password: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={newHR.confirmPassword}
                onChange={(e) =>
                  setNewHR({ ...newHR, confirmPassword: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateHR}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageHR;
