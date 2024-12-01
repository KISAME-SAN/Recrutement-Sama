import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Charger les candidatures initiales
  useEffect(() => {
    const loadApplications = async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs (
            title
          )
        `)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erreur lors du chargement des candidatures:", error);
        return;
      }

      if (data) {
        setApplications(data);
        setUnreadCount(data.length);
      }
    };

    loadApplications();
  }, []);

  // Configurer l'écoute Realtime pour les nouvelles candidatures
  useEffect(() => {
    const channel = supabase
      .channel('applications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications'
        },
        async (payload) => {
          console.log('Nouvelle candidature reçue:', payload);
          const newApplication = payload.new;
          
          // Récupérer le titre du poste
          const { data: jobData } = await supabase
            .from("jobs")
            .select("title")
            .eq("id", newApplication.job_id)
            .single();

          if (jobData) {
            // Ajouter la nouvelle candidature à l'état
            const applicationWithJob = { ...newApplication, jobs: { title: jobData.title } };
            setApplications(currentApplications => {
              const updatedApplications = [applicationWithJob, ...currentApplications].slice(0, 5);
              return updatedApplications;
            });
            setUnreadCount(count => count + 1);

            // Afficher un toast pour la nouvelle candidature
            toast({
              title: "Nouvelle candidature",
              description: `${newApplication.first_name} ${newApplication.last_name} vient de postuler pour le poste de ${jobData.title}`,
            });
          }
        }
      )
      .subscribe();

    // Cleanup lors du démontage du composant
    return () => {
      channel.unsubscribe();
    };
  }, [toast]);

  const handleNotificationClick = async (applicationId: string) => {
    // Marquer la notification comme lue
    const { error } = await supabase
      .from("applications")
      .update({ is_read: true })
      .eq("id", applicationId);

    if (error) {
      console.error("Erreur lors de la mise à jour de la notification:", error);
      return;
    }

    // Mettre à jour l'état local
    setApplications(currentApplications => 
      currentApplications.filter(app => app.id !== applicationId)
    );
    setUnreadCount(count => Math.max(0, count - 1));

    // Rediriger vers la page de détails de la candidature
    navigate(`/admin/application/${applicationId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {applications?.map((application) => (
          <DropdownMenuItem 
            key={application.id} 
            className="p-4 cursor-pointer hover:bg-accent"
            onClick={() => handleNotificationClick(application.id)}
          >
            <div>
              <p className="font-medium">Nouvelle candidature</p>
              <p className="text-sm text-gray-500">
                {application.first_name} {application.last_name} a postulé pour le poste de {application.jobs?.title}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
        {(!applications || applications.length === 0) && (
          <DropdownMenuItem disabled>
            Aucune notification
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;