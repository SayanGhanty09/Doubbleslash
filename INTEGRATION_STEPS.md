# Supabase Integration - Step-by-Step Guide

## Step 1: Create Supabase Account & Project

1. Go to **https://supabase.com** and sign up
2. Click **"Create a new project"**
3. Fill in:
   - **Project name:** `spectru` (or your preference)
   - **Database password:** Use a strong password (save it!)
   - **Region:** Choose `Asia Pacific (ap-south-1)` for India
4. Wait for project to initialize (~2 minutes)

---

## Step 2: Get Your API Keys

1. In Supabase console, go to **Settings → API** (left sidebar)
2. You'll see:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
3. **Copy both values** - you'll need them next

---

## Step 3: Configure Your Application

1. Open the file: **`juhacks/.env.local`**
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdef123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZjEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc0MDAwMDAwLCJleHAiOjE5OTk5OTk5OTl9
```

3. **Save the file** (Ctrl+S)

---

## Step 4: Create Database Schema

1. In Supabase console, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file: **`supabase_schema.sql`** (in project root)
4. **Copy the entire SQL code** from that file
5. **Paste into** the Supabase SQL Editor
6. Click **"Run"** (top right, or Ctrl+Enter)
7. Wait for completion (~10 seconds)

**You should see:** `All done successfully!` or no error messages

---

## Step 5: Install Dependencies

```bash
cd juhacks
npm install
```

This installs the new packages:
- `supabase` - Database client
- `leaflet` - Map library
- `react-leaflet` - React map wrapper

---

## Step 6: Start the Application

```bash
npm run dev
```

You should see:
```
VITE v7.3.1  ready in 123 ms

➜  Local:   http://localhost:5173/
```

---

## Step 7: Test the Application

1. **Open** http://localhost:5173/login
2. **Click "Sign Up"** tab
3. Fill in:
   - **Full Name:** Dr. Test Doctor
   - **Specialty:** Cardiologist
   - **Email:** test@example.com
   - **Password:** Test@123456
4. **Click "Create Account"**
5. You should be logged in!

### Test Patient Creation
1. Click **"Patient Management"** (left sidebar)
2. Click **"Add Patient"** button
3. Fill in:
   - **Name:** John Doe
   - **Age:** 45
   - **Sex:** Male
   - **Latitude:** 28.7041 (Delhi)
   - **Longitude:** 77.1025 (Delhi)
   - **State:** Delhi
   - **City:** New Delhi
4. Click **"Save"**

### Test Heatmap
1. Click **"View Heatmap"** button
2. You should see an interactive map of India
3. A circle should appear at Delhi location
4. Click the circle to see patient details

### Test Security (Data Isolation)
1. Click **"Settings"** → **"Logout"**
2. Create ANOTHER doctor account with different email
3. **Add patients for this doctor**
4. Go to **Patient Management**
5. **Verify you ONLY see this doctor's patients** (not the first doctor's)
6. This proves **security is working!** ✓

---

## Troubleshooting

### "Missing environment variables" Error
**Solution:** 
- Check if `.env.local` file exists in `juhacks/` folder
- Verify both values are filled in (no empty lines)
- **Restart the dev server** (Ctrl+C, then `npm run dev` again)

### Heatmap doesn't show on map
**Solution:**
- Verify you added **both latitude AND longitude** to patient
- Check browser console (F12) for errors
- Ensure map loaded (should show OpenStreetMap tiles)

### Can't login or signup
**Solution:**
- Check if tables were created in Supabase → Table Editor
- Verify SQL was executed without errors
- Check browser console for error messages
- Verify `.env.local` values are correct (no extra spaces)

### "Permission denied" error
**Solution:**
- This usually means RLS policies aren't working yet
- Go back to Supabase SQL Editor
- Run the SQL again (sometimes initial policies need refresh)
- Logout and login again

---

## What Got Created

### Database Tables
1. **doctors** - Stores doctor credentials and profile
2. **patients** - Stores patient data with location fields
3. **recordings** - Stores biomarker readings

### Security (Row-Level Security)
- Doctor A cannot see Doctor B's patients
- Enforced at DATABASE level (not just frontend)
- Cannot be bypassed

### Fields Stored per Patient
```
- Name
- Age
- Sex (Male/Female/Other)
- Latitude ← Location
- Longitude ← Location
- State ← Location
- City ← Location
```

---

## Key Files for Reference

- **`src/services/supabaseClient.ts`** - Supabase configuration
- **`src/contexts/AuthContext.tsx`** - Authentication logic
- **`src/contexts/PatientStore.tsx`** - Patient data management
- **`src/components/HeatmapComponent.tsx`** - Map visualization
- **`supabase_schema.sql`** - Database schema (this file)
- **`SUPABASE_SETUP.md`** - Detailed technical documentation
- **`SECURITY_DETAILS.md`** - Security & compliance info

---

## Next Steps

### After Testing (This Week)
- [ ] Test with multiple doctor accounts
- [ ] Add patients in different states of India
- [ ] Verify heatmap shows all locations correctly
- [ ] Test mobile responsiveness

### Before Production (Next Week)
- [ ] Review SECURITY_DETAILS.md
- [ ] Enable 2FA in Supabase console (optional)
- [ ] Configure backup retention
- [ ] Document data retention policy
- [ ] Set up monitoring/alerts

---

## Quick Reference

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_key_here
```

### Default Test Credentials
- **Email:** test@example.com
- **Password:** Test@123456

### India Coordinates Reference
```
Delhi:      28.7041°N, 77.1025°E
Mumbai:     19.0760°N, 72.8777°E
Bangalore:  12.9716°N, 77.5946°E
Hyderabad:  17.3850°N, 78.4867°E
Chennai:    13.0827°N, 80.2707°E
Kolkata:    22.5726°N, 88.3639°E
```

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Row-Level Security Guide:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **Project Documentation:** See other `.md` files in project root

---

**Everything is ready to go! Just follow these 7 steps and you'll be up and running in 15 minutes. ✅**
