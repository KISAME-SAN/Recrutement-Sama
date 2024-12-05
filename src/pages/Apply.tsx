import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { ApplicationForm } from "@/components/application/ApplicationForm";
import { ApplicationFormData } from "@/types/application";

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

      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("Vous devez être connecté");
      }

      // Upload CV
      const cvFile = values.cv;
      const cvPath = `applications/${user.data.user.id}/${id}/cv-${Date.now()}-${cvFile.name}`;
      const { error: cvError } = await supabase.storage
        .from("documents")
        .upload(cvPath, cvFile);
      if (cvError) {
        throw cvError;
      }

      // Upload Cover Letter
      const clFile = values.coverLetter;
      const clPath = `applications/${user.data.user.id}/${id}/cl-${Date.now()}-${clFile.name}`;
      const { error: clError } = await supabase.storage
        .from("documents")
        .upload(clPath, clFile);
      if (clError) {
        throw clError;
      }

      // Create application
      const { data: newApplication, error: applicationError } = await supabase
        .from("applications")
        .insert({
          job_id: id,
          user_id: user.data.user.id,
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          phone: values.phone,
          gender: values.gender,
          age: values.age,
          professional_experience: values.professionalExperience,
          skills: values.skills,
          diploma: values.diploma,
          years_of_experience: values.yearsOfExperience,
          previous_company: values.previousCompany,
          cv_url: cvPath,
          cover_letter_url: clPath,
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      return newApplication;
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