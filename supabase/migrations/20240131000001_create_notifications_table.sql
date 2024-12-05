-- Supprimer la table notifications si elle existe
DROP TABLE IF EXISTS notifications;

-- Créer la table notifications avec la bonne structure
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    application_id UUID REFERENCES applications(id),
    admin_id UUID REFERENCES auth.users(id)
);
