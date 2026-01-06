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

interface HeaderProps {
  currentType?: 'internal' | 'external';
  onTypeChange?: (type: 'internal' | 'external') => void;
}

export default function Header({ currentType = 'internal', onTypeChange }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
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
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      return result.url;
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user._id === 'guest') {
      alert('ไม่สามารถแก้ไขโปรไฟล์ Guest ได้');
      return;
    }

    try {
      let profilePictureUrl = editProfilePicture;

      // ถ้ามีไฟล์ใหม่ ให้อัปโหลดก่อน
      if (profilePictureFile) {
        profilePictureUrl = await handleProfilePictureUpload(profilePictureFile);
      }

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
        alert('อัปเดตโปรไฟล์สำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถอัปเดตโปรไฟล์ได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentName.trim()) return;

    try {
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newComponentName,
          parentId: newComponentParent || undefined,
        }),
      });

      if (response.ok) {
        await fetchComponents();
        setShowCreateComponent(false);
        setNewComponentName('');
        setNewComponentParent('');
        alert('สร้าง Component สำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถสร้าง Component ได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospitalName.trim()) return;

    try {
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHospitalName,
        }),
      });

      if (response.ok) {
        await fetchHospitals();
        setShowCreateHospital(false);
        setNewHospitalName('');
        alert('เพิ่มโรงพยาบาลสำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถเพิ่มโรงพยาบาลได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowCreateUser(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        alert('สร้างผู้ใช้สำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถสร้างผู้ใช้ได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;

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
      // Parse component path from text input and create component if needed
      let componentPath: string[] = [];
      let componentId: string | undefined = undefined;
      
      if (newIssueComponent && newIssueComponent.trim()) {
        const componentInput = newIssueComponent.trim();
        
        // Check if it's a component ID first
        const matchingCompById = components.find(comp => comp._id === componentInput);
        if (matchingCompById) {
          // It's a component ID
          componentId = matchingCompById._id;
          componentPath = matchingCompById.path || [];
        } else {
          // Check if it matches any component path
          const matchingCompByPath = components.find(comp => {
            const compPath = (comp.path || []).join(' > ');
            return compPath === componentInput;
          });
          
          if (matchingCompByPath) {
            // It matches an existing component path
            componentId = matchingCompByPath._id;
            componentPath = matchingCompByPath.path || [];
          } else {
            // It's a new component path - create it in database
            const pathParts = componentInput.split(' > ').map(s => s.trim()).filter(s => s);
            if (pathParts.length > 0) {
              try {
                // Create the component with the full path
                const createCompResponse = await fetch('/api/components', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: pathParts[pathParts.length - 1], // Last part is the component name
                    parentId: undefined, // Will handle nested components later if needed
                    path: pathParts,
                  }),
                });
                
                if (createCompResponse.ok) {
                  const newComponent = await createCompResponse.json();
                  componentId = newComponent._id;
                  componentPath = newComponent.path || pathParts;
                  // Refresh components list
                  await fetchComponents();
                } else {
                  // If creation fails, just use the path
                  componentPath = pathParts;
                }
              } catch (error) {
                // If creation fails, just use the path
                componentPath = pathParts;
              }
            }
          }
        }
      }
      
      const issueData: any = {
        title: newIssueTitle,
        componentId: componentId || undefined,
        componentPath: componentPath,
        priority: newIssuePriority,
        urgency: newIssueUrgency,
        type: currentType,
        reporterName: reporterName, // ใช้ชื่อ user ถ้า login อยู่ หรือใช้ที่กรอกมา
      };

      // สำหรับทั้ง internal และ external ต้องมี reporterName
      if (newIssueAssignedTo.trim()) issueData.assignedTo = newIssueAssignedTo.trim();

      // เพิ่มประเภทปัญหา (issueType)
      if (newIssueType && newIssueType !== '-') {
        issueData.issueType = newIssueType;
      }

      // สำหรับ external เพิ่มโรงพยาบาลและแผนก
      if (currentType === 'external') {
        if (newIssueHospital) issueData.hospital = newIssueHospital;
        if (newIssueDepartment) issueData.department = newIssueDepartment;
      }

      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueData),
      });

      if (response.ok) {
        setShowCreateIssue(false);
        setNewIssueTitle('');
        setNewIssueComponent('');
        setNewIssuePriority('MED');
        setNewIssueUrgency(null);
        setNewIssueReporterName('');
        setNewIssueAssignedTo('');
        setNewIssueHospital('');
        setNewIssueDepartment('');
        setNewIssueType('');
        alert('สร้าง Issue สำเร็จ');
        // Refresh page to show new issue
        if (pathname === '/') {
          window.location.reload();
        } else {
          router.push('/');
        }
      } else {
        const error = await response.json();
        alert(`ไม่สามารถสร้าง Issue ได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Left side - Type selection and View selection */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            {/* View selection */}
            <div className="flex items-center gap-1 sm:gap-2 border-r-0 sm:border-r pr-0 sm:pr-2 mr-0 sm:mr-2 border-b sm:border-b-0 pb-2 sm:pb-0">
              <button
                onClick={() => router.push('/')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded font-medium text-xs sm:text-base ${
                  pathname === '/'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => router.push('/list')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded font-medium text-xs sm:text-base ${
                  pathname === '/list'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                List View
              </button>
            </div>
            
            {/* Type selection */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => {
                  onTypeChange?.('internal');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('currentIssueType', 'internal');
                  }
                }}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded font-medium text-xs sm:text-base ${
                  currentType === 'internal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">ปัญหาที่แจ้งจากภายใน</span>
                <span className="sm:hidden">ภายใน</span>
              </button>
              <button
                onClick={() => {
                  onTypeChange?.('external');
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('currentIssueType', 'external');
                  }
                }}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded font-medium text-xs sm:text-base ${
                  currentType === 'external'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">ปัญหาที่แจ้งจากภายนอก</span>
                <span className="sm:hidden">ภายนอก</span>
              </button>
            </div>
          </div>

          {/* Right side - User section */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
            <button
              onClick={() => {
                // ไปที่โปรเจคต์ Service Management
                // ไปที่หน้า Service Management ในโปรเจกต์เดียวกัน
                router.push('/service-management');
              }}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden md:inline">Service Management</span>
              <span className="hidden sm:inline md:hidden">Service</span>
              <span className="sm:hidden">SM</span>
            </button>
            <button
              onClick={() => setShowCreateComponent(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden lg:inline">สร้าง Component</span>
              <span className="hidden sm:inline lg:hidden">Component</span>
              <span className="sm:hidden">Comp</span>
            </button>
            <button
              onClick={() => setShowCreateHospital(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden lg:inline">เพิ่มโรงพยาบาล</span>
              <span className="hidden sm:inline lg:hidden">โรงพยาบาล</span>
              <span className="sm:hidden">โรงพยาบาล</span>
            </button>
            <button
              onClick={() => setShowCreateUser(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden lg:inline">สร้างผู้ใช้ใหม่</span>
              <span className="hidden sm:inline lg:hidden">ผู้ใช้</span>
              <span className="sm:hidden">ผู้ใช้</span>
            </button>
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
                {user._id !== 'guest' && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    {user.profilePicture ? (
                      <img
                        src={`${user.profilePicture}${user.profilePicture.includes('?') ? '&' : '?'}v=${(user as any).profilePictureUpdated || getUrlHash(user.profilePicture)}`}
                        alt={user.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-300 cursor-pointer hover:border-blue-500 flex-shrink-0"
                        onClick={() => setShowProfileEdit(true)}
                        key={`${user.profilePicture}-${(user as any).profilePictureUpdated || ''}`} // Force re-render when URL or timestamp changes
                      />
                    ) : (
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold cursor-pointer hover:bg-blue-600 border-2 border-gray-300 text-xs sm:text-base flex-shrink-0"
                        onClick={() => setShowProfileEdit(true)}
                      >
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    {user.name && <span className="text-xs sm:text-sm text-gray-700 hidden md:inline whitespace-nowrap">{user.name}</span>}
                  </div>
                )}
                {user._id === 'guest' && (
                  <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">Guest</span>
                )}
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <span className="hidden md:inline">ออกจากระบบ</span>
                  <span className="hidden sm:inline md:hidden">ออก</span>
                  <span className="sm:hidden">ออก</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
              >
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                <span className="sm:hidden">เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-2 sm:mx-4 relative z-50 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">แก้ไขโปรไฟล์</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">รูปโปรไฟล์</label>
                <div className="flex items-center gap-4 mb-2">
                  {editProfilePicture || profilePictureFile ? (
                    <img
                      src={profilePictureFile ? URL.createObjectURL(profilePictureFile) : editProfilePicture}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-2xl">
                      {editName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfilePictureFile(file);
                        }
                      }}
                      className="text-sm"
                    />
                    {editProfilePicture && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditProfilePicture('');
                          setProfilePictureFile(null);
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileEdit(false);
                    setEditName(user.name || '');
                    setEditProfilePicture(user.profilePicture || '');
                    setProfilePictureFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Component Modal */}
      {showCreateComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-2 sm:mx-4 relative z-50 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">สร้าง Component</h2>
            <form onSubmit={handleCreateComponent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ Component</label>
                <input
                  type="text"
                  value={newComponentName}
                  onChange={(e) => setNewComponentName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parent Component (ไม่บังคับ)</label>
                <select
                  value={newComponentParent}
                  onChange={(e) => setNewComponentParent(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">ไม่มี (root)</option>
                  {components.map(comp => (
                    <option key={comp._id} value={comp._id}>
                      {(comp.path || []).join(' > ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  สร้าง
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateComponent(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative z-50">
            <h2 className="text-xl font-bold mb-4">สร้าง Issue</h2>
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">หัวข้อปัญหา *</label>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Component (ไม่บังคับ)</label>
                <input
                  type="text"
                  list="componentList"
                  value={newIssueComponent}
                  onChange={(e) => setNewIssueComponent(e.target.value)}
                  placeholder="เลือกหรือพิมพ์ชื่อ Component"
                  className="w-full px-3 py-2 border rounded"
                />
                <datalist id="componentList">
                  {components.map(comp => (
                    <option key={comp._id} value={(comp.path || []).join(' > ')} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ประเภทปัญหา</label>
                <select
                  value={newIssueType}
                  onChange={(e) => setNewIssueType(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-</option>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                </select>
              </div>
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
                <label className="block text-sm font-medium mb-1">ความเร่งด่วน</label>
                <select
                  value={newIssueUrgency || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewIssueUrgency(value ? (value as 'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD') : null);
                  }}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-</option>
                  <option value="URGENT_EASY">ด่วน-ง่าย</option>
                  <option value="URGENT_HARD">ด่วน-ยาก</option>
                  <option value="NOT_URGENT_EASY">ไม่ด่วน-ง่าย</option>
                  <option value="NOT_URGENT_HARD">ไม่ด่วน-ยาก</option>
                </select>
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
              
              {/* ผู้รับงาน - ไม่บังคับ */}
              <div>
                <label className="block text-sm font-medium mb-1">ผู้รับงาน (ไม่บังคับ)</label>
                <input
                  type="text"
                  list="assignedToList"
                  value={newIssueAssignedTo}
                  onChange={(e) => setNewIssueAssignedTo(e.target.value)}
                  placeholder="เลือกหรือพิมพ์ชื่อผู้รับงาน"
                  className="w-full px-3 py-2 border rounded"
                />
                <datalist id="assignedToList">
                  {users.map(u => (
                    <option key={u._id} value={u.name} />
                  ))}
                </datalist>
              </div>

              {/* สำหรับปัญหาจากภายนอก เพิ่มโรงพยาบาลและแผนก */}
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

      {/* Create Hospital Modal */}
      {showCreateHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-2 sm:mx-4 relative z-50 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">ลงทะเบียนโรงพยาบาล</h2>
            <form onSubmit={handleCreateHospital} className="space-y-4">
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
                  {['กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยะลา', 'ยโสธร', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'].map(province => (
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
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  บันทึกข้อมูลโรงพยาบาล
                </button>
                <button
                  type="button"
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
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-2 sm:mx-4 relative z-50 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">สร้างผู้ใช้ใหม่</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  สร้าง
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button - Create Issue */}
      {pathname === '/' && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const event = new CustomEvent('openCreateIssue');
            window.dispatchEvent(event);
          }}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 hover:shadow-xl transition-all duration-200 flex items-center justify-center z-[60] cursor-pointer"
          title="สร้าง Issue"
          type="button"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </header>
  );
}

