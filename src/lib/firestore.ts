import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { serializeArray, deserializeArray, serializeJson, deserializeJson } from './json-helpers';

// Helper to convert Firestore timestamp to Date
const convertTimestamp = (data: any) => {
  if (!data) return data;
  const converted: any = { ...data };
  if (converted.createdAt?.toDate) {
    converted.createdAt = converted.createdAt.toDate();
  }
  if (converted.updatedAt?.toDate) {
    converted.updatedAt = converted.updatedAt.toDate();
  }
  return converted;
};

// Helper to convert Date to Firestore timestamp
const convertToTimestamp = (data: any) => {
  if (!data) return data;
  const converted: any = { ...data };
  if (converted.createdAt instanceof Date) {
    converted.createdAt = Timestamp.fromDate(converted.createdAt);
  }
  if (converted.updatedAt instanceof Date) {
    converted.updatedAt = Timestamp.fromDate(converted.updatedAt);
  }
  return converted;
};

// Component operations
export const componentCollection = collection(db, 'components');

export async function getComponents() {
  try {
    // Add limit to improve performance (max 1000 components)
    const q = query(componentCollection, orderBy('createdAt', 'desc'), limit(1000));
    
    // Single attempt with one retry if needed (ลด retry เพื่อความเร็ว)
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = convertTimestamp(doc.data());
        return {
          ...data,
          _id: doc.id,
          path: deserializeArray(data.path || '[]'),
        };
      });
    } catch (error: any) {
      // Only retry once for critical errors
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        await new Promise(resolve => setTimeout(resolve, 500));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
          const data = convertTimestamp(doc.data());
          return {
            ...data,
            _id: doc.id,
            path: deserializeArray(data.path || '[]'),
          };
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error getting components:', error);
    // Provide more helpful error message
    if (error.message?.includes('offline')) {
      throw new Error('Firestore is offline. Please check your internet connection and Firestore rules.');
    }
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    throw error;
  }
}

