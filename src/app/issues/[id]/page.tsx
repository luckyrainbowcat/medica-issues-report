'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IssueEditor from '@/components/IssueEditor';

interface Issue {
  _id: string;
  title: string;
  status: string;
  priority: string;
  componentPath: string[];
  description: any;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
}

interface User {
  _id: string;
  username: string;
  name: string;
}

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [subIssues, setSubIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSubIssue, setShowCreateSubIssue] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  
  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editReporterName, setEditReporterName] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editClosedBy, setEditClosedBy] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editComponentPath, setEditComponentPath] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  
  // Create sub-issue form states
  const [newSubIssueTitle, setNewSubIssueTitle] = useState('');
  const [newSubIssuePriority, setNewSubIssuePriority] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  const [newSubIssueReporterName, setNewSubIssueReporterName] = useState('');
  const [newSubIssueAssignedTo, setNewSubIssueAssignedTo] = useState('');
  
  // Sub-issue action states
  const [subIssueAction, setSubIssueAction] = useState<{ id: string; type: 'accept' | 'done' } | null>(null);
  const [subIssueAssignedToName, setSubIssueAssignedToName] = useState('');
  const [subIssueClosedByName, setSubIssueClosedByName] = useState('');
  
  useEffect(() => {
    fetchIssue();
    fetchUsers();
    
    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
    
    // Only auto-refresh if user is not editing description or canvas
    const interval = setInterval(() => {
      if (!isEditingDescription) {
        fetchIssue();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [params.id, isEditingDescription]);

  useEffect(() => {
    if (issue) {
      fetchSubIssues();
    }
  }, [issue]);

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

  // Recursive function to count nested sub-issues
  const countNestedSubIssues = (parentId: string, allIssues: any[]): number => {
    const directSubs = allIssues.filter(sub => {
      const subParentId = String(sub.parentIssueId || '').trim();
      const pId = String(parentId || '').trim();
      return subParentId === pId && subParentId !== '';
    });
    
    let total = directSubs.length;
    // Recursively count nested sub-issues
    directSubs.forEach(sub => {
      total += countNestedSubIssues(sub._id, allIssues);
    });
    
    return total;
  };

  const fetchIssue = async () => {
    try {
      const response = await fetch(`/api/issues/${params.id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch issue' }));
        throw new Error(errorData.error || 'Failed to fetch issue');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setIssue(data);
      setEditTitle(data.title || '');
      setEditReporterName(data.reporterName || '');
      setEditAssignedTo(data.assignedTo || '');
      setEditClosedBy(data.closedBy || '');
      setEditHospital(data.hospital || '');
      setEditDepartment(data.department || '');
      setEditComponentPath(data.componentPath && data.componentPath.length > 0 ? data.componentPath.join(' > ') : '');
      setEditPriority(data.priority || 'MED');
    } catch (error: any) {
      console.error('Error fetching issue:', error);
      alert(`ไม่สามารถโหลด Issue ได้: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubIssues = async () => {
    if (!issue) return;
    try {
      // Fetch all issues to get nested sub-issues
      const response = await fetch(`/api/issues`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const allIssues = await response.json();
        // Filter to get direct sub-issues of current issue
        const directSubs = allIssues.filter((i: any) => {
          const subParentId = String(i.parentIssueId || '').trim();
          const parentId = String(issue._id || '').trim();
          return subParentId === parentId && subParentId !== '';
        });
        
        // Calculate subIssuesCount for each sub-issue (nested)
        const subIssuesWithCount = directSubs.map((sub: any) => {
          const nestedCount = countNestedSubIssues(sub._id, allIssues);
          return {
            ...sub,
            subIssuesCount: nestedCount,
          };
        });
        
        setSubIssues(subIssuesWithCount);
        console.log('Fetched sub-issues:', subIssuesWithCount);
      } else {
        console.error('Failed to fetch sub-issues:', response.status);
      }
    } catch (error) {
      console.error('Error fetching sub-issues:', error);
    }
  };

  const handleSave = async (content: any) => {
    if (!issue) return;

    try {
      const response = await fetch(`/api/issues/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save' }));
        throw new Error(errorData.error || 'Failed to save');
      }

      const updated = await response.json();
      setIssue(updated);
      setIsEditingDescription(false);
      await fetchIssue();
    } catch (error: any) {
      console.error('Error saving issue:', error);
      alert(`ไม่สามารถบันทึกได้: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleUpdateField = async (field: string, value: string) => {
    if (!issue) return;

    // Check if trying to close issue - must close all sub-issues first
    if (field === 'status' && value === 'DONE') {
      // Fetch all sub-issues to check if all are DONE
      const allSubIssuesResponse = await fetch(`/api/issues?parentIssueId=${issue._id}`);
      if (allSubIssuesResponse.ok) {
        const allSubIssues = await allSubIssuesResponse.json();
        const incompleteSubIssues = allSubIssues.filter((sub: any) => sub.status !== 'DONE');
        if (incompleteSubIssues.length > 0) {
          alert(`ไม่สามารถปิดงานได้: ยังมีปัญหาย่อยที่ยังไม่ปิดงาน ${incompleteSubIssues.length} ข้อ`);
          setEditingField(null);
          return;
        }
      }
    }

    try {
      let updateData: any = {};
      
      // Handle componentPath specially - convert string to array and create/update component
      if (field === 'componentPath') {
        if (value && value.trim()) {
          // Split by ' > ' to get array
          const pathArray = value.split(' > ').map((s: string) => s.trim()).filter((s: string) => s);
          
          if (pathArray.length > 0) {
            // Check if component exists with this path
            const allComponentsResponse = await fetch('/api/components');
            if (allComponentsResponse.ok) {
              const allComponents = await allComponentsResponse.json();
              const matchingComp = allComponents.find((comp: any) => {
                const compPath = (comp.path || []).join(' > ');
                return compPath === value.trim();
              });
              
              if (matchingComp) {
                // Use existing component
                updateData.componentId = matchingComp._id;
                updateData.componentPath = matchingComp.path || pathArray;
              } else {
                // Create new component
                try {
                  const createCompResponse = await fetch('/api/components', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: pathArray[pathArray.length - 1],
                      parentId: undefined,
                      path: pathArray,
                    }),
                  });
                  
                  if (createCompResponse.ok) {
                    const newComponent = await createCompResponse.json();
                    updateData.componentId = newComponent._id;
                    updateData.componentPath = newComponent.path || pathArray;
                  } else {
                    // If creation fails, just use the path
                    updateData.componentPath = pathArray;
                    updateData.componentId = null;
                  }
                } catch (error) {
                  // If creation fails, just use the path
                  updateData.componentPath = pathArray;
                  updateData.componentId = null;
                }
              }
            } else {
              // If can't fetch components, just use the path
              updateData.componentPath = pathArray;
              updateData.componentId = null;
            }
          } else {
            updateData.componentPath = [];
            updateData.componentId = null;
          }
        } else {
          updateData.componentPath = [];
          updateData.componentId = null;
        }
      } else {
        updateData[field] = value || null;
      }
      
      const response = await fetch(`/api/issues/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      await fetchIssue();
      setEditingField(null);
    } catch (error: any) {
      alert(`ไม่สามารถอัปเดตได้: ${error.message}`);
    }
  };

  const handleSubIssueAccept = async (subIssueId: string, name: string) => {
    try {
      const response = await fetch(`/api/issues/${subIssueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'IN_PROGRESS', 
          assignedTo: name 
        }),
      });

      if (response.ok) {
        await fetchSubIssues();
        await fetchIssue();
        
        // Check if any sub-issue has assignedTo, if yes, update parent issue status to IN_PROGRESS
        if (issue && issue.status === 'OPEN') {
          const allSubIssuesResponse = await fetch(`/api/issues?parentIssueId=${issue._id}`);
          if (allSubIssuesResponse.ok) {
            const allSubIssues = await allSubIssuesResponse.json();
            const hasAssignedSubIssue = allSubIssues.some((sub: any) => sub.assignedTo && sub.assignedTo.trim() !== '');
            if (hasAssignedSubIssue) {
              // Update parent issue status to IN_PROGRESS
              await fetch(`/api/issues/${issue._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'IN_PROGRESS' }),
              });
              await fetchIssue();
            }
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update issue' }));
        throw new Error(errorData.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Error accepting sub-issue:', error);
      alert(`ไม่สามารถรับงานได้: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubIssueDone = async (subIssueId: string, name: string) => {
    try {
      const response = await fetch(`/api/issues/${subIssueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'DONE', 
          closedBy: name 
        }),
      });

      if (response.ok) {
        await fetchSubIssues();
        await fetchIssue();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update issue' }));
        throw new Error(errorData.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Error closing sub-issue:', error);
      alert(`ไม่สามารถปิดงานได้: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateSubIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !newSubIssueTitle.trim()) return;

    try {
      const issueData: any = {
        title: newSubIssueTitle,
        priority: newSubIssuePriority,
        type: issue.type || 'internal',
        parentIssueId: issue._id,
        componentId: null,
      };

      // สำหรับทั้ง internal และ external ต้องมี reporterName
      // ถ้ามี user login อยู่ ให้ใช้ชื่อ user เป็นผู้แจ้งปัญหา
      const reporterName = currentUser ? currentUser.name : newSubIssueReporterName;
      if (reporterName) issueData.reporterName = reporterName;
      // Don't set assignedTo when creating - it should be set via Accept button

      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueData),
      });

      if (response.ok) {
        setShowCreateSubIssue(false);
        setNewSubIssueTitle('');
        setNewSubIssuePriority('MED');
        setNewSubIssueReporterName('');
        setNewSubIssueAssignedTo('');
        // Refresh both issue and sub-issues
        await fetchIssue();
        await fetchSubIssues();
        alert('สร้างปัญหาย่อยสำเร็จ');
      } else {
        const error = await response.json();
        alert(`ไม่สามารถสร้างปัญหาย่อยได้: ${error.error}`);
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-8">กำลังโหลด...</div>;
  }

  if (!issue) {
    return <div className="p-8">ไม่พบ Issue</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← กลับไปยัง Board
          </button>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded text-sm ${
              issue.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
              issue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {issue.status.replace('_', ' ')}
            </span>
            {issue.status !== 'DONE' && (
              editingField === 'priority' ? (
                <div className="inline-flex items-center gap-2">
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as 'LOW' | 'MED' | 'HIGH')}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MED">MED</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                  <button
                    onClick={() => handleUpdateField('priority', editPriority)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => {
                      setEditPriority(issue.priority || 'MED');
                      setEditingField(null);
                    }}
                    className="px-2 py-1 bg-gray-300 rounded text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <span 
                  className={`px-3 py-1 rounded text-sm cursor-pointer hover:underline ${
                    issue.priority === 'LOW' ? 'bg-yellow-100 text-yellow-800' :
                    issue.priority === 'MED' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}
                  onClick={() => setEditingField('priority')}
                >
                  {issue.priority}
                </span>
              )
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          {editingField === 'title' ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-2xl font-bold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateField('title', editTitle);
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                    setEditTitle(issue.title);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => handleUpdateField('title', editTitle)}
                className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                บันทึก
              </button>
              <button
                onClick={() => {
                  setEditingField(null);
                  setEditTitle(issue.title);
                }}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold flex-1">{issue.title}</h1>
              <button
                onClick={() => {
                  setEditingField('title');
                  setEditTitle(issue.title);
                }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="แก้ไขชื่อปัญหา"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Component: </span>
            {editingField === 'componentPath' ? (
              <div className="inline-flex items-center gap-2">
                <input
                  type="text"
                  value={editComponentPath}
                  onChange={(e) => setEditComponentPath(e.target.value)}
                  className="px-2 py-1 border rounded"
                  placeholder="เช่น Component1 > Component2"
                />
                <button
                  onClick={() => handleUpdateField('componentPath', editComponentPath)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setEditComponentPath(issue.componentPath && issue.componentPath.length > 0 ? issue.componentPath.join(' > ') : '');
                    setEditingField(null);
                  }}
                  className="px-2 py-1 bg-gray-300 rounded text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:underline"
                onClick={() => setEditingField('componentPath')}
              >
                {issue.componentPath && issue.componentPath.length > 0 ? issue.componentPath.join(' > ') : 'คลิกเพื่อเพิ่ม'}
              </span>
            )}
          </div>
          
          {/* ผู้แจ้งปัญหา - แสดงสำหรับทั้งสองประเภท */}
          <div className="col-span-2">
            <span className="font-medium">ผู้แจ้งปัญหา: </span>
            {editingField === 'reporterName' ? (
              <div className="inline-flex items-center gap-2">
                <select
                  value={editReporterName}
                  onChange={(e) => setEditReporterName(e.target.value)}
                  className="px-2 py-1 border rounded"
                >
                  <option value="">เลือกผู้แจ้งปัญหา</option>
                  {users.map(u => (
                    <option key={u._id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editReporterName}
                  onChange={(e) => setEditReporterName(e.target.value)}
                  placeholder="หรือพิมพ์ชื่อเอง"
                  className="px-2 py-1 border rounded"
                />
                <button
                  onClick={() => handleUpdateField('reporterName', editReporterName)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setEditReporterName(issue.reporterName || '');
                    setEditingField(null);
                  }}
                  className="px-2 py-1 bg-gray-300 rounded text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:underline"
                onClick={() => setEditingField('reporterName')}
              >
                {issue.reporterName || 'คลิกเพื่อเพิ่ม'}
              </span>
            )}
          </div>
          
          {/* ผู้รับงาน - แสดงเมื่อ status เป็น IN_PROGRESS สำหรับทั้งสองประเภท */}
          {issue.status === 'IN_PROGRESS' && (
            <div>
              <span className="font-medium">ผู้รับงาน: </span>
              {editingField === 'assignedTo' ? (
                <div className="inline-flex items-center gap-2">
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="">เลือกผู้รับงาน</option>
                    {users.map(u => (
                      <option key={u._id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    placeholder="หรือพิมพ์ชื่อเอง"
                    className="px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => handleUpdateField('assignedTo', editAssignedTo)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => {
                      setEditAssignedTo(issue.assignedTo || '');
                      setEditingField(null);
                    }}
                    className="px-2 py-1 bg-gray-300 rounded text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <span 
                  className="cursor-pointer hover:underline"
                  onClick={() => setEditingField('assignedTo')}
                >
                  {issue.assignedTo || 'คลิกเพื่อเพิ่ม'}
                </span>
              )}
            </div>
          )}
          
          {/* ผู้ปิดงาน - แสดงเมื่อ status เป็น DONE สำหรับทั้งสองประเภท */}
          {issue.status === 'DONE' && issue.closedBy && (
            <div className="col-span-2">
              <span className="font-medium">ผู้ปิดงาน: </span>
              <span>{issue.closedBy}</span>
            </div>
          )}

          {/* โรงพยาบาลและแผนก - แสดงเฉพาะปัญหาจากภายนอก */}
          {issue.type === 'external' && (
            <>
              <div>
                <span className="font-medium">โรงพยาบาล: </span>
                {editingField === 'hospital' ? (
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      value={editHospital}
                      onChange={(e) => setEditHospital(e.target.value)}
                      className="px-2 py-1 border rounded"
                    />
                    <button
                      onClick={() => handleUpdateField('hospital', editHospital)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={() => {
                        setEditHospital(issue.hospital || '');
                        setEditingField(null);
                      }}
                      className="px-2 py-1 bg-gray-300 rounded text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => setEditingField('hospital')}
                  >
                    {issue.hospital || 'คลิกเพื่อเพิ่ม'}
                  </span>
                )}
              </div>
              <div>
                <span className="font-medium">แผนก: </span>
                {editingField === 'department' ? (
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="px-2 py-1 border rounded"
                    />
                    <button
                      onClick={() => handleUpdateField('department', editDepartment)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={() => {
                        setEditDepartment(issue.department || '');
                        setEditingField(null);
                      }}
                      className="px-2 py-1 bg-gray-300 rounded text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => setEditingField('department')}
                  >
                    {issue.department || 'คลิกเพื่อเพิ่ม'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sub-issues section */}
        <div className="mt-6 border-t-2 border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-800">ปัญหาย่อย</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {subIssues.length} ข้อ
              </span>
            </div>
            <button
              onClick={() => setShowCreateSubIssue(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มปัญหาย่อย
            </button>
          </div>
          {subIssues.length > 0 ? (
            <div className="space-y-3">
              {subIssues.map((subIssue, index) => {
                const isAccepting = subIssueAction?.id === subIssue._id && subIssueAction?.type === 'accept';
                const isCompleting = subIssueAction?.id === subIssue._id && subIssueAction?.type === 'done';
                
                return (
                  <div
                    key={subIssue._id}
                    className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input') && !(e.target as HTMLElement).closest('select') && !(e.target as HTMLElement).closest('form')) {
                        router.push(`/issues/${subIssue._id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <h4 className="font-semibold text-gray-800">{subIssue.title}</h4>
                            {subIssue.subIssuesCount !== undefined && subIssue.subIssuesCount > 0 && (
                              <span className="text-xs text-purple-600 font-semibold bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {subIssue.subIssuesCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {subIssue.type === 'internal' && subIssue.reporterName && (
                          <p className="text-xs text-gray-600 mb-1">
                            <span className="font-medium">ผู้แจ้ง:</span> {subIssue.reporterName}
                          </p>
                        )}
                        {subIssue.assignedTo && (
                          <p className="text-xs text-blue-600 mb-1">
                            <span className="font-medium">ผู้รับงาน:</span> {subIssue.assignedTo}
                          </p>
                        )}
                        {subIssue.closedBy && (
                          <p className="text-xs text-green-600 mb-1">
                            <span className="font-medium">ผู้ปิดงาน:</span> {subIssue.closedBy}
                          </p>
                        )}
                        {subIssue.priority && subIssue.status !== 'DONE' && (
                          <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${
                            subIssue.priority === 'LOW' ? 'bg-yellow-100 text-yellow-800' :
                            subIssue.priority === 'MED' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {subIssue.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
                          subIssue.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          subIssue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-green-100 text-green-800 border border-green-300'
                        }`}>
                          {subIssue.status === 'OPEN' ? 'เปิด' :
                           subIssue.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' :
                           'เสร็จสิ้น'}
                        </span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {subIssue.status === 'OPEN' && !isAccepting && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubIssueAction({ id: subIssue._id, type: 'accept' });
                                setSubIssueAssignedToName('');
                              }}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                            >
                              Accept
                            </button>
                          )}
                          {subIssue.status === 'IN_PROGRESS' && !isCompleting && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubIssueAction({ id: subIssue._id, type: 'done' });
                                setSubIssueClosedByName('');
                              }}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 whitespace-nowrap"
                            >
                              Done
                            </button>
                          )}
                        </div>
                        {!isAccepting && !isCompleting && (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    {/* Accept Form */}
                    {isAccepting && (
                      <div className="mt-3 pt-3 border-t border-purple-300" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!subIssueAssignedToName.trim()) {
                            alert('กรุณาระบุชื่อผู้รับงาน');
                            return;
                          }
                          await handleSubIssueAccept(subIssue._id, subIssueAssignedToName.trim());
                          setSubIssueAction(null);
                          setSubIssueAssignedToName('');
                        }} className="space-y-2">
                          <label className="block text-xs font-medium mb-1">ผู้รับงาน *</label>
                          <select
                            value={subIssueAssignedToName}
                            onChange={(e) => setSubIssueAssignedToName(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">เลือกผู้รับงาน</option>
                            {users.map(u => (
                              <option key={u._id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={subIssueAssignedToName}
                            onChange={(e) => setSubIssueAssignedToName(e.target.value)}
                            placeholder="หรือพิมพ์ชื่อเอง"
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                            required
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="submit"
                              className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                              ยืนยัน
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubIssueAction(null);
                                setSubIssueAssignedToName('');
                              }}
                              className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    
                    {/* Done Form */}
                    {isCompleting && (
                      <div className="mt-3 pt-3 border-t border-purple-300" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!subIssueClosedByName.trim()) {
                            alert('กรุณาระบุชื่อผู้ปิดงาน');
                            return;
                          }
                          await handleSubIssueDone(subIssue._id, subIssueClosedByName.trim());
                          setSubIssueAction(null);
                          setSubIssueClosedByName('');
                        }} className="space-y-2">
                          <label className="block text-xs font-medium mb-1">ผู้ปิดงาน *</label>
                          <select
                            value={subIssueClosedByName}
                            onChange={(e) => setSubIssueClosedByName(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">เลือกผู้ปิดงาน</option>
                            {users.map(u => (
                              <option key={u._id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={subIssueClosedByName}
                            onChange={(e) => setSubIssueClosedByName(e.target.value)}
                            placeholder="หรือพิมพ์ชื่อเอง"
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                            required
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="submit"
                              className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            >
                              ยืนยัน
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubIssueAction(null);
                                setSubIssueClosedByName('');
                              }}
                              className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">ยังไม่มีปัญหาย่อย</p>
              <p className="text-xs text-gray-400 mt-1">คลิกปุ่ม "เพิ่มปัญหาย่อย" เพื่อสร้างปัญหาย่อยใหม่</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t">
        <IssueEditor 
          initialContent={issue.description} 
          onSave={handleSave} 
          onEditingChange={setIsEditingDescription}
        />
      </div>

      {/* Create Sub-Issue Modal */}
      {showCreateSubIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 relative z-50">
            <h2 className="text-xl font-bold mb-4">สร้างปัญหาย่อย</h2>
            <form onSubmit={handleCreateSubIssue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">หัวข้อปัญหา *</label>
                <input
                  type="text"
                  value={newSubIssueTitle}
                  onChange={(e) => setNewSubIssueTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ความสำคัญ</label>
                <select
                  value={newSubIssuePriority}
                  onChange={(e) => setNewSubIssuePriority(e.target.value as 'LOW' | 'MED' | 'HIGH')}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="LOW">ต่ำ</option>
                  <option value="MED">ปานกลาง</option>
                  <option value="HIGH">สูง</option>
                </select>
              </div>
              {issue.type === 'internal' && (
                <>
                  {currentUser ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">ผู้แจ้งปัญหา</label>
                      <div className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700">
                        {currentUser.name}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">ใช้ชื่อผู้ใช้ที่ login อยู่</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">ผู้แจ้งปัญหา</label>
                      <select
                        value={newSubIssueReporterName}
                        onChange={(e) => setNewSubIssueReporterName(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">เลือกผู้แจ้งปัญหา</option>
                        {users.map(u => (
                          <option key={u._id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newSubIssueReporterName}
                        onChange={(e) => setNewSubIssueReporterName(e.target.value)}
                        placeholder="หรือพิมพ์ชื่อเอง"
                        className="w-full px-3 py-2 border rounded mt-2"
                      />
                    </div>
                  )}
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
                  onClick={() => setShowCreateSubIssue(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
