'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

function PendingStatusDropdown({ issueId, currentStatus, assignedTo }: { issueId: string; currentStatus: string; assignedTo?: string }) {
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

  const handleStatusChange = async (status: string | null) => {
    try {
      // ถ้า status เป็น null ให้เปลี่ยนกลับเป็น OPEN (หรือ IN_PROGRESS ถ้ามี assignedTo)
      let newStatus: string;
      if (status === null) {
        // ถ้ามี assignedTo อยู่แล้ว ให้เปลี่ยนกลับเป็น IN_PROGRESS
        // ถ้าไม่มี assignedTo ให้เปลี่ยนกลับเป็น OPEN
        newStatus = assignedTo ? 'IN_PROGRESS' : 'OPEN';
      } else {
        newStatus = status;
      }
      
      // ถ้ามี assignedTo อยู่แล้ว (หมายความว่าอยู่ใน IN_PROGRESS) และเลือก pending status
      // ต้องเก็บ assignedTo ไว้ด้วย เพื่อให้ยังอยู่ใน IN_PROGRESS column
      const updateData: any = { status: newStatus };
      if (assignedTo && (newStatus === 'PROGRAMMER_PENDING' || newStatus === 'ONSITE_PENDING')) {
        // เก็บ assignedTo ไว้เพื่อให้ยังอยู่ใน IN_PROGRESS column
        updateData.assignedTo = assignedTo;
      }
      
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // ถ้าเลือก status แล้วให้แสดง status นั้น แทน "Pending Status"
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
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('PROGRAMMER_PENDING');
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 text-purple-800"
          >
            PROGRAMMER PENDING
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('ONSITE_PENDING');
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 text-blue-800"
          >
            ONSITE PENDING
          </button>
          {(currentStatus === 'PROGRAMMER_PENDING' || currentStatus === 'ONSITE_PENDING') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(null);
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

function UrgencyDropdown({ issueId, currentUrgency }: { issueId: string; currentUrgency?: string | null }) {
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
      return 'px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 whitespace-nowrap';
    }
    if (urgency === 'URGENT_EASY') {
      return 'px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200 whitespace-nowrap';
    } else if (urgency === 'URGENT_HARD') {
      return 'px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 hover:bg-orange-200 whitespace-nowrap';
    } else if (urgency === 'NOT_URGENT_HARD') {
      return 'px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 hover:bg-orange-200 whitespace-nowrap';
    } else {
      return 'px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 whitespace-nowrap';
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
            className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 text-red-800"
          >
            ด่วน-ง่าย
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('URGENT_HARD');
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-orange-50 text-orange-800"
          >
            ด่วน-ยาก
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('NOT_URGENT_EASY');
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-yellow-50 text-yellow-800"
          >
            ไม่ด่วน-ง่าย
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUrgencyChange('NOT_URGENT_HARD');
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-orange-50 text-orange-800"
          >
            ไม่ด่วน-ยาก
          </button>
          {currentUrgency && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUrgencyChange(null);
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

interface Issue {
  _id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'PROGRAMMER_PENDING' | 'ONSITE_PENDING';
  priority: 'LOW' | 'MED' | 'HIGH';
  urgency?: 'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD' | null;
  componentPath: string[];
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
  subIssuesCount?: number;
  reportedAt?: Date | string;
  assignedAt?: Date | string;
  closedAt?: Date | string;
}

interface GroupedIssue extends Issue {
  subIssues?: Issue[];
}

// Helper function to truncate text to 40 characters
const truncateTitle = (title: string, maxLength: number = 40): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

function KanbanCard({ issue, onClick, onAccept, onDone, showSubIssuesCount, users, onConfirmAccept, onConfirmDone, onUpdateTitle }: { 
  issue: GroupedIssue; 
  onClick: () => void;
  onAccept: () => void;
  onDone: () => void;
  showSubIssuesCount?: boolean;
  users: any[];
  onConfirmAccept: (issueId: string, name: string) => Promise<void>;
  onConfirmDone: (issueId: string, name: string) => Promise<void>;
  onUpdateTitle: (issueId: string, title: string) => Promise<void>;
}) {
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [showDoneForm, setShowDoneForm] = useState(false);
  const [assignedToName, setAssignedToName] = useState('');
  const [closedByName, setClosedByName] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAcceptForm(true);
    setAssignedToName('');
  };

  const handleDoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDoneForm(true);
    setClosedByName('');
  };

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!assignedToName.trim()) {
      alert('กรุณาระบุชื่อผู้รับงาน');
      return;
    }
    await onConfirmAccept(issue._id, assignedToName.trim());
    setShowAcceptForm(false);
    setAssignedToName('');
  };

  const handleConfirmDone = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!closedByName.trim()) {
      alert('กรุณาระบุชื่อผู้ปิดงาน');
      return;
    }
    await onConfirmDone(issue._id, closedByName.trim());
    setShowDoneForm(false);
    setClosedByName('');
  };

  const handleEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditTitle(issue.title);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) {
      alert('กรุณาระบุชื่อปัญหา');
      return;
    }
    await onUpdateTitle(issue._id, editTitle.trim());
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(false);
    setEditTitle(issue.title);
  };

  // Debug: log subIssuesCount
  console.log(`Card ${issue._id}: subIssuesCount = ${issue.subIssuesCount}, showSubIssuesCount = ${showSubIssuesCount}`);

  return (
    <div
      className="bg-white p-2 sm:p-3 rounded shadow mb-2 hover:shadow-md relative cursor-pointer isolate w-full max-w-full overflow-hidden"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input') && !(e.target as HTMLElement).closest('select') && !(e.target as HTMLElement).closest('form')) {
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
        {isEditingTitle ? (
          <form onSubmit={handleSaveTitle} className="flex-1 flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm font-semibold min-w-0"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <button
              type="submit"
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={handleCancelEditTitle}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 flex-shrink-0"
            >
              ยกเลิก
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden w-full">
              <h3 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0 max-w-full" title={issue.title}>{truncateTitle(issue.title)}</h3>
              {showSubIssuesCount && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                  (issue.subIssuesCount || 0) > 0 
                    ? 'text-purple-600 bg-purple-100' 
                    : 'text-gray-400 bg-gray-50'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {issue.subIssuesCount || 0}
                </span>
              )}
            </div>
            <button
              onClick={handleEditTitle}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="แก้ไขชื่อปัญหา"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </>
        )}
      </div>
      {issue.componentPath && issue.componentPath.length > 0 && (
        <p className="text-xs text-gray-500 mb-1">
          {issue.componentPath.join(' > ')}
        </p>
      )}
      {/* ผู้แจ้งปัญหา - แสดงสำหรับทั้งสองประเภท */}
      {issue.reporterName && (
        <p className="text-xs text-gray-600 mb-1">
          ผู้แจ้ง: {issue.reporterName}
          {issue.reportedAt && (
            <span className="text-gray-500 ml-2">
              ({typeof issue.reportedAt === 'string' 
                ? new Date(issue.reportedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : new Date(issue.reportedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </p>
      )}
      {/* ผู้รับงาน - แสดงสำหรับทั้งสองประเภท */}
      {issue.assignedTo && (
        <p className="text-xs text-blue-600 mb-1">
          ผู้รับงาน: {(() => {
            // ถ้า assignedTo เป็น user ID ให้แปลงเป็นชื่อ
            const assignedUser = users.find(u => u._id === issue.assignedTo);
            return assignedUser ? assignedUser.name : issue.assignedTo;
          })()}
          {issue.assignedAt && (
            <span className="text-gray-500 ml-2">
              ({typeof issue.assignedAt === 'string' 
                ? new Date(issue.assignedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : new Date(issue.assignedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </p>
      )}
      {/* ผู้ปิดงาน - แสดงสำหรับทั้งสองประเภท */}
      {issue.closedBy && (
        <p className="text-xs text-green-600 mb-1">
          ผู้ปิดงาน: {issue.closedBy}
          {issue.closedAt && (
            <span className="text-gray-500 ml-2">
              ({typeof issue.closedAt === 'string' 
                ? new Date(issue.closedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : new Date(issue.closedAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </p>
      )}
      {/* โรงพยาบาลและแผนก - แสดงเฉพาะปัญหาจากภายนอก */}
      {issue.type === 'external' && issue.hospital && (
        <p className="text-xs text-gray-600 mb-1">
          โรงพยาบาล: {issue.hospital}
        </p>
      )}
      {issue.type === 'external' && issue.department && (
        <p className="text-xs text-gray-600 mb-1">
          แผนก: {issue.department}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between mt-2 gap-2 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {issue.status !== 'DONE' && (
            <>
              <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                issue.priority === 'LOW' ? 'bg-yellow-100 text-yellow-800' :
                issue.priority === 'MED' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {issue.priority === 'LOW' ? 'ต่ำ' : issue.priority === 'MED' ? 'ปานกลาง' : 'สูง'}
              </span>
              <UrgencyDropdown issueId={issue._id} currentUrgency={issue.urgency} />
            </>
          )}
          {/* แสดงปุ่มเลือก Pending Status เมื่อ status เป็น OPEN, IN_PROGRESS, PROGRAMMER_PENDING หรือ ONSITE_PENDING */}
          {(issue.status === 'OPEN' || issue.status === 'IN_PROGRESS' || issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && (
            <PendingStatusDropdown issueId={issue._id} currentStatus={issue.status} assignedTo={issue.assignedTo} />
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 min-w-0" onClick={(e) => e.stopPropagation()}>
          {/* แสดงปุ่ม Accept เมื่อ status เป็น OPEN หรือ PENDING และไม่มี assignedTo */}
          {(issue.status === 'OPEN' || issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && !issue.assignedTo && !showAcceptForm && (
            <button
              onClick={handleAcceptClick}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 whitespace-nowrap flex-shrink-0"
            >
              Accept
            </button>
          )}
          {/* แสดงปุ่ม Done เมื่อ status เป็น IN_PROGRESS หรือมี assignedTo อยู่แล้ว (รวมถึง PENDING ที่มี assignedTo) */}
          {((issue.status === 'IN_PROGRESS' || (issue.assignedTo && issue.status !== 'DONE')) && !showDoneForm) && (
            <button
              onClick={handleDoneClick}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 whitespace-nowrap flex-shrink-0"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Inline Accept Form */}
      {showAcceptForm && (issue.status === 'OPEN' || issue.status === 'PROGRAMMER_PENDING' || issue.status === 'ONSITE_PENDING') && (
        <div className="mt-3 pt-3 border-t border-gray-200 relative z-0" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleConfirmAccept} className="space-y-2">
            <label className="block text-xs font-medium mb-1">ผู้รับงาน *</label>
            <input
              type="text"
              list={`assignedTo-${issue._id}`}
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              placeholder="เลือกหรือพิมพ์ชื่อผู้รับงาน"
              className="w-full px-2 py-1 border rounded text-xs"
              onClick={(e) => e.stopPropagation()}
              required
            />
            <datalist id={`assignedTo-${issue._id}`}>
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
                  setShowAcceptForm(false);
                  setAssignedToName('');
                }}
                className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Done Form */}
      {showDoneForm && (issue.status === 'IN_PROGRESS' || (issue.assignedTo && issue.status !== 'DONE')) && (
        <div className="mt-3 pt-3 border-t border-gray-200 relative z-0" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleConfirmDone} className="space-y-2">
            <label className="block text-xs font-medium mb-1">ผู้ปิดงาน *</label>
            <input
              type="text"
              list={`closedBy-${issue._id}`}
              value={closedByName}
              onChange={(e) => setClosedByName(e.target.value)}
              placeholder="เลือกหรือพิมพ์ชื่อผู้ปิดงาน"
              className="w-full px-2 py-1 border rounded text-xs"
              onClick={(e) => e.stopPropagation()}
              required
            />
            <datalist id={`closedBy-${issue._id}`}>
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
                  setShowDoneForm(false);
                  setClosedByName('');
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
}

function KanbanColumn({ status, issues, onCardClick, onAccept, onDone, showSubIssuesCount, users, onConfirmAccept, onConfirmDone, onUpdateTitle }: { 
  status: string; 
  issues: GroupedIssue[]; 
  onCardClick: (issueId: string) => void;
  onAccept: (issueId: string) => void;
  onDone: (issueId: string) => void;
  showSubIssuesCount?: boolean;
  users: any[];
  onConfirmAccept: (issueId: string, name: string) => Promise<void>;
  onConfirmDone: (issueId: string, name: string) => Promise<void>;
  onUpdateTitle: (issueId: string, title: string) => Promise<void>;
}) {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 rounded min-h-[300px] sm:min-h-[400px] max-h-[70vh] sm:max-h-[80vh] md:max-h-[80vh] overflow-hidden min-w-[240px] sm:min-w-[200px] md:min-w-[220px] w-full md:w-auto">
      <h2 className="font-bold text-sm sm:text-base md:text-lg p-2 sm:p-4 bg-gray-100 border-b border-gray-300 flex-shrink-0">{status.replace('_', ' ')}</h2>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 pt-2">
        {issues.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            ไม่มีข้อมูล
          </div>
        ) : (
          issues.map(issue => (
            <KanbanCard 
              key={issue._id} 
              issue={issue} 
              onClick={() => onCardClick(issue._id)}
              onAccept={() => onAccept(issue._id)}
              onDone={() => onDone(issue._id)}
              showSubIssuesCount={showSubIssuesCount}
              users={users}
              onConfirmAccept={onConfirmAccept}
              onConfirmDone={onConfirmDone}
              onUpdateTitle={onUpdateTitle}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  // อ่าน currentType จาก localStorage หรือใช้ 'internal' เป็นค่าเริ่มต้น
  const [currentType, setCurrentType] = useState<'internal' | 'external'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentIssueType');
      return (saved === 'internal' || saved === 'external') ? saved : 'internal';
    }
    return 'internal';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [groupedIssues, setGroupedIssues] = useState<GroupedIssue[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'DONE'>('OPEN');

  // เก็บ currentType ไว้ใน localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentIssueType', currentType);
    }
  }, [currentType]);

  useEffect(() => {
    // ตรวจสอบว่ามี user login อยู่หรือไม่
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    
    fetchIssues();
    fetchUsers();
    
    const interval = setInterval(() => {
      fetchIssues(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentType]);

  // Recursive function to count all nested sub-issues
  const countSubIssues = (parentId: string, allSubIssues: Issue[]): number => {
    const directSubs = allSubIssues.filter(sub => {
      const subParentId = String(sub.parentIssueId || '').trim();
      const pId = String(parentId || '').trim();
      return subParentId === pId && subParentId !== '';
    });
    
    let total = directSubs.length;
    // Recursively count nested sub-issues
    directSubs.forEach(sub => {
      total += countSubIssues(sub._id, allSubIssues);
    });
    
    return total;
  };

  useEffect(() => {
    // Group issues: parent issues with their sub-issues
    const parentIssues = issues.filter(issue => {
      const hasParent = issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
      return !hasParent;
    });
    const subIssues = issues.filter(issue => {
      const hasParent = issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
      return hasParent;
    });
    
    
    const grouped: GroupedIssue[] = parentIssues.map(parent => {
      // Count all nested sub-issues recursively
      const count = countSubIssues(parent._id, subIssues);
      if (count > 0) {
        console.log(`✓ Issue ${parent._id} (${parent.title}): ${count} sub-issues (including nested)`);
      }
      return {
        ...parent,
        subIssues: subIssues.filter(sub => {
          const subParentId = String(sub.parentIssueId || '').trim();
          const parentId = String(parent._id || '').trim();
          return subParentId === parentId && subParentId !== '';
        }),
        subIssuesCount: count,
      };
    });
    
    setGroupedIssues(grouped);
  }, [issues]);

  const [loadingIssues, setLoadingIssues] = useState(false);

  const fetchIssues = async (showError = true) => {
    if (loadingIssues) return;
    setLoadingIssues(true);
    try {
      // For Kanban Board: Fetch only parent issues (no sub-issues)
      // But we need to fetch all issues to count sub-issues for display
      const url = `/api/issues?type=${currentType}&parentIssueId=null`;
      const parentResponse = await fetch(url, {
        cache: 'no-store',
      });
      if (!parentResponse.ok) {
        const errorData = await parentResponse.json().catch(() => ({ error: 'Failed to fetch issues' }));
        console.error('[fetchIssues] Parent response error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch issues');
      }
      const parentData = await parentResponse.json();
      if (parentData.error) {
        console.error('[fetchIssues] Parent data has error:', parentData.error);
        throw new Error(parentData.error);
      }
      // ถ้าไม่มีข้อมูลและ currentType เป็น 'external' ให้เปลี่ยนเป็น 'internal'
      if (Array.isArray(parentData) && parentData.length === 0 && currentType === 'external') {
        setCurrentType('internal');
        return; // จะ fetch อีกครั้งเมื่อ currentType เปลี่ยน
      }
      
      // Fetch ALL issues (including sub-issues) to count sub-issues for each parent
      // This is needed to show the sub-issues count badge on cards
      const allIssuesUrl = `/api/issues`;
      const allIssuesResponse = await fetch(allIssuesUrl, {
        cache: 'no-store',
      });
      if (allIssuesResponse.ok) {
        const allIssues = await allIssuesResponse.json();
        const allSubIssues = allIssues.filter((i: any) => i.parentIssueId && i.parentIssueId !== null);
        
        // For Kanban Board: Only set parent issues, but keep sub-issues data for counting
        // The useEffect will filter to show only parent issues in the board
        const combined = [...parentData, ...allSubIssues];
        setIssues(combined);
      } else {
        // Fallback: use only parent issues if we can't fetch all issues
        setIssues(parentData);
      }
    } catch (error: any) {
      console.error('[fetchIssues] Error fetching issues:', error);
      console.error('[fetchIssues] Error stack:', error.stack);
      if (showError) {
        alert(`ไม่สามารถโหลด Issues ได้: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoadingIssues(false);
    }
  };

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

  const handleAccept = (issueId: string) => {
    // This is now handled inline in the card
  };

  const handleDone = (issueId: string) => {
    // This is now handled inline in the card
  };

  const handleConfirmAccept = async (issueId: string, name: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'IN_PROGRESS', 
          assignedTo: name 
        }),
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update issue' }));
        throw new Error(errorData.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Error accepting issue:', error);
      alert(`ไม่สามารถรับงานได้: ${error.message || 'Unknown error'}`);
    }
  };

  const handleConfirmDone = async (issueId: string, name: string) => {
    try {
      // Check if issue has sub-issues that are not DONE
      const allIssuesResponse = await fetch(`/api/issues`);
      if (allIssuesResponse.ok) {
        const allIssues = await allIssuesResponse.json();
        const subIssues = allIssues.filter((i: any) => i.parentIssueId === issueId);
        const incompleteSubIssues = subIssues.filter((sub: any) => sub.status !== 'DONE');
        if (incompleteSubIssues.length > 0) {
          alert(`ไม่สามารถปิดงานได้: ยังมีปัญหาย่อยที่ยังไม่ปิดงาน ${incompleteSubIssues.length} ข้อ`);
          return;
        }
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'DONE', 
          closedBy: name 
        }),
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update issue' }));
        throw new Error(errorData.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Error closing issue:', error);
      alert(`ไม่สามารถปิดงานได้: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateTitle = async (issueId: string, title: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        await fetchIssues();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update issue' }));
        throw new Error(errorData.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Error updating title:', error);
      alert(`ไม่สามารถแก้ไขชื่อปัญหาได้: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCardClick = (issueId: string) => {
    // เก็บข้อมูลว่ามาจากหน้า kanban board
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('returnToPage', '/');
    }
    router.push(`/issues/${issueId}`);
  };

  const STATUSES: ('OPEN' | 'IN_PROGRESS' | 'DONE')[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

  const getIssuesByStatus = (status: string) => {
    // PROGRAMMER_PENDING and ONSITE_PENDING should stay in OPEN column until assigned
    // But if they have assignedTo, they should be in IN_PROGRESS column
    const filtered = groupedIssues.filter(i => {
      if (status === 'OPEN') {
        // Only show in OPEN if status is OPEN/PENDING AND no assignedTo
        return (i.status === 'OPEN' || i.status === 'PROGRAMMER_PENDING' || i.status === 'ONSITE_PENDING') && !i.assignedTo;
      }
      if (status === 'IN_PROGRESS') {
        // Show IN_PROGRESS status OR any status with assignedTo (except DONE)
        return i.status === 'IN_PROGRESS' || 
               (i.assignedTo && i.status !== 'DONE' && (i.status === 'OPEN' || i.status === 'PROGRAMMER_PENDING' || i.status === 'ONSITE_PENDING'));
      }
      return i.status === status;
    });
    
    // For DONE column: sort by closedAt (most recent first)
    if (status === 'DONE') {
      return filtered.sort((a, b) => {
        const aClosedAt = a.closedAt ? (typeof a.closedAt === 'string' ? new Date(a.closedAt) : a.closedAt) : new Date(0);
        const bClosedAt = b.closedAt ? (typeof b.closedAt === 'string' ? new Date(b.closedAt) : b.closedAt) : new Date(0);
        return bClosedAt.getTime() - aClosedAt.getTime(); // Most recent first
      });
    }
    
    // For other columns: Sort by priority: HIGH > MED > LOW, then by urgency: URGENT_EASY > URGENT_HARD > NOT_URGENT_HARD > NOT_URGENT_EASY
    const priorityOrder: { [key: string]: number } = { 
      HIGH: 3, 
      MED: 2, 
      LOW: 1 
    };
    const urgencyOrder: { [key: string]: number } = {
      URGENT_EASY: 4,
      URGENT_HARD: 3,
      NOT_URGENT_HARD: 2,
      NOT_URGENT_EASY: 1,
    };
    return filtered.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 2;
      const priorityB = priorityOrder[b.priority] || 2;
      if (priorityB !== priorityA) {
        return priorityB - priorityA; // Higher priority first
      }
      // If priority is same, sort by urgency
      const urgencyA = urgencyOrder[a.urgency || ''] || 0;
      const urgencyB = urgencyOrder[b.urgency || ''] || 0;
      return urgencyB - urgencyA; // Higher urgency first
    });
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar 
        currentType={currentType} 
        onTypeChange={setCurrentType}
        onCollapseChange={setSidebarCollapsed}
      />
      
      <div 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: isMobile 
            ? '0' 
            : (sidebarCollapsed ? '80px' : '280px'),
          padding: '0.5rem',
        }}
      >
        <div className="p-2 sm:p-4 md:p-8">

        {/* Mobile: Status Selection Buttons */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STATUSES.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  selectedStatus === status
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-200'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Show all columns */}
        <div className="hidden md:flex gap-2 sm:gap-4 overflow-x-auto pb-4 -mx-2 sm:-mx-4 md:-mx-8 px-2 sm:px-4 md:px-8">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              issues={getIssuesByStatus(status)}
              onCardClick={handleCardClick}
              onAccept={handleAccept}
              onDone={handleDone}
              showSubIssuesCount={true}
              users={users}
              onConfirmAccept={handleConfirmAccept}
              onConfirmDone={handleConfirmDone}
              onUpdateTitle={handleUpdateTitle}
            />
          ))}
        </div>

        {/* Mobile: Show only selected column */}
        <div className="md:hidden">
          <KanbanColumn
            status={selectedStatus}
            issues={getIssuesByStatus(selectedStatus)}
            onCardClick={handleCardClick}
            onAccept={handleAccept}
            onDone={handleDone}
            showSubIssuesCount={true}
            users={users}
            onConfirmAccept={handleConfirmAccept}
            onConfirmDone={handleConfirmDone}
            onUpdateTitle={handleUpdateTitle}
          />
        </div>
        </div>
        
        {/* Floating Action Button - Create Issue */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked!'); // Debug log
            const event = new CustomEvent('openCreateIssue');
            window.dispatchEvent(event);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-full shadow-lg shadow-success-300/50 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-success-400/50 cursor-pointer"
          aria-label="สร้าง Issue"
          style={{ zIndex: 9999, pointerEvents: 'auto' }}
          type="button"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
