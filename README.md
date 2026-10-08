# myDogGPS

myDogGPS is the application shell for the project. Members can register their dogs, and administrators can manage member access through **Personregister**. GPS devices and tracking are not implemented yet.

## Run locally

1. Install Node.js (LTS).
2. Install dependencies with `npm install`.
3. Create `.env.local` in the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_publishable_key
   ```

4. Run `npm run dev` and open the local URL printed in the terminal.

Use the Supabase Project URL and publishable key. Never put a `service_role` or secret key in frontend environment variables. `.env.local` is excluded from Git.

## Supabase setup

Run `supabase/schema.sql` in the SQL Editor of the intended Supabase project. The first administrator must be promoted in the `public.profiles` table by setting `role` to `admin` and `status` to `approved` for their account. Admins can open **Personregister** to review pending member accounts.

For an existing project that already has the member schema, run `supabase/add_dogs.sql` in the SQL Editor to create the dogs table and its owner-only access policies. Then run `supabase/add_search_areas.sql` to add saved search routes and 50-meter search areas. Approved members can register dogs from `/dashboard`, open a dog's personal overview, and record search paths from its **Sök** activity. Browser location recording requires HTTPS; the Vite server's plain HTTP LAN address cannot access GPS on an iPhone.

## Routes

- `/login` — sign in
- `/register` — request a member account
- `/dashboard` — myDogGPS home
- `/dogs/:dogId` — a member's personal dog overview
- `/dogs/:dogId/search` — record and save a search path and area
- `/personregister` — admin member management

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — lint the source
