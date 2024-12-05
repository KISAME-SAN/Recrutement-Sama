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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Non authentifié');
      }

      // Obtenir les notifications non lues
      const { data: unreadData, error: unreadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('admin_id', user.id)
        .is('user_id', null)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (unreadError) {
        throw unreadError;
      }

      // Obtenir les notifications lues
      const { data: readData, error: readError } = await supabase
        .from('notifications')
        .select('*')
        .eq('admin_id', user.id)
        .is('user_id', null)
        .eq('is_read', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (readError) {
        throw readError;
      }

      // Combiner et trier les notifications
      const allNotifications = [...(unreadData || []), ...(readData || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUnreadCount(unreadData?.length || 0);

      return allNotifications;
    },
    staleTime: 30000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Écouter les nouvelles notifications admin en temps réel
  const initializeChannel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `admin_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Notification reçue:', payload);

          // Rafraîchir les données
          await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });

          // Afficher une notification toast pour les nouvelles notifications
          if (payload.eventType === 'INSERT') {
            toast.info('Nouvelle notification reçue');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Abonné aux notifications admin');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    const cleanup = initializeChannel();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Mettre à jour le cache
      queryClient.setQueryData(['admin-notifications'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((notification: Notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        );
      });

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      toast.error("Erreur lors du marquage comme lu");
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n: Notification) => !n.is_read)
        .map((n: Notification) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      // Mettre à jour le cache
      queryClient.setQueryData(['admin-notifications'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((notification: Notification) => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }));
      });

      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      toast.error("Erreur lors du marquage comme lu");
    }
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
