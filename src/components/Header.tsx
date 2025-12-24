'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  name: string;
}

interface HeaderProps {
  currentType?: 'internal' | 'external';
  onTypeChange?: (type: 'internal' | 'external') => void;
}

export default function Header({ currentType = 'internal', onTypeChange }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateComponent, setShowCreateComponent] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Create user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  
  // Create component form state
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentParent, setNewComponentParent] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  
  // Create issue form state
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueComponent, setNewIssueComponent] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  const [newIssueReporterName, setNewIssueReporterName] = useState('');
  const [newIssueAssignedTo, setNewIssueAssignedTo] = useState('');
  const [newIssueHospital, setNewIssueHospital] = useState('');
  const [newIssueDepartment, setNewIssueDepartment] = useState('');

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Load users for dropdown
    fetchUsers();
    fetchComponents();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setShowLogin(false);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        const error = await response.json();
        alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
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

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;

    // ถ้ามี user login อยู่ ให้ใช้ชื่อ user เป็นผู้แจ้งปัญหา
    const reporterName = user ? user.name : newIssueReporterName.trim();
    
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
        type: currentType,
        reporterName: reporterName, // ใช้ชื่อ user ถ้า login อยู่ หรือใช้ที่กรอกมา
      };

      // สำหรับทั้ง internal และ external ต้องมี reporterName
      if (newIssueAssignedTo.trim()) issueData.assignedTo = newIssueAssignedTo.trim();

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
        setNewIssueReporterName('');
        setNewIssueAssignedTo('');
        setNewIssueHospital('');
        setNewIssueDepartment('');
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
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left side - Type selection and View selection */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View selection */}
            <div className="flex items-center gap-2 border-r pr-2 mr-2">
              <button
                onClick={() => router.push('/')}
                className={`px-4 py-2 rounded font-medium ${
                  pathname === '/'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => router.push('/list')}
                className={`px-4 py-2 rounded font-medium ${
                  pathname === '/list'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                List View
              </button>
            </div>
            
            {/* Type selection */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTypeChange?.('internal')}
                className={`px-4 py-2 rounded font-medium ${
                  currentType === 'internal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ปัญหาที่แจ้งจากภายใน
              </button>
              <button
                onClick={() => onTypeChange?.('external')}
                className={`px-4 py-2 rounded font-medium ${
                  currentType === 'external'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ปัญหาที่แจ้งจากภายนอก
              </button>
            </div>
          </div>

          {/* Right side - User section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateComponent(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              สร้าง Component
            </button>
            {user ? (
              <>
                <span className="text-sm text-gray-700">สวัสดี, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  สร้างผู้ใช้
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 relative z-50">
            <h2 className="text-xl font-bold mb-4">เข้าสู่ระบบ</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 relative z-50">
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
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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

      {/* Create Component Modal */}
      {showCreateComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 relative z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto relative z-50">
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIssueComponent}
                    onChange={(e) => setNewIssueComponent(e.target.value)}
                    placeholder="พิมพ์ชื่อ Component"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedComp = components.find(comp => comp._id === e.target.value);
                        if (selectedComp) {
                          setNewIssueComponent((selectedComp.path || []).join(' > '));
                        }
                      }
                    }}
                    className="px-3 py-2 border rounded bg-gray-50"
                  >
                    <option value="">เลือก Component</option>
                    {components.map(comp => (
                      <option key={comp._id} value={comp._id}>
                        {(comp.path || []).join(' > ')}
                      </option>
                    ))}
                  </select>
                </div>
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
              
              {/* ผู้แจ้งปัญหา - ต้องมีสำหรับทั้งสองประเภท */}
              {user ? (
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
                  <select
                    value={newIssueReporterName}
                    onChange={(e) => setNewIssueReporterName(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">เลือกผู้แจ้งปัญหา</option>
                    {users.map(u => (
                      <option key={u._id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newIssueReporterName}
                    onChange={(e) => setNewIssueReporterName(e.target.value)}
                    placeholder="หรือพิมพ์ชื่อเอง"
                    className="w-full px-3 py-2 border rounded mt-2"
                    required
                  />
                </div>
              )}
              
              {/* ผู้รับผิดชอบ - ไม่บังคับ */}
              <div>
                <label className="block text-sm font-medium mb-1">ผู้รับผิดชอบ (ไม่บังคับ)</label>
                <select
                  value={newIssueAssignedTo}
                  onChange={(e) => setNewIssueAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">ไม่มี</option>
                  {users.map(u => (
                    <option key={u._id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newIssueAssignedTo}
                  onChange={(e) => setNewIssueAssignedTo(e.target.value)}
                  placeholder="หรือพิมพ์ชื่อเอง"
                  className="w-full px-3 py-2 border rounded mt-2"
                />
              </div>

              {/* สำหรับปัญหาจากภายนอก เพิ่มโรงพยาบาลและแผนก */}
              {currentType === 'external' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">โรงพยาบาล</label>
                    <input
                      type="text"
                      value={newIssueHospital}
                      onChange={(e) => setNewIssueHospital(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
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

      {/* Floating Action Button - Create Issue */}
      {pathname === '/' && (
        <button
          onClick={() => setShowCreateIssue(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
          title="สร้าง Issue"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </header>
  );
}

