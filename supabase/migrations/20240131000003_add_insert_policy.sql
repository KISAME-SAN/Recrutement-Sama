-- Supprimer la politique d'insertion si elle existe
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;

-- Créer la politique pour l'insertion des notifications
CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true);
