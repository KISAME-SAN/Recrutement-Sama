-- Activer RLS sur la table notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture des notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT
    USING (admin_id = auth.uid());

-- Politique pour la mise à jour des notifications
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE
    USING (admin_id = auth.uid());

-- Politique pour l'insertion des notifications
CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true);
