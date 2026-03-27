-- 1. PROFILES TABLE
-- Stores extra user information linked to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FINANCIAL RECORDS TABLE
-- Stores the actual income, assets, and liabilities
CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  expenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  liabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_appetite TEXT CHECK (risk_appetite IN ('low', 'medium', 'high')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI INSIGHTS CACHE TABLE
-- Caches LLM responses to avoid redundant API calls
CREATE TABLE ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_hash TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, data_hash)
);

-- 4. ROW LEVEL SECURITY (RLS)
-- Ensure users can only access their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Financial Records: Users can manage their own records
CREATE POLICY "Users can view own records" ON financial_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON financial_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records" ON financial_records FOR UPDATE USING (auth.uid() = user_id);

-- AI Insights Cache: Users can manage their own cache
CREATE POLICY "Users can view own cache" ON ai_insights_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cache" ON ai_insights_cache FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. TRIGGER FOR NEW USERS
-- Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
