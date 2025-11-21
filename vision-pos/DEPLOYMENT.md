# Deploying Vision POS to Vercel

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- PostgreSQL database (recommended: Vercel Postgres, Supabase, or Neon)

## Step 1: Prepare Database for Production

### Option A: Vercel Postgres (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" → "Create Database" → "Postgres"
3. Copy the `POSTGRES_PRISMA_URL` connection string

### Option B: Supabase (Free tier available)
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Go to Settings → Database → Connection String
4. Copy the connection pooling string (transaction mode)

### Option C: Neon (Generous free tier)
1. Go to [Neon](https://neon.tech)
2. Create new project
3. Copy the connection string

## Step 2: Update Prisma Schema for Production

The schema already supports PostgreSQL. No changes needed!

## Step 3: Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "Initial commit - Vision POS"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/vision-pos.git
git branch -M master
git push -u origin master
```

## Step 4: Deploy to Vercel

### Via Vercel Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Via Vercel CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

## Step 5: Configure Environment Variables in Vercel

Go to your project settings → Environment Variables and add:

```
DATABASE_URL=your-postgres-connection-string-here
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=generate-a-random-secret-key-min-32-chars
```

### Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Step 6: Run Database Migrations

After deployment, you need to push the schema to your production database:

### Option A: Using Vercel CLI
```bash
# Set DATABASE_URL locally to production
export DATABASE_URL="your-postgres-connection-string"

# Push schema
npx prisma db push

# Seed database (optional)
npx prisma db seed
```

### Option B: Using Prisma Studio in Production
```bash
npx prisma studio --url "your-postgres-connection-string"
```

## Step 7: Create Admin User

After deployment, you'll need to create an admin user. You can:

1. **Run seed script locally against production DB:**
```bash
export DATABASE_URL="your-postgres-connection-string"
node create-demo-user.js
```

2. **Or create manually via Prisma Studio:**
```bash
npx prisma studio --url "your-postgres-connection-string"
```

## Post-Deployment Checklist

- [ ] Database connected and migrations run
- [ ] Environment variables configured
- [ ] Admin user created
- [ ] Test login at your-app.vercel.app/login
- [ ] Test customer creation
- [ ] Test quote builder
- [ ] Test inventory management

## Environment Variables Summary

```env
# Production Database (PostgreSQL)
DATABASE_URL="postgresql://..."

# NextAuth Configuration
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="your-32-char-secret-here"
```

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify `prisma generate` runs during build

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check if connection pooling is enabled
- Ensure SSL is configured (most providers require it)

### Auth Issues
- Verify NEXTAUTH_URL matches your domain
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again

## Development vs Production

### Development (Current):
- SQLite database (`dev.db`)
- Local environment (`.env.local`)
- No SSL required

### Production (Vercel):
- PostgreSQL database
- Environment variables in Vercel dashboard
- SSL enabled by default

## Auto-Deploy

Once connected to GitHub:
- Push to `master` = automatic deployment to production
- Pull requests = preview deployments
- Easy rollbacks from Vercel dashboard

## Custom Domain (Optional)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain

---

Need help? Check:
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guides](https://www.prisma.io/docs/guides/deployment)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)
