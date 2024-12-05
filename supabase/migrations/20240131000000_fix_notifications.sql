-- Renommer la colonne read en is_read si elle existe
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'read'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
    END IF;
END $$;

-- S'assurer que la colonne is_read existe avec la bonne configuration
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
    END IF;
END $$;
