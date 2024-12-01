import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          toast.info(payload.new.message, {
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      toast.error('Erreur lors de la mise à jour de la notification');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      toast.error('Erreur lors de la mise à jour des notifications');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}