-- ==============================================================================
-- COUPLECAPITAL: Supabase Initial Schema & RLS Policies
-- Execute this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Create Custom Types
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE transaction_type AS ENUM ('personal', 'shared');
CREATE TYPE split_type AS ENUM ('equal', 'exact', 'percentage');

-- ==============================================================================
-- 2. Create Tables
-- ==============================================================================

-- USERS (Extends auth.users)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HOUSEHOLDS (Grupos/Planes Familiares)
CREATE TABLE public.households (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  invite_code text UNIQUE DEFAULT substring(md5(random()::text) from 1 for 6) NOT NULL,
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HOUSEHOLD MEMBERS
CREATE TABLE public.household_members (
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member'::user_role NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  paid_by uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text,
  type transaction_type DEFAULT 'shared'::transaction_type NOT NULL,
  split_type split_type DEFAULT 'equal'::split_type NOT NULL,
  date date DEFAULT current_date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TRANSACTION SPLITS (Desglose de quién debe cuánto por cada transacción)
CREATE TABLE public.transaction_splits (
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL, -- Denormalized for simpler RLS
  owed_by uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount_owed numeric(10, 2) NOT NULL CHECK (amount_owed >= 0),
  PRIMARY KEY (transaction_id, owed_by)
);

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

-- POLICIES: USERS
-- A user can read their own profile, or profiles of users in the same household
CREATE POLICY "Users can view members of their households" ON public.users
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members m1
      JOIN public.household_members m2 ON m1.household_id = m2.household_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = public.users.id
    )
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- POLICIES: HOUSEHOLDS
-- You can view a household if you are a member
CREATE POLICY "Users can view households they belong to" ON public.households
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members 
      WHERE household_id = public.households.id AND user_id = auth.uid()
    )
  );

-- Any authenticated user can create a household
CREATE POLICY "Users can create a household" ON public.households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update their household
CREATE POLICY "Admins can update their households" ON public.households
  FOR UPDATE USING (admin_id = auth.uid());

-- POLICIES: HOUSEHOLD MEMBERS
-- You can view members of households you are part of
CREATE POLICY "Users can view members of their households" ON public.household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members AS my_memberships
      WHERE my_memberships.household_id = public.household_members.household_id 
      AND my_memberships.user_id = auth.uid()
    )
  );

-- Users can join a household (insert) if they know the invite code, 
-- or admins can insert them. (For simplicity, authenticated users can insert themselves)
CREATE POLICY "Users can join households" ON public.household_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- POLICIES: TRANSACTIONS
-- View transactions of your households
CREATE POLICY "Users can view household transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members 
      WHERE household_id = public.transactions.household_id AND user_id = auth.uid()
    )
  );

-- Insert into your household
CREATE POLICY "Users can add household transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members 
      WHERE household_id = public.transactions.household_id AND user_id = auth.uid()
    )
  );

-- POLICIES: TRANSACTION SPLITS
-- View splits of your households
CREATE POLICY "Users can view household transaction splits" ON public.transaction_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members 
      WHERE household_id = public.transaction_splits.household_id AND user_id = auth.uid()
    )
  );

-- Insert splits into your household
CREATE POLICY "Users can add household transaction splits" ON public.transaction_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members 
      WHERE household_id = public.transaction_splits.household_id AND user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 4. Triggers
-- ==============================================================================

-- Trigger to create a user in public.users when they sign up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger listening to insert on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
