import { supabase } from "@/lib/supabase";

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
  application_id: string;
}) => {
  console.log("=== DÉBUT CRÉATION NOTIFICATION ADMIN ===");
  console.log("Données de candidature:", application);

  try {
    // Récupérer le titre du poste et le créateur avec plus de détails
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, created_by, title")
      .eq("id", application.job_id)
      .single();

    console.log("Job récupéré:", job);
    console.log("Admin ID (created_by):", job?.created_by);

    if (jobError) {
      console.error("Erreur lors de la récupération du job:", jobError);
      throw jobError;
    }

    if (!job) {
      const error = new Error("Job non trouvé pour l'id: " + application.job_id);
      console.error(error);
      throw error;
    }

    // Utiliser un titre par défaut si le job n'a pas de titre
    const jobTitle = job.title || "Poste non spécifié";

    // Récupérer l'admin (créateur du job ou admin par défaut)
    let adminId = job.created_by;
    if (!adminId) {
      console.log("Recherche d'un admin par défaut...");
      const { data: adminUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true)
        .single();

      if (!adminUser) {
        throw new Error("Aucun administrateur trouvé pour recevoir la notification");
      }
      
      adminId = adminUser.id;
      console.log("Admin par défaut trouvé:", adminId);
    }

    // Créer la notification pour l'admin
    const adminNotificationData = {
      message: `${application.first_name} ${application.last_name} a postulé pour le poste "${jobTitle}"`,
      is_read: false,
      admin_id: adminId,
      user_id: null, // Explicitement null pour les notifications admin
      application_id: application.application_id,
      type: NotificationTypes.ADMIN_NEW_APPLICATION,
      status: "en attente",
      notification_type: NotificationTypes.APPLICATION // Utiliser 'application' comme type
    };

    console.log("Données de notification à insérer:", adminNotificationData);

    // Vérifier qu'il n'y a pas déjà une notification similaire non lue
    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("application_id", application.application_id)
      .eq("type", NotificationTypes.ADMIN_NEW_APPLICATION)
      .eq("is_read", false)
      .eq("admin_id", adminId)
      .single();

    if (existingNotification) {
      console.log("Une notification non lue existe déjà pour cette candidature");
      return;
    }

    const { data: insertedNotification, error: adminNotificationError } = await supabase
      .from("notifications")
      .insert([adminNotificationData])
      .select()
      .single();

    if (adminNotificationError) {
      console.error("Erreur lors de la création de la notification admin:", adminNotificationError);
      throw adminNotificationError;
    }

    console.log("Notification insérée avec succès:", insertedNotification);
    console.log("=== FIN CRÉATION NOTIFICATION ADMIN ===");
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
export async function createNotification({
  message,
  userId,
  adminId,
  applicationId,
  notificationType
}: CreateNotificationParams) {
  try {
    console.log("=== DÉBUT CRÉATION NOTIFICATION ===");
    console.log("Paramètres de notification:", { message, userId, adminId, applicationId, notificationType });

    // S'assurer qu'on ne peut pas avoir à la fois un userId et un adminId
    if (userId && adminId) {
      console.error("Une notification ne peut pas avoir à la fois un user_id et un admin_id");
      throw new Error("Configuration de notification invalide");
    }

    // Déterminer le type de notification
    const recipientType = userId ? NotificationTypes.STATUS_CHANGE : NotificationTypes.APPLICATION;

    const notificationData = {
      message,
      user_id: userId || null,
      admin_id: adminId || null,
      application_id: applicationId,
      type: notificationType,
      is_read: false,
      notification_type: recipientType
    };

    console.log("Données de notification à insérer:", notificationData);

    // Vérifier les notifications existantes
    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("application_id", applicationId)
      .eq("type", notificationType)
      .eq("is_read", false)
      .eq(userId ? "user_id" : "admin_id", userId || adminId)
      .single();

    if (existingNotification) {
      console.log("Une notification non lue existe déjà");
      return;
    }

    const { data: insertedNotification, error } = await supabase
      .from("notifications")
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création de la notification:", error);
      throw error;
    }

    console.log("Notification insérée avec succès:", insertedNotification);
    console.log("=== FIN CRÉATION NOTIFICATION ===");
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    throw error;
  }
}

// Nouvelle fonction pour créer une notification de changement de statut
export async function createStatusChangeNotification(
  applicationId: string,
  userId: string,
  newStatus: string
) {
  try {
    console.log(`=== DÉBUT CRÉATION NOTIFICATION CHANGEMENT STATUT ===`);
    console.log("Paramètres de notification:", { applicationId, userId, newStatus });

    // Récupérer la dernière notification pour cette candidature
    const { data: lastNotification } = await supabase
      .from('notifications')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', userId)
      .eq('type', NotificationTypes.USER_STATUS_CHANGE)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log("Dernière notification récupérée:", lastNotification);

    // Si une notification existe déjà avec le même statut, ne pas en créer une nouvelle
    if (lastNotification?.message?.includes(newStatus)) {
      console.log('Une notification pour ce statut existe déjà');
      return;
    }

    const statusMessages: { [key: string]: string } = {
      'pending': 'Votre candidature est en attente d\'examen',
      'reviewing': 'Votre candidature est en cours d\'examen',
      'accepted': 'Félicitations ! Votre candidature a été acceptée',
      'rejected': 'Votre candidature n\'a malheureusement pas été retenue',
      'archived': 'Votre candidature a été archivée',
      'en cours d\'examination': 'Votre candidature est en cours d\'examen',
      'accepter': 'Félicitations ! Votre candidature a été acceptée',
      'refuser': 'Votre candidature n\'a malheureusement pas été retenue'
    };

    const message = statusMessages[newStatus] || `Le statut de votre candidature a été mis à jour: ${newStatus}`;

    console.log("Message de notification:", message);

    // Créer la nouvelle notification
    await createNotification({
      message,
      userId,
      applicationId,
      notificationType: NotificationTypes.USER_STATUS_CHANGE
    });

    console.log(`=== FIN CRÉATION NOTIFICATION CHANGEMENT STATUT ===`);
  } catch (error) {
    console.error('Erreur lors de la création de la notification de changement de statut:', error);
    throw error;
  }
}

// Créer une notification pour l'utilisateur quand le statut de sa candidature change
export const createStatusChangeNotificationOld = async (
  applicationId: string,
  newStatus: string,
  userId: string
) => {
  try {
    console.log(`=== DÉBUT CRÉATION NOTIFICATION CHANGEMENT STATUT ===`);
    console.log("Paramètres de notification:", { applicationId, newStatus, userId });

    // Vérifier s'il existe déjà une notification similaire non lue
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("application_id", applicationId)
      .eq("user_id", userId)
      .eq("is_read", false)
      .eq("type", NotificationTypes.USER_STATUS_CHANGE)
      .single();

    console.log("Notifications existantes récupérées:", existingNotifications);

    if (existingNotifications) {
      console.log("Une notification non lue existe déjà pour cette mise à jour");
      return;
    }

    // Récupérer les détails de la candidature
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("*, jobs(title)")
      .eq("id", applicationId)
      .single();

    console.log("Candidature récupérée:", application);

    if (applicationError) throw applicationError;

    const jobTitle = application.jobs?.title || "Poste non spécifié";
    const statusMessage = {
      "accepté": "a été acceptée",
      "refusé": "a été refusée",
      "en attente": "est en cours d'examen",
      "en cours": "est en cours de traitement"
    }[newStatus] || "a été mise à jour";

    console.log("Message de notification:", `Votre candidature pour "${jobTitle}" ${statusMessage}`);

    // Créer la notification pour l'utilisateur
    const notificationData = {
      message: `Votre candidature pour "${jobTitle}" ${statusMessage}`,
      user_id: userId,
      application_id: applicationId,
      is_read: false,
      type: NotificationTypes.USER_STATUS_CHANGE,
      status: newStatus,
      notification_type: NotificationTypes.STATUS_CHANGE // Utiliser 'status_change' comme type
    };

    console.log("Données de notification à insérer:", notificationData);

    const { data: insertedNotification, error: notificationError } = await supabase
      .from("notifications")
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) throw notificationError;

    console.log("Notification insérée avec succès:", insertedNotification);
    console.log(`=== FIN CRÉATION NOTIFICATION CHANGEMENT STATUT ===`);
  } catch (error) {
    console.error("Erreur lors de la création de la notification de statut:", error);
    throw error;
  }
};