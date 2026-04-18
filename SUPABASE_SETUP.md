# Supabase Integration Guide

## Overview
This application now uses Supabase for secure, cloud-based data storage with the following features:
1. **Doctor Authentication** - Secure credential storage using Supabase Auth
2. **Patient Management** - Patient data with location information
3. **Heatmap Visualization** - Geographic distribution of patients across Indian map
4. **Data Security** - Row-Level Security (RLS) policies to prevent unauthorized access

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project:
   - Project name: `spectru` (or your preference)
   - Database password: Use a strong password
   - Region: Choose a region close to your users (e.g., India: ap-south-1)
3. Save your credentials securely

### 2. Get Your API Keys

1. Navigate to **Settings → API**
2. Copy:
   - **Project URL**: `https://[project-id].supabase.co`
   - **Anon Key**: `eyJhbGciOi...` (the public key starting with "eyJ")
3. Do NOT use the service_role key in frontend code

### 3. Create Database Tables

Go to **SQL Editor** in Supabase and run the following SQL:

```sql
-- Create doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT CHECK (sex IN ('Male', 'Female', 'Other')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  state TEXT,
  city TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recordings table
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patientId UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patientName TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  biomarkers JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_patients_userId ON patients(userId);
CREATE INDEX idx_recordings_userId ON recordings(userId);
CREATE INDEX idx_recordings_patientId ON recordings(patientId);
CREATE INDEX idx_patients_location ON patients(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### 4. Enable Row-Level Security (RLS)

Enable RLS on tables and run these policies:

```sql
-- Enable RLS on all tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Doctors can only see their own profile
CREATE POLICY "Doctors can view own profile" ON doctors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE USING (auth.uid() = id);

-- Patients: Users can only see their own patients
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own patients" ON patients
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE USING (auth.uid() = userId) WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can delete their own patients" ON patients
  FOR DELETE USING (auth.uid() = userId);

-- Recordings: Users can only see their own recordings
CREATE POLICY "Users can view their own recordings" ON recordings
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can delete their own recordings" ON recordings
  FOR DELETE USING (auth.uid() = userId);
```

### 5. Configure Environment Variables

1. Create or edit `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

2. Replace with your actual values from Step 2

3. **IMPORTANT**: Add `.env.local` to `.gitignore` (should already be there)

### 6. Install Dependencies

```bash
npm install
```

## Security Features

### 1. Row-Level Security (RLS)
- Each user can ONLY access their own patient records
- Patients and recordings are isolated by userId
- Database enforces security at the row level (can't be bypassed from client)

### 2. Authentication
- Credentials stored securely using Supabase's built-in auth
- Passwords hashed with bcrypt (industry standard)
- Session tokens managed securely
- Can optionally enable 2FA, social login, etc.

### 3. Data Encryption
- All data in transit uses HTTPS (TLS 1.3)
- Enable encryption at rest in Supabase settings

### 4. API Key Security
- Anon key (used in frontend) has NO write access by default
- Service role key (never use in frontend) has full access
- All operations respecting user context via `auth.uid()`

### 5. Location Data Privacy
- Location data (latitude/longitude) is protected by RLS
- Only the patient's assigned doctor can see their location
- Heatmap renders only authenticated user's patient data

## Data Access Policies

### What can users see?
- ✅ Their own doctor profile
- ✅ Patients they created
- ✅ Recordings of their patients
- ✅ Heatmap of their patients' locations
- ❌ Other doctors' patients
- ❌ Other doctors' recordings
- ❌ Patient location data without authentication

### What operations are allowed?
- ✅ Create new patients with location
- ✅ Update patient information (including location)
- ✅ Delete patients and their recordings
- ✅ Record biomarker data
- ❌ Modify other users' records
- ❌ View aggregate statistics (without custom RLS)

## Monitoring & Maintenance

### Check Logs
1. Go to **Logs** in Supabase console
2. Monitor authentication events
3. Check for failed API requests

### Database Backups
1. Supabase provides automated daily backups
2. Manual backups available in Pro plan
3. Can be downloaded from Storage

### Performance Optimization
- Indexes are created on `userId`, `patientId`, and location fields
- Location queries are optimized with GiST index
- Consider adding vector search for semantic search (future)

## Troubleshooting

### "Missing environment variables"
- Check `.env.local` exists with correct values
- Restart development server after changing `.env.local`
- Ensure no quotes around URLs/keys

### "Permission denied" errors
- Verify you're logged in
- Check RLS policies are correctly applied
- Ensure `userId` matches `auth.uid()`

### Heatmap not showing
- Verify location fields (latitude, longitude) are populated
- Check browser console for errors
- Ensure Leaflet CSS is loaded

### Slow queries
- Check indexes with `EXPLAIN ANALYZE`
- Limit recording queries with date ranges
- Use pagination for large patient lists

## Data Migration from LocalStorage

If you had existing data in localStorage:

```javascript
// This code would migrate old data (run once, then remove)
const oldPatients = JSON.parse(localStorage.getItem('spectru_patients') || '[]');
for (const patient of oldPatients) {
  await addPatient(patient);
}
```

## Next Steps

1. Test signup and login flow
2. Create a test patient with location
3. View the heatmap
4. Verify location data is protected
5. Test with multiple user accounts

## Support

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Check Supabase Discord community for issues
