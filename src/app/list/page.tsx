'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Issue {
  _id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'PROGRAMMER_PENDING' | 'ONSITE_PENDING';
  priority: 'LOW' | 'MED' | 'HIGH';
  urgency?: 'URGENT_EASY' | 'URGENT_HARD' | 'NOT_URGENT_EASY' | 'NOT_URGENT_HARD' | null;
  componentPath: string[];
  componentId?: string | null;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
  createdAt: Date | string;
  closedAt?: Date | string;
}

interface Component {
  _id: string;
  name: string;
  path: string[];
}

// Helper function to truncate text to 40 characters
const truncateTitle = (title: string, maxLength: number = 40): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

export default function ListViewPage() {
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
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [parentIssuesMap, setParentIssuesMap] = useState<Map<string, Issue>>(new Map());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [showSubIssues, setShowSubIssues] = useState<boolean>(false);

  // เก็บ currentType ไว้ใน localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentIssueType', currentType);
    }
  }, [currentType]);

  useEffect(() => {
    fetchIssues();
    fetchComponents();
    
    const interval = setInterval(() => {
      fetchIssues(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentType, showSubIssues]);

  useEffect(() => {
    // Apply filters and search
    let filtered = [...issues];
    
    // Filter: Show only parent issues by default, or show only sub-issues if toggle is on
    if (!showSubIssues) {
      // Show only parent issues (no parentIssueId)
      filtered = filtered.filter(issue => {
        const hasParent = issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
        return !hasParent;
      });
    } else {
      // Show only sub-issues (has parentIssueId)
      filtered = filtered.filter(issue => {
        const hasParent = issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
        return hasParent;
      });
    }
    
    // Search filter - search in title, reporterName, and dates
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const formatDateForSearch = (date: Date | string | undefined) => {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        // Search only by date (year, month, day) - not time
        return d.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).toLowerCase();
      };
      filtered = filtered.filter(issue => {
        const matchesTitle = issue.title.toLowerCase().includes(query);
        const matchesReporter = issue.reporterName?.toLowerCase().includes(query) || false;
        const matchesCreatedAt = formatDateForSearch(issue.createdAt).includes(query);
        const matchesReportedAt = formatDateForSearch((issue as any).reportedAt).includes(query);
        const matchesAssignedAt = formatDateForSearch((issue as any).assignedAt).includes(query);
        const matchesClosedAt = formatDateForSearch(issue.closedAt).includes(query);
        return matchesTitle || matchesReporter || matchesCreatedAt || matchesReportedAt || matchesAssignedAt || matchesClosedAt;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter);
    }
    
    // Urgency filter
    if (urgencyFilter !== 'all') {
      if (urgencyFilter === 'none') {
        filtered = filtered.filter(issue => !issue.urgency || issue.urgency === null);
      } else {
        filtered = filtered.filter(issue => issue.urgency === urgencyFilter);
      }
    }
    
    // Component filter
    if (componentFilter !== 'all') {
      filtered = filtered.filter(issue => {
        if (componentFilter === 'none') {
          return !issue.componentId || issue.componentId === null;
        }
        return issue.componentId === componentFilter;
      });
    }
    
    setFilteredIssues(filtered);
  }, [issues, searchQuery, statusFilter, priorityFilter, urgencyFilter, componentFilter, showSubIssues]);

  const fetchIssues = async (showError = true) => {
    try {
      let url: string;
      
      if (showSubIssues) {
        // Fetch all issues to get sub-issues, then we'll filter to show only sub-issues
        url = `/api/issues?type=${currentType}`;
      } else {
        // Fetch only parent issues
        url = `/api/issues?type=${currentType}&parentIssueId=null`;
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch issues' }));
        throw new Error(errorData.error || 'Failed to fetch issues');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Convert dates to Date if they're strings
      const processedData = data.map((issue: any) => ({
        ...issue,
        createdAt: issue.createdAt ? (typeof issue.createdAt === 'string' ? new Date(issue.createdAt) : issue.createdAt) : new Date(),
        reportedAt: issue.reportedAt ? (typeof issue.reportedAt === 'string' ? new Date(issue.reportedAt) : issue.reportedAt) : undefined,
        assignedAt: issue.assignedAt ? (typeof issue.assignedAt === 'string' ? new Date(issue.assignedAt) : issue.assignedAt) : undefined,
        closedAt: issue.closedAt ? (typeof issue.closedAt === 'string' ? new Date(issue.closedAt) : issue.closedAt) : undefined,
      }));
      
      setIssues(processedData);
      
      // Always fetch parent issues to create a map (needed for showing parent issue title for sub-issues)
      const parentResponse = await fetch(`/api/issues?type=${currentType}&parentIssueId=null`, {
        cache: 'no-store',
      });
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        const parentMap = new Map<string, Issue>();
        parentData.forEach((issue: any) => {
          parentMap.set(issue._id, {
            ...issue,
            createdAt: issue.createdAt ? (typeof issue.createdAt === 'string' ? new Date(issue.createdAt) : issue.createdAt) : new Date(),
          });
        });
        setParentIssuesMap(parentMap);
      }
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      if (showError) {
        alert(`ไม่สามารถโหลด Issues ได้: ${error.message || 'Unknown error'}`);
      }
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

  const handleRowClick = (issueId: string) => {
    // เก็บข้อมูลว่ามาจากหน้า list view
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('returnToPage', '/list');
    }
    router.push(`/issues/${issueId}`);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string, assignedTo?: string) => {
    // แสดงแค่ 3 สถานะหลัก: OPEN, IN_PROGRESS, DONE
    // ถ้าเป็น PROGRAMMER_PENDING หรือ ONSITE_PENDING และมี assignedTo ให้แสดงเป็น IN_PROGRESS
    // ถ้าเป็น PROGRAMMER_PENDING หรือ ONSITE_PENDING แต่ไม่มี assignedTo ให้แสดงเป็น OPEN
    if (status === 'PROGRAMMER_PENDING' || status === 'ONSITE_PENDING') {
      return assignedTo ? 'กำลังดำเนินการ' : 'เปิด';
    }
    switch (status) {
      case 'OPEN': return 'เปิด';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'DONE': return 'เสร็จสิ้น';
      default: return status;
    }
  };

  const getStatusColor = (status: string, assignedTo?: string) => {
    // แสดงแค่ 3 สถานะหลัก: OPEN, IN_PROGRESS, DONE
    // ถ้าเป็น PROGRAMMER_PENDING หรือ ONSITE_PENDING และมี assignedTo ให้แสดงเป็น IN_PROGRESS
    // ถ้าเป็น PROGRAMMER_PENDING หรือ ONSITE_PENDING แต่ไม่มี assignedTo ให้แสดงเป็น OPEN
    if (status === 'PROGRAMMER_PENDING' || status === 'ONSITE_PENDING') {
      return assignedTo ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
    }
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'ต่ำ';
      case 'MED': return 'ปานกลาง';
      case 'HIGH': return 'สูง';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-warning-100 text-warning-700';
      case 'MED': return 'bg-warning-200 text-warning-800';
      case 'HIGH': return 'bg-danger-100 text-danger-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getUrgencyLabel = (urgency: string | null | undefined) => {
    if (!urgency) return '-';
    switch (urgency) {
      case 'URGENT_EASY': return 'ด่วน-ง่าย';
      case 'URGENT_HARD': return 'ด่วน-ยาก';
      case 'NOT_URGENT_EASY': return 'ไม่ด่วน-ง่าย';
      case 'NOT_URGENT_HARD': return 'ไม่ด่วน-ยาก';
      default: return urgency;
    }
  };

  const getUrgencyColor = (urgency: string | null | undefined) => {
    if (!urgency) return 'bg-neutral-100 text-neutral-700';
    switch (urgency) {
      case 'URGENT_EASY': return 'bg-danger-100 text-danger-700';
      case 'URGENT_HARD': return 'bg-warning-200 text-warning-800';
      case 'NOT_URGENT_HARD': return 'bg-warning-200 text-warning-800';
      case 'NOT_URGENT_EASY': return 'bg-warning-100 text-warning-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const isSubIssue = (issue: Issue) => {
    return issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
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
        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-neutral-600">
            {showSubIssues ? 'แสดงปัญหาทั้งหมดรวมทั้งปัญหาย่อย (Sub-issues)' : 'แสดงปัญหาหลัก (Parent Issues) เท่านั้น'}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">ค้นหา</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาจากชื่อหัวข้อ, ผู้แจ้งปัญหา, หรือเวลา..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">สถานะ</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="OPEN">เปิด</option>
                <option value="PROGRAMMER_PENDING">Programmer Pending</option>
                <option value="ONSITE_PENDING">Onsite Pending</option>
                <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                <option value="DONE">เสร็จสิ้น</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">ความสำคัญ</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="LOW">ต่ำ</option>
                <option value="MED">ปานกลาง</option>
                <option value="HIGH">สูง</option>
              </select>
            </div>

            {/* Component Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Component</label>
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="none">ไม่มี Component</option>
                {components.map(comp => (
                  <option key={comp._id} value={comp._id}>
                    {comp.path.join(' > ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency Filter - แสดงเป็น "ระดับความยาก" */}
            <div>
              <label className="block text-sm font-medium mb-1">ระดับความยาก</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="none">ไม่มี</option>
                <option value="URGENT_EASY">ด่วน-ง่าย</option>
                <option value="URGENT_HARD">ด่วน-ยาก</option>
                <option value="NOT_URGENT_EASY">ไม่ด่วน-ง่าย</option>
                <option value="NOT_URGENT_HARD">ไม่ด่วน-ยาก</option>
              </select>
            </div>
          </div>

          {/* Toggle for showing sub-issues */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSubIssues}
                onChange={(e) => setShowSubIssues(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">แสดงปัญหาย่อย</span>
            </label>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg shadow-md shadow-neutral-200/50 overflow-hidden border border-neutral-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-neutral-50 to-white">
                <tr>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    หัวข้อปัญหา
                  </th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap">
                    สถานะ
                  </th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                    ความสำคัญ
                  </th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                    ระดับความยาก
                  </th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap">
                    วันที่สร้าง
                  </th>
                  <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                    วันที่ปิดงาน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 md:px-4 lg:px-6 py-4 text-center text-neutral-500">
                      {issues.length === 0 ? 'ไม่มีข้อมูลปัญหา' : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr
                      key={issue._id}
                      onClick={() => handleRowClick(issue._id)}
                      className="hover:bg-primary-50 cursor-pointer transition-all duration-200"
                    >
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSubIssue(issue) && (
                            <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap">
                              ปัญหาย่อย
                            </span>
                          )}
                          <span className="text-xs md:text-sm font-medium text-gray-900 truncate max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl block" title={issue.title}>{truncateTitle(issue.title)}</span>
                        </div>
                        {isSubIssue(issue) && issue.parentIssueId && parentIssuesMap.has(issue.parentIssueId) && (
                          <div className="text-xs text-blue-600 mt-1 font-medium truncate">
                            ← ปัญหาหลัก:{' '}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/issues/${issue.parentIssueId}`);
                              }}
                              className="underline hover:text-blue-800 truncate max-w-xs inline-block"
                              title={parentIssuesMap.get(issue.parentIssueId)?.title}
                            >
                              {truncateTitle(parentIssuesMap.get(issue.parentIssueId)?.title || '')}
                            </button>
                          </div>
                        )}
                        {issue.componentPath && issue.componentPath.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {issue.componentPath.join(' > ')}
                          </div>
                        )}
                        {issue.reporterName && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            ผู้แจ้ง: {issue.reporterName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status, issue.assignedTo)}`}>
                          {getStatusLabel(issue.status, issue.assignedTo)}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                          {getPriorityLabel(issue.priority)}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 whitespace-nowrap hidden xl:table-cell">
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(issue.urgency)}`}>
                          {getUrgencyLabel(issue.urgency)}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-neutral-600">
                        {formatDate(issue.createdAt)}
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-neutral-600 hidden xl:table-cell">
                        {issue.closedAt ? formatDate(issue.closedAt) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              {issues.length === 0 ? 'ไม่มีข้อมูลปัญหา' : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => handleRowClick(issue._id)}
                className="bg-white rounded-lg shadow-md shadow-neutral-200/50 p-4 hover:shadow-lg hover:shadow-primary-200/30 cursor-pointer transition-all duration-200 border border-neutral-100"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 w-full min-w-0 overflow-hidden">
                      {isSubIssue(issue) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                          ปัญหาย่อย
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-neutral-900 truncate flex-1 min-w-0 max-w-full" title={issue.title}>{truncateTitle(issue.title)}</h3>
                    </div>
                    {isSubIssue(issue) && issue.parentIssueId && parentIssuesMap.has(issue.parentIssueId) && (
                      <div className="text-xs text-primary-600 mb-1 font-medium">
                        ← ปัญหาหลัก:{' '}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/issues/${issue.parentIssueId}`);
                          }}
                          className="underline hover:text-primary-800"
                          title={parentIssuesMap.get(issue.parentIssueId)?.title}
                        >
                          {truncateTitle(parentIssuesMap.get(issue.parentIssueId)?.title || '')}
                        </button>
                      </div>
                    )}
                    {issue.componentPath && issue.componentPath.length > 0 && (
                      <div className="text-xs text-neutral-500 mb-1 truncate">
                        {issue.componentPath.join(' > ')}
                      </div>
                    )}
                    {issue.reporterName && (
                      <div className="text-xs text-neutral-500 mb-1">
                        ผู้แจ้ง: {issue.reporterName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status, issue.assignedTo)}`}>
                    {getStatusLabel(issue.status, issue.assignedTo)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                    {getPriorityLabel(issue.priority)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(issue.urgency)}`}>
                    {getUrgencyLabel(issue.urgency)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-neutral-600 border-t border-neutral-200 pt-2 mt-2">
                  <div>
                    <span className="font-medium">วันที่สร้าง: </span>
                    <span>{formatDate(issue.createdAt)}</span>
                  </div>
                  {issue.closedAt && (
                    <div>
                      <span className="font-medium">วันที่ปิดงาน: </span>
                      <span>{formatDate(issue.closedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 text-xs sm:text-sm text-gray-600">
          แสดง {filteredIssues.length} จาก {issues.length} รายการ
        </div>
        </div>
        
        {/* Floating Action Button - Create Issue */}
        <button
          onClick={() => {
            const event = new CustomEvent('openCreateIssue');
            window.dispatchEvent(event);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-full shadow-lg shadow-success-300/50 flex items-center justify-center transition-all duration-300 z-40 hover:scale-110 hover:shadow-xl hover:shadow-success-400/50"
          aria-label="สร้าง Issue"
          style={{ zIndex: 40 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