export async function getComponent(id: string) {
  try {
    const docRef = doc(db, 'components', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = convertTimestamp(docSnap.data());
    return {
      ...data,
      _id: docSnap.id,
      path: deserializeArray(data.path || '[]'),
    };
  } catch (error) {
    console.error('Error getting component:', error);
    throw error;
  }
}

export async function createComponent(data: { name: string; parentId?: string | null; path?: string[] }) {
  try {
    const now = Timestamp.now();
    const componentData = {
      name: data.name,
      parentId: data.parentId || null,
      path: serializeArray(data.path || []),
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(componentCollection, componentData);
    const created = await getComponent(docRef.id);
    return created;
  } catch (error) {
    console.error('Error creating component:', error);
    throw error;
  }
}

export async function updateComponent(id: string, data: { name?: string; parentId?: string | null; path?: string[] }) {
  try {
    const docRef = doc(db, 'components', id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.path !== undefined) updateData.path = serializeArray(data.path);
    
    await updateDoc(docRef, updateData);
    return await getComponent(id);
  } catch (error) {
    console.error('Error updating component:', error);
    throw error;
  }
}

export async function deleteComponent(id: string) {
  try {
    const docRef = doc(db, 'components', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting component:', error);
    throw error;
  }
}

// Issue operations
export const issueCollection = collection(db, 'issues');

export async function getIssues(filters?: { status?: string; componentId?: string; type?: 'internal' | 'external'; parentIssueId?: string | null }) {
  try {
    // Firestore requires composite index when using where() with orderBy() on different fields
    // To avoid index requirements, we'll fetch all and filter/sort in memory when type filter is used
    let constraints: QueryConstraint[] = [];
    let shouldFilterInMemory = false;
    
    // Check if we need to filter in memory (when type filter is used with orderBy)
    if (filters?.type) {
      shouldFilterInMemory = true;
    }
    
    // If filtering in memory, don't use where() for type, just orderBy
    if (shouldFilterInMemory) {
      constraints = [orderBy('createdAt', 'desc'), limit(1000)];
    } else {
      // Apply filters only if we can use Firestore where() without index issues
      constraints = [orderBy('createdAt', 'desc'), limit(1000)];
      
      if (filters?.status && !filters?.componentId && !filters?.type && filters?.parentIssueId === undefined) {
        constraints.push(where('status', '==', filters.status));
      } else if (filters?.componentId && !filters?.status && !filters?.type && filters?.parentIssueId === undefined) {
        constraints.push(where('componentId', '==', filters.componentId));
      } else if (filters?.parentIssueId !== undefined && !filters?.status && !filters?.componentId && !filters?.type) {
        if (filters.parentIssueId === null) {
          constraints.push(where('parentIssueId', '==', null));
        } else {
          constraints.push(where('parentIssueId', '==', filters.parentIssueId));
        }
      }
    }
    
    const q = query(issueCollection, ...constraints);
    
    // Single attempt with timeout (ลด retry เพื่อความเร็ว)
    try {
      const snapshot = await getDocs(q);
      let issues = snapshot.docs.map(doc => {
        const data = convertTimestamp(doc.data());
        return {
          ...data,
          _id: doc.id,
          componentPath: deserializeArray(data.componentPath || '[]'),
          description: deserializeJson(data.description || null),
          type: data.type || 'internal',
          parentIssueId: data.parentIssueId || null,
        };
      });
      
      // Apply filters in memory (always do this to ensure consistency)
      if (filters) {
        if (filters.status) {
          issues = issues.filter(issue => issue.status === filters.status);
        }
        if (filters.componentId) {
          issues = issues.filter(issue => issue.componentId === filters.componentId);
        }
        if (filters.type) {
          issues = issues.filter(issue => (issue as any).type === filters.type);
        }
        if (filters.parentIssueId !== undefined) {
          if (filters.parentIssueId === null) {
            issues = issues.filter(issue => !(issue as any).parentIssueId);
          } else {
            issues = issues.filter(issue => (issue as any).parentIssueId === filters.parentIssueId);
          }
        }
      }
      
      // Sort by createdAt desc (in case we filtered in memory and lost the order)
      issues.sort((a, b) => {
        const aDate = (a as any).createdAt instanceof Date ? (a as any).createdAt : new Date((a as any).createdAt);
        const bDate = (b as any).createdAt instanceof Date ? (b as any).createdAt : new Date((b as any).createdAt);
        return bDate.getTime() - aDate.getTime();
      });
      
      return issues;
    } catch (error: any) {
      // Only retry once for critical errors
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        await new Promise(resolve => setTimeout(resolve, 500));
        const snapshot = await getDocs(q);
        let issues = snapshot.docs.map(doc => {
          const data = convertTimestamp(doc.data());
          return {
            ...data,
            _id: doc.id,
            componentPath: deserializeArray(data.componentPath || '[]'),
            description: deserializeJson(data.description || null),
          };
        });
        
        if (filters) {
          if (filters.status) {
            issues = issues.filter(issue => issue.status === filters.status);
          }
          if (filters.componentId) {
            issues = issues.filter(issue => issue.componentId === filters.componentId);
          }
          if (filters.type) {
            issues = issues.filter(issue => (issue as any).type === filters.type);
          }
          if (filters.parentIssueId !== undefined) {
            if (filters.parentIssueId === null) {
              issues = issues.filter(issue => !(issue as any).parentIssueId);
            } else {
              issues = issues.filter(issue => (issue as any).parentIssueId === filters.parentIssueId);
            }
          }
        }
        
        // Sort by createdAt desc
        issues.sort((a, b) => {
          const aDate = (a as any).createdAt instanceof Date ? (a as any).createdAt : new Date((a as any).createdAt);
          const bDate = (b as any).createdAt instanceof Date ? (b as any).createdAt : new Date((b as any).createdAt);
          return bDate.getTime() - aDate.getTime();
        });
        
        return issues;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error getting issues:', error);
    // Provide more helpful error message
    if (error.message?.includes('offline')) {
      throw new Error('Firestore is offline. Please check your internet connection and Firestore rules.');
    }
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    throw error;
  }
}

export async function getIssue(id: string) {
  try {
    const docRef = doc(db, 'issues', id);
    
    // Single attempt with one retry if needed (ลด retry เพื่อความเร็ว)
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return null;
      }
      const data = convertTimestamp(docSnap.data());
      return {
        ...data,
        _id: docSnap.id,
        componentPath: deserializeArray(data.componentPath || '[]'),
        description: deserializeJson(data.description || null),
        type: data.type || 'internal',
        parentIssueId: data.parentIssueId || null,
      };
    } catch (error: any) {
      // Only retry once for critical errors
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        await new Promise(resolve => setTimeout(resolve, 500));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return null;
        }
        const data = convertTimestamp(docSnap.data());
        return {
          ...data,
          _id: docSnap.id,
          componentPath: deserializeArray(data.componentPath || '[]'),
          description: deserializeJson(data.description || null),
        };
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error getting issue:', error);
    // Provide more helpful error message
    if (error.message?.includes('offline')) {
      throw new Error('Firestore is offline. Please check your internet connection and Firestore rules.');
    }
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    throw error;
  }
}

export async function createIssue(data: {
  title: string;
  status?: string;
  priority?: string;
  componentId?: string | null;
  componentPath?: string[];
  description?: any;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
}) {
  try {
    const now = Timestamp.now();
    const issueData: any = {
      title: data.title,
      status: data.status || 'OPEN',
      priority: data.priority || 'MED',
      componentId: data.componentId || null,
      componentPath: serializeArray(data.componentPath || []),
      description: serializeJson(data.description || null),
      type: data.type || 'internal',
      createdAt: now,
      updatedAt: now,
    };
    
    // Internal issue fields
    if (data.type === 'internal') {
      if (data.reporterName) issueData.reporterName = data.reporterName;
      if (data.assignedTo) issueData.assignedTo = data.assignedTo;
    }
    
    // External issue fields
    if (data.type === 'external') {
      if (data.hospital) issueData.hospital = data.hospital;
      if (data.department) issueData.department = data.department;
    }
    
    // Parent issue for sub-issues
    if (data.parentIssueId) {
      issueData.parentIssueId = data.parentIssueId;
    }
    
    const docRef = await addDoc(issueCollection, issueData);
    const created = await getIssue(docRef.id);
    return created;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
}

export async function updateIssue(id: string, data: {
  title?: string;
  status?: string;
  priority?: string;
  componentId?: string | null;
  componentPath?: string[];
  description?: any;
  type?: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;
  hospital?: string;
  department?: string;
}) {
  try {
    const docRef = doc(db, 'issues', id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.componentId !== undefined) updateData.componentId = data.componentId;
    if (data.componentPath !== undefined) updateData.componentPath = serializeArray(data.componentPath);
    if (data.description !== undefined) updateData.description = serializeJson(data.description);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.reporterName !== undefined) updateData.reporterName = data.reporterName;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.closedBy !== undefined) updateData.closedBy = data.closedBy;
    if (data.parentIssueId !== undefined) updateData.parentIssueId = data.parentIssueId;
    if (data.hospital !== undefined) updateData.hospital = data.hospital;
    if (data.department !== undefined) updateData.department = data.department;
    
    await updateDoc(docRef, updateData);
    return await getIssue(id);
  } catch (error) {
    console.error('Error updating issue:', error);
    throw error;
  }
}

export async function deleteIssue(id: string) {
  try {
    const docRef = doc(db, 'issues', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting issue:', error);
    throw error;
  }
}

// User operations
export const userCollection = collection(db, 'users');

export async function getUsers() {
  try {
    const q = query(userCollection, orderBy('username', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = convertTimestamp(doc.data());
      return {
        ...data,
        _id: doc.id,
      };
    });
  } catch (error: any) {
    console.error('Error getting users:', error);
    throw error;
  }
}

export async function getUser(id: string) {
  try {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = convertTimestamp(docSnap.data());
    return {
      ...data,
      _id: docSnap.id,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const q = query(userCollection, where('username', '==', username), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const docSnap = snapshot.docs[0];
    const data = convertTimestamp(docSnap.data());
    return {
      ...data,
      _id: docSnap.id,
    };
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

export async function createUser(data: { username: string; password: string; name: string }) {
  try {
    // Check if username already exists
    const existing = await getUserByUsername(data.username);
    if (existing) {
      throw new Error('Username already exists');
    }

    const now = Timestamp.now();
    const userData = {
      username: data.username,
      password: data.password, // In production, this should be hashed
      name: data.name,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(userCollection, userData);
    const created = await getUser(docRef.id);
    // Don't return password
    if (created) {
      delete (created as any).password;
    }
    return created;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function verifyUser(username: string, password: string) {
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return null;
    }
    // Simple password comparison (in production, use hashed passwords)
    if ((user as any).password === password) {
      const { password: _, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    }
    return null;
  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  }
}

