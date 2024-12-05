import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserNotifications } from '@/hooks/use-user-notifications';
import { Check } from 'lucide-react';

export function UserNotificationDropdown() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useUserNotifications();

  const handleNotificationClick = async (notificationId: string, applicationId: string) => {
    // Marquer comme lu avant la navigation
    await markAsRead(notificationId);
    navigate(`/applications/${applicationId}`);
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
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-muted/50 hover:bg-muted/70' : 'hover:bg-muted/30'
                }`}
                onClick={() =>
                  handleNotificationClick(notification.id, notification.application_id)
                }
              >
                <div className="space-y-1">
                  <p className={`${!notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'PPp', {
                        locale: fr,
                      })}
                    </p>
                    {notification.is_read && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3" /> Lu
                      </span>
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
}
