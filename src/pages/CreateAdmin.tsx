import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Navbar from "@/components/Navbar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Configuration Supabase avec la clé service depuis .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Les variables d\'environnement Supabase ne sont pas définies');
}

// Initialisation du client Supabase avec les privilèges admin
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Schéma de validation
const createAdminSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type FormData = z.infer<typeof createAdminSchema>;

const CreateAdmin = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      // 1. Créer l'utilisateur avec les droits admin
      const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          full_name: values.fullName,
          is_admin: true
        },
        app_metadata: {
          is_admin: true,  // Important pour AdminContext
          role: 'admin'
        }
      });

      if (createUserError || !user) {
        throw new Error(`Échec de la création de l'utilisateur: ${createUserError?.message}`);
      }

      const userId = user.id;

      // 2. Créer le profil admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: values.fullName,
          is_admin: true
        });

      if (profileError) throw profileError;

      // 3. Mettre à jour le rôle dans la table users
      const { error: userTableError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          role: 'admin'  // On garde uniquement role car is_admin n'existe pas dans la table
        });

      if (userTableError) throw userTableError;

      // 4. Ajouter aux hr_managers
      const { error: hrManagerError } = await supabase
        .from('hr_managers')
        .upsert({
          user_id: userId,
          full_name: values.fullName,
          first_name: values.fullName.split(' ')[0],
          phone: values.phone,
          email: values.email,
          is_active: true
        });

      if (hrManagerError) throw hrManagerError;

      // 5. Mettre à jour les métadonnées de l'utilisateur
      const { error: updateError } = await supabase.auth.admin
        .updateUserById(userId, {
          app_metadata: { 
            is_admin: true,  // Important pour AdminContext
            role: 'admin'
          },
          user_metadata: { 
            full_name: values.fullName,
            is_admin: true 
          }
        });

      if (updateError) throw updateError;

      console.log(`Administrateur créé avec succès: ${values.email}`);
      console.log(`User ID: ${userId}`);

      toast.success("Administrateur créé avec succès");
      form.reset();
      navigate("/admin");
    } catch (error: any) {
      console.error('Erreur création admin:', error);
      toast.error(error.message || "Erreur lors de la création de l'administrateur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Créer un administrateur</h1>
              <p className="text-muted-foreground">
                Remplissez le formulaire ci-dessous pour créer un nouvel administrateur
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+221 77 123 45 67" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Création..." : "Créer l'administrateur"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateAdmin;
