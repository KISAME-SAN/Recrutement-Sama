import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { NotificationAdmin } from '@/types/notifications';

let channel: ReturnType<typeof supabase.channel> | null = null;

export function useAdminNotifications() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Récupérer les notifications admin
  const { data: notifications = [], isLoading } = useQuery<NotificationAdmin[]>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('notification_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const initializeChannel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    // Désabonner des canaux existants avant d'en créer un nouveau
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(ch => {
      if (ch.topic === 'admin-notifications') {
        supabase.removeChannel(ch);
      }
    });

    channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_admin',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(['admin-notifications'], (old: NotificationAdmin[] | undefined) => {
              const notifications = old || [];
              const exists = notifications.some(n => n.id === payload.new.id);
              
              if (exists) {
                return notifications;
              }
              
              const newNotification = payload.new as NotificationAdmin;
              toast(newNotification.message);
              return [newNotification, ...notifications];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(['admin-notifications'], (old: NotificationAdmin[] | undefined) => {
              return (old || []).map(n =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              );
            });
          }
        }
      )
      .subscribe();
  };

  useEffect(() => {
    if (!isInitialized) {
      initializeChannel();
      setIsInitialized(true);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isInitialized]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_admin')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.setQueryData(['admin-notifications'], (old: NotificationAdmin[] | undefined) => {
        return (old || []).map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
      });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      throw error;
    }
  };

  return {
    notifications,
    isLoading,
    markAsRead,
  };
}
