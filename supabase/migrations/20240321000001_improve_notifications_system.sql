-- Amélioration de la table notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'application',
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Fonction pour mettre à jour read_at
CREATE OR REPLACE FUNCTION update_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at = NOW();
    ELSIF NEW.is_read = false THEN
        NEW.read_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement read_at
DROP TRIGGER IF EXISTS update_notification_read_at ON notifications;
CREATE TRIGGER update_notification_read_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_read_status();

-- Vue pour les notifications non lues
CREATE OR REPLACE VIEW unread_notifications AS
SELECT *
FROM notifications
WHERE is_read = false;

-- Fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer toutes les notifications d'un utilisateur comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_uuid UUID, is_admin BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF is_admin THEN
        UPDATE notifications
        SET is_read = true,
            read_at = NOW()
        WHERE admin_id = user_uuid AND is_read = false;
    ELSE
        UPDATE notifications
        SET is_read = true,
            read_at = NOW()
        WHERE user_id = user_uuid AND is_read = false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Index pour améliorer les performances des requêtes sur les notifications non lues
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NOT NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'is_admin' = 'true' OR u.raw_app_meta_data->>'is_hr' = 'true')
    )
);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
);

-- Fonction pour obtenir le nombre de notifications non lues
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID, is_admin BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    IF is_admin THEN
        SELECT COUNT(*)
        INTO count
        FROM notifications
        WHERE admin_id = user_uuid AND is_read = false;
    ELSE
        SELECT COUNT(*)
        INTO count
        FROM notifications
        WHERE user_id = user_uuid AND is_read = false;
    END IF;
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;
