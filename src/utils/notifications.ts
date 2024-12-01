import { supabase } from '@/lib/supabase';

export const createApplicationNotification = async (application: {
  first_name: string;
  last_name: string;
  job_id: string;
  id: string;
}) => {
  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("*, created_by")
      .eq("id", application.job_id)
      .single();

    if (!job) throw new Error("Job not found");

    const { error } = await supabase
      .from("notifications")
      .insert({
        title: "Nouvelle candidature",
        message: `${application.first_name} ${application.last_name} a postulé pour le poste "${job.title}"`,
        is_read: false,
        user_id: job.created_by,
        application_id: application.id
      });

    if (error) throw error;
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};