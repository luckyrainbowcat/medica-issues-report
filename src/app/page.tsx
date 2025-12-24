'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Issue {
  _id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MED' | 'HIGH';
  componentPath: string[];
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
  subIssuesCount?: number;
}

interface GroupedIssue extends Issue {
  subIssues?: Issue[];
}

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
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [editPriority, setEditPriority] = useState<'LOW' | 'MED' | 'HIGH'>(issue.priority || 'MED');

  const priorityColors = {
    LOW: 'bg-yellow-100 text-yellow-800',
    MED: 'bg-orange-100 text-orange-800',
    HIGH: 'bg-red-100 text-red-800',
  };

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
      className="bg-white p-3 rounded shadow mb-2 hover:shadow-md relative cursor-pointer isolate"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input') && !(e.target as HTMLElement).closest('select') && !(e.target as HTMLElement).closest('form')) {
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
        {isEditingTitle ? (
          <form onSubmit={handleSaveTitle} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm font-semibold"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <button
              type="submit"
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={handleCancelEditTitle}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
            >
              ยกเลิก
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-semibold">{issue.title}</h3>
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
        </p>
      )}
      {/* ผู้รับงาน - แสดงสำหรับทั้งสองประเภท */}
      {issue.assignedTo && (
        <p className="text-xs text-blue-600 mb-1">
          ผู้รับงาน: {issue.assignedTo}
        </p>
      )}
      {/* ผู้ปิดงาน - แสดงสำหรับทั้งสองประเภท */}
      {issue.closedBy && (
        <p className="text-xs text-green-600 mb-1">
          ผู้ปิดงาน: {issue.closedBy}
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
      <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
        {issue.status !== 'DONE' && (
          <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${priorityColors[issue.priority] || priorityColors.MED}`}>
            {issue.priority || 'MED'}
          </span>
        )}
        <div className="flex gap-1 flex-shrink-0 min-w-0" onClick={(e) => e.stopPropagation()}>
          {issue.status === 'OPEN' && !showAcceptForm && (
            <button
              onClick={handleAcceptClick}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 whitespace-nowrap flex-shrink-0"
            >
              Accept
            </button>
          )}
          {issue.status === 'IN_PROGRESS' && !showDoneForm && (
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
      {showAcceptForm && issue.status === 'OPEN' && (
        <div className="mt-3 pt-3 border-t border-gray-200 relative z-0" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleConfirmAccept} className="space-y-2">
            <label className="block text-xs font-medium mb-1">ผู้รับงาน *</label>
            <select
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
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
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
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
      {showDoneForm && issue.status === 'IN_PROGRESS' && (
        <div className="mt-3 pt-3 border-t border-gray-200 relative z-0" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleConfirmDone} className="space-y-2">
            <label className="block text-xs font-medium mb-1">ผู้ปิดงาน *</label>
            <select
              value={closedByName}
              onChange={(e) => setClosedByName(e.target.value)}
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
              value={closedByName}
              onChange={(e) => setClosedByName(e.target.value)}
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
    <div className="flex-1 bg-gray-100 p-4 rounded min-h-[400px] max-h-[80vh] overflow-y-auto overflow-x-hidden">
      <h2 className="font-bold text-lg mb-4 sticky top-0 bg-gray-100 py-2 z-10">{status.replace('_', ' ')}</h2>
      {issues.map(issue => (
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
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [currentType, setCurrentType] = useState<'internal' | 'external'>('internal');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [groupedIssues, setGroupedIssues] = useState<GroupedIssue[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
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
    
    console.log('Total issues:', issues.length);
    console.log('Parent issues:', parentIssues.length, parentIssues.map(p => ({ id: p._id, title: p.title })));
    console.log('Sub issues:', subIssues.length);
    console.log('Sub issues data:', subIssues.map(s => ({ id: s._id, parentId: s.parentIssueId, title: s.title })));
    
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
    
    console.log('Grouped issues:', grouped.map(g => ({ id: g._id, title: g.title, subCount: g.subIssuesCount })));
    setGroupedIssues(grouped);
  }, [issues]);

  const [loadingIssues, setLoadingIssues] = useState(false);

  const fetchIssues = async (showError = true) => {
    if (loadingIssues) return;
    setLoadingIssues(true);
    try {
      // For Kanban Board: Fetch only parent issues (no sub-issues)
      // But we need to fetch all issues to count sub-issues for display
      const parentResponse = await fetch(`/api/issues?type=${currentType}&parentIssueId=null`, {
        cache: 'no-store',
      });
      if (!parentResponse.ok) {
        const errorData = await parentResponse.json().catch(() => ({ error: 'Failed to fetch issues' }));
        throw new Error(errorData.error || 'Failed to fetch issues');
      }
      const parentData = await parentResponse.json();
      if (parentData.error) {
        throw new Error(parentData.error);
      }
      
      // Fetch ALL issues (including sub-issues) to count sub-issues for each parent
      // This is needed to show the sub-issues count badge on cards
      const allIssuesResponse = await fetch(`/api/issues`, {
        cache: 'no-store',
      });
      if (allIssuesResponse.ok) {
        const allIssues = await allIssuesResponse.json();
        const allSubIssues = allIssues.filter((i: any) => i.parentIssueId && i.parentIssueId !== null);
        
        // For Kanban Board: Only set parent issues, but keep sub-issues data for counting
        // The useEffect will filter to show only parent issues in the board
        setIssues([...parentData, ...allSubIssues]);
      } else {
        // Fallback: use only parent issues if we can't fetch all issues
        setIssues(parentData);
      }
    } catch (error: any) {
      console.error('Error fetching issues:', error);
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
    router.push(`/issues/${issueId}`);
  };

  const STATUSES: ('OPEN' | 'IN_PROGRESS' | 'DONE')[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

  const getIssuesByStatus = (status: string) => {
    const filtered = groupedIssues.filter(i => i.status === status);
    // Sort by priority: HIGH > MED > LOW
    const priorityOrder = { HIGH: 3, MED: 2, LOW: 1 };
    return filtered.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 2;
      const priorityB = priorityOrder[b.priority] || 2;
      return priorityB - priorityA; // Higher priority first
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentType={currentType} onTypeChange={setCurrentType} />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {currentType === 'internal' ? 'Issues List' : 'Issues List'}
          </h1>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
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
      </div>
    </div>
  );
}
