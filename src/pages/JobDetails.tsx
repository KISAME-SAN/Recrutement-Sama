import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  Briefcase, 
  Clock, 
  GraduationCap,
  Target,
  Users,
  Building,
  CheckCircle2,
  Laptop2,
  Brain,
  BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Offre d'emploi non trouvée
              </h1>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-primary">{job.title}</h1>
                <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">
                  {job.positions} {job.positions > 1 ? "postes disponibles" : "poste disponible"}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{job.contract_type}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{job.department}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Publié: {format(new Date(job.created_at), "d MMMM yyyy", { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expire: {format(new Date(job.expiration_date), "d MMMM yyyy", { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>{job.diploma}</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Description du poste
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                  {job.description}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Compétences techniques requises
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                  {job.technical_skills}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Compétences comportementales
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                  {job.soft_skills}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Laptop2 className="h-5 w-5" />
                  Outils à maîtriser
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                  {job.tools}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Formation et expérience
                </h2>
                <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                  {job.experience}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Niveaux linguistiques exigés
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-muted-foreground">
                  <div>
                    <span className="font-medium">Français:</span> {job.french_level}
                  </div>
                  <div>
                    <span className="font-medium">Anglais:</span> {job.english_level}
                  </div>
                  <div>
                    <span className="font-medium">Wolof:</span> {job.wolof_level}
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8">
              <Button 
                size="lg" 
                className="w-full md:w-auto"
                onClick={() => navigate(`/jobs/${id}/apply`)}
              >
                Postuler maintenant
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default JobDetails;
