# Accounting ERP System

This is an accounting and ERP system built with Next.js, Tailwind CSS, and Neon PostgreSQL.

## Database Setup

The application uses Neon PostgreSQL as its database. Follow these steps to set up the database:

1. Make sure you have the Neon integration set up in your Vercel project.

2. The database connection string should be available as the `CONNECTION_STRING` environment variable.

3. Run the database initialization script to create the necessary tables:

\`\`\`bash
npx tsx scripts/init-db.ts
\`\`\`

This will create the following tables:
- `branches` - Stores information about company branches
- `users` - Stores user information
- `user_branch_assignments` - Stores the relationship between users and branches

## Development

To run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

The application provides the following API endpoints:

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get a user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/{id}` - Update a user
- `DELETE /api/users/{id}` - Delete a user
- `POST /api/users/{id}/reset-password` - Reset a user's password
- `GET /api/users/statistics` - Get user statistics

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/{id}` - Get a branch by ID
- `POST /api/branches` - Create a new branch
- `PUT /api/branches/{id}` - Update a branch
- `DELETE /api/branches/{id}` - Delete a branch
- `GET /api/branches/search` - Search branches
- `GET /api/branches/statistics` - Get branch statistics

## Environment Variables

The following environment variables are required:

- `CONNECTION_STRING` - Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `JWT_SECRET` - Secret for JWT tokens
# mimhaad-erp-test
