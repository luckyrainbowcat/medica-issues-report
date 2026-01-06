// Helper functions สำหรับ Installation operations ใน Firestore
import {
  findById,
  findMany,
  findAll,
  create,
  update,
  deleteDoc,
  findOneByField,
  toFirestoreDate,
  fromFirestoreDate,
} from './firestoreHelpers';

// Helper: populate installation with relations
export async function populateInstallation(installation: any) {
  // ถ้ามี hospital (string) ให้หา hospital object จาก collection
  if (installation.hospital && typeof installation.hospital === 'string') {
    const hospitalName = installation.hospital;
    const hospitalObj = await findOneByField<any>('hospitals', 'name', hospitalName);
    if (hospitalObj) {
      installation.hospital = hospitalObj; // เปลี่ยนจาก string เป็น object
      installation.hospitalId = hospitalObj.id; // เก็บ hospitalId ไว้ด้วย
    } else {
      // ถ้าหาไม่เจอ ให้สร้าง object จากชื่อ
      installation.hospital = { id: null, name: hospitalName };
      installation.hospitalId = null;
    }
    installation.hospitalObj = installation.hospital; // เก็บไว้สำหรับ backward compatibility
  }
  // รองรับ hospitalId (legacy) สำหรับข้อมูลเก่า
  if (installation.hospitalId && (!installation.hospital || typeof installation.hospital === 'string')) {
    const hospitalObj = await findById<any>('hospitals', installation.hospitalId);
    if (hospitalObj) {
      installation.hospital = hospitalObj; // เก็บ object แทน string
      installation.hospitalObj = hospitalObj;
    }
  }
  
  // Populate equipment
  if (installation.id) {
    installation.equipment = await findMany<any>('equipments', [
      { field: 'installationId', operator: '==', value: installation.id }
    ]);
    
    // Populate equipment images
    for (const eq of installation.equipment) {
      eq.equipmentImages = await findMany<any>('equipmentImages', [
        { field: 'equipmentId', operator: '==', value: eq.id }
      ]);
    }
  }
  
  // Populate networkConfig
  if (installation.id) {
    const networkConfigs = await findMany<any>('networkConfigs', [
      { field: 'installationId', operator: '==', value: installation.id }
    ]);
    installation.networkConfig = networkConfigs[0] || null;
    
    if (installation.networkConfig) {
      installation.networkConfig.networkImages = await findMany<any>('networkImages', [
        { field: 'networkConfigId', operator: '==', value: installation.networkConfig.id }
      ]);
    }
  }
  
  // Populate installation images
  if (installation.id) {
    installation.installationImages = await findMany<any>('installationImages', [
      { field: 'installationId', operator: '==', value: installation.id }
    ]);
  }
  
  // Convert Timestamps to Dates
  if (installation.warrantyExpireDate) {
    installation.warrantyExpireDate = fromFirestoreDate(installation.warrantyExpireDate);
  }
  if (installation.installDate) {
    installation.installDate = fromFirestoreDate(installation.installDate);
  }
  if (installation.inspectionDate) {
    installation.inspectionDate = fromFirestoreDate(installation.inspectionDate);
  }
  if (installation.lateWarrantyExtendDate) {
    installation.lateWarrantyExtendDate = fromFirestoreDate(installation.lateWarrantyExtendDate);
  }
  
  return installation;
}

// Helper: prepare installation data for Firestore
export function prepareInstallationData(data: any) {
  return {
    ...data,
    warrantyExpireDate: toFirestoreDate(data.warrantyExpireDate),
    installDate: toFirestoreDate(data.installDate),
    inspectionDate: toFirestoreDate(data.inspectionDate),
    lateWarrantyExtendDate: toFirestoreDate(data.lateWarrantyExtendDate),
  };
}

