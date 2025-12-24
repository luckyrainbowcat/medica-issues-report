'use client';

import { useState, useRef, useEffect } from 'react';
import CanvasEditor from './CanvasEditor';

interface IssueEditorProps {
  initialContent?: any;
  onSave: (content: any) => Promise<void>;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function IssueEditor({ initialContent, onSave, onEditingChange }: IssueEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSave = async (content: any) => {
    setIsEditing(false);
    onEditingChange?.(false);
    await onSave(content);
  };
  
  const handleEditingStart = () => {
    if (!isEditing) {
      setIsEditing(true);
      onEditingChange?.(true);
    }
    // Reset timeout - if user is active, keep editing state
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }
    // Set timeout to mark as not editing after 5 seconds of inactivity
    editingTimeoutRef.current = setTimeout(() => {
      // Don't auto-set to false - let user finish editing
    }, 5000);
  };
  
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className="h-full" 
      onMouseDown={handleEditingStart} 
      onTouchStart={handleEditingStart}
    >
      <CanvasEditor initialContent={initialContent} onSave={handleSave} />
    </div>
  );
}

