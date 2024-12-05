import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { NotificationAdmin } from '@/types/notifications';

const AdminNotificationDropdown = () => {
  const navigate = useNavigate();
  const { notifications = [], isLoading, markAsRead } = useAdminNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification: NotificationAdmin) => {
    try {
      // Marquer comme lu
      await markAsRead(notification.id);
      
      // Rediriger vers les détails de la candidature (même page que l'œil dans la gestion des candidatures)
      navigate(`/admin/application/${notification.application_id}`);
    } catch (error) {
      console.error('Erreur lors du clic sur la notification:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <p>Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-muted/50 hover:bg-muted/70' : 'hover:bg-muted/30'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="space-y-1">
                  <p className={`${!notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'dd MMM yyyy à HH:mm', {
                        locale: fr,
                      })}
                    </p>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminNotificationDropdown;
