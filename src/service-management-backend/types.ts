// src/types.ts

// ------- ส่วนข้อมูลโรงพยาบาล / ตำแหน่ง -------
export interface HospitalForm {
  systemType: string;        // EndoCAPTURE / RINX / ...
  hospitalName: string;      // ใช้ผูกกับตาราง Hospital.name
  department: string;
  building?: string;
  floor?: string;
  room?: string;
  endoscopeBrand?: string;
  systemMode?: string;       // server / client / stand-alone
}

// ------- อุปกรณ์ -------
export interface EquipmentItem {
  equipmentType: string;
  name: string;
  quantity: number;
  unit?: string | null;
  serialNumber?: string | null;
  lengthM?: number | null;
  connectionType?: string | null;
  signalType?: string | null;
  footSwitchMode?: string | null;
  notes?: string | null;
}

// ------- ข้อมูลภาคสนาม / ติดตั้ง -------
export interface FieldInfo {
  hasSpareSet: boolean;
  pmPerYear?: number | null;
  warrantyMonths?: number | null;
  warrantyExpireDate?: string | null; // yyyy-mm-dd
  installDate?: string | null;
  inspectionDate?: string | null;
  lateWarrantyExtendDate?: string | null;
  technicianName?: string | null;
  technicianPhone?: string | null;
  spareSetNote?: string | null;
  spareNote?: string | null;
  images?: string[];
}

// ------- Network / AnyDesk -------
export interface NetworkInfo {
  anydeskId?: string | null;
  anydeskPassword?: string | null;
  hospitalWifiSsid?: string | null;
  hospitalLanInfo?: string | null;
}

// ------- extra -------
export interface ExtraInfo {
  additionalInfo?: string | null;
  images?: string[];
}

// ------- ฟอร์มเต็มที่ frontend ส่งมา -------
export interface InstallationFormInput {
  hospital: HospitalForm;
  equipment: EquipmentItem[];
  fieldInfo: FieldInfo;
  network: NetworkInfo;
  extra: ExtraInfo;
}

// ------- Request Body Types -------
export interface HospitalRequestBody {
  name?: string;
  code?: string;
  province?: string;
  region?: string;
  address?: string;
}

export interface DepartmentRequestBody {
  name?: string;
}

export interface SimRequestBody {
  phoneNumber?: string;
  networkFlags?: string | string[];
  networkOther?: string;
  ownerName?: string;
  activatedDate?: string;
  packageDetail?: string;
  packageExpireAt?: string;
  simExpireAt?: string;
  status?: "active" | "expired";
  hospitalId?: number | string;
  departmentId?: number | string;
}

export interface ConnectionRequestBody {
  hospitalId?: number | string;
  pacsDetail?: string;
  emrDetail?: string;
  serverDetail?: string;
  otherDetail?: string;
  images?: string[];
}

export interface InstallationRequestBody {
  hospital?: {
    name?: string;
    hospitalName?: string;
    systemType?: string;
    department?: string;
    building?: string;
    floor?: string;
    room?: string;
    endoscopeBrand?: string;
    systemMode?: string;
  };
  equipment?: Array<{
    equipmentType?: string;
    name?: string;
    quantity?: number | string;
    unit?: string | null;
    serialNumber?: string | null;
    lengthM?: number | string | null;
    connectionType?: string | null;
    signalType?: string | null;
    footSwitchMode?: string | null;
    notes?: string | null;
  }>;
  fieldInfo?: FieldInfo;
  network?: NetworkInfo & {
    hospitalWifiPassword?: string | null;
    wifiUser?: string | null;
    vpnDetail?: string | null;
    connectionFlags?: string | null;
    networkGateway?: string | null;
    networkSubnet?: string | null;
    images?: string[];
  };
  extra?: ExtraInfo;
  equipmentImages?: string[];
}

export interface NetworkUpdateRequestBody {
  anydeskId?: string | null;
  anydeskPassword?: string | null;
  hospitalWifiSsid?: string | null;
  hospitalWifiPassword?: string | null;
  hospitalLanInfo?: string | null;
  wifiUser?: string | null;
  vpnDetail?: string | null;
  connectionFlags?: string | null;
  networkGateway?: string | null;
  networkSubnet?: string | null;
  images?: string[];
}

export interface WarrantyExtensionRequestBody {
  installationId: number;
  latestExtensionDate: string; // yyyy-mm-dd
  hospital?: {
    name?: string;
    hospitalName?: string;
    systemType?: string;
    department?: string;
    building?: string;
    floor?: string;
    room?: string;
    endoscopeBrand?: string;
    systemMode?: string;
  };
  equipment?: Array<{
    equipmentType?: string;
    brand?: string;
    model?: string;
    serialNumber?: string | null;
    quantity?: number | string;
    lengthM?: number | string | null;
    connectionType?: string | null;
    signalType?: string | null;
    footSwitchMode?: string | null;
    notes?: string | null;
  }>;
  fieldInfo?: FieldInfo;
  extra?: ExtraInfo;
  equipmentImages?: string[];
  fieldInfoImages?: string[];
}

export interface SimWithRelations {
  id: number;
  phoneNumber: string;
  networkFlags: string;
  networkOther: string | null;
  ownerName: string | null;
  activatedDate: Date | null;
  packageDetail: string | null;
  packageExpireAt: Date | null;
  simExpireAt: Date | null;
  status: string;
  hospitalId: number;
  departmentId: number;
  hospital?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
}