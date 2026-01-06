'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
}

// Helper function to create a simple hash from URL for cache busting
const getUrlHash = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

interface SidebarProps {
  currentType?: 'internal' | 'external';
  onTypeChange?: (type: 'internal' | 'external') => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ currentType = 'internal', onTypeChange, onCollapseChange }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCreateComponent, setShowCreateComponent] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showCreateHospital, setShowCreateHospital] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  // Profile edit form state
  const [editName, setEditName] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  
  // Create component form state
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentParent, setNewComponentParent] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  
  // Create hospital form state
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newHospitalProvince, setNewHospitalProvince] = useState('');
  const [newHospitalCode, setNewHospitalCode] = useState('');
  const [newHospitalAddress, setNewHospitalAddress] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);
  
  // List of Thai provinces
  const PROVINCES = [
    "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น",
    "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร",
    "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
    "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี",
    "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
    "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา", "พัทลุง", "พิจิตร",
    "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม",
    "มุกดาหาร", "แม่ฮ่องสอน", "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง",
    "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
    "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม",
    "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี",
    "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ",
    "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
  ];
  
  // Create user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  
  // Create issue form state
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueComponent, setNewIssueComponent] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  const [newIssueUrgency, setNewIssueUrgency] = useState<'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD' | null>(null);
  const [newIssueReporterName, setNewIssueReporterName] = useState('');
  const [newIssueAssignedTo, setNewIssueAssignedTo] = useState('');
  const [newIssueHospital, setNewIssueHospital] = useState('');
  const [newIssueDepartment, setNewIssueDepartment] = useState('');
  const [newIssueType, setNewIssueType] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    // Check if mobile
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      setIsMobile(isMobileWidth);
      // ใน mobile ให้ซ่อน sidebar โดย default
      if (isMobileWidth) {
        setIsCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Notify parent about collapse state
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setEditName(parsedUser.name || '');
      setEditProfilePicture(parsedUser.profilePicture || '');
    }
    
    // Load users for dropdown
    fetchUsers();
    fetchComponents();
    fetchHospitals();
    
    // Listen for localStorage changes (when profile is updated in another tab/device)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser') {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setEditName(parsedUser.name || '');
          setEditProfilePicture(parsedUser.profilePicture || '');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes in same tab
    const interval = setInterval(() => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.profilePicture !== user?.profilePicture || parsedUser.name !== user?.name) {
          setUser(parsedUser);
          setEditName(parsedUser.name || '');
          setEditProfilePicture(parsedUser.profilePicture || '');
        }
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user?.profilePicture, user?.name]);

  // Listen for custom event to open create issue modal
  useEffect(() => {
    const handleOpenCreateIssue = () => {
      setShowCreateIssue(true);
    };
    
    window.addEventListener('openCreateIssue', handleOpenCreateIssue);
    
    return () => {
      window.removeEventListener('openCreateIssue', handleOpenCreateIssue);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchComponents = async () => {
    try {
      const response = await fetch('/api/components');
      if (response.ok) {
        const data = await response.json();
        setComponents(data);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals');
      if (response.ok) {
        const data = await response.json();
        setHospitals(data);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const handleProfilePictureUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file); // เปลี่ยนจาก 'image' เป็น 'file' ให้ตรงกับ API
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    return data.url;
  };

  const handleSaveProfile = async () => {
    try {
      if (!user || user._id === 'guest') {
        alert('ไม่สามารถแก้ไขโปรไฟล์ Guest ได้');
        return;
      }

      let profilePictureUrl = editProfilePicture;
      
      if (profilePictureFile) {
        profilePictureUrl = await handleProfilePictureUpload(profilePictureFile);
      }

      // เก็บใน database (Firestore) เหมือนกับรูปภาพในการแจ้งปัญหา
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          profilePicture: profilePictureUrl,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // เพิ่ม timestamp สำหรับ cache busting
        const userWithTimestamp = {
          ...updatedUser,
          profilePictureUpdated: Date.now(),
        };
        setUser(userWithTimestamp);
        localStorage.setItem('currentUser', JSON.stringify(userWithTimestamp));
        setShowProfileEdit(false);
        setProfilePictureFile(null);
        alert('บันทึกข้อมูลสำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถบันทึกข้อมูลได้: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  const handleCreateComponent = async () => {
    if (!newComponentName.trim()) {
      alert('กรุณากรอกชื่อ Component');
      return;
    }
    
    try {
      const parentId = newComponentParent || null;
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newComponentName.trim(),
          parentId,
        }),
      });
      
      if (response.ok) {
        setNewComponentName('');
        setNewComponentParent('');
        setShowCreateComponent(false);
        fetchComponents();
        alert('สร้าง Component สำเร็จ');
      } else {
        alert('สร้าง Component ไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error creating component:', error);
      alert('สร้าง Component ไม่สำเร็จ');
    }
  };

  const handleCreateHospital = async () => {
    if (!newHospitalName.trim()) {
      alert('กรุณากรอกชื่อโรงพยาบาล');
      return;
    }
    
    if (!newHospitalName.trim() || !newHospitalProvince.trim()) {
      alert('กรุณากรอกชื่อโรงพยาบาลและจังหวัด');
      return;
    }

    try {
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHospitalName.trim(),
          province: newHospitalProvince.trim() || null,
          code: newHospitalCode.trim() || null,
          address: newHospitalAddress.trim() || null,
        }),
      });
      
      if (response.ok) {
        setNewHospitalName('');
        setNewHospitalProvince('');
        setNewHospitalCode('');
        setNewHospitalAddress('');
        setShowCreateHospital(false);
        fetchHospitals();
        alert('เพิ่มโรงพยาบาลสำเร็จ');
      } else {
        alert('เพิ่มโรงพยาบาลไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error creating hospital:', error);
      alert('เพิ่มโรงพยาบาลไม่สำเร็จ');
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          name: newName.trim(),
        }),
      });
      
      if (response.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        setShowCreateUser(false);
        fetchUsers();
        alert('สร้างผู้ใช้สำเร็จ');
      } else {
        alert('สร้างผู้ใช้ไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('สร้างผู้ใช้ไม่สำเร็จ');
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) {
      alert('กรุณากรอกหัวข้อปัญหา');
      return;
    }
    
    if (!newIssueComponent) {
      alert('กรุณาเลือก Component');
      return;
    }
    
    // ถ้ามี user login อยู่และไม่ใช่ guest ให้ใช้ชื่อ user เป็นผู้แจ้งปัญหา
    // ถ้าเป็น guest หรือไม่มี user ให้ใช้ชื่อที่กรอกมา
    const reporterName = (user && user._id !== 'guest' && user.name) 
      ? user.name 
      : newIssueReporterName.trim();
    
    // สำหรับปัญหาทั้งภายในและภายนอก ต้องระบุผู้แจ้งปัญหา
    if (!reporterName) {
      alert('กรุณาระบุผู้แจ้งปัญหา');
      return;
    }
    
    try {
      const issueData: any = {
        title: newIssueTitle.trim(),
        componentId: newIssueComponent,
        priority: newIssuePriority,
        type: currentType,
        reporterName: reporterName, // ใช้ชื่อ user ถ้า login อยู่ หรือใช้ที่กรอกมา
      };
      
      if (newIssueUrgency) {
        issueData.urgency = newIssueUrgency;
      }
      
      if (newIssueAssignedTo) {
        issueData.assignedTo = newIssueAssignedTo;
      }
      
      if (currentType === 'external') {
        if (newIssueHospital) {
          issueData.hospital = newIssueHospital;
        }
        if (newIssueDepartment) {
          issueData.department = newIssueDepartment;
        }
      }
      
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueData),
      });
      
      if (response.ok) {
        setNewIssueTitle('');
        setNewIssueComponent('');
        setNewIssuePriority('MED');
        setNewIssueUrgency(null);
        setNewIssueReporterName(''); // ยังคง reset แต่จะไม่ใช้ถ้ามี user login
        setNewIssueAssignedTo('');
        setNewIssueHospital('');
        setNewIssueDepartment('');
        setShowCreateIssue(false);
        window.location.reload();
      } else {
        alert('สร้าง Issue ไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('สร้าง Issue ไม่สำเร็จ');
    }
  };

  const sidebarWidth = isCollapsed ? (isMobile ? '0' : '80px') : '280px';

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 shadow-lg z-50 transition-all duration-300 ${
          isMobile ? (isCollapsed ? '-translate-x-full' : 'translate-x-0') : ''
        }`}
        style={{ 
          width: isMobile ? (isCollapsed ? '0' : '280px') : sidebarWidth,
          // ใน mobile ถ้าซ่อนอยู่ให้ซ่อนขอบและ shadow ด้วย และซ่อนทั้งหมด
          ...(isMobile && isCollapsed ? { 
            borderRight: 'none',
            boxShadow: 'none',
            pointerEvents: 'none',
            visibility: 'hidden',
            opacity: 0,
            overflow: 'hidden'
          } : {
            visibility: 'visible',
            opacity: 1,
            overflow: 'visible'
          })
        }}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-white to-neutral-50">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 bg-white flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex flex-col">
                <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#8c8c8c", fontWeight: 600 }}>
                  ยินดีต้อนรับเข้าสู่
                </span>
                <h2 className="text-lg font-bold text-neutral-800 bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                ระบบจัดการปัญหา
                </h2>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-primary-50 rounded-lg transition-colors text-neutral-600 hover:text-primary-600"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* View Selection */}
            <div className="space-y-2">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  มุมมอง
                </div>
              )}
              <button
                onClick={() => router.push('/')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  (mounted && pathname === '/')
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
                suppressHydrationWarning
                title={isCollapsed ? 'Board' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                {!isCollapsed && <span>Board</span>}
              </button>
              <button
                onClick={() => router.push('/list')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  (mounted && pathname === '/list')
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
                suppressHydrationWarning
                title={isCollapsed ? 'List View' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {!isCollapsed && <span>List View</span>}
              </button>
            </div>

            {/* Type Selection */}
            <div className="space-y-2 pt-4 border-t border-neutral-200">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  ประเภทปัญหา
                </div>
              )}
              <button
                onClick={() => {
                  onTypeChange?.('internal');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('currentIssueType', 'internal');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentType === 'internal'
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
                title={isCollapsed ? 'ภายใน' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {!isCollapsed && <span>ปัญหาที่แจ้งจากภายใน</span>}
              </button>
              <button
                onClick={() => {
                  onTypeChange?.('external');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('currentIssueType', 'external');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentType === 'external'
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
                title={isCollapsed ? 'ภายนอก' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {!isCollapsed && <span>ปัญหาที่แจ้งจากภายนอก</span>}
              </button>
            </div>

            {/* Form Menu Items */}
            <div className="space-y-2 pt-4 border-t border-neutral-200">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  แบบฟอร์มการเพิ่มข้อมูล
                </div>
              )}
              <button
                onClick={() => setShowCreateComponent(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
                title={isCollapsed ? 'สร้าง Component' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!isCollapsed && <span>สร้าง Component</span>}
              </button>
              <button
                onClick={() => setShowCreateHospital(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
                title={isCollapsed ? 'เพิ่มโรงพยาบาล' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!isCollapsed && <span>เพิ่มโรงพยาบาล</span>}
              </button>
              <button
                onClick={() => setShowCreateUser(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
                title={isCollapsed ? 'สร้างผู้ใช้ใหม่' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!isCollapsed && <span>สร้างผู้ใช้ใหม่</span>}
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-neutral-200">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  การจัดการ
                </div>
              )}
              <button
                onClick={() => router.push('/service-management')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
                title={isCollapsed ? 'ระบบจัดการเซอร์วิส' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!isCollapsed && <span>ระบบจัดการเซอร์วิส</span>}
              </button>
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary-50 transition-all duration-200"
                >
                  {user.profilePicture ? (
                    <img
                      src={`${user.profilePicture}${user.profilePicture.includes('?') ? '&' : '?'}v=${(user as any).profilePictureUpdated || getUrlHash(user.profilePicture)}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 flex-shrink-0"
                      key={`${user.profilePicture}-${(user as any).profilePictureUpdated || ''}`} // Force re-render when URL or timestamp changes
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0 shadow-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-neutral-900 truncate">{user.name}</div>
                      <div className="text-xs text-neutral-500 truncate">{user.username}</div>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-danger-500 text-white hover:bg-danger-600 transition-all duration-200 shadow-sm hover:shadow-md"
                  title={isCollapsed ? 'ออกจากระบบ' : undefined}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!isCollapsed && <span>ออกจากระบบ</span>}
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all duration-200 shadow-sm hover:shadow-md"
                title={isCollapsed ? 'เข้าสู่ระบบ' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {!isCollapsed && <span>เข้าสู่ระบบ</span>}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button - แสดงเฉพาะเมื่อ sidebar ซ่อนอยู่ - อยู่ด้านล่างซ้าย */}
      {isMobile && isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed bottom-6 left-6 z-[60] p-3 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 text-neutral-600 hover:text-primary-600"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Modals - Copy from Header.tsx */}
      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">แก้ไขโปรไฟล์</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">รูปโปรไฟล์</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setProfilePictureFile(file);
                  }}
                  className="w-full px-3 py-2 border rounded"
                />
                {profilePictureFile && (
                  <img
                    src={URL.createObjectURL(profilePictureFile)}
                    alt="Preview"
                    className="mt-2 w-20 h-20 rounded-full object-cover"
                  />
                )}
                {editProfilePicture && !profilePictureFile && (
                  <img
                    src={`${editProfilePicture}${editProfilePicture.includes('?') ? '&' : '?'}v=${getUrlHash(editProfilePicture)}`}
                    alt="Current"
                    className="mt-2 w-20 h-20 rounded-full object-cover"
                    key={editProfilePicture} // Force re-render when URL changes
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setShowProfileEdit(false);
                    setProfilePictureFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Component Modal */}
      {showCreateComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">สร้าง Component</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ Component</label>
                <input
                  type="text"
                  value={newComponentName}
                  onChange={(e) => setNewComponentName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Component หลัก (ถ้ามี)</label>
                <select
                  value={newComponentParent}
                  onChange={(e) => setNewComponentParent(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">ไม่มี</option>
                  {components.map((comp) => (
                    <option key={comp._id} value={comp._id}>
                      {comp.path.join(' > ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateComponent}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                >
                  สร้าง
                </button>
                <button
                  onClick={() => setShowCreateComponent(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Hospital Modal */}
      {showCreateHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">ลงทะเบียนโรงพยาบาล</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  <span className="text-red-500">*</span> ชื่อโรงพยาบาล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="hospitalNameList"
                  value={newHospitalName}
                  onChange={(e) => setNewHospitalName(e.target.value)}
                  placeholder="พิมพ์เพื่อค้นหาหรือเลือกโรงพยาบาล"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <datalist id="hospitalNameList">
                  {hospitals.map(hospital => (
                    <option key={hospital._id} value={hospital.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <span className="text-red-500">*</span> จังหวัด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="provinceList"
                  value={newHospitalProvince}
                  onChange={(e) => setNewHospitalProvince(e.target.value)}
                  placeholder="พิมพ์เพื่อค้นหาหรือเลือกจังหวัด"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <datalist id="provinceList">
                  {PROVINCES.map(province => (
                    <option key={province} value={province} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">รหัสโรงพยาบาล</label>
                <input
                  type="text"
                  value={newHospitalCode}
                  onChange={(e) => setNewHospitalCode(e.target.value)}
                  placeholder="เช่น HOSP-001"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ที่อยู่</label>
                <textarea
                  value={newHospitalAddress}
                  onChange={(e) => setNewHospitalAddress(e.target.value)}
                  placeholder="เลขที่ / ถนน / ตำบล / อำเภอ"
                  rows={3}
                  className="w-full px-3 py-2 border rounded resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateHospital}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                >
                  บันทึกข้อมูลโรงพยาบาล
                </button>
                <button
                  onClick={() => {
                    setShowCreateHospital(false);
                    setNewHospitalName('');
                    setNewHospitalProvince('');
                    setNewHospitalCode('');
                    setNewHospitalAddress('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">สร้างผู้ใช้ใหม่</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateUser}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                >
                  สร้าง
                </button>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Issue Modal - Copy from Header.tsx */}
      {showCreateIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">สร้าง Issue ใหม่</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateIssue();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Component <span className="text-red-500">*</span></label>
                <select
                  value={newIssueComponent}
                  onChange={(e) => setNewIssueComponent(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">เลือก Component</option>
                  {components.map((comp) => (
                    <option key={comp._id} value={comp._id}>
                      {comp.path.join(' > ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ความสำคัญ</label>
                  <select
                    value={newIssuePriority}
                    onChange={(e) => setNewIssuePriority(e.target.value as 'LOW' | 'MED' | 'HIGH')}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="LOW">ต่ำ</option>
                    <option value="MED">ปานกลาง</option>
                    <option value="HIGH">สูง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ระดับความยาก</label>
                  <select
                    value={newIssueUrgency || ''}
                    onChange={(e) => setNewIssueUrgency(e.target.value as any || null)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">ไม่ระบุ</option>
                    <option value="URGENT_EASY">ด่วน-ง่าย</option>
                    <option value="URGENT_HARD">ด่วน-ยาก</option>
                    <option value="NOT_URGENT_EASY">ไม่ด่วน-ง่าย</option>
                    <option value="NOT_URGENT_HARD">ไม่ด่วน-ยาก</option>
                  </select>
                </div>
              </div>
              
              {/* ผู้แจ้งปัญหา - ต้องมีสำหรับทั้งสองประเภท */}
              {user && user._id !== 'guest' && user.name ? (
                <div>
                  <label className="block text-sm font-medium mb-1">ผู้แจ้งปัญหา</label>
                  <div className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700">
                    {user.name}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ใช้ชื่อผู้ใช้ที่ login อยู่</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">ผู้แจ้งปัญหา *</label>
                  <input
                    type="text"
                    list="reporterNameList"
                    value={newIssueReporterName}
                    onChange={(e) => setNewIssueReporterName(e.target.value)}
                    placeholder="เลือกหรือพิมพ์ชื่อผู้แจ้งปัญหา"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                  <datalist id="reporterNameList">
                    {users.map(u => (
                      <option key={u._id} value={u.name} />
                    ))}
                  </datalist>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">มอบหมายให้</label>
                <select
                  value={newIssueAssignedTo}
                  onChange={(e) => setNewIssueAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">ไม่มอบหมาย</option>
                  {users.map((u) => (
                    <option key={u._id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              {currentType === 'external' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">โรงพยาบาล</label>
                    <input
                      type="text"
                      list="hospitalList"
                      value={newIssueHospital}
                      onChange={(e) => setNewIssueHospital(e.target.value)}
                      placeholder="เลือกหรือพิมพ์ชื่อโรงพยาบาล"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <datalist id="hospitalList">
                      {hospitals.map(hospital => (
                        <option key={hospital._id} value={hospital.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">แผนก</label>
                    <input
                      type="text"
                      value={newIssueDepartment}
                      onChange={(e) => setNewIssueDepartment(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  สร้าง
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateIssue(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

