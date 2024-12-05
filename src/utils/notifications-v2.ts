import { supabase } from '@/lib/supabase';
import { NotificationStatus } from '@/types/notifications';

export async function createAdminNotification(
  authorId: string,
  jobId: string,
  jobTitle: string,
  applicationId: string
) {
  try {
    console.log('=== DÉBUT CRÉATION NOTIFICATION ADMIN ===');
    
    // 1. Récupérer les informations de la candidature
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('first_name, last_name')
      .eq('id', applicationId)
      .single();

    if (applicationError) throw applicationError;

    // 2. Créer la notification admin avec le message
    const message = `${application.first_name} ${application.last_name} a postulé pour le poste "${jobTitle}"`;
    
    console.log('Message de notification admin:', message);
    
    const { error } = await supabase
      .from('notification_admin')
      .insert({
        author_id: authorId,
        job_id: jobId,
        job_title: jobTitle,
        application_id: applicationId,
        read: false,
        message: message,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Erreur lors de la création de la notification admin:', error);
      throw error;
    }

    console.log('=== FIN CRÉATION NOTIFICATION ADMIN ===');
  } catch (error) {
    console.error('Erreur lors de la création de la notification admin:', error);
    throw error;
  }
}

export async function createStatusChangeNotification(
  applicationId: string,
  userId: string,
  newStatus: NotificationStatus
) {
  try {
    console.log('=== DÉBUT CRÉATION NOTIFICATION CHANGEMENT STATUT ===');
    console.log('Paramètres de notification:', { applicationId, userId, newStatus });

    // 1. Récupérer les informations de l'application et du job
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        jobs!inner (
          title
        )
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError) {
      console.error('Erreur lors de la récupération des informations de la candidature:', applicationError);
      throw applicationError;
    }

    if (!application || !application.jobs) {
      console.error('Données de candidature incomplètes:', application);
      throw new Error('Impossible de récupérer les informations du poste');
    }

    // Typer correctement la relation jobs
    type JobRelation = {
      title: string;
    };

    const jobTitle = (application.jobs as JobRelation).title;
    if (!jobTitle) {
      console.error('Titre du poste manquant:', application.jobs);
      throw new Error('Titre du poste manquant');
    }

    // 2. Créer le message en fonction du statut
    const statusMessages: Record<NotificationStatus, string> = {
      'en attente': "Votre candidature est en attente d'examen",
      "en cours d'examination": "Votre candidature est en cours d'examen",
      'accepter': "Félicitations ! Votre candidature a été acceptée",
      'refuser': "Votre candidature n'a malheureusement pas été retenue"
    };

    const message = `${statusMessages[newStatus]} pour le poste "${jobTitle}"`;
    console.log('Message de notification:', message);

    // 3. Créer la notification utilisateur
    const notificationData = {
      user_id: userId,
      job_id: application.job_id,
      job_title: jobTitle,
      application_id: applicationId,
      status: newStatus,
      message: message,
      read: false,
      created_at: new Date().toISOString(),
    };

    console.log('Données de notification à insérer:', notificationData);

    const { error } = await supabase
      .from('notification_user')
      .insert(notificationData);

    if (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }

    console.log('=== FIN CRÉATION NOTIFICATION CHANGEMENT STATUT ===');
  } catch (error) {
    console.error('Erreur lors de la création de la notification de changement de statut:', error);
    throw error;
  }
}
