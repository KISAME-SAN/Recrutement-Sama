-- Suppression des politiques existantes
DROP POLICY IF EXISTS "Les administrateurs peuvent tout faire avec les notifications" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres notifications" ON notifications;
DROP POLICY IF EXISTS "Tout le monde peut créer des notifications" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notifications;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON notifications;

-- Création de la table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE
);

-- Politiques RLS pour la table notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Les administrateurs peuvent tout faire
CREATE POLICY "Les administrateurs peuvent tout faire avec les notifications"
  ON notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Tout le monde peut créer des notifications
CREATE POLICY "Tout le monde peut créer des notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);