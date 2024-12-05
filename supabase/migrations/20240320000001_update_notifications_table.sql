-- Supprimer d'abord les politiques existantes
DROP POLICY IF EXISTS "Les administrateurs peuvent voir leurs notifications" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs notifications" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des notifications" ON notifications;
DROP POLICY IF EXISTS "Les administrateurs peuvent modifier leurs notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- Supprimer la fonction de mise à jour
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Supprimer la fonction existante update_application_status
DROP FUNCTION IF EXISTS update_application_status(UUID, TEXT);

-- Supprimer et recréer la table
DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    admin_id UUID REFERENCES auth.users(id),
    application_id UUID REFERENCES applications(id),
    status TEXT DEFAULT 'en attente',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Créer les index
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX idx_notifications_application_id ON notifications(application_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Activer RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Activer RLS sur la table applications si ce n'est pas déjà fait
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Vérifier si la table applications existe, sinon la créer
CREATE TABLE IF NOT EXISTS applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'en attente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS sur les tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Les administrateurs peuvent mettre à jour les candidatures" ON applications;
DROP POLICY IF EXISTS "Les administrateurs peuvent modifier leurs notifications" ON notifications;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs candidatures" ON applications;
DROP POLICY IF EXISTS "Utilisateurs peuvent créer leurs candidatures" ON applications;
DROP POLICY IF EXISTS "Admins peuvent mettre à jour les candidatures" ON applications;
DROP POLICY IF EXISTS "Voir les notifications" ON notifications;
DROP POLICY IF EXISTS "Créer des notifications" ON notifications;
DROP POLICY IF EXISTS "Mettre à jour les notifications" ON notifications;

-- Activer RLS sur les tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "applications_policy" ON applications;
DROP POLICY IF EXISTS "notifications_policy" ON notifications;

-- Recréer la table applications avec une structure complète
DROP TABLE IF EXISTS applications CASCADE;
CREATE TABLE applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    job_id UUID REFERENCES jobs(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    professional_experience TEXT NOT NULL,
    skills TEXT NOT NULL,
    diploma TEXT NOT NULL,
    years_of_experience INTEGER NOT NULL,
    previous_company TEXT,
    cv_url TEXT NOT NULL,
    cover_letter_url TEXT NOT NULL,
    status TEXT DEFAULT 'en attente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Créer des politiques séparées pour chaque opération
CREATE POLICY "allow_select" ON applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "allow_delete" ON applications FOR DELETE TO authenticated USING (true);
CREATE POLICY "allow_patch" ON applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ajouter une colonne de statut si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'applications' 
                  AND column_name = 'status') THEN
        ALTER TABLE applications ADD COLUMN status TEXT DEFAULT 'en attente';
    END IF;
END $$;

-- Donner toutes les permissions nécessaires
GRANT ALL ON applications TO authenticated;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Créer un trigger pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_timestamp ON applications;
CREATE TRIGGER update_timestamp
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Créer une fonction simple pour mettre à jour le statut
CREATE OR REPLACE FUNCTION update_application_status(
    app_id UUID,
    new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE applications
    SET status = new_status
    WHERE id = app_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION update_application_status TO authenticated;

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Créer une fonction pour gérer les notifications de candidature
CREATE OR REPLACE FUNCTION handle_new_application()
RETURNS TRIGGER AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Trouver l'ID d'un administrateur
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE is_admin = true
    LIMIT 1;

    -- Créer une notification uniquement pour l'administrateur
    INSERT INTO notifications (
        message,
        admin_id,
        application_id,
        status,
        is_read
    ) VALUES (
        'Nouvelle candidature reçue de ' || NEW.first_name || ' ' || NEW.last_name,
        admin_user_id,
        NEW.id,
        'non lu',
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les nouvelles candidatures
DROP TRIGGER IF EXISTS on_new_application ON applications;
CREATE TRIGGER on_new_application
    AFTER INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_application();

-- Créer une fonction pour gérer les notifications de changement de statut
CREATE OR REPLACE FUNCTION handle_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si le statut a changé
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Créer une notification pour l'utilisateur
        INSERT INTO notifications (
            message,
            user_id,
            application_id,
            status
        ) VALUES (
            CASE NEW.status
                WHEN 'acceptée' THEN 'Félicitations ! Votre candidature a été acceptée'
                WHEN 'refusée' THEN 'Nous sommes désolés, votre candidature n''a pas été retenue'
                WHEN 'en cours de traitement' THEN 'Votre candidature est en cours d''examen'
                ELSE 'Le statut de votre candidature a été mis à jour : ' || NEW.status
            END,
            NEW.user_id,
            NEW.id,
            'non lu'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les changements de statut
DROP TRIGGER IF EXISTS on_application_status_change ON applications;
CREATE TRIGGER on_application_status_change
    AFTER UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_application_status_change();

-- Ajouter des politiques pour les notifications
CREATE POLICY "Les administrateurs peuvent voir toutes les notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Insertion automatique des notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE notifications IS 'Table stockant toutes les notifications du système';
COMMENT ON COLUMN notifications.id IS 'Identifiant unique de la notification';
COMMENT ON COLUMN notifications.message IS 'Contenu principal de la notification';
COMMENT ON COLUMN notifications.user_id IS 'ID de l''utilisateur concerné par la notification';
COMMENT ON COLUMN notifications.admin_id IS 'ID de l''administrateur concerné par la notification';
COMMENT ON COLUMN notifications.application_id IS 'ID de la candidature associée à la notification';
COMMENT ON COLUMN notifications.status IS 'Statut de la notification: en attente, lu, ou archivé';
COMMENT ON COLUMN notifications.is_read IS 'Indique si la notification a été lue';
COMMENT ON COLUMN notifications.created_at IS 'Date de création de la notification';
COMMENT ON COLUMN notifications.updated_at IS 'Date de dernière modification de la notification';
COMMENT ON COLUMN notifications.read_at IS 'Date à laquelle la notification a été lue';
