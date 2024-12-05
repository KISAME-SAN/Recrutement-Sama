import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, UserPlus, Menu, X, Briefcase, Settings } from "lucide-react";
import AdminNotificationDropdown from '@/components/AdminNotificationDropdown';
import { UserNotificationDropdownV2 } from '@/components/UserNotificationDropdownV2';
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo et navigation principale */}
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold text-primary">
              KISAME
            </a>
            {/* Navigation desktop à gauche */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href="/jobs"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Offres d'emploi
              </a>
              {isAdmin && (
                <>
                  <a
                    href="/admin"
                    className="text-gray-600 hover:text-primary transition-colors"
                  >
                    Panneau d'administration
                  </a>
                  <a
                    href="/admin/create"
                    className="text-gray-600 hover:text-primary transition-colors"
                  >
                    Création d'admin
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Notifications et menu mobile */}
          <div className="flex items-center gap-4">
            {/* Notifications - toujours visibles */}
            {isAdmin ? (
              <AdminNotificationDropdown />
            ) : user && (
              <UserNotificationDropdownV2 />
            )}

            {/* Boutons d'authentification desktop */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <Button
                  variant="ghost"
                  className="gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => navigate("/login")}
                  >
                    <LogIn className="h-5 w-5" />
                    <span className="hidden sm:inline">Connexion</span>
                  </Button>
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => navigate("/register")}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span className="hidden sm:inline">Inscription</span>
                  </Button>
                </>
              )}
            </div>

            {/* Bouton menu hamburger sur mobile */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        <div
          className={cn(
            "md:hidden",
            isMenuOpen ? "block" : "hidden"
          )}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a
              href="/jobs"
              className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              <Briefcase className="h-5 w-5" />
              Offres d'emploi
            </a>
            {isAdmin && (
              <>
                <a
                  href="/admin"
                  className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  Panneau d'administration
                </a>
                <a
                  href="/admin/create"
                  className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserPlus className="h-5 w-5" />
                  Création d'admin
                </a>
              </>
            )}
            <div className="pt-4 pb-3 border-t border-gray-200">
              {/* Boutons d'authentification mobile */}
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 px-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  Déconnexion
                </Button>
              ) : (
                <div className="space-y-2 px-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      navigate("/login");
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogIn className="h-5 w-5" />
                    Connexion
                  </Button>
                  <Button
                    variant="default"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      navigate("/register");
                      setIsMenuOpen(false);
                    }}
                  >
                    <UserPlus className="h-5 w-5" />
                    Inscription
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;