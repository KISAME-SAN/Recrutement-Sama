import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { createStatusChangeNotification } from "@/utils/notifications-v2";
import { NotificationStatus } from "@/types/notifications";

const ApplicationDetails = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: ["application-details", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs (
            title
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (application?.status === newStatus) {
        console.log("Le statut n'a pas changé, pas de mise à jour nécessaire");
        return;
      }

      // 1. Mettre à jour le statut de la candidature
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      // 2. Créer une notification pour l'utilisateur
      if (application?.user_id) {
        const notificationStatus = newStatus as NotificationStatus;
        await createStatusChangeNotification(id!, application.user_id, notificationStatus);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-details", id] });
      toast.success("Statut mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    },
  });

  const getFileUrl = async (path: string) => {
    const { data } = await supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  };

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

  if (!application) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Aucune candidature trouvée</p>
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
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* En-tête */}
              <div className="bg-primary p-6 text-white">
                <h1 className="text-3xl font-bold">
                  {application.first_name} {application.last_name}
                </h1>
                <p className="mt-2 text-primary-foreground/80">{application.email}</p>
              </div>

              {/* Informations personnelles */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-primary">
                      Informations personnelles
                    </h2>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Téléphone:</span>{" "}
                        {application.phone}
                      </p>
                      <p>
                        <span className="font-medium">Genre:</span>{" "}
                        {application.gender}
                      </p>
                      <p>
                        <span className="font-medium">Âge:</span>{" "}
                        {application.age} ans
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-primary">
                      Formation et expérience
                    </h2>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Diplôme:</span>{" "}
                        {application.diploma}
                      </p>
                      <p>
                        <span className="font-medium">Années d'expérience:</span>{" "}
                        {application.years_of_experience}
                      </p>
                      {application.previous_company && (
                        <p>
                          <span className="font-medium">
                            Entreprise précédente:
                          </span>{" "}
                          {application.previous_company}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expérience et compétences */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-primary">
                    Expérience professionnelle
                  </h2>
                  <div className="whitespace-pre-wrap break-words overflow-hidden bg-gray-50 rounded-lg p-4 border">
                    {application.professional_experience}
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-primary">
                    Compétences
                  </h2>
                  <div className="whitespace-pre-wrap break-words overflow-hidden bg-gray-50 rounded-lg p-4 border">
                    {application.skills}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-primary">Documents</h2>
                  <div className="flex gap-4">
                    <Button
                      onClick={async () => {
                        const url = await getFileUrl(application.cv_url);
                        window.open(url, "_blank");
                      }}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-5 w-5" />
                      Voir le CV
                    </Button>
                    <Button
                      onClick={async () => {
                        const url = await getFileUrl(
                          application.cover_letter_url
                        );
                        window.open(url, "_blank");
                      }}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-5 w-5" />
                      Voir la lettre de motivation
                    </Button>
                  </div>
                </div>

                {/* Statut avec sélecteur */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-primary">
                      Statut de la candidature
                    </h2>
                    <Select
                      value={application.status}
                      onValueChange={(value) => updateStatusMutation.mutate(value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en attente">En attente</SelectItem>
                        <SelectItem value="en cours d'examination">
                          En cours d'examination
                        </SelectItem>
                        <SelectItem value="accepter">Accepté</SelectItem>
                        <SelectItem value="refuser">Refusé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApplicationDetails;