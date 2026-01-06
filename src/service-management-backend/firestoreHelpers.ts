import { db } from './firestoreClient';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { FirebaseFirestore } from 'firebase-admin/firestore';

// Helper function: แปลง Date เป็น Firestore Timestamp
export function toFirestoreDate(value: Date | string | null | undefined): Timestamp | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  return null;
}

// Helper function: แปลง Firestore Timestamp เป็น Date
export function fromFirestoreDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

// Helper function: แปลง Firestore document เป็น object พร้อม id
export function docToObject<T>(doc: FirebaseFirestore.DocumentSnapshot): T & { id: string } {
  const data = doc.data() as T;
  return {
    ...data,
    id: doc.id,
  };
}

// Helper function: แปลง Firestore documents array เป็น objects array
export function docsToArray<T>(docs: FirebaseFirestore.DocumentSnapshot[]): (T & { id: string })[] {
  return docs.map(doc => docToObject<T>(doc));
}

// Helper function: สร้าง batch write สำหรับ transaction
export async function runBatch<T>(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    docId?: string;
    data?: any;
  }>
): Promise<void> {
  const batch = db.batch();
  
  for (const op of operations) {
    const ref = op.docId 
      ? db.collection(op.collection).doc(op.docId)
      : db.collection(op.collection).doc();
    
    switch (op.type) {
      case 'create':
        if (op.data) {
          batch.set(ref, {
            ...op.data,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      case 'update':
        if (op.data) {
          batch.update(ref, {
            ...op.data,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      case 'delete':
        batch.delete(ref);
        break;
    }
  }
  
  await batch.commit();
}

// Helper function: ค้นหา document โดย field
export async function findOneByField<T>(
  collection: string,
  field: string,
  value: any
): Promise<(T & { id: string }) | null> {
  const snapshot = await db.collection(collection)
    .where(field, '==', value)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  return docToObject<T>(snapshot.docs[0]);
}

// Helper function: ค้นหา documents ทั้งหมด
export async function findAll<T>(
  collection: string,
  orderBy?: { field: string; direction: 'asc' | 'desc' }
): Promise<(T & { id: string })[]> {
  let query: FirebaseFirestore.Query = db.collection(collection);
  
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction);
  }
  
  const snapshot = await query.get();
  return docsToArray<T>(snapshot.docs);
}

// Helper function: ค้นหา documents ด้วยเงื่อนไข
export async function findMany<T>(
  collection: string,
  where?: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>,
  orderBy?: { field: string; direction: 'asc' | 'desc' },
  limit?: number
): Promise<(T & { id: string })[]> {
  let query: FirebaseFirestore.Query = db.collection(collection);
  
  if (where) {
    for (const condition of where) {
      query = query.where(condition.field, condition.operator, condition.value);
    }
  }
  
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const snapshot = await query.get();
  return docsToArray<T>(snapshot.docs);
}

// Helper function: สร้าง document ใหม่
export async function create<T>(
  collection: string,
  data: Omit<T, 'id'>
): Promise<string> {
  const ref = db.collection(collection).doc();
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// Helper function: สร้าง document พร้อมระบุ ID
export async function createWithId<T>(
  collection: string,
  id: string,
  data: Omit<T, 'id'>
): Promise<string> {
  const ref = db.collection(collection).doc(id);
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return id;
}

// Helper function: อัปเดต document
export async function update<T>(
  collection: string,
  id: string,
  data: Partial<Omit<T, 'id'>>
): Promise<void> {
  const ref = db.collection(collection).doc(id);
  await ref.update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Helper function: อ่าน document ตาม ID
export async function findById<T>(
  collection: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return docToObject<T>(doc);
}

// Helper function: ลบ document
export async function deleteDoc(collection: string, id: string): Promise<void> {
  await db.collection(collection).doc(id).delete();
}

// Helper function: ลบ documents หลายตัว
export async function deleteMany(
  collection: string,
  where: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>
): Promise<void> {
  const snapshot = await findMany(collection, where);
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.delete(db.collection(collection).doc(doc.id));
  });
  await batch.commit();
}

// Helper function: upsert (update หรือ create)
export async function upsert<T>(
  collection: string,
  whereField: string,
  whereValue: any,
  data: Omit<T, 'id'>
): Promise<string> {
  const existing = await findOneByField<T>(collection, whereField, whereValue);
  
  if (existing) {
    await update(collection, existing.id, data);
    return existing.id;
  } else {
    return await create(collection, data);
  }
}

// Helper function: นับจำนวน documents
export async function count(
  collection: string,
  where?: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>
): Promise<number> {
  let query: FirebaseFirestore.Query = db.collection(collection);
  
  if (where) {
    for (const condition of where) {
      query = query.where(condition.field, condition.operator, condition.value);
    }
  }
  
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

