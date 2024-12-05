import { useAdmin } from '@/contexts/AdminContext';

/**
 * Hook d'authentification unifié
 * 
 * Ce hook fournit une interface d'authentification commune pour l'application.
 * Il utilise le contexte AdminContext pour récupérer les informations de l'utilisateur.
 */
export const useAuth = () => {
  const admin = useAdmin();
  
  console.log("useAuth - Admin context:", {
    user: admin.user?.id,
    isAdmin: admin.isAdmin,
    isHR: admin.isHR
  });

  return {
    /**
     * Utilisateur actuellement connecté
     */
    user: admin.user,
    /**
     * Indique si l'utilisateur est un administrateur
     */
    isAdmin: admin.isAdmin,
    /**
     * Indique si l'utilisateur est un responsable RH
     */
    isHR: admin.isHR,
    /**
     * Fonction pour se déconnecter
     */
    signOut: admin.logout,
    /**
     * Fonction pour se connecter
     */
    signIn: admin.login,
  };
};
