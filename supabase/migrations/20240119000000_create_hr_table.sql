-- Create users table for roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'hr')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own role
CREATE POLICY "Users can read their own role" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Allow admins to manage all users
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    ));

-- Create HR table
CREATE TABLE IF NOT EXISTS hr_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies for HR table
ALTER TABLE hr_managers ENABLE ROW LEVEL SECURITY;

-- Admin can read all HR records
CREATE POLICY "Admin can read all HR records" ON hr_managers
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- Admin can create HR records
CREATE POLICY "Admin can create HR records" ON hr_managers
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- Admin can update HR records
CREATE POLICY "Admin can update HR records" ON hr_managers
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- Admin can delete HR records
CREATE POLICY "Admin can delete HR records" ON hr_managers
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_hr_managers_updated_at
    BEFORE UPDATE ON hr_managers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create function to create HR user
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
    -- Create auth user
    v_user_id := (SELECT id FROM auth.users WHERE email = p_email);
    IF v_user_id IS NULL THEN
        v_user_id := (
            WITH new_user AS (
                INSERT INTO auth.users (email, password, email_confirmed_at)
                VALUES (p_email, crypt(p_password, gen_salt('bf')), now())
                RETURNING id
            )
            SELECT id FROM new_user
        );
    END IF;

    -- Insert into users table with HR role
    INSERT INTO users (id, role)
    VALUES (v_user_id, 'hr')
    ON CONFLICT (id) DO UPDATE
    SET role = 'hr';

    -- Insert into hr_managers
    INSERT INTO hr_managers (user_id, full_name, first_name, phone, email)
    VALUES (v_user_id, p_full_name, p_first_name, p_phone, p_email);

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
