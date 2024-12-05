import { supabase } from "@/lib/supabase";
import { ApplicationFormData } from "@/types/application";
import { createAdminNotification } from "./notifications-v2";

export async function submitApplication(values: ApplicationFormData, jobId: string) {
    console.log("Début de la soumission de candidature");
    
    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("Erreur d'authentification:", authError);
        throw new Error("Vous devez être connecté pour postuler");
    }

    try {
        // 2. Upload du CV
        const cvFile = values.cv;
        const cvPath = `${user.id}/${jobId}/${Date.now()}-${cvFile.name}`;
        const { error: cvError } = await supabase.storage
            .from("documents")
            .upload(cvPath, cvFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (cvError) {
            console.error("Erreur upload CV:", cvError);
            throw new Error("Erreur lors de l'upload du CV");
        }

        // 3. Upload de la lettre de motivation
        const clFile = values.coverLetter;
        const clPath = `${user.id}/${jobId}/${Date.now()}-${clFile.name}`;
        const { error: clError } = await supabase.storage
            .from("documents")
            .upload(clPath, clFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (clError) {
            console.error("Erreur upload lettre de motivation:", clError);
            // Nettoyer le CV déjà uploadé
            await supabase.storage.from("documents").remove([cvPath]);
            throw new Error("Erreur lors de l'upload de la lettre de motivation");
        }

        // 4. Récupérer les informations du job
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("title")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            console.error("Erreur récupération job:", jobError);
            throw new Error("Erreur lors de la récupération des informations du poste");
        }

        // 5. Créer la candidature
        const { data: application, error: applicationError } = await supabase
            .from("applications")
            .insert({
                job_id: jobId,
                user_id: user.id,
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

        if (applicationError || !application) {
            console.error("Erreur création candidature:", applicationError);
            // Nettoyer les fichiers en cas d'erreur
            await supabase.storage.from("documents").remove([cvPath, clPath]);
            throw new Error("Erreur lors de la création de la candidature");
        }

        // 6. Créer la notification admin
        await createAdminNotification(
            user.id,
            jobId,
            job.title,
            application.id
        );

        return true;
    } catch (error) {
        console.error("Erreur lors de la soumission:", error);
        throw error;
    }
}
