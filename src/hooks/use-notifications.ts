import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  application_id: string;
  admin_id: string;
  notification_type: string;
  action_url?: string;
}

// Ce hook est UNIQUEMENT pour les notifications admin
export function useNotifications() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Requête pour obtenir les notifications admin
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      console.log("=== RÉCUPÉRATION NOTIFICATIONS ADMIN ===");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("Pas d'utilisateur connecté");
        throw new Error('Non authentifié');
      }

      console.log("Récupération des notifications pour l'admin:", user.id);

      // Obtenir les notifications non lues
      const { data: unreadData, error: unreadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('admin_id', user.id)
        .is('user_id', null)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      console.log("Notifications non lues récupérées:", unreadData);

      if (unreadError) {
        console.error("Erreur lors de la récupération des notifications non lues:", unreadError);
        throw unreadError;
      }

      // Obtenir les notifications lues récentes (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: readData, error: readError } = await supabase
        .from('notifications')
        .select('*')
        .eq('admin_id', user.id)
        .is('user_id', null)
        .eq('is_read', true)
        .gte('read_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      console.log("Notifications lues récupérées:", readData);

      if (readError) {
        console.error("Erreur lors de la récupération des notifications lues:", readError);
        throw readError;
      }

      // Combiner et trier
      const allNotifications = [...(unreadData || []), ...(readData || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log("Total des notifications:", allNotifications.length);
      console.log("=== FIN RÉCUPÉRATION NOTIFICATIONS ADMIN ===");

      return allNotifications;
    },
    staleTime: 30000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Écouter les nouvelles notifications admin en temps réel
  useEffect(() => {
    let channel: any;
    console.log("=== INITIALISATION HOOK NOTIFICATIONS ADMIN ===");

    const initializeChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User récupéré (Admin):", user?.id);
      if (!user) {
        console.log("Pas d'utilisateur connecté, arrêt de l'initialisation");
        return;
      }

      // Désabonner des canaux existants avant d'en créer un nouveau
      const existingChannels = supabase.getChannels();
      console.log("Canaux existants:", existingChannels.map(ch => ch.topic));
      
      existingChannels.forEach(ch => {
        if (ch.topic === 'admin-notifications') {
          console.log("Désabonnement du canal:", ch.topic);
          supabase.removeChannel(ch);
        }
      });

      console.log("Création d'un nouveau canal de notifications admin");
      channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `admin_id=eq.${user.id} and user_id=is.null`,
          },
          (payload) => {
            console.log('=== ÉVÉNEMENT NOTIFICATION ADMIN ===');
            console.log('Type événement:', payload.eventType);
            console.log('Données payload:', payload);
            
            if (payload.eventType === 'INSERT') {
              console.log('Traitement nouvelle notification admin');
              queryClient.setQueryData(['admin-notifications'], (old: any) => {
                const notifications = old || [];
                const exists = notifications.some((n: Notification) => n.id === payload.new.id);
                
                console.log('Notification existe déjà?', exists);
                if (exists) {
                  console.log('Notification ignorée car déjà existante');
                  return notifications;
                }
                
                const newNotification = payload.new;
                console.log('Ajout nouvelle notification:', newNotification);
                toast(payload.new.message);
                return [newNotification, ...notifications];
              });
            } else if (payload.eventType === 'UPDATE') {
              console.log('Mise à jour notification admin');
              queryClient.setQueryData(['admin-notifications'], (old: any) => {
                return (old || []).map((n: Notification) =>
                  n.id === payload.new.id ? payload.new : n
                );
              });
            }
          }
        )
        .subscribe();
      
      console.log("Canal de notifications admin souscrit avec succès");
    };

    initializeChannel();

    return () => {
      if (channel) {
        console.log('Désabonnement du canal de notifications admin');
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  // Mettre à jour le compteur de notifications non lues
  useEffect(() => {
    setUnreadCount(
      notifications.filter((notification) => !notification.is_read).length
    );
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.setQueryData(['admin-notifications'], (old: any) =>
        (old || []).map((n: Notification) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      queryClient.setQueryData(['admin-notifications'], (old: any) =>
        (old || []).map((n: Notification) => ({
          ...n,
          is_read: true
        }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
  };
}
