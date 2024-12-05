// Types des tables de notifications
export type NotificationAdmin = {
  id: string;
  author_id: string;
  application_id: string;
  message: string;
  created_at: string;
  read: boolean;
};

export type NotificationUser = {
  id: string;
  user_id: string;
  job_id: string;
  job_title: string;
  application_id: string;
  message: string;
  created_at: string;
  read: boolean;
  status: NotificationStatus;
};

// Type pour les statuts de candidature
export type NotificationStatus = 
  | 'en attente'
  | "en cours d'examination"
  | 'accepter'
  | 'refuser';
