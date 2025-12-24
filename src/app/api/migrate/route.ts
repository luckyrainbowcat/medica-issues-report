import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { deserializeArray, deserializeJson } from '@/lib/json-helpers';

const prisma = new PrismaClient();

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (date: Date | null | undefined): Timestamp | null => {
  if (!date) return null;
  return Timestamp.fromDate(date);
};

// Helper to serialize array for Firestore
const serializeArray = (data: string | string[]): string => {
  if (Array.isArray(data)) {
    return JSON.stringify(data);
  }
  return data || '[]';
};

// Helper to serialize JSON for Firestore
const serializeJson = (data: any): string | null => {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string') {
    // Try to parse and re-stringify to ensure valid JSON
    try {
      JSON.parse(data);
      return data;
    } catch {
      return JSON.stringify(data);
    }
  }
  return JSON.stringify(data);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'migrate') {
      return await performMigration();
    } else if (action === 'verify') {
      return await verifyMigration();
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "migrate" or "verify"' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: error.message || 'Migration failed',
      details: error.stack 
    }, { status: 500 });
  }
}

export async function GET() {
  // GET request จะแสดงสถานะและจำนวนข้อมูล
  try {
    await prisma.$connect();
    
    const prismaComponentsCount = await prisma.component.count();
    const prismaIssuesCount = await prisma.issue.count();
    
    // ตรวจสอบ Firestore
    const componentsSnapshot = await getDocs(collection(db, 'components'));
    const issuesSnapshot = await getDocs(collection(db, 'issues'));
    
    const firestoreComponentsCount = componentsSnapshot.size;
    const firestoreIssuesCount = issuesSnapshot.size;
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      prisma: {
        components: prismaComponentsCount,
        issues: prismaIssuesCount,
      },
      firestore: {
        components: firestoreComponentsCount,
        issues: firestoreIssuesCount,
      },
      status: {
        componentsMatch: prismaComponentsCount === firestoreComponentsCount,
        issuesMatch: prismaIssuesCount === firestoreIssuesCount,
        allMigrated: prismaComponentsCount === firestoreComponentsCount && 
                     prismaIssuesCount === firestoreIssuesCount,
      }
    });
  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to check status'
    }, { status: 500 });
  }
}

async function performMigration() {
  const results = {
    components: { migrated: 0, total: 0 },
    issues: { migrated: 0, total: 0 },
    errors: [] as string[],
  };

  try {
    await prisma.$connect();

    // Migrate Components
    console.log('📦 เริ่ม migrate Components...');
    const components = await prisma.component.findMany({
      orderBy: { createdAt: 'asc' },
    });

    results.components.total = components.length;

    if (components.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < components.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchData = components.slice(i, i + batchSize);

        for (const component of batchData) {
          try {
            const componentRef = doc(db, 'components', component.id);
            const firestoreData = {
              name: component.name,
              parentId: component.parentId || null,
              path: serializeArray(component.path),
              createdAt: toTimestamp(component.createdAt) || Timestamp.now(),
              updatedAt: toTimestamp(component.updatedAt) || Timestamp.now(),
            };
            batch.set(componentRef, firestoreData);
          } catch (error: any) {
            results.errors.push(`Component ${component.id}: ${error.message}`);
          }
        }

        await batch.commit();
        results.components.migrated += batchData.length;
      }
    }

    // Migrate Issues
    console.log('📋 เริ่ม migrate Issues...');
    const issues = await prisma.issue.findMany({
      orderBy: { createdAt: 'asc' },
    });

    results.issues.total = issues.length;

    if (issues.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < issues.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchData = issues.slice(i, i + batchSize);

        for (const issue of batchData) {
          try {
            const issueRef = doc(db, 'issues', issue.id);
            const firestoreData = {
              title: issue.title,
              status: issue.status || 'OPEN',
              priority: issue.priority || 'MED',
              componentId: issue.componentId || null,
              componentPath: serializeArray(issue.componentPath),
              description: serializeJson(issue.description),
              createdAt: toTimestamp(issue.createdAt) || Timestamp.now(),
              updatedAt: toTimestamp(issue.updatedAt) || Timestamp.now(),
            };
            batch.set(issueRef, firestoreData);
          } catch (error: any) {
            results.errors.push(`Issue ${issue.id}: ${error.message}`);
          }
        }

        await batch.commit();
        results.issues.migrated += batchData.length;
      }
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results,
    });
  } catch (error: any) {
    await prisma.$disconnect().catch(() => {});
    throw error;
  }
}

async function verifyMigration() {
  try {
    await prisma.$connect();
    
    const prismaComponentsCount = await prisma.component.count();
    const prismaIssuesCount = await prisma.issue.count();
    
    const componentsSnapshot = await getDocs(collection(db, 'components'));
    const issuesSnapshot = await getDocs(collection(db, 'issues'));
    
    const firestoreComponentsCount = componentsSnapshot.size;
    const firestoreIssuesCount = issuesSnapshot.size;
    
    await prisma.$disconnect();
    
    const allMatch = prismaComponentsCount === firestoreComponentsCount && 
                     prismaIssuesCount === firestoreIssuesCount;
    
    return NextResponse.json({
      success: allMatch,
      prisma: {
        components: prismaComponentsCount,
        issues: prismaIssuesCount,
      },
      firestore: {
        components: firestoreComponentsCount,
        issues: firestoreIssuesCount,
      },
      match: {
        components: prismaComponentsCount === firestoreComponentsCount,
        issues: prismaIssuesCount === firestoreIssuesCount,
        all: allMatch,
      }
    });
  } catch (error: any) {
    await prisma.$disconnect().catch(() => {});
    throw error;
  }
}

