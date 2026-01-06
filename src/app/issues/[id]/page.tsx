'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import IssueEditor from '@/components/IssueEditor';

interface Issue {
  _id: string;
  title: string;
  status: string;
  priority: 'LOW' | 'MED' | 'HIGH';
  urgency?: 'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD' | null;
  componentPath: string[];
  description: any;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
  issueType?: string;
  reportedAt?: Date | string;
  assignedAt?: Date | string;
  closedAt?: Date | string;
  subIssuesCount?: number;
}

interface User {
  _id: string;
  username: string;
  name: string;
}

function SubIssuePendingStatusDropdown({ issueId, currentStatus, onStatusChange }: { issueId: string; currentStatus?: string; onStatusChange: (status: string | null) => Promise<void> }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown && buttonRef.current && dropdownMenuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      dropdownMenuRef.current.style.top = `${buttonRect.bottom + 4}px`;
      dropdownMenuRef.current.style.left = `${buttonRect.left}px`;
    }
  }, [showDropdown]);

  const displayText = currentStatus === 'PROGRAMMER_PENDING' 
    ? 'PROGRAMMER PENDING' 
    : currentStatus === 'ONSITE_PENDING' 
    ? 'ONSITE PENDING' 
    : 'Pending Status';

  const buttonClass = currentStatus === 'PROGRAMMER_PENDING'
    ? 'px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 whitespace-nowrap'
    : currentStatus === 'ONSITE_PENDING'
    ? 'px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 whitespace-nowrap'
    : 'px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 whitespace-nowrap';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={buttonClass}
        >
          {displayText}
        </button>
      </div>
      {showDropdown && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownMenuRef}
          className="fixed bg-white border rounded shadow-lg z-[9999] min-w-[180px]"
          style={{ 
            top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 4}px` : '0px',
            left: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().left}px` : '0px'
          }}
        >
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await onStatusChange('PROGRAMMER_PENDING');
              setShowDropdown(false);
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 text-purple-800"
          >
            PROGRAMMER PENDING
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await onStatusChange('ONSITE_PENDING');
              setShowDropdown(false);
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 text-blue-800"
          >
            ONSITE PENDING
          </button>
          {(currentStatus === 'PROGRAMMER_PENDING' || currentStatus === 'ONSITE_PENDING') && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onStatusChange(null);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-600 border-t border-gray-200"
            >
              ลบออก
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function PriorityDropdown({ issueId, currentPriority, onPriorityChange }: { issueId: string; currentPriority?: 'LOW' | 'MED' | 'HIGH'; onPriorityChange?: (priority: 'LOW' | 'MED' | 'HIGH') => Promise<void> }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown && buttonRef.current && dropdownMenuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      dropdownMenuRef.current.style.top = `${buttonRect.bottom + 4}px`;
      dropdownMenuRef.current.style.left = `${buttonRect.left}px`;
    }
  }, [showDropdown]);

  const handlePriorityChange = async (priority: 'LOW' | 'MED' | 'HIGH') => {
    setShowDropdown(false);
    if (onPriorityChange) {
      await onPriorityChange(priority);
    } else {
      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error updating priority:', error);
      }
    }
  };

  // Get button class based on priority
  const getPriorityButtonClass = (priority: 'LOW' | 'MED' | 'HIGH' | undefined): string => {
    if (priority === 'LOW') {
      return 'px-3 py-1 rounded text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer';
    } else if (priority === 'MED') {
      return 'px-3 py-1 rounded text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer';
    } else {
      return 'px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer';
    }
  };

  // Get display text
  const getPriorityDisplayText = (priority: 'LOW' | 'MED' | 'HIGH' | undefined): string => {
    if (priority === 'LOW') return 'ต่ำ';
    if (priority === 'MED') return 'ปานกลาง';
    if (priority === 'HIGH') return 'สูง';
    return 'เลือกความสำคัญ';
  };

  const displayText = getPriorityDisplayText(currentPriority);
  const buttonClass = getPriorityButtonClass(currentPriority);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={buttonClass}
        >
          {displayText}
        </button>
      </div>
      {showDropdown && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownMenuRef}
          className="fixed bg-white border rounded shadow-lg z-[9999] min-w-[180px]"
          style={{ 
            top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 4}px` : '0px',
            left: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().left}px` : '0px'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePriorityChange('LOW');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-yellow-50 text-yellow-800"
          >
            ต่ำ
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePriorityChange('MED');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-orange-800"
          >
            ปานกลาง
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePriorityChange('HIGH');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-800"
          >
            สูง
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function UrgencyDropdown({ issueId, currentUrgency, onUrgencyChange }: { issueId: string; currentUrgency?: string | null; onUrgencyChange?: (urgency: string | null) => Promise<void> }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown && buttonRef.current && dropdownMenuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      dropdownMenuRef.current.style.top = `${buttonRect.bottom + 4}px`;
      dropdownMenuRef.current.style.left = `${buttonRect.left}px`;
    }
  }, [showDropdown]);

  const handleUrgencyChange = async (urgency: string | null) => {
    setShowDropdown(false);
    if (onUrgencyChange) {
      await onUrgencyChange(urgency);
    } else {
      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urgency }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error updating urgency:', error);
      }
    }
  };

  // Mapping urgency values to display text
  const getUrgencyDisplayText = (urgency: string | null | undefined): string => {
    if (!urgency) return 'เลือกความเร่งด่วน';
    const urgencyMap: { [key: string]: string } = {
      'URGENT_EASY': 'ด่วน-ง่าย',
      'URGENT_HARD': 'ด่วน-ยาก',
      'NOT_URGENT_EASY': 'ไม่ด่วน-ง่าย',
      'NOT_URGENT_HARD': 'ไม่ด่วน-ยาก',
    };
    return urgencyMap[urgency] || urgency;
  };

  // Get button class based on urgency
  const getUrgencyButtonClass = (urgency: string | null | undefined): string => {
    if (!urgency) {
      return 'px-3 py-1 rounded text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer';
    }
    if (urgency === 'URGENT_EASY') {
      return 'px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer';
    } else if (urgency === 'URGENT_HARD') {
      return 'px-3 py-1 rounded text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer';
    } else if (urgency === 'NOT_URGENT_HARD') {
      return 'px-3 py-1 rounded text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer';
    } else {
      return 'px-3 py-1 rounded text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer';
    }
  };

  const displayText = getUrgencyDisplayText(currentUrgency);
  const buttonClass = getUrgencyButtonClass(currentUrgency);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={buttonClass}
        >
          {displayText}
        </button>
      </div>
      {showDropdown && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownMenuRef}
          className="fixed bg-white border rounded shadow-lg z-[9999] min-w-[180px]"
          style={{ 
            top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 4}px` : '0px',
            left: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().left}px` : '0px'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('URGENT_EASY');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-800"
          >
            ด่วน-ง่าย
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('URGENT_HARD');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-orange-800"
          >
            ด่วน-ยาก
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('NOT_URGENT_EASY');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-yellow-50 text-yellow-800"
          >
            ไม่ด่วน-ง่าย
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('NOT_URGENT_HARD');
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-orange-800"
          >
            ไม่ด่วน-ยาก
          </button>
          {currentUrgency && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUrgencyChange(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-600 border-t border-gray-200"
            >
              ลบออก
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// Helper function to truncate text to 40 characters
const truncateTitle = (title: string, maxLength: number = 40): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

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
  
  // Create sub-issue form states
  const [newSubIssueTitle, setNewSubIssueTitle] = useState('');
  const [newSubIssuePriority, setNewSubIssuePriority] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  const [newSubIssueUrgency, setNewSubIssueUrgency] = useState<'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD' | null>(null);
  const [newSubIssueReporterName, setNewSubIssueReporterName] = useState('');
  const [newSubIssueAssignedTo, setNewSubIssueAssignedTo] = useState('');
  
  // Sub-issue action states
  const [subIssueAction, setSubIssueAction] = useState<{ id: string; type: 'accept' | 'done' } | null>(null);
  const [subIssueAssignedToName, setSubIssueAssignedToName] = useState('');
  const [subIssueClosedByName, setSubIssueClosedByName] = useState('');
  
  // Pending status dropdown state
  const [showPendingDropdown, setShowPendingDropdown] = useState(false);
  const pendingButtonRef = useRef<HTMLButtonElement>(null);
  const pendingDropdownRef = useRef<HTMLDivElement>(null);
  
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
      // แจ้งเตือนเมื่อบันทึกสำเร็จ
      alert('บันทึกข้อมูลสำเร็จ');
    } catch (error: any) {
      console.error('Error saving issue:', error);
      alert(`ไม่สามารถบันทึกได้: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleUpdateField = async (field: string, value: string | null) => {
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
      // แจ้งเตือนเมื่อบันทึกสำเร็จ
      alert('บันทึกข้อมูลสำเร็จ');
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
        urgency: newSubIssueUrgency,
        type: issue.type || 'internal',
        parentIssueId: issue._id,
        componentId: null,
      };

      // สำหรับทั้ง internal และ external ต้องมี reporterName
      // ถ้ามี user login อยู่และไม่ใช่ guest ให้ใช้ชื่อ user เป็นผู้แจ้งปัญหา
      // ถ้าเป็น guest หรือไม่มี user ให้ใช้ชื่อที่กรอกมา
      const reporterName = (currentUser && currentUser._id !== 'guest' && currentUser.name)
        ? currentUser.name
        : newSubIssueReporterName;
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
        setNewSubIssueUrgency(null);
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
      <div className="bg-white border-b p-2 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 mb-4">
          <button
            onClick={() => {
              // เก็บ currentType จาก issue.type หรือจาก localStorage
              if (issue && issue.type) {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('currentIssueType', issue.type);
                }
              }
              // ตรวจสอบว่ามาจากหน้าไหน
              const returnToPage = typeof window !== 'undefined' ? sessionStorage.getItem('returnToPage') : null;
              if (returnToPage === '/list') {
                router.push('/list');
              } else {
                router.push('/');
              }
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm sm:text-base self-start"
          >
            ← กลับ
          </button>
          <div className="flex flex-wrap gap-2">
            {editingField === 'status' ? (
              <div className="inline-flex items-center gap-2">
                <select
                  value={issue.status}
                  onChange={(e) => {
                    handleUpdateField('status', e.target.value);
                    setEditingField(null);
                  }}
                  className="px-2 py-1 border rounded text-sm"
                  autoFocus
                >
                  <option value="OPEN">OPEN</option>
                  <option value="PROGRAMMER_PENDING">PROGRAMMER PENDING</option>
                  <option value="ONSITE_PENDING">ONSITE PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <button
                  onClick={() => setEditingField(null)}
                  className="px-2 py-1 bg-gray-300 rounded text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              // แสดง status span เฉพาะเมื่อเป็น IN_PROGRESS หรือ DONE
              // เพราะ OPEN, PROGRAMMER_PENDING, ONSITE_PENDING จะมี pending status dropdown แสดงแทน
              (issue.status === 'IN_PROGRESS' || issue.status === 'DONE') ? (
                <span 
                  className={`px-3 py-1 rounded text-sm cursor-pointer hover:underline ${
                    issue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}
                  onClick={() => setEditingField('status')}
                >
                  {issue.status.replace(/_/g, ' ')}
                </span>
              ) : null
            )}
            {issue.status !== 'DONE' && (
              <>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <PriorityDropdown 
                    issueId={issue._id} 
                    currentPriority={issue.priority}
                    onPriorityChange={async (priority: 'LOW' | 'MED' | 'HIGH') => {
                      try {
                        const response = await fetch(`/api/issues/${issue._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ priority }),
                        });
                        if (response.ok) {
                          await fetchIssue();
                        }
                      } catch (error) {
                        console.error('Error updating priority:', error);
                      }
                    }}
                  />
                  <UrgencyDropdown 
                    issueId={issue._id} 
                    currentUrgency={issue.urgency}
                    onUrgencyChange={async (urgency: string | null) => {
                      try {
                        const response = await fetch(`/api/issues/${issue._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ urgency }),
                        });
                        if (response.ok) {
                          await fetchIssue();
                        }
                      } catch (error) {
                        console.error('Error updating urgency:', error);
                      }
                    }}
                  />
                </div>
                {/* แสดงปุ่มเลือก Pending Status เมื่อ status เป็น OPEN, IN_PROGRESS, PROGRAMMER_PENDING หรือ ONSITE_PENDING */}
                {(issue.status === 'OPEN' || issue.status === 'IN_PROGRESS' || issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && (
                  <>
                    <div className="relative">
                      <button
                        ref={pendingButtonRef}
                        onClick={() => setShowPendingDropdown(!showPendingDropdown)}
                        className={`px-3 py-1 rounded text-sm cursor-pointer ${
                          issue.status === 'PROGRAMMER_PENDING'
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            : issue.status === 'ONSITE_PENDING'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {issue.status === 'PROGRAMMER_PENDING' 
                          ? 'PROGRAMMER PENDING' 
                          : issue.status === 'ONSITE_PENDING' 
                          ? 'ONSITE PENDING' 
                          : 'Pending Status'}
                      </button>
                    </div>
                    {showPendingDropdown && typeof document !== 'undefined' && createPortal(
                      <div 
                        ref={pendingDropdownRef}
                        className="fixed bg-white border rounded shadow-lg z-[9999] min-w-[180px]"
                        style={{ 
                          top: pendingButtonRef.current ? `${pendingButtonRef.current.getBoundingClientRect().bottom + 4}px` : '0px',
                          left: pendingButtonRef.current ? `${pendingButtonRef.current.getBoundingClientRect().left}px` : '0px'
                        }}
                      >
                        <button
                          onClick={() => {
                            handleUpdateField('status', 'PROGRAMMER_PENDING');
                            setShowPendingDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 text-purple-800"
                        >
                          PROGRAMMER PENDING
                        </button>
                        <button
                          onClick={() => {
                            handleUpdateField('status', 'ONSITE_PENDING');
                            setShowPendingDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-blue-800"
                        >
                          ONSITE PENDING
                        </button>
                        {(issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && (
                          <button
                            onClick={() => {
                              handleUpdateField('status', 'OPEN');
                              setShowPendingDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-600 border-t border-gray-200"
                          >
                            ลบออก
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          {editingField === 'title' ? (
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-lg sm:text-xl md:text-2xl font-bold"
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
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateField('title', editTitle)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setEditingField(null);
                    setEditTitle(issue.title);
                  }}
                  className="flex-1 sm:flex-none px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex-1 break-words">{issue.title}</h1>
              <button
                onClick={() => {
                  setEditingField('title');
                  setEditTitle(issue.title);
                }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded self-start sm:self-auto"
                title="แก้ไขชื่อปัญหา"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          {issue.issueType && (
            <div>
              <span className="font-medium">ประเภทปัญหา: </span>
              <span>{issue.issueType === 'software' ? 'Software' : issue.issueType === 'hardware' ? 'Hardware' : issue.issueType}</span>
            </div>
          )}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">ผู้แจ้งปัญหา: </span>
                {editingField === 'reporterName' ? (
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      list="editReporterNameList"
                      value={editReporterName}
                      onChange={(e) => setEditReporterName(e.target.value)}
                      placeholder="เลือกหรือพิมพ์ชื่อผู้แจ้งปัญหา"
                      className="px-2 py-1 border rounded"
                    />
                    <datalist id="editReporterNameList">
                      {users.map(u => (
                        <option key={u._id} value={u.name} />
                      ))}
                    </datalist>
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
              {issue.reportedAt && (
                <span className="text-xs text-gray-500">
                  {new Date(issue.reportedAt).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
          
          {/* ผู้รับงาน - แสดงเมื่อ status เป็น IN_PROGRESS หรือ PROGRAMMER_PENDING หรือ ONSITE_PENDING สำหรับทั้งสองประเภท */}
          {(issue.status === 'IN_PROGRESS' || issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                      {(() => {
                        // ถ้า assignedTo เป็น user ID ให้แปลงเป็นชื่อ
                        const assignedUser = users.find(u => u._id === issue.assignedTo);
                        return assignedUser ? assignedUser.name : (issue.assignedTo || 'คลิกเพื่อเพิ่ม');
                      })()}
                    </span>
                  )}
                </div>
                {issue.assignedAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(issue.assignedAt).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* ผู้ปิดงาน - แสดงเมื่อ status เป็น DONE สำหรับทั้งสองประเภท */}
          {issue.status === 'DONE' && issue.closedBy && (
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">ผู้ปิดงาน: </span>
                  <span>{issue.closedBy}</span>
                </div>
                {issue.closedAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(issue.closedAt).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
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
        <div className="mt-4 sm:mt-6 border-t-2 border-gray-200 pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">ปัญหาย่อย</h3>
              <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-semibold">
                {subIssues.length} ข้อ
              </span>
            </div>
            <button
              onClick={() => setShowCreateSubIssue(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-600 shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>เพิ่มปัญหาย่อย</span>
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
                        // เก็บข้อมูลว่ามาจากหน้าไหน (ถ้ามี)
                        const returnToPage = typeof window !== 'undefined' ? sessionStorage.getItem('returnToPage') : null;
                        if (returnToPage) {
                          sessionStorage.setItem('returnToPage', returnToPage);
                        }
                        router.push(`/issues/${subIssue._id}`);
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-semibold text-gray-800 break-words flex-1 min-w-0">{subIssue.title}</h4>
                            {subIssue.subIssuesCount !== undefined && subIssue.subIssuesCount > 0 && (
                              <span className="text-xs text-purple-600 font-semibold bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
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
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
                            subIssue.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            subIssue.status === 'PROGRAMMER_PENDING' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                            subIssue.status === 'ONSITE_PENDING' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            subIssue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-green-100 text-green-800 border border-green-300'
                          }`}>
                            {subIssue.status === 'OPEN' ? 'เปิด' :
                             subIssue.status === 'PROGRAMMER_PENDING' ? 'PROGRAMMER PENDING' :
                             subIssue.status === 'ONSITE_PENDING' ? 'ONSITE PENDING' :
                             subIssue.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' :
                             'เสร็จสิ้น'}
                          </span>
                          {subIssue.priority && subIssue.status !== 'DONE' && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              subIssue.priority === 'LOW' ? 'bg-yellow-100 text-yellow-800' :
                              subIssue.priority === 'MED' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {subIssue.priority}
                            </span>
                          )}
                          {/* แสดงปุ่มเลือก Pending Status เมื่อ status เป็น OPEN หรือ IN_PROGRESS */}
                          {(subIssue.status === 'OPEN' || subIssue.status === 'IN_PROGRESS') && (
                            <SubIssuePendingStatusDropdown 
                              issueId={subIssue._id} 
                              onStatusChange={async (status: string) => {
                                try {
                                  const response = await fetch(`/api/issues/${subIssue._id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status }),
                                  });
                                  if (response.ok) {
                                    await fetchSubIssues();
                                    await fetchIssue();
                                  }
                                } catch (error) {
                                  console.error('Error updating status:', error);
                                }
                              }}
                            />
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
                          <input
                            type="text"
                            list={`subIssueAssignedTo-${subIssue._id}`}
                            value={subIssueAssignedToName}
                            onChange={(e) => setSubIssueAssignedToName(e.target.value)}
                            placeholder="เลือกหรือพิมพ์ชื่อผู้รับงาน"
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                            required
                          />
                          <datalist id={`subIssueAssignedTo-${subIssue._id}`}>
                            {users.map(u => (
                              <option key={u._id} value={u.name} />
                            ))}
                          </datalist>
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
                          <input
                            type="text"
                            list={`subIssueClosedBy-${subIssue._id}`}
                            value={subIssueClosedByName}
                            onChange={(e) => setSubIssueClosedByName(e.target.value)}
                            placeholder="เลือกหรือพิมพ์ชื่อผู้ปิดงาน"
                            className="w-full px-2 py-1 border rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                            required
                          />
                          <datalist id={`subIssueClosedBy-${subIssue._id}`}>
                            {users.map(u => (
                              <option key={u._id} value={u.name} />
                            ))}
                          </datalist>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-2 sm:mx-4 relative z-50 max-h-[95vh] overflow-y-auto">
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
              <div>
                <label className="block text-sm font-medium mb-1">ระดับความยาก</label>
                <select
                  value={newSubIssueUrgency || ''}
                  onChange={(e) => setNewSubIssueUrgency(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-</option>
                  <option value="URGENT_EASY">ด่วน-ง่าย</option>
                  <option value="URGENT_HARD">ด่วน-ยาก</option>
                  <option value="NOT_URGENT_EASY">ไม่ด่วน-ง่าย</option>
                  <option value="NOT_URGENT_HARD">ไม่ด่วน-ยาก</option>
                </select>
              </div>
              {issue.type === 'internal' && (
                <>
                  {currentUser && currentUser._id !== 'guest' && currentUser.name ? (
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
                      <input
                        type="text"
                        list="subIssueReporterNameList"
                        value={newSubIssueReporterName}
                        onChange={(e) => setNewSubIssueReporterName(e.target.value)}
                        placeholder="เลือกหรือพิมพ์ชื่อผู้แจ้งปัญหา"
                        className="w-full px-3 py-2 border rounded"
                      />
                      <datalist id="subIssueReporterNameList">
                        {users.map(u => (
                          <option key={u._id} value={u.name} />
                        ))}
                      </datalist>
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
