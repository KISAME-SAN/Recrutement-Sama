import { supabase } from '@/lib/supabase';

// Types de notification
export const NotificationTypes = {
  ADMIN_NEW_APPLICATION: 'admin_new_application',
  USER_STATUS_CHANGE: 'user_status_change',
  USER_APPLICATION_UPDATE: 'user_application_update',
  APPLICATION: 'application',
  STATUS_CHANGE: 'status_change'
} as const;

// Créer une notification pour l'admin quand un utilisateur postule
export const createApplicationNotification = async (application: {
  first_name: string;
  last_name: string;
  job_id: string;
  id: string;
}) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, created_by, title")
      .eq("id", application.job_id)
      .single();

    if (jobError) {
      throw jobError;
    }

    if (!job) {
      throw new Error("Job non trouvé pour l'id: " + application.job_id);
    }

    // Utiliser un titre par défaut si le job n'a pas de titre
    const jobTitle = job.title || "Poste non spécifié";

    // Créer la notification
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: null,
        admin_id: job.created_by,
        application_id: application.id,
        message: `${application.first_name} ${application.last_name} a postulé pour le poste "${jobTitle}"`,
        notification_type: NotificationTypes.ADMIN_NEW_APPLICATION,
        is_read: false,
      });

    if (notificationError) {
      throw notificationError;
    }
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};

interface CreateNotificationParams {
  message: string;
  userId?: string;
  adminId?: string;
  applicationId: string;
  notificationType: string;
}

// Fonction générique de création de notification
export const createNotification = async ({
  message,
  userId,
  adminId,
  applicationId,
  notificationType
}: CreateNotificationParams) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        message,
        user_id: userId || null,
        admin_id: adminId || null,
        application_id: applicationId,
        notification_type: notificationType,
        is_read: false,
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};

// Créer une notification pour l'utilisateur quand le statut de sa candidature change
export const createStatusChangeNotification = async (
  applicationId: string,
  userId: string,
  newStatus: string
) => {
  try {
    // Récupérer les informations de la candidature
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select(`
        *,
        jobs (
          title
        )
      `)
      .eq("id", applicationId)
      .single();

    if (applicationError) {
      throw applicationError;
    }

    if (!application || !application.jobs) {
      throw new Error("Application ou job non trouvé");
    }

    const jobTitle = (application.jobs as { title: string }).title;

    // Créer le message en fonction du statut
    let message = "";
    switch (newStatus) {
      case "en attente":
        message = "Votre candidature est en attente d'examen";
        break;
      case "en cours d'examination":
        message = "Votre candidature est en cours d'examen";
        break;
      case "accepter":
        message = "Félicitations ! Votre candidature a été acceptée";
        break;
      case "refuser":
        message = "Votre candidature n'a malheureusement pas été retenue";
        break;
      default:
        message = "Le statut de votre candidature a été mis à jour";
    }

    message += ` pour le poste "${jobTitle}"`;

    // Créer la notification
    await createNotification({
      message,
      userId,
      applicationId,
      notificationType: NotificationTypes.STATUS_CHANGE,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};