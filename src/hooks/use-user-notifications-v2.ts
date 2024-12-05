import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { NotificationUser } from '@/types/notifications';

let channel: ReturnType<typeof supabase.channel> | null = null;

export function useUserNotifications() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Récupérer les notifications de l'utilisateur
  const { data: notifications, isLoading } = useQuery<NotificationUser[]>({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('notification_user')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const initializeChannel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Désabonner des canaux existants
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(ch => {
      if (ch.topic === 'user-notifications') {
        supabase.removeChannel(ch);
      }
    });

    channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_user',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(['user-notifications'], (old: NotificationUser[] | undefined) => {
              const notifications = old || [];
              const newNotification = payload.new as NotificationUser;
              
              // Afficher une notification toast
              toast(newNotification.message);
              
              return [newNotification, ...notifications];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(['user-notifications'], (old: NotificationUser[] | undefined) => {
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
        .from('notification_user')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.setQueryData(['user-notifications'], (old: NotificationUser[] | undefined) => {
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
    notifications: notifications || [],
    isLoading,
    markAsRead,
  };
}
