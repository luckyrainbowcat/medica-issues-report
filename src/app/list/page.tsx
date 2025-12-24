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
  componentId?: string | null;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
  createdAt: Date | string;
}

interface Component {
  _id: string;
  name: string;
  path: string[];
}

export default function ListViewPage() {
  const router = useRouter();
  const [currentType, setCurrentType] = useState<'internal' | 'external'>('internal');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [parentIssuesMap, setParentIssuesMap] = useState<Map<string, Issue>>(new Map());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [showSubIssues, setShowSubIssues] = useState<boolean>(false);

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
    
    // Search filter - search in title and reporterName
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(query) ||
        (issue.reporterName && issue.reporterName.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter);
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
    
    // AssignedTo filter
    if (assignedToFilter !== 'all') {
      if (assignedToFilter === 'unassigned') {
        filtered = filtered.filter(issue => !issue.assignedTo || issue.assignedTo === '');
      } else {
        filtered = filtered.filter(issue => issue.assignedTo === assignedToFilter);
      }
    }
    
    setFilteredIssues(filtered);
  }, [issues, searchQuery, statusFilter, priorityFilter, componentFilter, assignedToFilter, showSubIssues]);

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
      
      // Convert createdAt to Date if it's a string
      const processedData = data.map((issue: any) => ({
        ...issue,
        createdAt: issue.createdAt ? (typeof issue.createdAt === 'string' ? new Date(issue.createdAt) : issue.createdAt) : new Date(),
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'เปิด';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'DONE': return 'เสร็จสิ้น';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
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
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      case 'MED': return 'bg-orange-100 text-orange-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isSubIssue = (issue: Issue) => {
    return issue.parentIssueId !== null && issue.parentIssueId !== undefined && issue.parentIssueId !== '';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentType={currentType} onTypeChange={setCurrentType} />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">รายการปัญหาทั้งหมด</h1>
          <p className="text-gray-600">
            {showSubIssues ? 'แสดงปัญหาทั้งหมดรวมทั้งปัญหาย่อย (Sub-issues)' : 'แสดงปัญหาหลัก (Parent Issues) เท่านั้น'}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">ค้นหา</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาจากชื่อหัวข้อหรือชื่อผู้แจ้งปัญหา..."
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
                <option value="HIGH">สูง</option>
                <option value="MED">ปานกลาง</option>
                <option value="LOW">ต่ำ</option>
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

            {/* AssignedTo Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">ผู้รับผิดชอบ</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="unassigned">ยังไม่ได้รับมอบหมาย</option>
                {Array.from(new Set(issues.filter(i => i.assignedTo).map(i => i.assignedTo!))).sort().map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
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

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    หัวข้อปัญหา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ความสำคัญ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้รับผิดชอบ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่สร้าง
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      {issues.length === 0 ? 'ไม่มีข้อมูลปัญหา' : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr
                      key={issue._id}
                      onClick={() => handleRowClick(issue._id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isSubIssue(issue) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              ปัญหาย่อย
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-900">{issue.title}</span>
                        </div>
                        {isSubIssue(issue) && issue.parentIssueId && parentIssuesMap.has(issue.parentIssueId) && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            ← ปัญหาหลัก:{' '}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/issues/${issue.parentIssueId}`);
                              }}
                              className="underline hover:text-blue-800"
                            >
                              {parentIssuesMap.get(issue.parentIssueId)?.title}
                            </button>
                          </div>
                        )}
                        {issue.componentPath && issue.componentPath.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {issue.componentPath.join(' > ')}
                          </div>
                        )}
                        {issue.reporterName && (
                          <div className="text-xs text-gray-500 mt-1">
                            ผู้แจ้ง: {issue.reporterName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                          {getStatusLabel(issue.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                          {getPriorityLabel(issue.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {issue.assignedTo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(issue.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600">
          แสดง {filteredIssues.length} จาก {issues.length} รายการ
        </div>
      </div>
    </div>
  );
}

