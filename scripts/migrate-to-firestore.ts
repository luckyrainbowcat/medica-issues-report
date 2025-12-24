/**
 * Migration script to migrate data from Prisma/SQLite to Firebase Firestore
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-firestore.ts
 * 
 * หรือ
 *   npm run migrate
 */

import { PrismaClient } from '@prisma/client';
import { db } from '../src/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { deserializeArray, deserializeJson } from '../src/lib/json-helpers';

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

async function migrateComponents() {
  console.log('📦 เริ่ม migrate Components...');
  
  try {
    // อ่านข้อมูลจาก Prisma
    const components = await prisma.component.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (components.length === 0) {
      console.log('   ไม่มี Components ที่ต้อง migrate');
      return 0;
    }

    console.log(`   พบ ${components.length} Components`);

    // ใช้ batch write เพื่อประสิทธิภาพ (Firestore จำกัด 500 operations ต่อ batch)
    const batchSize = 500;
    let migrated = 0;

    for (let i = 0; i < components.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = components.slice(i, i + batchSize);

      for (const component of batchData) {
        const componentRef = doc(db, 'components', component.id);
        
        // แปลงข้อมูลให้เข้ากับ Firestore format
        const firestoreData = {
          name: component.name,
          parentId: component.parentId || null,
          path: serializeArray(component.path),
          createdAt: toTimestamp(component.createdAt) || Timestamp.now(),
          updatedAt: toTimestamp(component.updatedAt) || Timestamp.now(),
        };

        batch.set(componentRef, firestoreData);
      }

      await batch.commit();
      migrated += batchData.length;
      console.log(`   ✅ Migrated ${migrated}/${components.length} Components`);
    }

    console.log(`✅ Migrate Components เสร็จสิ้น: ${migrated} รายการ`);
    return migrated;
  } catch (error: any) {
    console.error('❌ เกิดข้อผิดพลาดในการ migrate Components:', error);
    throw error;
  }
}

async function migrateIssues() {
  console.log('📋 เริ่ม migrate Issues...');
  
  try {
    // อ่านข้อมูลจาก Prisma
    const issues = await prisma.issue.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (issues.length === 0) {
      console.log('   ไม่มี Issues ที่ต้อง migrate');
      return 0;
    }

    console.log(`   พบ ${issues.length} Issues`);

    // ใช้ batch write เพื่อประสิทธิภาพ
    const batchSize = 500;
    let migrated = 0;

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = issues.slice(i, i + batchSize);

      for (const issue of batchData) {
        const issueRef = doc(db, 'issues', issue.id);
        
        // แปลงข้อมูลให้เข้ากับ Firestore format
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
      }

      await batch.commit();
      migrated += batchData.length;
      console.log(`   ✅ Migrated ${migrated}/${issues.length} Issues`);
    }

    console.log(`✅ Migrate Issues เสร็จสิ้น: ${migrated} รายการ`);
    return migrated;
  } catch (error: any) {
    console.error('❌ เกิดข้อผิดพลาดในการ migrate Issues:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 กำลังตรวจสอบข้อมูลที่ migrate...');
  
  try {
    const { getDocs, collection: getCollection } = await import('firebase/firestore');
    
    // ตรวจสอบ Components
    const componentsSnapshot = await getDocs(getCollection(db, 'components'));
    const componentsCount = componentsSnapshot.size;
    const prismaComponentsCount = await prisma.component.count();
    
    console.log(`   Components: Prisma=${prismaComponentsCount}, Firestore=${componentsCount}`);
    
    // ตรวจสอบ Issues
    const issuesSnapshot = await getDocs(getCollection(db, 'issues'));
    const issuesCount = issuesSnapshot.size;
    const prismaIssuesCount = await prisma.issue.count();
    
    console.log(`   Issues: Prisma=${prismaIssuesCount}, Firestore=${issuesCount}`);
    
    if (componentsCount === prismaComponentsCount && issuesCount === prismaIssuesCount) {
      console.log('✅ ข้อมูลทั้งหมดถูก migrate เรียบร้อยแล้ว!');
      return true;
    } else {
      console.log('⚠️  จำนวนข้อมูลไม่ตรงกัน กรุณาตรวจสอบ');
      return false;
    }
  } catch (error: any) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 เริ่ม Migration จาก Prisma/SQLite ไปยัง Firebase Firestore\n');
  
  try {
    // เชื่อมต่อ Prisma
    await prisma.$connect();
    console.log('✅ เชื่อมต่อ Prisma สำเร็จ\n');

    // Migrate Components ก่อน (เพราะ Issues มี foreign key ไปยัง Components)
    const componentsCount = await migrateComponents();
    console.log('');

    // Migrate Issues
    const issuesCount = await migrateIssues();
    console.log('');

    // ตรวจสอบข้อมูล
    await verifyMigration();

    console.log('\n🎉 Migration เสร็จสิ้น!');
    console.log(`   - Components: ${componentsCount} รายการ`);
    console.log(`   - Issues: ${issuesCount} รายการ`);
    
  } catch (error: any) {
    console.error('\n❌ Migration ล้มเหลว:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ ปิดการเชื่อมต่อ Prisma');
  }
}

// รัน migration
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateToFirestore };

