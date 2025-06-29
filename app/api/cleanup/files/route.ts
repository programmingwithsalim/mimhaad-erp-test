import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface CleanupStats {
  foldersDeleted: string[]
  filesDeleted: string[]
  totalSize: number
  duplicatesRemoved: string[]
}

// Folders to completely remove
const FOLDERS_TO_DELETE = [
  "db",
  "scripts",
  "docs",
  "analysis",
  "data", // All mock JSON data
  "app/dashboard/admin", // All admin setup pages
  "app/dashboard/debug", // All debug pages
  "app/setup",
  "components/admin", // Admin components
  "components/debug", // Debug components
  "components/examples", // Example components
  "lib/migrations", // Migration files
  "app/api/debug", // Debug API routes
  "app/api/db", // Database initialization routes
  "app/api/seed", // Seed data routes
  "app/api/init", // Initialization routes
  "app/api/sync", // Sync routes
  "app/api/system", // System routes
]

// File patterns to delete (simplified for API route)
const FILE_PATTERNS_TO_DELETE = [
  "mock-data.ts",
  "mock-data.tsx",
  "mock-data.json",
  "test-data.json",
  "sample-data.json",
  "seed-data.ts",
  "debug-utils.ts",
  "init-db.ts",
  "setup.ts",
]

// Duplicate files to remove
const DUPLICATE_FILES_TO_REMOVE = [
  "components/inventory/e-zwich-card-issuance.tsx",
  "components/e-zwich/card-issuance-form.tsx",
  "components/float-management/create-account-form.tsx",
  "app/dashboard/float-management/page-fixed.tsx",
  "app/dashboard/settings/page-redesigned.tsx",
  "app/dashboard/settings/page-fixed.tsx",
  "components/settings/update-profile-form-fixed.tsx",
  "components/settings/notification-settings-fixed.tsx",
  "components/settings/role-permission-settings-fixed.tsx",
  "app/api/users/notification-settings/route-fixed.ts",
  "hooks/use-float-accounts-fixed.ts",
  "hooks/use-momo-enhanced.ts",
  "hooks/use-current-user-enhanced.ts",
  "lib/services/gl-posting-service-fixed.ts",
  "lib/services/gl-posting-service-enhanced.tsx",
  "lib/services/gl-posting-service-existing.ts",
  "lib/services/gl-posting-service-corrected.ts",
  "components/dashboard/enhanced-admin-dashboard.tsx",
  "components/dashboard/enhanced-manager-dashboard.tsx",
  "components/dashboard/enhanced-finance-dashboard.tsx",
]

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

async function getFolderSize(folderPath: string): Promise<number> {
  let totalSize = 0
  try {
    const items = await fs.readdir(folderPath, { withFileTypes: true })

    for (const item of items) {
      const itemPath = path.join(folderPath, item.name)
      if (item.isDirectory()) {
        totalSize += await getFolderSize(itemPath)
      } else {
        totalSize += await getFileSize(itemPath)
      }
    }
  } catch {
    // Folder doesn't exist or can't be read
  }
  return totalSize
}

async function deleteFolder(folderPath: string): Promise<boolean> {
  try {
    await fs.rm(folderPath, { recursive: true, force: true })
    return true
  } catch (error) {
    console.warn(`Could not delete folder ${folderPath}:`, error)
    return false
  }
}

async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    console.warn(`Could not delete file ${filePath}:`, error)
    return false
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function POST() {
  try {
    const stats: CleanupStats = {
      foldersDeleted: [],
      filesDeleted: [],
      duplicatesRemoved: [],
      totalSize: 0,
    }

    console.log("Starting file system cleanup...")

    // 1. Clean up folders
    console.log("Deleting unnecessary folders...")
    for (const folder of FOLDERS_TO_DELETE) {
      if (await fileExists(folder)) {
        const size = await getFolderSize(folder)
        const deleted = await deleteFolder(folder)
        if (deleted) {
          stats.foldersDeleted.push(folder)
          stats.totalSize += size
          console.log(`Deleted folder: ${folder}`)
        }
      }
    }

    // 2. Clean up duplicate files
    console.log("Removing duplicate files...")
    for (const file of DUPLICATE_FILES_TO_REMOVE) {
      if (await fileExists(file)) {
        const size = await getFileSize(file)
        const deleted = await deleteFile(file)
        if (deleted) {
          stats.duplicatesRemoved.push(file)
          stats.totalSize += size
          console.log(`Removed duplicate: ${file}`)
        }
      }
    }

    // 3. Clean up specific problematic files
    const specificFiles = [
      "README.md",
      ".env.local",
      "cleanup.sh",
      "cleanup.bat",
      "middleware.ts", // If it's development only
    ]

    for (const file of specificFiles) {
      if (await fileExists(file)) {
        const size = await getFileSize(file)
        const deleted = await deleteFile(file)
        if (deleted) {
          stats.filesDeleted.push(file)
          stats.totalSize += size
          console.log(`Deleted: ${file}`)
        }
      }
    }

    // 4. Update package.json
    try {
      const packageJsonPath = "package.json"
      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"))

        // Remove development scripts
        const scriptsToRemove = ["db:init", "db:seed", "db:migrate", "cleanup", "setup", "debug", "seed", "init"]

        if (packageJson.scripts) {
          scriptsToRemove.forEach((script) => {
            if (packageJson.scripts[script]) {
              delete packageJson.scripts[script]
            }
          })
        }

        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log("Updated package.json")
      }
    } catch (error) {
      console.warn("Could not update package.json:", error)
    }

    // 5. Create production README
    const readmeContent = `# Financial Services Dashboard

A modern, responsive financial services management dashboard built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Multi-Service Support**: MoMo, E-Zwich, Agency Banking, Power, and Jumia services
- **Float Management**: Real-time float tracking and allocation
- **User Management**: Role-based access control with branch assignments  
- **Transaction Processing**: Comprehensive transaction management with GL integration
- **Commission Tracking**: Automated commission calculations and payments
- **Expense Management**: Complete expense tracking and approval workflows
- **Financial Reporting**: Real-time financial reports and analytics
- **Audit Trail**: Complete audit logging for all system activities

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (Neon)
- **Authentication**: Custom JWT-based authentication
- **State Management**: React hooks and context

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables
4. Run the development server: \`npm run dev\`
5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

\`\`\`
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_SECRET=your_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

## Deployment

This application is optimized for deployment on Vercel.

## License

MIT License
`

    try {
      await fs.writeFile("README.md", readmeContent)
      console.log("Created production README.md")
    } catch (error) {
      console.warn("Could not create README.md:", error)
    }

    console.log("File system cleanup completed successfully!")

    return NextResponse.json({
      success: true,
      message: "File system cleanup completed successfully",
      stats: {
        foldersDeleted: stats.foldersDeleted.length,
        filesDeleted: stats.filesDeleted.length,
        duplicatesRemoved: stats.duplicatesRemoved.length,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
      },
      details: {
        foldersDeleted: stats.foldersDeleted,
        filesDeleted: stats.filesDeleted,
        duplicatesRemoved: stats.duplicatesRemoved,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error during file system cleanup:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup file system",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
