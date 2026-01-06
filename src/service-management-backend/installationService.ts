// src/installationService.ts
import { findOneByField, create, findById, findMany, findAll, update, deleteDoc, toFirestoreDate, fromFirestoreDate } from "./firestoreHelpers";
import { db } from "./firestoreClient";
import { FieldValue } from "firebase-admin/firestore";
import { InstallationFormInput } from "./types";

function toDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export class InstallationService {
  // สร้าง / หา Hospital จากชื่อ
  private static async resolveHospitalId(hospitalName: string): Promise<string> {
    const name = hospitalName?.trim() || "ไม่ระบุชื่อโรงพยาบาล";

    let hospital = await findOneByField<any>("hospitals", "name", name);

    if (!hospital) {
      const hospitalId = await create("hospitals", { name } as any);
      return hospitalId;
    }

    return hospital.id;
  }

  // ✅ CREATE
  static async createInstallation(form: InstallationFormInput) {
    const { hospital, fieldInfo, extra, network, equipment } = form;

    const hospitalId = await this.resolveHospitalId(hospital.hospitalName);

    // ใช้ batch write
    const batch = db.batch();

    // สร้าง Installation
    const installationRef = db.collection("installations").doc();
    const installationId = installationRef.id;
    batch.set(installationRef, {
      hospitalId,
      systemType: hospital.systemType,
      department: hospital.department,
      building: hospital.building ?? null,
      floor: hospital.floor ?? null,
      room: hospital.room ?? null,
      endoscopeBrand: hospital.endoscopeBrand ?? null,
      systemMode: hospital.systemMode ?? "server",
      hasSpareSet: fieldInfo.hasSpareSet ?? false,
      pmPerYear: fieldInfo.pmPerYear ?? null,
      warrantyMonths: fieldInfo.warrantyMonths ?? null,
      warrantyExpireDate: toFirestoreDate(toDateOrNull(fieldInfo.warrantyExpireDate)),
      installDate: toFirestoreDate(toDateOrNull(fieldInfo.installDate)),
      inspectionDate: toFirestoreDate(toDateOrNull(fieldInfo.inspectionDate)),
      lateWarrantyExtendDate: toFirestoreDate(toDateOrNull(fieldInfo.lateWarrantyExtendDate)),
      additionalInfo: extra.additionalInfo ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // NetworkConfig (1:1)
    if (network) {
      const networkRef = db.collection("networkConfigs").doc();
      batch.set(networkRef, {
        installationId: installationId,
        anydeskId: network.anydeskId ?? null,
        anydeskPassword: network.anydeskPassword ?? null,
        hospitalWifiSsid: network.hospitalWifiSsid ?? null,
        hospitalLanInfo: network.hospitalLanInfo ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Equipment list
    if (equipment && equipment.length > 0) {
      for (const eq of equipment) {
        const eqRef = db.collection("equipments").doc();
        batch.set(eqRef, {
          installationId: installationId,
          equipmentType: eq.equipmentType,
          name: eq.name || "",
          quantity: eq.quantity,
          unit: eq.unit ?? null,
          serialNumber: eq.serialNumber ?? null,
          lengthM: eq.lengthM ?? null,
          connectionType: eq.connectionType ?? null,
          signalType: eq.signalType ?? null,
          footSwitchMode: eq.footSwitchMode ?? null,
          notes: eq.notes ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูลที่สร้างแล้ว
    const installation = await findById<any>("installations", installationId);
    return installation;
  }

  // ✅ UPDATE
  static async updateInstallation(id: string, form: InstallationFormInput) {
    const { hospital, fieldInfo, extra, network, equipment } = form;

    const hospitalId = await this.resolveHospitalId(hospital.hospitalName);

    // ใช้ batch write
    const batch = db.batch();

    // อัปเดต Installation
    const installationRef = db.collection("installations").doc(id);
    batch.update(installationRef, {
      hospitalId,
      systemType: hospital.systemType,
      department: hospital.department,
      building: hospital.building ?? null,
      floor: hospital.floor ?? null,
      room: hospital.room ?? null,
      endoscopeBrand: hospital.endoscopeBrand ?? null,
      systemMode: hospital.systemMode ?? "server",
      hasSpareSet: fieldInfo.hasSpareSet ?? false,
      pmPerYear: fieldInfo.pmPerYear ?? null,
      warrantyMonths: fieldInfo.warrantyMonths ?? null,
      warrantyExpireDate: toFirestoreDate(toDateOrNull(fieldInfo.warrantyExpireDate)),
      installDate: toFirestoreDate(toDateOrNull(fieldInfo.installDate)),
      inspectionDate: toFirestoreDate(toDateOrNull(fieldInfo.inspectionDate)),
      lateWarrantyExtendDate: toFirestoreDate(toDateOrNull(fieldInfo.lateWarrantyExtendDate)),
      additionalInfo: extra.additionalInfo ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // NetworkConfig (1:1) - upsert
    if (network) {
      const existingNetworkConfigs = await findMany<any>("networkConfigs", [
        { field: "installationId", operator: "==", value: id }
      ]);
      
      if (existingNetworkConfigs.length > 0) {
        const networkRef = db.collection("networkConfigs").doc(existingNetworkConfigs[0].id);
        batch.update(networkRef, {
          anydeskId: network.anydeskId ?? null,
          anydeskPassword: network.anydeskPassword ?? null,
          hospitalWifiSsid: network.hospitalWifiSsid ?? null,
          hospitalLanInfo: network.hospitalLanInfo ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const networkRef = db.collection("networkConfigs").doc();
        batch.set(networkRef, {
          installationId: id,
          anydeskId: network.anydeskId ?? null,
          anydeskPassword: network.anydeskPassword ?? null,
          hospitalWifiSsid: network.hospitalWifiSsid ?? null,
          hospitalLanInfo: network.hospitalLanInfo ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Equipment list - ลบเก่าออกก่อน แล้วสร้างใหม่
    const existingEquipments = await findMany<any>("equipments", [
      { field: "installationId", operator: "==", value: id }
    ]);
    existingEquipments.forEach((eq: any) => {
      batch.delete(db.collection("equipments").doc(eq.id));
    });

    if (equipment && equipment.length > 0) {
      for (const eq of equipment) {
        const eqRef = db.collection("equipments").doc();
        batch.set(eqRef, {
          installationId: id,
          equipmentType: eq.equipmentType,
          name: eq.name || "",
          quantity: eq.quantity,
          unit: eq.unit ?? null,
          serialNumber: eq.serialNumber ?? null,
          lengthM: eq.lengthM ?? null,
          connectionType: eq.connectionType ?? null,
          signalType: eq.signalType ?? null,
          footSwitchMode: eq.footSwitchMode ?? null,
          notes: eq.notes ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูลที่อัปเดตแล้ว
    const installation = await findById<any>("installations", id);
    return installation;
  }

  // ✅ READ one (สำหรับหน้าแก้ไข)
  static async getInstallationAsForm(id: string) {
    const inst = await findById<any>("installations", id);
    if (!inst) return null;

    // Populate relations
    if (inst.hospitalId) {
      inst.hospital = await findById<any>("hospitals", inst.hospitalId);
    }
    inst.equipment = await findMany<any>("equipments", [
      { field: "installationId", operator: "==", value: id }
    ]);
    const networkConfigs = await findMany<any>("networkConfigs", [
      { field: "installationId", operator: "==", value: id }
    ]);
    inst.networkConfig = networkConfigs[0] || null;

    // Convert Timestamps to Dates
    const formatDate = (date: any): string | null => {
      if (!date) return null;
      const d = date instanceof Date ? date : fromFirestoreDate(date);
      return d ? d.toISOString().slice(0, 10) : null;
    };

    return {
      hospital: {
        systemType: inst.systemType ?? "",
        hospitalName: inst.hospital?.name ?? "",
        department: inst.department ?? "",
        building: inst.building ?? "",
        floor: inst.floor ?? "",
        room: inst.room ?? "",
        endoscopeBrand: inst.endoscopeBrand ?? "",
        systemMode: inst.systemMode ?? "server",
      },
      equipment: inst.equipment || [],
      fieldInfo: {
        hasSpareSet: inst.hasSpareSet ?? false,
        pmPerYear: inst.pmPerYear ?? null,
        warrantyMonths: inst.warrantyMonths ?? null,
        warrantyExpireDate: formatDate(inst.warrantyExpireDate),
        installDate: formatDate(inst.installDate),
        inspectionDate: formatDate(inst.inspectionDate),
        lateWarrantyExtendDate: formatDate(inst.lateWarrantyExtendDate),
      },
      network: {
        anydeskId: inst.networkConfig?.anydeskId ?? "",
        anydeskPassword: inst.networkConfig?.anydeskPassword ?? "",
        hospitalWifiSsid: inst.networkConfig?.hospitalWifiSsid ?? "",
        hospitalLanInfo: inst.networkConfig?.hospitalLanInfo ?? "",
      },
      extra: {
        additionalInfo: inst.additionalInfo ?? "",
      },
    };
  }
}
