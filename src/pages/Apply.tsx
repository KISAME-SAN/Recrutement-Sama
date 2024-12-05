import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { ApplicationForm } from "@/components/application/ApplicationForm";
import { ApplicationFormData } from "@/types/application";
import { submitApplication } from "@/utils/applications";

const Apply = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (values: ApplicationFormData) => {
      if (!id) throw new Error("ID de l'offre manquant");
      return await submitApplication(values, id);
    },
    onSuccess: () => {
      toast.success("Votre candidature a été envoyée avec succès");
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la soumission:", error);
      toast.error(`Erreur: ${error.message}`);
    },
  });

  if (jobLoading) {
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
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-primary">
              Postuler pour: {job?.title}
            </h1>

            <ApplicationForm
              onSubmit={(values) => applyMutation.mutate(values)}
              isSubmitting={applyMutation.isPending}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Apply;