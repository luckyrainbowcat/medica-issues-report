# Issue Tracker MVP

Internal issue tracker web application with Kanban drag & drop, component tree, rich text editor, and image annotation.

## Features

- **Kanban Board**: Drag and drop issues between columns (OPEN, IN_PROGRESS, DONE)
- **Component Tree**: Unlimited depth component hierarchy
- **Rich Text Editor**: Tiptap editor with image upload support
- **Image Annotation**: Click images to annotate using TOAST UI Image Editor

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- MongoDB Community Server
- MinIO (S3-compatible object storage)
- Tiptap (rich text editor)
- @dnd-kit (drag and drop)
- TOAST UI Image Editor

## Prerequisites

- Node.js 20 or higher
- MongoDB Community Server
- MinIO Server

## Installation

### 1. Install Node.js 20

Download and install from [nodejs.org](https://nodejs.org/)

### 2. Install MongoDB Community Server

**Windows:**
1. Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. MongoDB will run on `localhost:27017` by default

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
# Follow official MongoDB installation guide for your distribution
```

### 3. Install MinIO Server

**Windows:**
1. Download from [MinIO Downloads](https://min.io/download)
2. Extract and run:
```powershell
minio.exe server C:\minio-data
```

**macOS:**
```bash
brew install minio/stable/minio
minio server ~/minio-data
```

**Linux:**
```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server ~/minio-data
```

MinIO will run on:
- API: `http://localhost:9000`
- Console: `http://localhost:9001`

Default credentials:
- Access Key: `minioadmin`
- Secret Key: `minioadmin`

### 4. Setup Project

1. Clone or extract the project
2. Copy `env.example` to `.env.local`:
```bash
# Windows PowerShell
Copy-Item env.example .env.local

# macOS/Linux
cp env.example .env.local
```

3. Edit `.env.local` and update if needed:
```env
MONGODB_URI=mongodb://localhost:27017/issue-tracker
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=issue-uploads
MINIO_PUBLIC_URL=http://localhost:9000
```

**Important**: If accessing from other devices on your network, set `MINIO_PUBLIC_URL` to your server's LAN IP:
```env
MINIO_PUBLIC_URL=http://192.168.1.100:9000
```

4. Install dependencies:
```bash
npm install
```

5. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Required Ports

- **3000**: Next.js development server
- **27017**: MongoDB
- **9000**: MinIO API
- **9001**: MinIO Console (optional, for management)

## Usage

1. **Create Components**: Use the "Create Component" form to build your component tree
2. **Create Issues**: Create issues and assign them to components
3. **Drag & Drop**: Drag issue cards between columns to change status
4. **Edit Issues**: Click on an issue card to open the detail page
5. **Rich Text Editing**: Use the Tiptap editor to add formatted text and images
6. **Image Upload**: Paste images from clipboard or drag & drop into editor
7. **Image Annotation**: Click on any image in the editor to open annotation modal

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # Image upload endpoint
│   │   ├── issues/
│   │   │   ├── route.ts             # List/create issues
│   │   │   └── [id]/route.ts        # Get/update issue
│   │   └── components/
│   │       ├── route.ts             # List/create components
│   │       └── [id]/route.ts        # Update component
│   ├── issues/[id]/page.tsx         # Issue detail page
│   └── page.tsx                     # Home page (Kanban board)
├── components/
│   ├── IssueEditor.tsx              # Tiptap editor component
│   └── ImageAnnotateModal.tsx       # Image annotation modal
└── lib/
    ├── db.ts                        # MongoDB connection
    ├── models.ts                    # Mongoose models
    ├── minio.ts                     # MinIO client
    └── upload.ts                    # Upload helper
```

## Notes

- The bucket `issue-uploads` will be created automatically on first upload
- Images are stored with UUID filenames to prevent conflicts
- Annotated images create new versions (original is preserved)
- Component paths are computed and cached at creation time
- Issue component paths are snapshotted when component is assigned

## Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running: `mongosh` should connect
- Check `MONGODB_URI` in `.env.local`

**MinIO connection error:**
- Ensure MinIO is running and accessible
- Check MinIO credentials in `.env.local`
- Verify bucket is created (auto-created on first upload)

**Image upload fails:**
- Check MinIO is running
- Verify `MINIO_PUBLIC_URL` is correct
- Ensure bucket exists and has public read policy

