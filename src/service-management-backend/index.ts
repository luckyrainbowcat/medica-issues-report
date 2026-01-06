// src/index.ts
import { InstallationService } from './installationService';
import { InstallationFormInput } from './types';

async function main() {
  const form: InstallationFormInput = {
    hospital: {
      hospitalName: 'โรงพยาบาลตัวอย่าง',
      systemType: 'EndoCAPTURE',
      department: 'แผนกส่องกล้อง',
      building: 'อาคาร A',
      floor: '3',
      room: 'Endo Room 1',
      endoscopeBrand: 'Olympus',
      systemMode: 'server'
    },
    equipment: [
      {
        equipmentType: 'SYSTEM_NAME',
        name: 'Endo Room 1 ชุดหลัก',
        quantity: 1,
        unit: 'ชุด'
      },
      {
        equipmentType: 'COMPUTER',
        name: 'คอมพิวเตอร์หลัก',
        quantity: 1,
        unit: 'เครื่อง',
        serialNumber: 'PC-123456'
      },
      {
        equipmentType: 'MONITOR',
        name: 'จอภาพหลัก',
        quantity: 1,
        unit: 'จอ',
        serialNumber: 'MON-9999'
      },
      {
        equipmentType: 'KEYBOARD',
        name: 'คีย์บอร์ด',
        quantity: 1,
        unit: 'ตัว',
        connectionType: 'USB'
      },
      {
        equipmentType: 'CABLE_SDI',
        name: 'สายสัญญาณ SDI',
        quantity: 2,
        unit: 'เส้น',
        lengthM: 5
      }
    ],
    fieldInfo: {
      pmPerYear: 1,
      warrantyMonths: 36, // 3 ปี = 36 เดือน
      installDate: '2024-01-15',
      inspectionDate: '2024-01-20',
      hasSpareSet: true
    },
    network: {
      anydeskId: '123 456 789',
      anydeskPassword: 'secretpass',
      hospitalWifiSsid: 'HOSPITAL_WIFI',
      hospitalLanInfo: 'Switch 3 / Port 10 / VLAN 20'
    },
    extra: {
      additionalInfo: 'มีการต่อ UPS แยกสำหรับระบบส่องกล้อง'
    }
  };

  // สร้างใหม่
  const created = await InstallationService.createInstallation(form);
  console.log('สร้าง installation แล้ว:', created.id);

  // แก้ไข (ตัวอย่าง: เพิ่มอุปกรณ์ใหม่/เปลี่ยนค่า)
  form.equipment.push({
    equipmentType: 'PRINTER',
    name: 'เครื่องพิมพ์',
    quantity: 1,
    unit: 'ตัว',
    serialNumber: 'PRN-001'
  });

  const updated = await InstallationService.updateInstallation(created.id, form);
  console.log('อัปเดต installation แล้ว:', updated.id);
}

main().catch(console.error);
