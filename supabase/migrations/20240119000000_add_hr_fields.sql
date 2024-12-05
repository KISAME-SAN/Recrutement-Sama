-- Add HR fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_hr BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Remove existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update HR status" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Base policy for viewing own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id
);

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'is_admin' = 'true'
    )
);

-- Policy for admins to update profiles
CREATE POLICY "Admins can update profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'is_admin' = 'true'
    )
);

-- Set initial admin user metadata directly
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object('is_admin', true)
WHERE id = '4e86f2fb-ac93-4f63-945d-0eeb55e98884';

UPDATE profiles
SET is_admin = true
WHERE id = '4e86f2fb-ac93-4f63-945d-0eeb55e98884';

-- Function to create HR user
CREATE OR REPLACE FUNCTION create_hr_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_first_name TEXT,
    p_phone TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verify if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'is_admin' = 'true'
    ) THEN
        RAISE EXCEPTION 'Only administrators can create HR users';
    END IF;

    -- Create auth user
    v_user_id := (SELECT id FROM auth.users WHERE email = p_email);
    IF v_user_id IS NULL THEN
        v_user_id := (
            WITH new_user AS (
                INSERT INTO auth.users (email, password, email_confirmed_at, raw_app_meta_data)
                VALUES (
                    p_email, 
                    crypt(p_password, gen_salt('bf')), 
                    now(),
                    jsonb_build_object('is_hr', true)
                )
                RETURNING id
            )
            SELECT id FROM new_user
        );
    END IF;

    -- Insert into profiles
    INSERT INTO profiles (id, full_name, first_name, phone, is_hr, created_at)
    VALUES (v_user_id, p_full_name, p_first_name, p_phone, true, now())
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = p_full_name,
        first_name = p_first_name,
        phone = p_phone,
        is_hr = true;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user metadata
CREATE OR REPLACE FUNCTION set_user_metadata(
    user_id UUID,
    is_admin BOOLEAN DEFAULT false,
    is_hr BOOLEAN DEFAULT false
) RETURNS void AS $$
BEGIN
    -- Verify if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_app_meta_data->>'is_admin' = 'true'
    ) THEN
        RAISE EXCEPTION 'Only administrators can modify user metadata';
    END IF;

    -- Update user metadata
    UPDATE auth.users
    SET raw_app_meta_data = 
        CASE 
            WHEN is_admin THEN jsonb_build_object('is_admin', true)
            WHEN is_hr THEN jsonb_build_object('is_hr', true)
            ELSE '{}'::jsonb
        END
    WHERE id = user_id;

    -- Update profiles table
    UPDATE profiles
    SET 
        is_admin = COALESCE(is_admin, false),
        is_hr = COALESCE(is_hr, false)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
