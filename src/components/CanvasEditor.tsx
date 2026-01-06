'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { API_URL } from '@/lib/service-management/api';

interface CanvasEditorProps {
  initialContent?: any;
  onSave: (content: any) => Promise<void>;
}

// Helper functions for localStorage
const loadFromStorage = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(`canvas-editor-${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`canvas-editor-${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export default function CanvasEditor({ initialContent, onSave }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const saveStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyIndexRef = useRef(-1);
  const historyInitializedRef = useRef(false);
  const isUndoRedoingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<'select' | 'draw' | 'text' | 'rect' | 'circle' | 'line' | 'arrow' | 'highlight' | 'image'>(
    loadFromStorage('tool', 'select')
  );
  const [drawingColor, setDrawingColor] = useState(loadFromStorage('drawingColor', '#000000'));
  const [drawingWidth, setDrawingWidth] = useState(loadFromStorage('drawingWidth', 2));
  const [fontFamily, setFontFamily] = useState(loadFromStorage('fontFamily', 'Arial'));
  const [fontSize, setFontSize] = useState(loadFromStorage('fontSize', 20));
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Sync ref with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isMobilePanning, setIsMobilePanning] = useState(false);
  const [mobilePanStartPoint, setMobilePanStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);
  const [cropImageRef, setCropImageRef] = useState<fabric.Image | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentShape, setCurrentShape] = useState<fabric.Rect | fabric.Circle | null>(null);
  const isDeletingRef = useRef(false);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!fabricCanvasRef.current) {
      alert('Canvas ยังไม่พร้อม กรุณารอสักครู่');
      return;
    }

    try {
      // Validate file size on mobile (max 5MB)
      const isMobile = window.innerWidth < 640;
      const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB mobile, 10MB desktop
      if (file.size > maxSize) {
        alert(`ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กกว่า ${isMobile ? '5' : '10'}MB`);
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      // Retry mechanism for mobile network issues
      const maxRetries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Create AbortController for timeout
          const controller = new AbortController();
          // Longer timeout for mobile (90 seconds)
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            // Don't set Content-Type header - browser will set it with boundary for FormData
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorMessage = 'Upload failed';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();
          if (!result.url) {
            throw new Error('Server did not return image URL');
          }

          // ตรวจสอบว่าเป็น ImgBB URL หรือไม่ (ไม่ควรแปลงเป็น relative path)
          let imageUrl = result.url;
          let relativePath = imageUrl; // เก็บ URL สำหรับการบันทึก
          
          // ถ้าเป็น ImgBB URL หรือ external URL ให้เก็บเป็น absolute URL ตามเดิม
          const isImgBBUrl = imageUrl.includes('i.ibb.co') || imageUrl.includes('ibb.co');
          const isExternalUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
          
          if (isExternalUrl && !isImgBBUrl) {
            // ถ้าเป็น external URL ที่ไม่ใช่ ImgBB (เช่น Firebase Storage) ให้แปลงเป็น relative path
            try {
              const urlObj = new URL(imageUrl);
              relativePath = urlObj.pathname;
              console.log('[Canvas] Converted external URL to relative path:', relativePath);
            } catch (e) {
              console.warn('[Canvas] Failed to parse URL, using as-is:', imageUrl);
            }
          } else if (isImgBBUrl) {
            // ImgBB URL ให้เก็บเป็น absolute URL ตามเดิม (ไม่แปลง)
            console.log('[Canvas] ImgBB URL detected, keeping as absolute URL:', imageUrl);
            relativePath = imageUrl; // เก็บ absolute URL
          }
          
          // สร้าง full URL สำหรับการโหลด
          if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
            // ถ้าเป็น relative path (ไม่ใช่ absolute URL) ให้ใช้ API_URL
            if (!relativePath.startsWith('/')) {
              relativePath = '/' + relativePath;
            }
            imageUrl = `${API_URL}${relativePath}`;
            console.log('[Canvas] Using API_URL for image loading:', imageUrl);
            console.log('[Canvas] Will save as relative path:', relativePath);
          } else {
            // ถ้าเป็น absolute URL อยู่แล้ว (ImgBB หรือ external URL) ให้ใช้ตามเดิม
            imageUrl = imageUrl;
            console.log('[Canvas] Using absolute URL for image loading:', imageUrl);
            console.log('[Canvas] Will save as absolute URL:', relativePath);
          }

          // Success - break out of retry loop
          return new Promise<void>((resolve, reject) => {
            if (!fabricCanvasRef.current || !fabricCanvasRef.current.getContext()) {
              reject(new Error('Canvas not available'));
              return;
            }

            const canvas = fabricCanvasRef.current;
            
            // Use simpler method for mobile compatibility
            fabric.Image.fromURL(
              imageUrl,
              (img: fabric.Image) => {
                try {
                  if (!canvas || !canvas.getContext()) {
                    reject(new Error('Canvas not available'));
                    return;
                  }
                  
                  // Scale image to reasonable size
                  const isMobile = window.innerWidth < 640;
                  const maxWidth = isMobile ? 300 : 400;
                  if (img.width && img.width > maxWidth) {
                    img.scaleToWidth(maxWidth);
                  } else if (img.width) {
                    img.scaleToWidth(Math.min(img.width, isMobile ? 250 : 300));
                  }
                  
                  // Get pointer position if available, otherwise use center of viewport
                  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                  const centerX = (-vpt[4] + (window.innerWidth || 800) / 2) / vpt[0];
                  const centerY = (-vpt[5] + (window.innerHeight || 600) / 2) / vpt[3];
                  
                  img.set({
                    left: centerX - (img.width || 300) * (img.scaleX || 1) / 2,
                    top: centerY - (img.height || 300) * (img.scaleY || 1) / 2,
                    selectable: true,
                    evented: true,
                  });
                  
                  canvas.add(img);
                  canvas.setActiveObject(img);
                  
                  // บันทึก relative path ใน image object เพื่อให้บันทึกเป็น relative path
                  if (img.getElement()) {
                    // เก็บ relative path ใน object เพื่อใช้ตอนบันทึก
                    (img as any)._relativePath = relativePath;
                    console.log('[Canvas] Stored relative path for image:', relativePath);
                  }
                  
                  canvas.renderAll();
                  resolve();
                } catch (err: any) {
                  console.error('Error adding image to canvas:', err);
                  reject(new Error(`ไม่สามารถเพิ่มรูปภาพลงใน canvas: ${err.message || 'Unknown error'}`));
                }
              },
              {
                crossOrigin: 'anonymous'
              }
            );
          });
        } catch (fetchError: any) {
          lastError = fetchError;
          
          // Don't retry on certain errors
          if (fetchError.message?.includes('File size') || 
              fetchError.message?.includes('Only image') ||
              fetchError.message?.includes('No file')) {
            throw fetchError; // Don't retry validation errors
          }
          
          // If last attempt, throw error
          if (attempt === maxRetries) {
            if (fetchError.name === 'AbortError') {
              throw new Error('การอัปโหลดใช้เวลานานเกินไป กรุณาลองอีกครั้งหรือเลือกรูปภาพที่เล็กกว่า');
            } else if (fetchError.message?.includes('fetch') || fetchError.message?.includes('network')) {
              throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
            } else {
              throw new Error(`เกิดข้อผิดพลาดในการอัปโหลด: ${fetchError.message || 'Unknown error'}`);
            }
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      
      // Should never reach here, but just in case
      throw lastError || new Error('Upload failed after retries');

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parse fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.url) {
        throw new Error('Server did not return image URL');
      }

      return new Promise<void>((resolve, reject) => {
        if (!fabricCanvasRef.current || !fabricCanvasRef.current.getContext()) {
          reject(new Error('Canvas not available'));
          return;
        }

        const canvas = fabricCanvasRef.current;
        
        // Use simpler method for mobile compatibility
        fabric.Image.fromURL(
          result.url,
          (img: fabric.Image) => {
            try {
              if (!canvas || !canvas.getContext()) {
                reject(new Error('Canvas not available'));
                return;
              }
              
              // Scale image to reasonable size
              const isMobile = window.innerWidth < 640;
              const maxWidth = isMobile ? 300 : 400;
              if (img.width && img.width > maxWidth) {
                img.scaleToWidth(maxWidth);
              } else if (img.width) {
                img.scaleToWidth(Math.min(img.width, isMobile ? 250 : 300));
              }
              
              // Get pointer position if available, otherwise use center of viewport
              const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
              const centerX = (-vpt[4] + (window.innerWidth || 800) / 2) / vpt[0];
              const centerY = (-vpt[5] + (window.innerHeight || 600) / 2) / vpt[3];
              
              img.set({
                left: centerX - (img.width || 300) * (img.scaleX || 1) / 2,
                top: centerY - (img.height || 300) * (img.scaleY || 1) / 2,
                selectable: true,
                evented: true,
              });
              
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.renderAll();
              resolve();
            } catch (err: any) {
              console.error('Error adding image to canvas:', err);
              reject(new Error(`ไม่สามารถเพิ่มรูปภาพลงใน canvas: ${err.message || 'Unknown error'}`));
            }
          },
          {
            crossOrigin: 'anonymous'
          }
        );
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const errorMessage = error.message || 'Unknown error';
      alert(`ไม่สามารถอัปโหลดรูปภาพได้: ${errorMessage}`);
      // Don't throw error, just show alert
      return Promise.reject(error);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dispose existing canvas if exists (ป้องกัน canvas ซ้อนกัน)
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
        console.log('[Canvas] Disposed existing canvas before creating new one');
      } catch (disposeError) {
        console.warn('[Canvas] Error disposing existing canvas:', disposeError);
      }
      fabricCanvasRef.current = null;
    }

    // Initialize Fabric.js canvas - Infinite canvas (large size for panning)
    // Canvas size is large, but viewport shows only screen size
    // Calculate available height - account for toolbar and mobile header
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const toolbarHeight = isMobile ? 180 : 120; // More space for mobile toolbar
    const availableHeight = Math.max(window.innerHeight - toolbarHeight, 400);
    
    // Reduce canvas size on mobile to save memory
    // Mobile: 2x viewport, max 1500px (ลดลงจาก 2000px)
    // Desktop: 3x viewport, max 3000px (ลดลงจาก 5000px เพื่อลด memory usage)
    const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
    const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
    const canvasWidth = Math.min(
      isMobile ? window.innerWidth * 2 : window.innerWidth * 3,
      MAX_CANVAS_WIDTH
    );
    const canvasHeight = Math.min(
      isMobile ? availableHeight * 2 : availableHeight * 3,
      MAX_CANVAS_HEIGHT
    );
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      isDrawingMode: false,
      preserveObjectStacking: true,
      renderOnAddRemove: !isMobile, // Disable auto-render on mobile to save memory
      stateful: false, // Disable stateful mode to save memory
    });
    
    // Optimize rendering for mobile - reduce memory usage
    if (isMobile) {
      // Disable auto-render to save memory
      canvas.renderOnAddRemove = false;
    }
    
    // Set initial viewport to center of canvas
    const viewportWidth = window.innerWidth;
    const viewportHeight = availableHeight;
    const initialX = (canvasWidth - viewportWidth) / 2;
    const initialY = (canvasHeight - viewportHeight) / 2;
    canvas.setViewportTransform([1, 0, 0, 1, -initialX, -initialY]);

    fabricCanvasRef.current = canvas;

    // Load initial content if exists - with better error handling
    // Skip loading if there's old Tiptap content (different format)
    if (initialContent) {
      // Use requestAnimationFrame to ensure canvas is fully ready
      let retryCount = 0;
      const maxRetries = 20; // Max 20 retries (1 second total)
      const loadCanvasContent = () => {
        requestAnimationFrame(() => {
          if (canvas && canvasRef.current && canvas.getContext()) {
            // Check if it's an image (saved as image due to size limit)
            if (initialContent.isImage && initialContent.imageUrl) {
              // โหลดรูปภาพในพื้นหลัง (ไม่บล็อกการ render)
              setTimeout(() => {
                try {
                  const imgElement = document.createElement('img');
                  imgElement.crossOrigin = 'anonymous';
                  
                  // เพิ่ม timeout สำหรับการโหลดรูปภาพ (5 วินาที)
                  const imageLoadTimeout = setTimeout(() => {
                    console.error('Image load timeout:', initialContent.imageUrl);
                    imgElement.onload = null;
                    imgElement.onerror = null;
                    // Render canvas ว่างแทนการค้าง
                    try {
                      canvas.renderAll();
                    } catch (renderError) {
                      console.error('Error rendering canvas:', renderError);
                    }
                  }, 5000);
                  
                  // แปลง relative path เป็น absolute URL ถ้าจำเป็น
                  let imageUrl = initialContent.imageUrl;
                  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
                    // ถ้าไม่ขึ้นต้นด้วย / ให้เพิ่ม /
                    if (!imageUrl.startsWith('/')) {
                      imageUrl = '/' + imageUrl;
                    }
                    imageUrl = `${API_URL}${imageUrl}`;
                    console.log('Converted relative imageUrl to absolute URL:', imageUrl);
                  }
                  
                  imgElement.onload = () => {
                    clearTimeout(imageLoadTimeout);
                    fabric.Image.fromURL(
                      imageUrl,
                      (img: fabric.Image) => {
                        if (canvas && canvas.getContext()) {
                          // Center the image - reduce size on mobile to save memory
                          const isMobile = window.innerWidth < 640;
                          const maxImageWidth = isMobile ? 400 : 800;
                          img.scaleToWidth(Math.min(canvas.width || maxImageWidth, maxImageWidth));
                          img.set({
                            left: (canvas.width || 800) / 2 - (img.width || 0) * (img.scaleX || 1) / 2,
                            top: (canvas.height || 600) / 2 - (img.height || 0) * (img.scaleY || 1) / 2,
                            selectable: true,
                            evented: true,
                          });
                          // Ensure src is set with timeout
                          const setSrcTimeout = setTimeout(() => {
                            console.warn('Image setSrc timeout, rendering anyway');
                            canvas.add(img);
                            canvas.renderAll();
                          }, 3000);
                          
                          img.setSrc(imageUrl, () => {
                            clearTimeout(setSrcTimeout);
                            canvas.add(img);
                            canvas.renderAll();
                          }, { crossOrigin: 'anonymous' });
                        }
                      },
                      { crossOrigin: 'anonymous' }
                    );
                  };
                  
                  imgElement.onerror = () => {
                    clearTimeout(imageLoadTimeout);
                    console.error('Error loading image from URL:', imageUrl);
                    // Continue with empty canvas instead of hanging
                    try {
                      canvas.renderAll();
                    } catch (renderError) {
                      console.error('Error rendering canvas:', renderError);
                    }
                  };
                  
                  imgElement.src = imageUrl;
                } catch (error) {
                  console.error('Error loading image:', error);
                  // Continue with empty canvas instead of hanging
                  try {
                    canvas.renderAll();
                  } catch (renderError) {
                    console.error('Error rendering canvas:', renderError);
                  }
                }
              }, 100); // Delay 100ms เพื่อให้ canvas render ก่อน
              
              // Render canvas ว่างทันที (ไม่ต้องรอรูปภาพ)
              try {
                canvas.renderAll();
              } catch (renderError) {
                console.error('Error rendering canvas:', renderError);
              }
            }
            // If it's canvas JSON data
            else if (initialContent.canvas && !initialContent.type) {
              try {
                const canvasData = initialContent.canvas;
                
                // Restore canvas dimensions if saved - แต่จำกัดขนาดสูงสุดเพื่อป้องกัน memory issues
                if (canvasData.canvasWidth && canvasData.canvasHeight) {
                  const isMobile = window.innerWidth < 640;
                  const toolbarHeight = isMobile ? 180 : 120;
                  const availableHeight = Math.max(window.innerHeight - toolbarHeight, 400);
                  const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
                  const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
                  
                  // คำนวณขนาด canvas ที่ควรเป็นสำหรับ device ปัจจุบัน
                  const idealCanvasWidth = Math.min(
                    isMobile ? window.innerWidth * 2 : window.innerWidth * 3,
                    MAX_CANVAS_WIDTH
                  );
                  const idealCanvasHeight = Math.min(
                    isMobile ? availableHeight * 2 : availableHeight * 3,
                    MAX_CANVAS_HEIGHT
                  );
                  
                  // ถ้า canvas ที่บันทึกไว้เล็กกว่า ideal size มาก (เช่น จาก mobile มา desktop)
                  // ให้ใช้ ideal size แทน เพื่อให้พื้นที่วาดขยายกลับมา
                  const savedWidth = canvasData.canvasWidth;
                  const savedHeight = canvasData.canvasHeight;
                  const isSavedSizeTooSmall = savedWidth < idealCanvasWidth * 0.7 || savedHeight < idealCanvasHeight * 0.7;
                  
                  if (isSavedSizeTooSmall && !isMobile) {
                    // ใช้ ideal size สำหรับ desktop
                    canvas.setDimensions({
                      width: idealCanvasWidth,
                      height: idealCanvasHeight,
                    });
                    console.log(`Canvas size expanded to desktop size: ${idealCanvasWidth}x${idealCanvasHeight} (saved: ${savedWidth}x${savedHeight})`);
                  } else {
                    // จำกัดขนาดไม่ให้เกิน limit
                    const safeWidth = Math.min(savedWidth, MAX_CANVAS_WIDTH);
                    const safeHeight = Math.min(savedHeight, MAX_CANVAS_HEIGHT);
                    canvas.setDimensions({
                      width: safeWidth,
                      height: safeHeight,
                    });
                    console.log(`Canvas size restored: ${safeWidth}x${safeHeight} (original: ${savedWidth}x${savedHeight})`);
                  }
                }
                
                // Restore viewport transform if saved
                if (canvasData.viewportTransform) {
                  canvas.setViewportTransform(canvasData.viewportTransform);
                }
                
                // Load canvas data (remove custom properties before loading)
                const jsonData: any = { ...canvasData };
                delete jsonData.canvasWidth;
                delete jsonData.canvasHeight;
                delete jsonData.viewportTransform;
                
              // เพิ่ม timeout สำหรับ loadFromJSON (10 วินาที)
              const loadTimeout = setTimeout(() => {
                console.error('loadFromJSON timeout - rendering empty canvas');
                try {
                  canvas.renderAll();
                } catch (renderError) {
                  console.error('Error rendering canvas:', renderError);
                }
              }, 10000);
              
              try {
                canvas.loadFromJSON(
                    jsonData,
                  () => {
                    clearTimeout(loadTimeout);
                    // Success callback - render after loading
                    try {
                      // Render canvas ทันทีโดยไม่ต้องรอรูปภาพ (รูปภาพจะโหลดในพื้นหลัง)
                      try {
                        canvas.renderAll();
                      } catch (renderError) {
                        console.error('Error rendering canvas:', renderError);
                      }
                      
                      // Reload images in background (ไม่บล็อกการ render)
                      setTimeout(() => {
                        const objects = canvas.getObjects();
                        objects.forEach((obj: any) => {
                          if (obj.type === 'image') {
                            try {
                              // Get the image src if available
                              let imgSrc = (obj as any).src || (obj as any)._element?.src;
                              if (imgSrc) {
                                console.log('[Canvas] Original image src:', imgSrc.substring(0, 100));
                                // ถ้าเป็น relative path (ไม่ใช่ absolute URL) ให้เพิ่ม API_URL
                                if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://') && !imgSrc.startsWith('data:')) {
                                  // ถ้าไม่ขึ้นต้นด้วย / ให้เพิ่ม /
                                  if (!imgSrc.startsWith('/')) {
                                    imgSrc = '/' + imgSrc;
                                  }
                                  imgSrc = `${API_URL}${imgSrc}`;
                                  console.log('[Canvas] Converted relative image path to absolute URL:', imgSrc);
                                  console.log('[Canvas] API_URL:', API_URL);
                                } else {
                                  console.log('[Canvas] Image src is already absolute URL');
                                }
                                
                                // Reload the image in background (ไม่บล็อก)
                                const img = obj as fabric.Image;
                                // ใช้ setTimeout เพื่อไม่ให้บล็อกการ render
                                setTimeout(() => {
                                  try {
                                    const imageLoadTimeout = setTimeout(() => {
                                      console.warn('Image reload timeout:', imgSrc);
                                    }, 5000);
                                    
                                    img.setSrc(imgSrc, () => {
                                      clearTimeout(imageLoadTimeout);
                                      console.log('[Canvas] Image loaded successfully:', imgSrc.substring(0, 100));
                                      canvas.renderAll();
                                    }, { crossOrigin: 'anonymous' });
                                    
                                    // เพิ่ม error handler สำหรับ setSrc
                                    setTimeout(() => {
                                      const imgElement = img.getElement();
                                      if (imgElement) {
                                        imgElement.onerror = () => {
                                          console.error('[Canvas] Image failed to load:', imgSrc.substring(0, 100));
                                          clearTimeout(imageLoadTimeout);
                                        };
                                      }
                                    }, 100);
                                  } catch (e) {
                                    console.warn('Error reloading image:', e);
                                  }
                                }, 100);
                              }
                            } catch (e) {
                              console.warn('Error processing image:', e);
                            }
                          }
                          // Set strokeUniform for all objects with stroke to keep stroke width constant when zooming
                          if (obj.stroke && obj.strokeWidth) {
                            obj.set('strokeUniform', true);
                          }
                        });
                      }, 100);
                      
                      // Save initial state to history after loading
                      setTimeout(() => {
                        try {
                          const initialJson = JSON.stringify(canvas.toJSON());
                          setHistory([initialJson]);
                          historyIndexRef.current = 0;
                          setHistoryIndex(0);
                          console.log('Initial state saved to history');
                        } catch (e) {
                          console.warn('Error saving initial state:', e);
                        }
                      }, 100);
                    } catch (renderError) {
                      console.error('Error rendering after load:', renderError);
                      // Still try to render
                      try {
                        canvas.renderAll();
                      } catch (e) {
                        console.error('Error rendering canvas:', e);
                      }
                    }
                  }
                );
              } catch (loadError) {
                clearTimeout(loadTimeout);
                console.error('Error calling loadFromJSON:', loadError);
                // Continue with empty canvas instead of hanging
                try {
                  canvas.renderAll();
                } catch (renderError) {
                  console.error('Error rendering canvas:', renderError);
                }
              }
            } catch (loadError) {
              console.error('Error in loadFromJSON:', loadError);
              // If loadFromJSON throws, try to continue with empty canvas
              try {
                canvas.renderAll();
              } catch (renderError) {
                console.error('Error rendering canvas:', renderError);
                }
              }
            }
          } else {
            // Canvas not ready yet, retry with max retry count
            retryCount++;
            if (retryCount < maxRetries) {
              setTimeout(loadCanvasContent, 50);
            } else {
              console.error('Canvas failed to initialize after max retries');
              // Continue with empty canvas
              try {
                canvas.renderAll();
              } catch (renderError) {
                console.error('Error rendering canvas:', renderError);
              }
            }
          }
        });
      };

      // Start loading after canvas is initialized
      loadCanvasContent();
    } else {
      // No initial content - save empty state to history after canvas is ready
      setTimeout(() => {
        if (fabricCanvasRef.current) {
          const initialJson = JSON.stringify(fabricCanvasRef.current.toJSON());
          setHistory([initialJson]);
          historyIndexRef.current = 0;
          setHistoryIndex(0);
          console.log('Empty initial state saved to history');
        }
      }, 200);
    }

    // Track drawing state for free drawing tool
    canvas.on('path:created', (e: any) => {
      try {
        // If we're in delete mode, don't create any paths
        if (isDeletingRef.current) {
          canvas.remove(e.path);
          return;
        }
        
        const path = e.path;
        if (path && canvas.getContext()) {
          // Normal drawing
          path.set({
            stroke: canvas.freeDrawingBrush.color,
            strokeWidth: canvas.freeDrawingBrush.width,
            fill: '',
            strokeUniform: true, // Keep stroke width constant when zooming
          });
          canvas.renderAll();
        }
      } catch (error) {
        console.error('Error handling path creation:', error);
      }
    });

    // Handle mouse:down for text, rect, and circle tools using fabric.js events
    let isDrawingShapeFabric = false;
    let shapeStartPointFabric: { x: number; y: number } | null = null;
    let currentShapeFabric: fabric.Rect | fabric.Circle | fabric.Line | fabric.Group | null = null;
    let currentArrowhead: fabric.Path | null = null;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      const currentTool = (window as any).__currentTool || 'select';
      
      // Track drawing state for free drawing tool
      if (currentTool === 'draw') {
        setIsDrawing(true);
      }
      
      // Handle text tool
      if (currentTool === 'text') {
        // Don't handle if clicking on an existing object (let it be selected)
        if (opt.target && opt.target !== canvas) {
          return;
        }
        
        // Prevent default behavior
        evt.preventDefault();
        evt.stopPropagation();
        
        const pointer = canvas.getPointer(evt);
        
        const text = new fabric.IText('คลิกเพื่อแก้ไข', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: (window as any).__fontFamily || 'Arial',
          fontSize: (window as any).__fontSize || 20,
          fill: (window as any).__drawingColor || '#000000',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        // Save state will be called by object:added event listener
        // Switch back to select tool
        (window as any).__currentTool = 'select';
        if ((window as any).__setTool) {
          (window as any).__setTool('select');
        }
      }
      // Handle rect, circle, line, arrow, and highlight tools
      else if (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'line' || currentTool === 'arrow' || currentTool === 'highlight') {
        // Don't handle if clicking on an existing object
        if (opt.target && opt.target !== canvas) {
          return;
        }
        
        // Track drawing state for shape tools
        setIsDrawingShape(true);
        
        evt.preventDefault();
        evt.stopPropagation();
        
        const pointer = canvas.getPointer(evt);
        isDrawingShapeFabric = true;
        shapeStartPointFabric = pointer;
        
        if (currentTool === 'rect') {
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: (window as any).__drawingColor || '#000000',
            strokeWidth: (window as any).__drawingWidth || 2,
            strokeUniform: true,
            selectable: false,
            evented: false,
          });
          canvas.add(rect);
          currentShapeFabric = rect;
        } else if (currentTool === 'circle') {
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: 'transparent',
            stroke: (window as any).__drawingColor || '#000000',
            strokeWidth: (window as any).__drawingWidth || 2,
            strokeUniform: true,
            selectable: false,
            evented: false,
          });
          canvas.add(circle);
          currentShapeFabric = circle;
        } else if (currentTool === 'line' || currentTool === 'arrow') {
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: (window as any).__drawingColor || '#000000',
            strokeWidth: (window as any).__drawingWidth || 2,
            strokeUniform: true,
            selectable: false,
            evented: false,
          });
          canvas.add(line);
          currentShapeFabric = line;
          
          // For arrow, create arrowhead path
          if (currentTool === 'arrow') {
            const strokeWidth = (window as any).__drawingWidth || 2;
            const arrowhead = new fabric.Path(`M ${pointer.x} ${pointer.y} L ${pointer.x} ${pointer.y} M ${pointer.x} ${pointer.y} L ${pointer.x} ${pointer.y}`, {
              stroke: (window as any).__drawingColor || '#000000',
              strokeWidth: strokeWidth,
              strokeUniform: true,
              fill: '',
              selectable: false,
              evented: false,
            });
            canvas.add(arrowhead);
            currentArrowhead = arrowhead;
          }
        } else if (currentTool === 'highlight') {
          // Highlight is a semi-transparent rectangle
          const highlight = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: (window as any).__drawingColor || '#ffff00',
            opacity: 0.3,
            stroke: 'transparent',
            selectable: false,
            evented: false,
          });
          canvas.add(highlight);
          currentShapeFabric = highlight;
        }
        canvas.renderAll();
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (!isDrawingShapeFabric || !shapeStartPointFabric || !currentShapeFabric) return;
      
      const pointer = canvas.getPointer(opt.e);
      const startX = shapeStartPointFabric.x;
      const startY = shapeStartPointFabric.y;
      const currentTool = (window as any).__currentTool || 'select';
      
      if (currentTool === 'rect' && currentShapeFabric instanceof fabric.Rect) {
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);
        const left = Math.min(startX, pointer.x);
        const top = Math.min(startY, pointer.y);
        
        currentShapeFabric.set({
          left: left,
          top: top,
          width: width,
          height: height,
        });
        canvas.renderAll();
      } else if (currentTool === 'circle' && currentShapeFabric instanceof fabric.Circle) {
        const radius = Math.sqrt(
          Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
        ) / 2;
        const left = (startX + pointer.x) / 2;
        const top = (startY + pointer.y) / 2;
        
        currentShapeFabric.set({
          left: left,
          top: top,
          radius: radius,
        });
        canvas.renderAll();
      } else if ((currentTool === 'line' || currentTool === 'arrow') && currentShapeFabric instanceof fabric.Line) {
        currentShapeFabric.set({
          x1: startX,
          y1: startY,
          x2: pointer.x,
          y2: pointer.y,
        });
        
        // Update arrowhead if it exists
        if (currentTool === 'arrow' && currentArrowhead) {
          const x1 = startX;
          const y1 = startY;
          const x2 = pointer.x;
          const y2 = pointer.y;
          
          // Get stroke width from line
          const strokeWidth = currentShapeFabric.strokeWidth || (window as any).__drawingWidth || 2;
          
          // Calculate arrowhead points - size based on stroke width
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowLength = Math.max(15, strokeWidth * 3); // Minimum 15, scale with stroke width
          const arrowAngle = Math.PI / 6; // 30 degrees
          
          const arrowX1 = x2 - arrowLength * Math.cos(angle - arrowAngle);
          const arrowY1 = y2 - arrowLength * Math.sin(angle - arrowAngle);
          const arrowX2 = x2 - arrowLength * Math.cos(angle + arrowAngle);
          const arrowY2 = y2 - arrowLength * Math.sin(angle + arrowAngle);
          
          // Update arrowhead path and stroke width
          currentArrowhead.path = [
            ['M', x2, y2],
            ['L', arrowX1, arrowY1],
            ['M', x2, y2],
            ['L', arrowX2, arrowY2]
          ];
          currentArrowhead.set({
            strokeWidth: strokeWidth,
          });
          currentArrowhead.setCoords();
        }
        
        canvas.renderAll();
      } else if (currentTool === 'highlight' && currentShapeFabric instanceof fabric.Rect) {
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);
        const left = Math.min(startX, pointer.x);
        const top = Math.min(startY, pointer.y);
        
        currentShapeFabric.set({
          left: left,
          top: top,
          width: width,
          height: height,
        });
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      const currentTool = (window as any).__currentTool || 'select';
      
      // Track drawing state for free drawing tool
      if (currentTool === 'draw') {
        // Delay a bit to ensure path:created has finished
        setTimeout(() => {
          setIsDrawing(false);
        }, 100);
      }
      
      if (isDrawingShapeFabric && currentShapeFabric) {
        
        // For arrow tool, group line and arrowhead together
        if (currentTool === 'arrow' && currentShapeFabric instanceof fabric.Line && currentArrowhead) {
          const line = currentShapeFabric;
          
          // Create a group with line and arrowhead
          const arrowGroup = new fabric.Group([line, currentArrowhead], {
            selectable: true,
            evented: true,
          });
          
          // Remove the original objects and add the group
          canvas.remove(line);
          canvas.remove(currentArrowhead);
          canvas.add(arrowGroup);
          canvas.setActiveObject(arrowGroup);
          currentShapeFabric = arrowGroup as any;
          currentArrowhead = null;
        } else {
          // Make shape selectable and finish drawing
          currentShapeFabric.set({
            selectable: true,
            evented: true,
          });
          canvas.setActiveObject(currentShapeFabric);
        }
        
        canvas.renderAll();
        // Save state will be called by object:modified event listener
        
        // Switch back to select tool
        (window as any).__currentTool = 'select';
        if ((window as any).__setTool) {
          (window as any).__setTool('select');
        }
        
        // Reset drawing state
        isDrawingShapeFabric = false;
        shapeStartPointFabric = null;
        currentShapeFabric = null;
        currentArrowhead = null;
        setIsDrawingShape(false);
      }
    });

    // Store tool state in window for fabric.js event handlers
    (window as any).__currentTool = tool;
    (window as any).__setTool = setTool;
    (window as any).__fontFamily = fontFamily;
    (window as any).__fontSize = fontSize;
    (window as any).__drawingColor = drawingColor;
    (window as any).__drawingWidth = drawingWidth;

    // Handle object selection - removed tool check as it causes issues
    // Tool mode is handled in separate useEffect

    // Handle window resize - keep canvas large, only adjust viewport
    const handleResize = () => {
      if (canvas && canvas.getContext()) {
        try {
          // Keep canvas large, viewport will be handled by CSS
          // Canvas size stays large for infinite canvas effect
          const isMobile = window.innerWidth < 640; // sm breakpoint
          const toolbarHeight = isMobile ? 180 : 120;
          const availableHeight = Math.max(window.innerHeight - toolbarHeight, 400);
          // Reduce canvas size on mobile to save memory - จำกัดขนาดสูงสุด
          const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
          const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
          const canvasWidth = Math.min(
            isMobile ? window.innerWidth * 2 : window.innerWidth * 3,
            MAX_CANVAS_WIDTH
          );
          const canvasHeight = Math.min(
            isMobile ? availableHeight * 2 : availableHeight * 3,
            MAX_CANVAS_HEIGHT
          );
          
          // Resize canvas when switching between mobile and desktop
          // หรือเมื่อขนาดแตกต่างกันมาก (เช่น canvas จาก mobile มา desktop)
          const currentWidth = canvas.width || 0;
          const currentHeight = canvas.height || 0;
          const widthDiff = Math.abs(currentWidth - canvasWidth);
          const heightDiff = Math.abs(currentHeight - canvasHeight);
          
          // Resize if:
          // 1. Size difference is significant (> 100px)
          // 2. OR current canvas is too small for desktop (e.g., from mobile < 2000px when desktop needs 3000px)
          const isCurrentSizeTooSmall = !isMobile && currentWidth < 2000 && canvasWidth >= 2500;
          
          if ((widthDiff > 100 || heightDiff > 100 || isCurrentSizeTooSmall) &&
              canvasWidth <= MAX_CANVAS_WIDTH && canvasHeight <= MAX_CANVAS_HEIGHT) {
            canvas.setDimensions({
              width: canvasWidth,
              height: canvasHeight,
            });
            canvas.renderAll();
            console.log(`Canvas resized: ${currentWidth}x${currentHeight} -> ${canvasWidth}x${canvasHeight} (isMobile: ${isMobile})`);
          }
        } catch (error) {
          console.error('Error resizing canvas:', error);
        }
      }
    };

    // Handle paste from clipboard (external images only)
    // This handles paste events from external sources (like screenshots, copied images)
    // Internal fabricClipboard objects are handled by handlePasteObjects via Ctrl+V
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle if there's no fabricClipboard (to avoid conflicts)
      const fabricClipboard = (window as any).fabricClipboard;
      if (fabricClipboard) {
        // If we have a fabricClipboard, let Ctrl+V handler deal with it
        // Don't process external paste
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      // Check for images in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          const file = item.getAsFile();
          if (file) {
            try {
              await handleImageUpload(file);
            } catch (error) {
              console.error('Error pasting image:', error);
            }
          }
          return;
        }
      }
    };

    // Handle drop files on canvas - removed, handled in component level

    // Handle keyboard shortcuts - all handled at component level
    // Prevent page scroll when middle mouse button is pressed
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (e.button === 1 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        // Only prevent if clicking on or near canvas
        if (x >= rect.left - 50 && x <= rect.right + 50 && y >= rect.top - 50 && y <= rect.bottom + 50) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleDocumentMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDocumentAuxClick = (e: MouseEvent) => {
      if (e.button === 1 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        // Only prevent if clicking on or near canvas
        if (x >= rect.left - 50 && x <= rect.right + 50 && y >= rect.top - 50 && y <= rect.bottom + 50) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('paste', handlePaste);
    // Note: drop and keydown are handled at component level, not here
    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('auxclick', handleDocumentAuxClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('paste', handlePaste);
      // keydown is handled at component level
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      document.removeEventListener('auxclick', handleDocumentAuxClick);
      canvas.dispose();
    };
  }, [handleImageUpload]); // Removed 'tool' from dependencies to prevent canvas recreation

  // Debounced save state to improve performance
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    // Don't save state if we're currently undoing/redoing
    if (isUndoRedoingRef.current) {
      console.log('Skipping save state - undo/redo in progress');
      return;
    }
    
    // Clear existing timeout
    if (saveStateTimeoutRef.current) {
      clearTimeout(saveStateTimeoutRef.current);
    }
    
    // Debounce save state to avoid too frequent saves
    saveStateTimeoutRef.current = setTimeout(() => {
      if (!fabricCanvasRef.current) return;
      
      // Double check - don't save if undo/redo started during timeout
      if (isUndoRedoingRef.current) {
        console.log('Skipping save state - undo/redo started during timeout');
        return;
      }
      
      try {
        const json = JSON.stringify(fabricCanvasRef.current.toJSON());
        console.log('Saving state to history...');
        // Use functional updates to get current state
        setHistory((prev) => {
          const currentIndex = historyIndexRef.current;
          const newHistory = prev.slice(0, currentIndex + 1);
          newHistory.push(json);
          // Reduce history size on mobile to save memory
          const isMobile = window.innerWidth < 640;
          const maxHistory = isMobile ? 20 : 50;
          if (newHistory.length > maxHistory) {
            newHistory.shift();
          }
          // Update index to point to the new state
          const newIndex = newHistory.length - 1;
          historyIndexRef.current = newIndex;
          setHistoryIndex(newIndex);
          console.log('State saved, history length:', newHistory.length, 'index:', newIndex);
          return newHistory;
        });
      } catch (error) {
        console.error('Error saving state:', error);
      }
    }, 100); // Debounce 100ms
  }, []); // Remove historyIndex from dependencies to avoid recreation

  // Undo/Redo functions - optimized for performance
  const handleUndo = useCallback(() => {
    if (!fabricCanvasRef.current) {
      console.log('Undo: Canvas not available');
      return;
    }
    
    try {
      // Clear any pending save state first
      if (saveStateTimeoutRef.current) {
        clearTimeout(saveStateTimeoutRef.current);
        saveStateTimeoutRef.current = null;
      }
      
      // Set flag to prevent saving state during undo
      isUndoRedoingRef.current = true;
      
      // Get history state directly using functional update
      setHistory((prev) => {
        const currentIndex = historyIndexRef.current;
        console.log('Undo: currentIndex =', currentIndex, 'history length =', prev.length);
        
        // Check if we can undo (need at least 2 states: current and previous)
        if (currentIndex <= 0 || prev.length <= 1) {
          console.log('Undo: Cannot undo - currentIndex =', currentIndex, 'history length =', prev.length);
          isUndoRedoingRef.current = false;
          return prev; // Can't undo
        }
        
        const newIndex = currentIndex - 1;
        console.log('Undo: newIndex =', newIndex);
        
        if (prev[newIndex]) {
          console.log('Undo: Loading state from index', newIndex);
          
          // Load state asynchronously to avoid blocking
          setTimeout(() => {
            if (!fabricCanvasRef.current) {
              isUndoRedoingRef.current = false;
              return;
            }
            
            try {
              const stateToLoad = prev[newIndex];
              fabricCanvasRef.current.loadFromJSON(stateToLoad, () => {
                if (fabricCanvasRef.current) {
                  fabricCanvasRef.current.renderAll();
                  historyIndexRef.current = newIndex;
                  setHistoryIndex(newIndex);
                  console.log('Undo: Successfully loaded state, new index =', newIndex);
                  
                  // Reset flag after a short delay to allow events to settle
                  setTimeout(() => {
                    isUndoRedoingRef.current = false;
                  }, 150);
                } else {
                  isUndoRedoingRef.current = false;
                }
              }, (o: any, object: any) => {
                // Reviver function to handle any custom properties
                return object;
              });
            } catch (loadError) {
              console.error('Error loading state in undo:', loadError);
              isUndoRedoingRef.current = false;
            }
          }, 0);
        } else {
          console.log('Undo: No state at index', newIndex);
          isUndoRedoingRef.current = false;
        }
        
        return prev;
      });
    } catch (error) {
      console.error('Error undoing:', error);
      isUndoRedoingRef.current = false;
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (!fabricCanvasRef.current) {
      console.log('Redo: Canvas not available');
      return;
    }
    
    try {
      // Clear any pending save state first
      if (saveStateTimeoutRef.current) {
        clearTimeout(saveStateTimeoutRef.current);
        saveStateTimeoutRef.current = null;
      }
      
      // Set flag to prevent saving state during redo
      isUndoRedoingRef.current = true;
      
      // Get current history state
      setHistory((prev) => {
        const currentIndex = historyIndexRef.current;
        console.log('Redo: currentIndex =', currentIndex, 'history length =', prev.length);
        
        // Check if we can redo (need to have a next state)
        if (currentIndex >= prev.length - 1 || prev.length === 0) {
          console.log('Redo: Cannot redo - currentIndex =', currentIndex, 'history length =', prev.length);
          isUndoRedoingRef.current = false;
          return prev; // Can't redo
        }
        
        const newIndex = currentIndex + 1;
        console.log('Redo: newIndex =', newIndex);
        
        if (prev[newIndex]) {
          console.log('Redo: Loading state from index', newIndex);
          
          // Update index immediately to prevent multiple redo calls
          historyIndexRef.current = newIndex;
          setHistoryIndex(newIndex);
          
          // Load state asynchronously to avoid blocking
          setTimeout(() => {
            if (!fabricCanvasRef.current) {
              isUndoRedoingRef.current = false;
              return;
            }
            
            try {
              const stateToLoad = prev[newIndex];
              fabricCanvasRef.current.loadFromJSON(stateToLoad, () => {
                if (fabricCanvasRef.current) {
                  fabricCanvasRef.current.renderAll();
                  // Ensure index is set correctly
                  historyIndexRef.current = newIndex;
                  setHistoryIndex(newIndex);
                  console.log('Redo: Successfully loaded state, new index =', newIndex);
                  
                  // Reset flag after a short delay to allow events to settle
                  setTimeout(() => {
                    isUndoRedoingRef.current = false;
                  }, 150);
                } else {
                  isUndoRedoingRef.current = false;
                }
              }, (o: any, object: any) => {
                // Reviver function to handle any custom properties
                return object;
              });
            } catch (loadError) {
              console.error('Error loading state in redo:', loadError);
              isUndoRedoingRef.current = false;
              // Revert index on error
              historyIndexRef.current = currentIndex;
              setHistoryIndex(currentIndex);
            }
          }, 0);
        } else {
          console.log('Redo: No state at index', newIndex);
          isUndoRedoingRef.current = false;
        }
        
        return prev;
      });
    } catch (error) {
      console.error('Error redoing:', error);
      isUndoRedoingRef.current = false;
    }
  }, []);

  // Copy/Paste functions
  const handleCopy = useCallback(() => {
    console.log('handleCopy called');
    if (!fabricCanvasRef.current) {
      console.warn('Canvas not available');
      return;
    }
    const activeObject = fabricCanvasRef.current.getActiveObject();
    console.log('Active object in handleCopy:', activeObject ? { type: activeObject.type } : 'none');
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการ copy ก่อน');
      return;
    }
    
    try {
      // For image objects, we need to store the image source separately
      if (activeObject.type === 'image') {
        const img = activeObject as fabric.Image;
        try {
          // Get image element to check if loaded
          const imgElement = img.getElement();
          
          // First, try to get the original image source
          let dataURL: string | null = null;
          
          // Method 1: Try to get from image element src (most reliable)
          if (imgElement && imgElement.src) {
            // Check if it's already a data URL
            if (imgElement.src.startsWith('data:')) {
              dataURL = imgElement.src;
            } else {
              // For external images, we need to convert to data URL
              // Create a temporary canvas to draw the image
              try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgElement.naturalWidth || img.width || 100;
                tempCanvas.height = imgElement.naturalHeight || img.height || 100;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                  tempCtx.drawImage(imgElement, 0, 0);
                  dataURL = tempCanvas.toDataURL('image/png');
                }
              } catch (canvasErr) {
                console.warn('Canvas conversion failed, trying toDataURL:', canvasErr);
              }
            }
          }
          
          // Method 2: Try fabric.js toDataURL
          if (!dataURL || dataURL === 'data:,') {
            try {
              dataURL = img.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
            } catch (err) {
              console.warn('toDataURL failed:', err);
            }
          }
          
          // Method 3: Try to get from fabric canvas
          if (!dataURL || dataURL === 'data:,') {
            try {
              const lowerCanvasEl = (fabricCanvasRef.current as any)?.lowerCanvasEl;
              if (lowerCanvasEl) {
                // Get the bounding box of the image
                const boundingRect = img.getBoundingRect();
                const ctx = lowerCanvasEl.getContext('2d');
                if (ctx) {
                  // Create a temporary canvas with the image dimensions
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = boundingRect.width;
                  tempCanvas.height = boundingRect.height;
                  const tempCtx = tempCanvas.getContext('2d');
                  if (tempCtx) {
                    // Draw the image from the main canvas
                    tempCtx.drawImage(
                      lowerCanvasEl,
                      boundingRect.left,
                      boundingRect.top,
                      boundingRect.width,
                      boundingRect.height,
                      0,
                      0,
                      boundingRect.width,
                      boundingRect.height
                    );
                    dataURL = tempCanvas.toDataURL('image/png');
                  }
                }
              }
            } catch (err) {
              console.warn('Canvas extraction failed:', err);
            }
          }
          
          // Method 4: If still no dataURL, try to use the image element src directly
          // (even if it's not a data URL, we can try to load it later)
          if (!dataURL || dataURL === 'data:,') {
            if (imgElement && imgElement.src) {
              dataURL = imgElement.src;
            }
          }
          
          if (dataURL && dataURL !== 'data:,') {
            // Verify dataURL is valid
            const isValidDataURL = dataURL.startsWith('data:') || 
                                   dataURL.startsWith('http://') || 
                                   dataURL.startsWith('https://') || 
                                   dataURL.startsWith('blob:');
            
            if (!isValidDataURL) {
              console.warn('DataURL format may be invalid:', dataURL.substring(0, 100));
              // Try to fix it - if it looks like base64, add data: prefix
              if (dataURL.length > 100 && !dataURL.includes(' ')) {
                // Might be base64 without prefix, try adding it
                dataURL = 'data:image/png;base64,' + dataURL;
                console.log('Attempted to fix dataURL by adding prefix');
              }
            }
            
            // Verify dataURL is long enough to be valid (at least 100 chars for a tiny image)
            if (dataURL.length < 100) {
              console.error('DataURL too short, may be invalid');
              alert('ไม่สามารถ copy รูปภาพได้ - ข้อมูลรูปภาพไม่ถูกต้อง');
              return;
            }
            
            // Store the image data URL and properties
            (window as any).fabricClipboard = {
              type: 'image',
              src: dataURL,
              left: activeObject.left || 0,
              top: activeObject.top || 0,
              scaleX: activeObject.scaleX || 1,
              scaleY: activeObject.scaleY || 1,
              angle: activeObject.angle || 0,
              flipX: activeObject.flipX || false,
              flipY: activeObject.flipY || false,
              opacity: activeObject.opacity !== undefined ? activeObject.opacity : 1,
              width: img.width || 0,
              height: img.height || 0,
            };
            console.log('Copied image to clipboard:', { 
              hasDataURL: !!dataURL, 
              dataURLLength: dataURL?.length,
              dataURLStart: dataURL?.substring(0, 50),
              isValid: isValidDataURL,
              width: img.width,
              height: img.height,
              scaleX: activeObject.scaleX,
              scaleY: activeObject.scaleY
            });
        } else {
            console.error('Failed to get image data URL');
            alert('ไม่สามารถ copy รูปภาพได้ (รูปภาพยังไม่โหลดเสร็จหรือไม่สามารถเข้าถึงได้)');
          }
        } catch (err) {
          console.error('Error copying image:', err);
          alert('ไม่สามารถ copy รูปภาพได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      } else {
        // For other objects, use normal clone
        // Only update clipboard after clone is successful
        activeObject.clone((cloned: fabric.Object) => {
          if (cloned) {
          (window as any).fabricClipboard = cloned;
          console.log('Copied object to clipboard');
          } else {
            console.error('Clone returned null');
            alert('ไม่สามารถ copy object ได้');
          }
        });
      }
    } catch (error: any) {
      console.error('Error copying:', error);
      alert(`ไม่สามารถ copy ได้: ${error.message || 'Unknown error'}`);
    }
  }, []);

  const handlePasteObjects = useCallback(() => {
    if (!fabricCanvasRef.current) {
      console.warn('Canvas not available');
      return;
    }
    
    // Get fresh clipboard reference (don't cache it)
    const clipboard = (window as any).fabricClipboard;
    if (!clipboard) {
      alert('ไม่มีข้อมูลใน clipboard กรุณา copy object ก่อน');
      return;
    }

    const canvas = fabricCanvasRef.current;
    
    // Log for debugging
    console.log('Pasting clipboard:', clipboard.type || 'object');

    try {
      // Handle image objects specially
      if (clipboard.type === 'image' && clipboard.src) {
        // Ensure canvas is ready
        if (!canvas || !canvas.getContext()) {
          throw new Error('Canvas ยังไม่พร้อม');
        }
        
        // Log clipboard data for debugging
        console.log('Pasting image from clipboard:', {
          hasSrc: !!clipboard.src,
          srcType: clipboard.src?.substring(0, 50),
          srcLength: clipboard.src?.length,
          width: clipboard.width,
          height: clipboard.height
        });
        
        // Create a new Image element first to ensure it loads properly
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';
        
        // Helper function to apply properties
        const applyImageProperties = (loadedImgElement: HTMLImageElement) => {
          try {
            if (!loadedImgElement || loadedImgElement.naturalWidth === 0 || loadedImgElement.naturalHeight === 0) {
              console.error('Invalid image element');
              alert('ไม่สามารถโหลดรูปภาพได้ - รูปภาพไม่ถูกต้อง');
              return;
            }
            
            console.log('Creating fabric.Image from loaded element:', {
              width: loadedImgElement.naturalWidth,
              height: loadedImgElement.naturalHeight,
              src: loadedImgElement.src.substring(0, 50)
            });
            
            // Create fabric.Image from the loaded image element's src
            // Use fromURL and wait for it to fully load
            fabric.Image.fromURL(
              loadedImgElement.src,
              (fabricImg: fabric.Image) => {
                if (!fabricImg) {
                  console.error('Failed to create fabric.Image from URL');
                  alert('ไม่สามารถสร้างรูปภาพจาก clipboard ได้');
                  return;
                }
                
                console.log('Fabric image created, checking element...');
                
                // Wait for fabric image element to be ready
                const fabricElement = fabricImg.getElement();
                const checkAndAdd = () => {
                  if (fabricElement && fabricElement.complete && fabricElement.naturalWidth > 0 && fabricElement.naturalHeight > 0) {
                    console.log('Fabric image element ready:', {
                      width: fabricElement.naturalWidth,
                      height: fabricElement.naturalHeight
                    });
                    
                    // Set properties after creation
                    fabricImg.set({
                      left: (clipboard.left || 0) + 20,
                      top: (clipboard.top || 0) + 20,
                      scaleX: clipboard.scaleX || 1,
                      scaleY: clipboard.scaleY || 1,
                      angle: clipboard.angle || 0,
                      flipX: clipboard.flipX || false,
                      flipY: clipboard.flipY || false,
                      opacity: clipboard.opacity !== undefined ? clipboard.opacity : 1,
                      selectable: true,
                      evented: true,
                      hasControls: true,
                      hasBorders: true,
                    });
                    
                    // If width/height were stored, apply them
                    if (clipboard.width && clipboard.height) {
                      const targetWidth = clipboard.width * (clipboard.scaleX || 1);
                      if (targetWidth > 0) {
                        fabricImg.scaleToWidth(targetWidth);
                      }
                    }
                    
                    console.log('Adding image to canvas...');
                    canvas.add(fabricImg);
                    canvas.setActiveObject(fabricImg);
                    canvas.renderAll();
                    saveState();
                    console.log('Pasted image from clipboard - successfully added');
                  } else {
                    console.log('Fabric image element not ready yet, waiting...', {
                      exists: !!fabricElement,
                      complete: fabricElement?.complete,
                      naturalWidth: fabricElement?.naturalWidth,
                      naturalHeight: fabricElement?.naturalHeight
                    });
                    // Wait a bit more
                    setTimeout(checkAndAdd, 100);
                  }
                };
                
                if (fabricElement) {
                  if (fabricElement.complete && fabricElement.naturalWidth > 0 && fabricElement.naturalHeight > 0) {
                    checkAndAdd();
                  } else {
                    fabricElement.onload = checkAndAdd;
                    fabricElement.onerror = () => {
                      console.error('Fabric image element failed to load');
                      alert('ไม่สามารถโหลดรูปภาพได้');
                    };
                    // Also set timeout
                    setTimeout(checkAndAdd, 2000);
                  }
                } else {
                  // No element yet, wait a bit
                  setTimeout(checkAndAdd, 200);
                }
              },
              { crossOrigin: 'anonymous' }
            );
          } catch (err) {
            console.error('Error in applyImageProperties:', err);
            alert('เกิดข้อผิดพลาดในการวางรูปภาพ: ' + (err instanceof Error ? err.message : 'Unknown error'));
          }
        };
        
        // Set up load handler before setting src
        imgElement.onload = () => {
          console.log('Image element loaded:', {
            complete: imgElement.complete,
            naturalWidth: imgElement.naturalWidth,
            naturalHeight: imgElement.naturalHeight,
            src: imgElement.src.substring(0, 50)
          });
          
          if (imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
            console.error('Image loaded but has no dimensions');
            alert('ไม่สามารถโหลดรูปภาพได้ - รูปภาพไม่ถูกต้อง');
            return;
          }
          
          // Apply properties using the loaded image element
          applyImageProperties(imgElement);
        };
        
        imgElement.onerror = (err) => {
          console.error('Error loading image element:', err);
          console.log('Image src that failed:', clipboard.src?.substring(0, 100));
          
          // Fallback: try fabric.Image.fromURL directly
          console.log('Trying fallback method with fabric.Image.fromURL...');
          fabric.Image.fromURL(
            clipboard.src,
            (img: fabric.Image) => {
              if (!img) {
                alert('ไม่สามารถโหลดรูปภาพได้');
                return;
              }
              
              // Wait for fabric image to load
              const fabricElement = img.getElement();
              if (fabricElement) {
                const checkAndAdd = () => {
                  if (fabricElement.complete && fabricElement.naturalWidth > 0 && fabricElement.naturalHeight > 0) {
                    const pointer = canvas.getPointer({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as any);
                    
                    img.set({
                      left: (clipboard.left || pointer.x || 0) + 20,
                      top: (clipboard.top || pointer.y || 0) + 20,
                      scaleX: clipboard.scaleX || 1,
                      scaleY: clipboard.scaleY || 1,
                      angle: clipboard.angle || 0,
                      flipX: clipboard.flipX || false,
                      flipY: clipboard.flipY || false,
                      opacity: clipboard.opacity !== undefined ? clipboard.opacity : 1,
                      selectable: true,
                      evented: true,
                      hasControls: true,
                      hasBorders: true,
                    });
                    
                    if (clipboard.width && clipboard.height) {
                      const targetWidth = clipboard.width * (clipboard.scaleX || 1);
                      if (targetWidth > 0) {
                        img.scaleToWidth(targetWidth);
                      }
                    }
                    
                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                    saveState();
                    console.log('Pasted image from clipboard (fallback method)');
                  } else {
                    setTimeout(checkAndAdd, 100);
                  }
                };
                
                if (fabricElement.complete && fabricElement.naturalWidth > 0 && fabricElement.naturalHeight > 0) {
                  checkAndAdd();
                } else {
                  fabricElement.onload = checkAndAdd;
                  setTimeout(checkAndAdd, 2000);
                }
              } else {
                setTimeout(() => {
                  const pointer = canvas.getPointer({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as any);
                  img.set({
                    left: (clipboard.left || pointer.x || 0) + 20,
                    top: (clipboard.top || pointer.y || 0) + 20,
                    scaleX: clipboard.scaleX || 1,
                    scaleY: clipboard.scaleY || 1,
                    angle: clipboard.angle || 0,
                    flipX: clipboard.flipX || false,
                    flipY: clipboard.flipY || false,
                    opacity: clipboard.opacity !== undefined ? clipboard.opacity : 1,
                    selectable: true,
                    evented: true,
                    hasControls: true,
                    hasBorders: true,
                  });
                  canvas.add(img);
                  canvas.setActiveObject(img);
                  canvas.renderAll();
                  saveState();
                }, 500);
              }
            },
            { crossOrigin: 'anonymous' }
          );
        };
        
        // Set src to trigger load
        imgElement.src = clipboard.src;
      } else if (clipboard.clone && typeof clipboard.clone === 'function') {
        // For other objects, use normal clone - ALWAYS clone fresh
        // Get the current clipboard object (may be the same reference)
        const clipboardObj = clipboard as fabric.Object;
        
        // Clone it to create a new instance
        clipboardObj.clone((cloned: fabric.Object) => {
          if (!cloned) {
            throw new Error('ไม่สามารถ clone object ได้');
          }
          
          // Get pointer position for offset
          const pointer = canvas.getPointer({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as any);
          
          cloned.set({
            left: (cloned.left || pointer.x || 0) + 20,
            top: (cloned.top || pointer.y || 0) + 20,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.renderAll();
          saveState();
          console.log('Pasted cloned object from clipboard');
        });
      } else if (clipboard && clipboard.type) {
        // Try to clone if it's a fabric object but doesn't have clone method accessible
        // This handles edge cases
        try {
          const clipboardObj = clipboard as any;
          if (typeof clipboardObj.clone === 'function') {
            clipboardObj.clone((cloned: fabric.Object) => {
              if (!cloned) {
                throw new Error('ไม่สามารถ clone object ได้');
              }
              const pointer = canvas.getPointer({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as any);
              
              cloned.set({
                left: (cloned.left || pointer.x || 0) + 20,
                top: (cloned.top || pointer.y || 0) + 20,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
              });
              canvas.add(cloned);
              canvas.setActiveObject(cloned);
          canvas.renderAll();
          saveState();
              console.log('Pasted object from clipboard (fallback clone)');
            });
        } else {
            throw new Error('รูปแบบข้อมูลใน clipboard ไม่รองรับ - ไม่สามารถ clone ได้');
          }
        } catch (err) {
          console.error('Error cloning clipboard object:', err);
          throw new Error('รูปแบบข้อมูลใน clipboard ไม่รองรับ');
        }
      } else {
        throw new Error('รูปแบบข้อมูลใน clipboard ไม่รองรับ');
      }
    } catch (error: any) {
      console.error('Error pasting:', error);
      alert(`ไม่สามารถ paste ได้: ${error.message || 'Unknown error'}`);
    }
  }, [saveState]);

  const handleDuplicate = useCallback(() => {
    if (!fabricCanvasRef.current) {
      console.warn('Canvas not available');
      return;
    }
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการ duplicate ก่อน');
      return;
    }

    const canvas = fabricCanvasRef.current;

    try {
      // Handle image objects specially - use same method as copy to preserve quality
      if (activeObject.type === 'image') {
        const img = activeObject as fabric.Image;
        const imgElement = img.getElement();
        
        // Get image source - prefer original src over toDataURL to avoid quality loss
        let dataURL: string | null = null;
        
        if (imgElement && imgElement.src) {
          if (imgElement.src.startsWith('data:')) {
            dataURL = imgElement.src;
          } else {
            // For external images, try to get original src first
            dataURL = imgElement.src;
          }
        }
        
        // Fallback to toDataURL with higher multiplier to preserve quality
        if (!dataURL || dataURL === 'data:,') {
          try {
            // Use higher multiplier to preserve image quality
            dataURL = img.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
          } catch (err) {
            console.warn('toDataURL failed:', err);
          }
        }
        
        if (dataURL && dataURL !== 'data:,') {
          fabric.Image.fromURL(
            dataURL,
            (clonedImg: fabric.Image) => {
              if (!clonedImg) {
                throw new Error('ไม่สามารถสร้างรูปภาพซ้ำได้');
              }
              
              // Wait for image to load
              const clonedElement = clonedImg.getElement();
              if (clonedElement) {
                const applyProperties = () => {
                  clonedImg.set({
                    left: (activeObject.left || 0) + 20,
                    top: (activeObject.top || 0) + 20,
                    scaleX: activeObject.scaleX || 1,
                    scaleY: activeObject.scaleY || 1,
                    angle: activeObject.angle || 0,
                    flipX: activeObject.flipX || false,
                    flipY: activeObject.flipY || false,
                    opacity: activeObject.opacity !== undefined ? activeObject.opacity : 1,
                    selectable: true,
                    evented: true,
                    hasControls: true,
                    hasBorders: true,
                  });
                  
                  // Preserve original dimensions
                  if (img.width && img.height) {
                    clonedImg.set({
                      width: img.width,
                      height: img.height
                    });
                  }
                  
                  canvas.add(clonedImg);
                  canvas.setActiveObject(clonedImg);
                  canvas.renderAll();
                  saveState();
                  console.log('Duplicated image with preserved quality');
                };
                
                if (clonedElement.complete && clonedElement.naturalWidth > 0 && clonedElement.naturalHeight > 0) {
                  applyProperties();
                } else {
                  clonedElement.onload = applyProperties;
                  clonedElement.onerror = () => {
                    console.error('Error loading duplicated image');
                    alert('ไม่สามารถ duplicate รูปภาพได้');
                  };
                }
              } else {
                // No element, try to apply anyway
                clonedImg.set({
                  left: (activeObject.left || 0) + 20,
                  top: (activeObject.top || 0) + 20,
                  scaleX: activeObject.scaleX || 1,
                  scaleY: activeObject.scaleY || 1,
                  angle: activeObject.angle || 0,
                  flipX: activeObject.flipX || false,
                  flipY: activeObject.flipY || false,
                  opacity: activeObject.opacity !== undefined ? activeObject.opacity : 1,
                  selectable: true,
                  evented: true,
                  hasControls: true,
                  hasBorders: true,
                });
                canvas.add(clonedImg);
                canvas.setActiveObject(clonedImg);
                canvas.renderAll();
                saveState();
              }
            },
            { crossOrigin: 'anonymous' }
          );
        } else {
          throw new Error('ไม่สามารถอ่านข้อมูลรูปภาพได้');
        }
      } else {
        // For other objects, use normal clone
        activeObject.clone((cloned: fabric.Object) => {
          if (!cloned) {
            throw new Error('ไม่สามารถ clone object ได้');
          }
          cloned.set({
            left: (cloned.left || 0) + 20,
            top: (cloned.top || 0) + 20,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.renderAll();
          saveState();
          console.log('Duplicated object');
        });
      }
    } catch (error: any) {
      console.error('Error duplicating:', error);
      alert(`ไม่สามารถ duplicate ได้: ${error.message || 'Unknown error'}`);
    }
  }, [saveState]);

  // Fullscreen functions - defined before keyboard shortcuts
  const handleFullscreen = useCallback(async () => {
    const container = document.querySelector('.canvas-editor-container') as HTMLElement;
    if (!container) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, [isFullscreen]);


  // Update brush color and width when they change (without affecting existing drawings)
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Update brush properties immediately when color/width changes
    // This ensures the brush uses the latest values
    if (canvas.freeDrawingBrush) {
      if (tool === 'draw') {
        canvas.freeDrawingBrush.color = drawingColor;
        canvas.freeDrawingBrush.width = drawingWidth;
      } else {
        canvas.freeDrawingBrush.width = drawingWidth * 2;
      }
    }
  }, [drawingColor, drawingWidth, tool]);

  // Update tool mode
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Update window state for fabric.js event handlers
    (window as any).__currentTool = tool;
    (window as any).__setTool = setTool;
    (window as any).__fontFamily = fontFamily;
    (window as any).__fontSize = fontSize;
    (window as any).__drawingColor = drawingColor;
    (window as any).__drawingWidth = drawingWidth;

    switch (tool) {
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = drawingColor;
        canvas.freeDrawingBrush.width = drawingWidth;
        canvas.defaultCursor = 'crosshair';
        canvas.selection = true;
        break;
      case 'select':
        canvas.isDrawingMode = false;
        canvas.defaultCursor = 'default';
        canvas.selection = true;
        break;
      case 'text':
        canvas.isDrawingMode = false;
        canvas.defaultCursor = 'text';
        canvas.selection = true; // Allow selection but handle text creation in mouse:down
        break;
      case 'rect':
      case 'circle':
      case 'line':
      case 'arrow':
      case 'highlight':
        canvas.isDrawingMode = false;
        canvas.defaultCursor = 'crosshair';
        canvas.selection = true; // Allow selection but handle shape creation in mouse:down
        break;
      case 'image':
        canvas.isDrawingMode = false;
        canvas.defaultCursor = 'crosshair';
        canvas.selection = true;
        break;
    }
  }, [tool, isPanning, fontFamily, fontSize, drawingColor]);

  const handleToolChange = (newTool: typeof tool) => {
    setTool(newTool);
  };

  // Zoom functions
  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(zoom * 1.2, 5);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.renderAll();
  };

  const handleZoomReset = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setZoom(1);
    canvas.setZoom(1);
    // Reset to center of canvas
    const isMobile = window.innerWidth < 640;
    const toolbarHeight = isMobile ? 180 : 120;
    const availableHeight = Math.max(window.innerHeight - toolbarHeight, 400);
    // จำกัดขนาด canvas ไม่ให้เกิน limit
    const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
    const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
    const canvasWidth = Math.min(canvas.width || MAX_CANVAS_WIDTH, MAX_CANVAS_WIDTH);
    const canvasHeight = Math.min(canvas.height || MAX_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT);
    const viewportWidth = window.innerWidth;
    const viewportHeight = availableHeight;
    const initialX = (canvasWidth - viewportWidth) / 2;
    const initialY = (canvasHeight - viewportHeight) / 2;
    canvas.setViewportTransform([1, 0, 0, 1, -initialX, -initialY]);
    canvas.renderAll();
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Pan function - for moving the canvas viewport
  const handlePanStart = (e: React.MouseEvent) => {
    if (!fabricCanvasRef.current) return;
    
    // Allow panning with middle mouse button only
    const isMiddleButton = e.button === 1;
    
    if (!isMiddleButton) return;
    
    // Don't interfere with drag and drop
    if ((e.nativeEvent as any).dataTransfer) return;
    
    // Don't interfere with shape drawing
    if (isDrawingShape) return;
    
    const canvas = fabricCanvasRef.current;
    // Check if clicking on an object - if so, don't pan (let object handle it)
    // But allow panning with middle button even on objects
    if (!isMiddleButton) {
    const target = canvas.findTarget(e.nativeEvent, false);
    if (target && target !== canvas) return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    canvas.skipTargetFind = true; // Disable object selection while panning
    
    // Store screen coordinates for panning
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !fabricCanvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    const canvas = fabricCanvasRef.current;
    
    // Calculate delta in screen coordinates (pixels)
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    // Get current viewport transform
    const vpt = canvas.viewportTransform;
    if (vpt) {
      // Update viewport transform directly with screen coordinates
      // vpt[4] and vpt[5] are the translation values
      vpt[4] += deltaX;
      vpt[5] += deltaY;
      canvas.setViewportTransform(vpt);
      canvas.renderAll();
    }
    
    // Update last position
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handlePanEnd = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.skipTargetFind = false; // Re-enable object selection
    }
    setIsPanning(false);
    setIsMobilePanning(false);
    setMobilePanStartPoint(null);
  };

  // Reset viewport to absolute top (see header at top of page)
  const handleResetViewport = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const isMobile = window.innerWidth < 640;
    const toolbarHeight = isMobile ? 180 : 120;
    const availableHeight = Math.max(window.innerHeight - toolbarHeight, 400);
    
    // จำกัดขนาด canvas ไม่ให้เกิน limit
    const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
    const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
    const canvasWidth = Math.min(canvas.width || MAX_CANVAS_WIDTH, MAX_CANVAS_WIDTH);
    const canvasHeight = Math.min(canvas.height || MAX_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT);
    const viewportWidth = window.innerWidth;
    const viewportHeight = availableHeight;
    
    // Reset to absolute top of canvas (y = 0) and center horizontally
    const initialX = (canvasWidth - viewportWidth) / 2;
    const initialY = 0; // บนสุดของ canvas
    canvas.setViewportTransform([1, 0, 0, 1, -initialX, -initialY]);
    canvas.renderAll();
    setZoom(1);
    
    // Scroll page to absolute top to see header
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Scroll canvas container to top
    const container = document.querySelector('.canvas-editor-container');
    if (container) {
      container.scrollTop = 0;
    }
    
    // Scroll all parent containers to top
    let parent: HTMLElement | null = container as HTMLElement;
    while (parent) {
      parent.scrollTop = 0;
      parent = parent.parentElement;
    }
    
    // Try to scroll to header element if exists
    const header = document.querySelector('header');
    if (header) {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Force scroll to top after a short delay to ensure it works
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
  }, []);

  // Mouse wheel zoom - allow zoom in any tool mode
  const handleWheel = (e: React.WheelEvent) => {
    if (!fabricCanvasRef.current) return;
    
    // Allow zoom with Ctrl/Cmd key in any tool, or always in select tool
    const allowZoom = (e.ctrlKey || e.metaKey) || tool === 'select';
    if (!allowZoom) return;
    
    e.preventDefault();
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    setZoom(newZoom);
    
    const pointer = fabricCanvasRef.current.getPointer(e.nativeEvent);
    fabricCanvasRef.current.zoomToPoint(pointer, newZoom);
    fabricCanvasRef.current.renderAll();
  };

  // Save settings to localStorage when they change
  // Also update selected text color if text is selected
  useEffect(() => {
    saveToStorage('drawingColor', drawingColor);
    
    // Update color of selected text object if one is selected
    if (fabricCanvasRef.current) {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
        activeObject.set('fill', drawingColor);
        fabricCanvasRef.current.renderAll();
        saveState();
      }
    }
  }, [drawingColor, saveState]);

  useEffect(() => {
    saveToStorage('drawingWidth', drawingWidth);
  }, [drawingWidth]);

  useEffect(() => {
    saveToStorage('fontFamily', fontFamily);
    
    // Update font family of selected text object if one is selected
    if (fabricCanvasRef.current) {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
        activeObject.set('fontFamily', fontFamily);
        fabricCanvasRef.current.renderAll();
        saveState();
      }
    }
  }, [fontFamily, saveState]);

  useEffect(() => {
    saveToStorage('fontSize', fontSize);
    
    // Update font size of selected text object if one is selected
    if (fabricCanvasRef.current) {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
        activeObject.set('fontSize', fontSize);
        fabricCanvasRef.current.renderAll();
        saveState();
      }
    }
  }, [fontSize, saveState]);

  useEffect(() => {
    saveToStorage('tool', tool);
  }, [tool]);

  // Initialize history on mount and add event listeners for state saving
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Initialize history only once when canvas is ready
    if (!historyInitializedRef.current && history.length === 0) {
      // Use setTimeout to ensure canvas is fully ready
      setTimeout(() => {
        if (fabricCanvasRef.current && !historyInitializedRef.current) {
          saveState();
          historyInitializedRef.current = true;
        }
      }, 200); // Wait a bit longer to ensure canvas is ready
    }

    // Save state on object modification
    const handleObjectAdded = () => {
      if (historyInitializedRef.current) {
        saveState();
      }
    };
    const handleObjectRemoved = () => {
      if (historyInitializedRef.current) {
        saveState();
      }
    };
    const handleObjectModified = () => {
      if (historyInitializedRef.current) {
        saveState();
      }
    };
    const handlePathCreated = () => {
      if (historyInitializedRef.current) {
        saveState();
      }
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('path:created', handlePathCreated);
    };
  }, [saveState]);


  // Crop function - Simple drag to select area
  const handleCrop = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();

    if (!activeObject || activeObject.type !== 'image') {
      alert('กรุณาเลือกรูปภาพที่ต้องการ crop ก่อน\n(คลิกเลือกรูปภาพก่อน แล้วกดปุ่ม Crop)');
      return;
    }

    const img = activeObject as fabric.Image;
    setIsCropping(true);
    setCropImageRef(img);

    // Make all other objects non-selectable during crop
    canvas.getObjects().forEach((obj: fabric.Object) => {
      if (obj !== img) {
        obj.set('selectable', false);
        obj.set('evented', false);
      }
    });

    // Make image non-selectable during crop
    img.set('selectable', false);
    img.set('evented', false);

    // Send image to back so overlays and crop rect appear on top
    (img as any).sendToBack();

    // Disable canvas selection to prevent selecting other objects
    canvas.selection = false;
    canvas.skipTargetFind = false; // Allow finding crop rect

    // Get image bounds - use actual image dimensions, not scaled bounds
    const imgBounds = (img as any).getBoundingRect();
    const imgLeft = img.left || 0;
    const imgTop = img.top || 0;
    const imgWidth = (img.width || 0) * (img.scaleX || 1);
    const imgHeight = (img.height || 0) * (img.scaleY || 1);
    
    // Use actual image bounds for calculations
    const actualImgBounds = {
      left: imgLeft,
      top: imgTop,
      width: imgWidth,
      height: imgHeight,
    };
    
    // Create initial crop rectangle at center of image (80% of image size)
    const initialWidth = Math.max(50, Math.min(imgWidth * 0.8, imgWidth));
    const initialHeight = Math.max(50, Math.min(imgHeight * 0.8, imgHeight));
    const initialLeft = imgLeft + (imgWidth - initialWidth) / 2;
    const initialTop = imgTop + (imgHeight - initialHeight) / 2;
    
    const cropRectObj = new fabric.Rect({
      left: initialLeft,
      top: initialTop,
      width: initialWidth,
      height: initialHeight,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 4, // เพิ่มความหนาให้เห็นชัดขึ้น
      strokeDashArray: [8, 4], // เส้นประที่เห็นชัดขึ้น
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      lockSkewingX: true,
      lockSkewingY: true,
      cornerColor: '#000000',
      cornerSize: 14, // เพิ่มขนาด corner
      transparentCorners: false,
      borderColor: '#000000',
      borderScaleFactor: 2,
      excludeFromExport: true,
      // เพิ่ม shadow เพื่อให้เห็นชัดเจนขึ้น
      shadow: {
        color: 'rgba(0, 0, 0, 0.3)',
        blur: 5,
        offsetX: 2,
        offsetY: 2,
      } as any,
    });

    // Constrain crop rectangle to stay within image bounds
    const constrainCropRect = () => {
      const rect = cropRectObj;
      const rectLeft = rect.left || 0;
      const rectTop = rect.top || 0;
      const rectWidth = (rect.width || 0) * (rect.scaleX || 1);
      const rectHeight = (rect.height || 0) * (rect.scaleY || 1);
      
      let changed = false;
      let newLeft = rectLeft;
      let newTop = rectTop;
      let newWidth = rectWidth;
      let newHeight = rectHeight;
      
      // Constrain position
      if (newLeft < actualImgBounds.left) {
        newLeft = actualImgBounds.left;
        changed = true;
      }
      if (newTop < actualImgBounds.top) {
        newTop = actualImgBounds.top;
        changed = true;
      }
      if (newLeft + newWidth > actualImgBounds.left + actualImgBounds.width) {
        newLeft = actualImgBounds.left + actualImgBounds.width - newWidth;
        changed = true;
      }
      if (newTop + newHeight > actualImgBounds.top + actualImgBounds.height) {
        newTop = actualImgBounds.top + actualImgBounds.height - newHeight;
        changed = true;
      }
      
      // Constrain size
      if (newWidth > actualImgBounds.width) {
        newWidth = actualImgBounds.width;
        newLeft = actualImgBounds.left;
        changed = true;
      }
      if (newHeight > actualImgBounds.height) {
        newHeight = actualImgBounds.height;
        newTop = actualImgBounds.top;
        changed = true;
      }
      
      // Ensure minimum size
      if (newWidth < 20) {
        newWidth = 20;
        changed = true;
      }
      if (newHeight < 20) {
        newHeight = 20;
        changed = true;
      }
      
      if (changed) {
        rect.set({
          left: newLeft,
          top: newTop,
          scaleX: newWidth / (rect.width || 1),
          scaleY: newHeight / (rect.height || 1),
        });
        canvas.renderAll();
      }
    };

    // Create overlay rectangles to darken areas outside crop
    const createOverlays = () => {
      const rectLeft = cropRectObj.left || 0;
      const rectTop = cropRectObj.top || 0;
      const rectWidth = (cropRectObj.width || 0) * (cropRectObj.scaleX || 1);
      const rectHeight = (cropRectObj.height || 0) * (cropRectObj.scaleY || 1);
      
      const overlays: fabric.Rect[] = [];
      
      // Top overlay
      if (rectTop > actualImgBounds.top) {
        const topOverlay = new fabric.Rect({
          left: actualImgBounds.left,
          top: actualImgBounds.top,
          width: actualImgBounds.width,
          height: rectTop - actualImgBounds.top,
          fill: 'rgba(0, 0, 0, 0.5)',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        overlays.push(topOverlay);
      }
      
      // Bottom overlay
      const bottomTop = rectTop + rectHeight;
      if (bottomTop < actualImgBounds.top + actualImgBounds.height) {
        const bottomOverlay = new fabric.Rect({
          left: actualImgBounds.left,
          top: bottomTop,
          width: actualImgBounds.width,
          height: (actualImgBounds.top + actualImgBounds.height) - bottomTop,
          fill: 'rgba(0, 0, 0, 0.5)',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        overlays.push(bottomOverlay);
      }
      
      // Left overlay
      if (rectLeft > actualImgBounds.left) {
        const leftOverlay = new fabric.Rect({
          left: actualImgBounds.left,
          top: rectTop,
          width: rectLeft - actualImgBounds.left,
          height: rectHeight,
          fill: 'rgba(0, 0, 0, 0.5)',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        overlays.push(leftOverlay);
      }
      
      // Right overlay
      const rightLeft = rectLeft + rectWidth;
      if (rightLeft < actualImgBounds.left + actualImgBounds.width) {
        const rightOverlay = new fabric.Rect({
          left: rightLeft,
          top: rectTop,
          width: (actualImgBounds.left + actualImgBounds.width) - rightLeft,
          height: rectHeight,
          fill: 'rgba(0, 0, 0, 0.5)',
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        overlays.push(rightOverlay);
      }
      
      return overlays;
    };

    const updateOverlays = () => {
      // Remove old overlays (only those with the overlay fill color)
      const objects = canvas.getObjects();
      const overlaysToRemove: fabric.Object[] = [];
      objects.forEach((obj: any) => {
        if (obj.excludeFromExport && 
            obj.fill === 'rgba(0, 0, 0, 0.5)' && 
            obj !== cropRectObj &&
            obj !== img) {
          overlaysToRemove.push(obj);
        }
      });
      overlaysToRemove.forEach(obj => canvas.remove(obj));
      
      // Ensure image is at the back
      (img as any).sendToBack();
      
      // Add new overlays - these should be above image but below crop rect
      const overlays = createOverlays();
      overlays.forEach(overlay => {
        canvas.add(overlay);
        // Send overlay to back (will be above image)
        (overlay as any).sendToBack();
      });
      
      // Keep crop rect on top of everything
      (cropRectObj as any).bringToFront();
      canvas.renderAll();
    };

    // Update overlays when crop rect moves or scales
    cropRectObj.on('moving', () => {
      constrainCropRect();
      updateOverlays();
    });
    cropRectObj.on('scaling', () => {
      constrainCropRect();
      updateOverlays();
    });

    // Add crop rectangle to canvas first
    canvas.add(cropRectObj);
    canvas.setActiveObject(cropRectObj);
    
    // Ensure proper layer order: image at back, overlays in middle, crop rect on top
    (img as any).sendToBack();
    
    // Add initial overlays
    updateOverlays();
    
    // Force render to ensure everything is visible
    canvas.renderAll();
    
    setCropRect(cropRectObj);
  };

  const handleApplyCrop = () => {
    if (!fabricCanvasRef.current || !cropRect) return;
    const canvas = fabricCanvasRef.current;
    
    // Get the image reference we stored
    const imgObj = cropImageRef;
    
    if (!imgObj) {
      alert('ไม่พบรูปภาพ');
      setIsCropping(false);
      canvas.remove(cropRect);
      canvas.renderAll();
      setCropRect(null);
      setCropImageRef(null);
      return;
    }

    try {
      // Get image element
      const imgElement = imgObj.getElement();
      if (!imgElement) {
        throw new Error('Image element not found');
      }

      // Wait for image to be fully loaded
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        alert('รูปภาพยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองอีกครั้ง');
        return;
      }

      // Get image actual bounds (accounting for scale)
      const imgLeft = imgObj.left || 0;
      const imgTop = imgObj.top || 0;
      const imgWidth = (imgObj.width || 0) * (imgObj.scaleX || 1);
      const imgHeight = (imgObj.height || 0) * (imgObj.scaleY || 1);
      
      // Get crop rectangle actual bounds
      const cropLeft = cropRect.left || 0;
      const cropTop = cropRect.top || 0;
      const cropWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
      const cropHeight = (cropRect.height || 0) * (cropRect.scaleY || 1);

      // Validate crop bounds
      if (cropWidth <= 0 || cropHeight <= 0) {
        alert('พื้นที่ crop ไม่ถูกต้อง');
        return;
      }

      // Calculate relative position of crop area within image
      const relativeLeft = (cropLeft - imgLeft) / imgWidth;
      const relativeTop = (cropTop - imgTop) / imgHeight;
      const relativeWidth = cropWidth / imgWidth;
      const relativeHeight = cropHeight / imgHeight;

      // Clamp values to valid range
      const clampedLeft = Math.max(0, Math.min(1, relativeLeft));
      const clampedTop = Math.max(0, Math.min(1, relativeTop));
      const clampedWidth = Math.max(0.01, Math.min(1 - clampedLeft, relativeWidth));
      const clampedHeight = Math.max(0.01, Math.min(1 - clampedTop, relativeHeight));

      // Get original image dimensions (natural size)
      const originalWidth = imgElement.naturalWidth || imgObj.width || 0;
      const originalHeight = imgElement.naturalHeight || imgObj.height || 0;

      if (originalWidth === 0 || originalHeight === 0) {
        throw new Error('ไม่สามารถอ่านขนาดรูปภาพได้');
      }

      // Calculate pixel coordinates in original image
      const sourceX = clampedLeft * originalWidth;
      const sourceY = clampedTop * originalHeight;
      const sourceWidth = clampedWidth * originalWidth;
      const sourceHeight = clampedHeight * originalHeight;

      // Validate source dimensions
      if (sourceWidth <= 0 || sourceHeight <= 0 || sourceX < 0 || sourceY < 0) {
        throw new Error('ขนาด crop area ไม่ถูกต้อง');
      }

      // Create temporary canvas for cropping
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to the cropped size
      const finalWidth = Math.max(1, Math.floor(sourceWidth));
      const finalHeight = Math.max(1, Math.floor(sourceHeight));
      tempCanvas.width = finalWidth;
      tempCanvas.height = finalHeight;

      // Draw the cropped portion
      tempCtx.drawImage(
        imgElement,
        Math.max(0, Math.floor(sourceX)),
        Math.max(0, Math.floor(sourceY)),
        Math.max(1, Math.floor(sourceWidth)),
        Math.max(1, Math.floor(sourceHeight)),
        0,
        0,
        finalWidth,
        finalHeight
      );

      const croppedDataURL = tempCanvas.toDataURL('image/png');

      // Validate data URL
      if (!croppedDataURL || croppedDataURL === 'data:,') {
        throw new Error('ไม่สามารถสร้างรูปภาพที่ crop ได้');
      }

      // Create new image from cropped data
      fabric.Image.fromURL(
        croppedDataURL,
        (croppedImg: fabric.Image) => {
          if (!croppedImg) {
            throw new Error('ไม่สามารถสร้างรูปภาพใหม่ได้');
          }

          // Validate cropped image dimensions
          if (!croppedImg.width || !croppedImg.height || croppedImg.width === 0 || croppedImg.height === 0) {
            throw new Error('รูปภาพที่ crop ได้มีขนาดไม่ถูกต้อง');
          }

          // Position at crop rectangle location
          croppedImg.set({
            left: cropLeft,
            top: cropTop,
            scaleX: 1,
            scaleY: 1,
            angle: imgObj.angle || 0,
            flipX: imgObj.flipX || false,
            flipY: imgObj.flipY || false,
            opacity: imgObj.opacity !== undefined ? imgObj.opacity : 1,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            cornerColor: '#000000',
            transparentCorners: true,
            borderColor: '#000000',
            borderScaleFactor: 1,
          });

          // Add cropped image first (before removing old one)
          canvas.add(croppedImg);
          canvas.setActiveObject(croppedImg);
          
          // Remove old image and crop rect
          canvas.remove(imgObj);
          canvas.remove(cropRect);
          
          // Remove all overlay rectangles
          const objects = canvas.getObjects();
          objects.forEach((obj: any) => {
            if (obj.excludeFromExport && obj.fill === 'rgba(0, 0, 0, 0.5)') {
              try {
                canvas.remove(obj);
              } catch (e) {
                // Ignore removal errors
              }
            }
          });
          
          // Clean up window storage
          (window as any).cropOverlays = null;
          
          // Restore all other objects to normal state
          canvas.getObjects().forEach((obj: fabric.Object) => {
            obj.set('selectable', true);
            obj.set('evented', true);
          });
          
          // Restore canvas selection
          canvas.selection = true;
          
          canvas.renderAll();
          saveState();

          setIsCropping(false);
          setCropRect(null);
          setCropImageRef(null);
        },
        { crossOrigin: 'anonymous' }
      );
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('เกิดข้อผิดพลาดในการ crop รูปภาพ: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Restore image state on error
      if (imgObj) {
        imgObj.set({
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        canvas.setActiveObject(imgObj);
      }
      
      setIsCropping(false);
      if (cropRect) {
        canvas.remove(cropRect);
      }
      canvas.renderAll();
      setCropRect(null);
      setCropImageRef(null);
    }
  };

  const handleCancelCrop = () => {
    if (!fabricCanvasRef.current || !cropRect) return;
    const canvas = fabricCanvasRef.current;
    
    // Remove crop rectangle
    canvas.remove(cropRect);
    
    // Remove all overlay rectangles
    const objects = canvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.excludeFromExport && obj.fill === 'rgba(0, 0, 0, 0.5)') {
        try {
          canvas.remove(obj);
        } catch (e) {
          // Ignore removal errors
        }
      }
    });
    
    // Remove overlays from window storage
    const overlays = (window as any).cropOverlays;
    if (overlays && Array.isArray(overlays)) {
      overlays.forEach((overlay: fabric.Rect) => {
        try {
          canvas.remove(overlay);
        } catch (e) {
          // Ignore removal errors
        }
      });
    }
    (window as any).cropOverlays = null;
    
    // Restore all objects to normal state
    canvas.getObjects().forEach((obj: fabric.Object) => {
      obj.set('selectable', true);
      obj.set('evented', true);
    });
    
    // Restore canvas selection
    canvas.selection = true;
    
    // Restore image to normal state
    const imgObj = cropImageRef;
    if (imgObj) {
      imgObj.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        cornerColor: '#000000',
        transparentCorners: true,
        borderColor: '#000000',
        borderScaleFactor: 1,
      });
      canvas.setActiveObject(imgObj);
    }
    
    canvas.renderAll();
    setIsCropping(false);
    setCropRect(null);
    setCropImageRef(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Blur file input to prevent focus issues
      if (fileInputRef.current) {
        fileInputRef.current.blur();
      }
      try {
        await handleImageUpload(file);
      } catch (error: any) {
        // Error already handled in handleImageUpload with alert
        console.error('File select error:', error);
      } finally {
        // Clear input value after upload (always clear, even on error)
        event.target.value = '';
        // Ensure focus returns to document body so keyboard shortcuts work
        setTimeout(() => {
          if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'file') {
            document.activeElement.blur();
          }
          // Focus on body to ensure keyboard shortcuts work
          if (document.body) {
            document.body.focus();
          }
        }, 100);
      }
    } else {
      event.target.value = '';
    }
  };

  // Layer ordering functions
  const handleBringToFront = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการนำมาหน้าสุดก่อน');
      return;
    }
    (activeObject as any).bringToFront();
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [saveState]);

  const handleSendToBack = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการส่งไปหลังสุดก่อน');
      return;
    }
    (activeObject as any).sendToBack();
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [saveState]);

  const handleBringForward = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการนำมาข้างหน้าก่อน');
      return;
    }
    (activeObject as any).bringForward();
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [saveState]);

  const handleSendBackwards = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      alert('กรุณาเลือก object ที่ต้องการส่งไปข้างหลังก่อน');
      return;
    }
    (activeObject as any).sendBackwards();
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [saveState]);

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!fabricCanvasRef.current || !fabricCanvasRef.current.getContext()) return;
    const canvas = fabricCanvasRef.current;
    
    try {
      // Set flag to prevent drawing/erasing
      isDeletingRef.current = true;
      
      // CRITICAL: Disable drawing mode FIRST to prevent any drawing/erasing
      canvas.isDrawingMode = false;
      canvas.selection = true;
      
      
      // Switch to select tool immediately (this will also disable drawing mode via useEffect)
      if (tool !== 'select') {
        setTool('select');
      }
      
      // Small delay to ensure tool change takes effect
      setTimeout(() => {
        // Ensure drawing mode is still off
        canvas.isDrawingMode = false;
        canvas.selection = true;
        
        // Get all selected objects (including multi-select)
      const activeObjects = canvas.getActiveObjects();
        const activeObject = canvas.getActiveObject();
        
        if (activeObjects.length > 0) {
          // Remove all selected objects
        activeObjects.forEach((obj: fabric.Object) => {
          try {
            canvas.remove(obj);
          } catch (e) {
              console.error('Error removing object:', e);
          }
        });
        canvas.discardActiveObject();
        canvas.renderAll();
        saveState();
        } else if (activeObject && activeObject.type === 'activeSelection') {
          // Handle multi-select group
          const objectsInGroup = (activeObject as any)._objects || [];
          objectsInGroup.forEach((obj: fabric.Object) => {
            try {
              canvas.remove(obj);
            } catch (e) {
              console.error('Error removing object from group:', e);
            }
          });
          canvas.discardActiveObject();
          canvas.renderAll();
          saveState();
        } else {
          // No objects selected - show message
          const allObjects = canvas.getObjects();
          if (allObjects.length > 0) {
            alert('กรุณาเลือกวัตถุที่ต้องการลบก่อน (คลิกหรือลากครอบวัตถุ)');
          } else {
            alert('ไม่มีวัตถุให้ลบ');
          }
        }
        
        // Reset flag after a short delay to allow any pending path creation to be cancelled
        setTimeout(() => {
          isDeletingRef.current = false;
        }, 100);
      }, 0);
    } catch (error) {
      console.error('Error deleting objects:', error);
      isDeletingRef.current = false;
      alert('เกิดข้อผิดพลาดในการลบวัตถุ');
    }
  };

  const handleClear = () => {
    if (!fabricCanvasRef.current) return;
    if (confirm('ต้องการลบทุกอย่างใน canvas หรือไม่?')) {
      try {
        const canvas = fabricCanvasRef.current;
        // Remove all objects first
        canvas.getObjects().forEach((obj: fabric.Object) => {
          canvas.remove(obj);
        });
        canvas.discardActiveObject();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
      } catch (error) {
        console.error('Error clearing canvas:', error);
        // Fallback: recreate canvas - จำกัดขนาดไม่ให้เกิน limit
        if (canvasRef.current && fabricCanvasRef.current) {
          const isMobile = window.innerWidth < 640;
          const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
          const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
          const width = Math.min(fabricCanvasRef.current.width || MAX_CANVAS_WIDTH, MAX_CANVAS_WIDTH);
          const height = Math.min(fabricCanvasRef.current.height || MAX_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT);
          fabricCanvasRef.current.dispose();
          const newCanvas = new fabric.Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            isDrawingMode: false,
          });
          fabricCanvasRef.current = newCanvas;
        }
      }
    }
  };

  // Compress JSON string using simple compression
  const compressJSON = (jsonString: string): string => {
    try {
      // Remove unnecessary whitespace and compress
      const compressed = JSON.stringify(JSON.parse(jsonString));
      return compressed;
    } catch {
      return jsonString;
    }
  };

  // Convert canvas to image if data is too large
  const convertCanvasToImage = async (): Promise<string | null> => {
    if (!fabricCanvasRef.current || !canvasRef.current) return null;
    
    try {
      // Get canvas bounds
      const objects = fabricCanvasRef.current.getObjects();
      if (objects.length === 0) return null;
      
      // Use HTMLCanvasElement.toDataURL method
      const dataURL = canvasRef.current.toDataURL('image/png', 0.7); // 0.7 quality to reduce size
      
      return dataURL;
    } catch (error) {
      console.error('Error converting canvas to image:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!fabricCanvasRef.current || !fabricCanvasRef.current.getContext()) {
      alert('Canvas ยังไม่พร้อม');
      return;
    }

    setSaving(true);
    try {
      // Try to save as JSON first
      const canvasData = fabricCanvasRef.current.toJSON(['selectable', 'evented']);
      const jsonString = JSON.stringify(canvasData);
      const compressedJson = compressJSON(jsonString);
      
      // Check size (1MB = 1048576 bytes, use 900KB as safe limit)
      const maxSize = 900 * 1024;
      const sizeInBytes = new Blob([compressedJson]).size;
      
      if (sizeInBytes > maxSize) {
        // If too large, convert to image instead
        console.warn('Canvas data too large, converting to image...');
        const imageDataURL = await convertCanvasToImage();
        
        if (imageDataURL) {
          // Upload image and save URL
          const base64Data = imageDataURL.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/png' });
          
          const formData = new FormData();
          formData.append('file', blob, 'canvas-export.png');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Upload failed');
          }
          
          const result = await uploadResponse.json();
          
          // ตรวจสอบว่าเป็น ImgBB URL หรือไม่ (ไม่ควรแปลงเป็น relative path)
          let imageUrl = result.url;
          const isImgBBUrl = imageUrl.includes('i.ibb.co') || imageUrl.includes('ibb.co');
          
          // ถ้าเป็น ImgBB URL ให้เก็บเป็น absolute URL ตามเดิม (ไม่แปลง)
          if (!isImgBBUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
            try {
              const urlObj = new URL(imageUrl);
              imageUrl = urlObj.pathname;
              console.log('[Canvas] Converted external URL to relative path for saving:', imageUrl);
            } catch (e) {
              console.warn('[Canvas] Failed to parse URL, using as-is:', imageUrl);
            }
          } else if (isImgBBUrl) {
            console.log('[Canvas] ImgBB URL detected, keeping as absolute URL for saving:', imageUrl);
          }
          
          // Save as image reference instead of full canvas data (บันทึกเป็น relative path)
          await onSave({ 
            canvas: null,
            imageUrl: imageUrl,
            isImage: true 
          });
        } else {
          // Fallback: try to save minimal data
          const minimalData = {
            version: '5.3.0',
            objects: [],
            background: '#ffffff'
          };
          await onSave({ canvas: minimalData });
        }
      } else {
        // Save canvas data with canvas dimensions
        // Ensure all images have their src preserved in the JSON
        // แปลง absolute URL เป็น relative path เพื่อให้ทำงานข้ามเครื่องได้
        const objects = fabricCanvasRef.current.getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'image') {
            const img = obj as fabric.Image;
            const imgElement = img.getElement();
            
            // ใช้ relative path ที่เก็บไว้ก่อน (ถ้ามี)
            let imgSrc = (obj as any)._relativePath;
            
            // ถ้าไม่มี relative path ให้แปลงจาก src
            if (!imgSrc && imgElement && imgElement.src) {
              imgSrc = imgElement.src;
              
              // ตรวจสอบว่าเป็น ImgBB URL หรือไม่
              const isImgBBUrl = imgSrc.includes('i.ibb.co') || imgSrc.includes('ibb.co');
              
              // ถ้าเป็น absolute URL ที่มี API_URL ให้แปลงเป็น relative path
              if (imgSrc.startsWith(API_URL)) {
                imgSrc = imgSrc.replace(API_URL, '');
                console.log('[Canvas] Converted API_URL to relative path:', imgSrc);
              }
              // ถ้าเป็น ImgBB URL ให้เก็บเป็น absolute URL ตามเดิม (ไม่แปลง)
              else if (isImgBBUrl) {
                console.log('[Canvas] ImgBB URL detected, keeping as absolute URL:', imgSrc);
                // ไม่ต้องแปลง ImgBB URL
              }
              // ถ้าเป็น absolute URL อื่นๆ (เช่น Firebase Storage) ให้แปลงเป็น relative path
              else if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                try {
                  const urlObj = new URL(imgSrc);
                  imgSrc = urlObj.pathname;
                  console.log('[Canvas] Converted external URL to relative path:', imgSrc);
                } catch (e) {
                  console.warn('[Canvas] Failed to parse URL, keeping as-is:', imgSrc);
                }
              }
            }
            
            // ถ้าเป็น data URL ให้เก็บไว้ตามเดิม (ไม่แปลง)
            if (imgSrc && !imgSrc.startsWith('data:')) {
              // Ensure src is in the object data (บันทึกเป็น relative path)
              (obj as any).src = imgSrc;
            } else if (imgSrc && imgSrc.startsWith('data:')) {
              // Data URL เก็บไว้ตามเดิม
              (obj as any).src = imgSrc;
            }
          }
        });
        
        // Get fresh JSON with image srcs
        const updatedCanvasData = fabricCanvasRef.current.toJSON(['selectable', 'evented', 'src']);
        const canvasWithDimensions: any = JSON.parse(JSON.stringify(updatedCanvasData));
        // จำกัดขนาด canvas ที่บันทึกไม่ให้เกิน limit เพื่อป้องกัน memory issues
        const isMobile = window.innerWidth < 640;
        const MAX_CANVAS_WIDTH = isMobile ? 1500 : 3000;
        const MAX_CANVAS_HEIGHT = isMobile ? 1500 : 3000;
        canvasWithDimensions.canvasWidth = Math.min(fabricCanvasRef.current.width || MAX_CANVAS_WIDTH, MAX_CANVAS_WIDTH);
        canvasWithDimensions.canvasHeight = Math.min(fabricCanvasRef.current.height || MAX_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT);
        // Use viewportTransform property directly instead of getViewportTransform()
        canvasWithDimensions.viewportTransform = fabricCanvasRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];
        await onSave({ canvas: canvasWithDimensions });
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      const errorMessage = error.message || 'ไม่สามารถบันทึกได้';
      if (errorMessage.includes('INVALID_ARGUMENT') || errorMessage.includes('longer than')) {
        alert('ข้อมูลมีขนาดใหญ่เกินไป กรุณาลดจำนวน objects หรือใช้รูปภาพแทน');
      } else {
        alert('ไม่สามารถบันทึกได้: ' + errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle keyboard shortcuts at component level (after all handlers are defined)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check if user is typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      const isInputField = target instanceof HTMLInputElement || 
                          target instanceof HTMLTextAreaElement || 
                          target instanceof HTMLSelectElement ||
                          (target.isContentEditable && target.closest('[contenteditable="true"]'));
      
      // If user is typing in input fields, don't handle shortcuts (except when explicitly needed)
      // This prevents interfering with normal text input
      if (isInputField) {
        // Only allow specific shortcuts in input fields if they're not standard browser shortcuts
        // For example, don't intercept Ctrl+C, Ctrl+V, Ctrl+Z in input fields
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'z'].includes(e.key.toLowerCase())) {
          // Let browser handle standard shortcuts (copy, paste, cut, select all, undo) in input fields
          return;
        }
        // For other shortcuts in input fields, also return to allow normal typing
        return;
      }
      
      // Check if canvas is focused or if we're on the canvas area
      // Allow shortcuts to work when canvas is active
      if (!fabricCanvasRef.current) {
        return; // Canvas not ready
      }

      // Log all keyboard events for debugging
      if ((e.ctrlKey || e.metaKey) && ['z', 'c', 'v', 'd'].includes(e.key.toLowerCase())) {
        console.log('Keyboard shortcut detected:', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          target: e.target
        });
      }

      // Handle Ctrl/Cmd shortcuts FIRST (before tool shortcuts)
      // Only handle these when NOT in input fields (checked above)
      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Undo triggered');
        handleUndo();
        return;
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Redo triggered');
        handleRedo();
        return;
      }
      // Ctrl+C / Cmd+C for copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault(); // Always prevent default to avoid conflicts
        e.stopPropagation(); // Stop event propagation
        console.log('Ctrl+C pressed - calling handleCopy directly (same as UI button)');
        // Call handleCopy directly, same as UI button - it will handle the check internally
        handleCopy();
        return; // Always return to prevent tool shortcut from triggering
      }
      // Ctrl+V / Cmd+V for paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !e.shiftKey) {
        // Always prevent default and call handlePasteObjects directly, same as UI button
        e.preventDefault();
        e.stopPropagation(); // Prevent paste event from firing
        console.log('Ctrl+V pressed - calling handlePasteObjects directly (same as UI button)');
        // Call handlePasteObjects directly, same as UI button - it will handle the check internally
        handlePasteObjects();
        return;
      }
      // Ctrl+D / Cmd+D for duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Duplicate triggered');
        handleDuplicate();
        return;
      }
      // Ctrl+] / Cmd+] for bring to front
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        e.stopPropagation();
        handleBringToFront();
        return;
      }
      // Ctrl+[ / Cmd+[ for send to back
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        e.stopPropagation();
        handleSendToBack();
        return;
      }

      // Don't handle shortcuts when editing text in canvas (IText object)
      const activeObject = fabricCanvasRef.current?.getActiveObject();
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
        // Check if the text object is in editing mode
        const isEditing = (activeObject as any).isEditing === true;
        if (isEditing) {
          // Only allow Ctrl/Cmd shortcuts when editing text (already handled above)
          // For tool shortcuts, allow them even when editing text (user can switch tools)
          if (!(e.ctrlKey || e.metaKey)) {
            // Allow tool shortcuts even when editing text
            // This allows user to switch tools while editing
          } else {
            // Ctrl/Cmd shortcuts are already handled above
            return;
          }
        }
      }

      // Tool shortcuts (only when not in input fields or when explicitly allowed)
      // IMPORTANT: These should NOT conflict with Ctrl/Cmd shortcuts which are handled above
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
        const key = e.key.toLowerCase();
        // Debug: log all key presses
        if (['v', 'p', 't', 'r', 'c', 'l', 'a', 'h'].includes(key)) {
          console.log('Tool shortcut key pressed:', key, 'target:', e.target);
        }
        
        switch (key) {
          case 'v':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: V (Select)');
            handleToolChange('select');
            return;
          case 'p':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: P (Draw)');
            handleToolChange('draw');
            return;
          case 't':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: T (Text)');
            handleToolChange('text');
            return;
          case 'r':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: R (Rectangle)');
            handleToolChange('rect');
            return;
          case 'c':
            // Only if not in crop mode
            // Note: Ctrl+C is already handled above, so this is only for single 'c' key
            if (!isCropping) {
              e.preventDefault();
              e.stopPropagation();
              console.log('✓ Tool shortcut: C (Circle)');
              handleToolChange('circle');
              return;
            }
            break;
          case 'l':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: L (Line)');
            handleToolChange('line');
            return;
          case 'a':
            // Only if not Ctrl+A (select all) - but we already checked for ctrlKey above
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: A (Arrow)');
            handleToolChange('arrow');
            return;
          case 'h':
            e.preventDefault();
            e.stopPropagation();
            console.log('✓ Tool shortcut: H (Highlight)');
            handleToolChange('highlight');
            return;
        }
      }

      // Zoom shortcuts
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
          return;
        }
      }

      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        handleFullscreen();
      }
      // Delete key for delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not in input field (already checked above)
        if (fabricCanvasRef.current?.getActiveObject()) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    // Use capture phase to ensure we get the event first, before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo, handleCopy, handlePasteObjects, handleDuplicate, handleFullscreen, handleImageUpload, handleToolChange, handleZoomIn, handleZoomOut, handleZoomReset, handleResetViewport, handleDelete, handleBringToFront, handleSendToBack, handleBringForward, handleSendBackwards, isCropping]);

  // Handle mouse down for pan tool and middle mouse button
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!fabricCanvasRef.current || !fabricCanvasRef.current.getContext()) return;

    // Handle middle mouse button (button 1) for panning
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      handlePanStart(e);
      return;
    }
    
    // Pan tool removed - only middle mouse button panning is available
    
    // Don't interfere with drawing mode
    if (tool === 'draw') return;
    
    // Text, rect, and circle are handled by fabric.js mouse:down event
  };

  // Handle mouse move for pan tool and middle mouse button
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!fabricCanvasRef.current) return;
    
    // Handle panning if middle mouse button is pressed or tool is pan
    if (isPanning) {
      handlePanMove(e);
      return;
    }
    
    // Rect and circle are handled by fabric.js mouse:move event
  };

  // Handle mouse up for pan tool and middle mouse button
  const handleCanvasMouseUp = (e?: React.MouseEvent) => {
    if (!fabricCanvasRef.current) return;
    
    // Handle middle mouse button release
    if (e && e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      handlePanEnd();
      return;
    }
    
    // Handle panning end
    if (isPanning) {
      handlePanEnd();
      return;
    }
    
    // Rect and circle are handled by fabric.js mouse:up event
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Text, rect, and circle are handled by fabric.js mouse:down event
    // This handler is kept for potential future use
  };

  return (
    <div className="flex flex-col h-full canvas-editor-container" style={{ minHeight: '400px' }}>
      {/* Toolbar */}
      <div className="bg-gray-100 p-1 sm:p-2 flex gap-1 sm:gap-2 items-center flex-wrap border-b relative z-50 overflow-x-auto">
        {/* Tools */}
        <div className="flex gap-1 border-r pr-1 sm:pr-2 flex-shrink-0">
          <button
            onClick={() => handleToolChange('select')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'select' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="เลือก/ย้าย (V)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('draw')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'draw' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="วาด (P)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('text')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="ข้อความ (T)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('rect')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'rect' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="สี่เหลี่ยม (R)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4V6z" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('circle')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'circle' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="วงกลม (C)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('line')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'line' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="เส้นตรง (L)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('arrow')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="ลูกศร (A)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <button
            onClick={() => handleToolChange('highlight')}
            className={`px-2 sm:px-3 py-1 rounded ${tool === 'highlight' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200'}`}
            title="ไฮไลท์ (H)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <label className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200 cursor-pointer" title="รูปภาพ">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {!isCropping ? (
            <button
              onClick={handleCrop}
              className="px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-1"
              title="ตัดรูปภาพ (Crop) - เลือกรูปภาพก่อนแล้วกดปุ่มนี้"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m7-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m7 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              <span className="text-sm font-medium">Crop</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleApplyCrop}
                className="px-2 sm:px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 flex items-center gap-1"
                title="ยืนยัน Crop"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">ยืนยัน</span>
              </button>
              <button
                onClick={handleCancelCrop}
                className="px-2 sm:px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                title="ยกเลิก Crop"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">ยกเลิก</span>
              </button>
            </>
          )}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-1 sm:gap-2 border-r pr-1 sm:pr-2 flex-shrink-0">
          <label className="text-xs sm:text-sm hidden sm:inline">สี:</label>
          <input
            type="color"
            value={drawingColor}
            onChange={(e) => setDrawingColor(e.target.value)}
            className="w-6 h-6 sm:w-8 sm:h-8 rounded border cursor-pointer"
          />
        </div>

        {/* Brush Width */}
        <div className="flex items-center gap-1 sm:gap-2 border-r pr-1 sm:pr-2 flex-shrink-0">
          <label className="text-xs sm:text-sm hidden sm:inline">ความหนา:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={drawingWidth}
            onChange={(e) => setDrawingWidth(Number(e.target.value))}
            className="w-12 sm:w-20"
          />
          <span className="text-xs w-6 sm:w-8">{drawingWidth}px</span>
        </div>

        {/* Font Family */}
        <div className="flex items-center gap-1 sm:gap-2 border-r pr-1 sm:pr-2 flex-shrink-0 hidden sm:flex">
          <label className="text-xs sm:text-sm">ฟอนต์:</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="px-1 sm:px-2 py-1 rounded border text-xs sm:text-sm"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
            <option value="Palatino">Palatino</option>
            <option value="Garamond">Garamond</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Impact">Impact</option>
            <option value="Lucida Console">Lucida Console</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Arial Black">Arial Black</option>
            <option value="Bookman">Bookman</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 sm:gap-2 border-r pr-1 sm:pr-2 flex-shrink-0">
          <label className="text-xs sm:text-sm hidden sm:inline">ขนาด:</label>
          <input
            type="number"
            min="8"
            max="200"
            value={fontSize}
            onChange={(e) => setFontSize(Math.max(8, Math.min(200, Number(e.target.value))))}
            className="w-12 sm:w-16 px-1 sm:px-2 py-1 rounded border text-xs sm:text-sm"
          />
          <span className="text-xs hidden sm:inline">px</span>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1 border-r pr-1 sm:pr-2 flex-shrink-0">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 || history.length <= 1}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1 || history.length === 0}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* Layer Ordering */}
        <div className="flex gap-1 border-r pr-1 sm:pr-2 flex-shrink-0 hidden sm:flex">
          <button
            onClick={handleBringToFront}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="นำมาหน้าสุด (Ctrl+])"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={handleSendToBack}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="ส่งไปหลังสุด (Ctrl+[)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleBringForward}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="นำมาข้างหน้า"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </button>
          <button
            onClick={handleSendBackwards}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="ส่งไปข้างหลัง"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </button>
        </div>

        {/* Copy/Paste/Duplicate */}
        <div className="flex gap-1 border-r pr-1 sm:pr-2 flex-shrink-0 hidden sm:flex">
          <button
            onClick={handleCopy}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="Copy (Ctrl+C)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handlePasteObjects}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="Paste (Ctrl+V)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <button
            onClick={handleDuplicate}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="Duplicate (Ctrl+D)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex gap-1 border-r pr-1 sm:pr-2 flex-shrink-0">
          <button
            onClick={handleZoomOut}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="Zoom Out (-)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200 text-xs"
            title="Reset Zoom & Center (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="Zoom In (+)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          <button
            onClick={handleResetViewport}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title="กลับไปจุดเริ่มต้น (Reset View)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleFullscreen}
            className="px-2 sm:px-3 py-1 rounded bg-white hover:bg-gray-200"
            title={isFullscreen ? "ออกจากเต็มจอ (F11)" : "ขยายเต็มจอ (F11)"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6h12v12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-auto flex-shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(e);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Set flag immediately to prevent any drawing
              isDeletingRef.current = true;
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="px-2 sm:px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs sm:text-sm"
            title="ลบ (Delete)"
          >
            ลบ
          </button>
          <button
            onClick={handleClear}
            className="px-2 sm:px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-xs sm:text-sm"
            title="ล้างทั้งหมด"
          >
            ล้าง
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-2 sm:px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 text-xs sm:text-sm"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>

      {/* Canvas Container - Full Screen with Infinite Canvas Support */}
      <div 
        className="flex-1 overflow-auto relative bg-gray-50"
        tabIndex={0}
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '300px',
          position: 'relative',
          zIndex: 0,
          overflow: 'hidden', // Prevent scrollbars, use pan instead
          outline: 'none' // Remove focus outline
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Stop panning if was panning
          setIsPanning(false);
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.skipTargetFind = false;
          }
          
          const files = e.dataTransfer?.files;
          if (!files || files.length === 0) {
            return;
          }
          
          try {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.type.startsWith('image/')) {
                await handleImageUpload(file);
              }
            }
          } catch (error) {
            console.error('Error handling drop:', error);
            alert(`ไม่สามารถอัปโหลดรูปภาพได้: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
        onDragOver={(e) => {
          // Always prevent default to allow drop
          e.preventDefault();
          e.stopPropagation();
          // Change cursor to indicate drop is allowed
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDragEnter={(e) => {
          // Prevent default to show drop cursor
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDragLeave={(e) => {
          // Only prevent default if actually leaving the container
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX;
          const y = e.clientY;
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onMouseDown={(e) => {
          // Handle middle mouse button at container level to prevent page scroll
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            handlePanStart(e);
          }
        }}
        onMouseMove={(e) => {
          // Handle panning at container level
          if (isPanning) {
            e.preventDefault();
            handlePanMove(e);
          }
        }}
        onMouseUp={(e) => {
          // Handle middle mouse button release at container level
          if (e.button === 1 || isPanning) {
            e.preventDefault();
            handlePanEnd();
          }
        }}
        onMouseLeave={(e) => {
          // Don't interfere with drag and drop
          if (!(e.nativeEvent as any).dataTransfer) {
            // End panning if was panning (middle button or pan tool)
            if (isPanning) {
            handlePanEnd();
            }
            // End shape drawing if was drawing
            if (isDrawingShape && currentShape) {
              handleCanvasMouseUp();
            }
          }
        }}
        onContextMenu={(e) => {
          // Prevent context menu when using middle mouse button
          if (isPanning) {
            e.preventDefault();
          }
        }}
        onAuxClick={(e) => {
          // Prevent middle mouse button from opening context menu or navigating
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onTouchStart={(e) => {
          // Removed complex two-finger pan - use floating button instead
          // Single finger pan on mobile when not drawing/selecting
          if (!fabricCanvasRef.current) return;
          
          if (e.touches.length === 1 && (tool === 'select' || tool === 'text')) {
            const touch = e.touches[0];
            const canvas = fabricCanvasRef.current;
            
            // Check if touching an object - if yes, don't pan (let object handle it)
            const canvasElement = canvasRef.current;
            if (canvasElement) {
              const rect = canvasElement.getBoundingClientRect();
              const touchX = touch.clientX;
              const touchY = touch.clientY;
              
              // Check if touch is within canvas bounds
              if (touchX >= rect.left && touchX <= rect.right && 
                  touchY >= rect.top && touchY <= rect.bottom) {
                // Touch is on canvas - check for object
                const target = canvas.findTarget(e.nativeEvent, false);
                if (target && target !== canvas) {
                  return; // Let object handle the touch
                }
              }
            }
            
            // Start panning
            e.preventDefault();
            setMobilePanStartPoint({ x: touch.clientX, y: touch.clientY });
            setIsMobilePanning(true);
            canvas.skipTargetFind = true;
          }
        }}
        onTouchMove={(e) => {
          if (!fabricCanvasRef.current) return;
          
          // Single finger pan only
          if (isMobilePanning && e.touches.length === 1 && mobilePanStartPoint) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - mobilePanStartPoint.x;
            const deltaY = touch.clientY - mobilePanStartPoint.y;
            
            const canvas = fabricCanvasRef.current;
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            vpt[4] += deltaX;
            vpt[5] += deltaY;
            canvas.setViewportTransform(vpt);
            canvas.renderAll();
            
            setMobilePanStartPoint({ x: touch.clientX, y: touch.clientY });
          }
        }}
        onTouchEnd={(e) => {
          // End panning on touch end
          if (isMobilePanning) {
            setIsMobilePanning(false);
            setMobilePanStartPoint(null);
            if (fabricCanvasRef.current) {
              fabricCanvasRef.current.skipTargetFind = false;
            }
          }
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDrop={(e) => {
            // Allow drop events to bubble up to container
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            // Allow drag over events to bubble up to container
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: isPanning ? 'grabbing' :
                    tool === 'draw' ? 'crosshair' :
                    tool === 'rect' || tool === 'circle' || tool === 'line' || tool === 'arrow' || tool === 'highlight' ? 'crosshair' :
                    'default',
            pointerEvents: 'auto',
            width: '100%',
            height: '100%',
            touchAction: 'none'
          }}
          onAuxClick={(e) => {
            // Prevent middle mouse button from opening context menu or navigating
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
      </div>

      {/* Floating Reset Button for Mobile */}
      <button
        onClick={handleResetViewport}
        disabled={isDrawing || isDrawingShape}
        className="fixed bottom-20 right-4 sm:hidden w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:bg-blue-700 transition-all duration-200 flex items-center justify-center z-50 disabled:opacity-50 disabled:pointer-events-none"
        title={isDrawing || isDrawingShape ? "กำลังวาดรูป..." : "กลับไปจุดเริ่มต้น"}
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          pointerEvents: (isDrawing || isDrawingShape) ? 'none' : 'auto'
        }}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Hint */}
      <div className="bg-gray-100 p-1 sm:p-2 text-xs text-gray-600 border-t flex gap-2 sm:gap-4 flex-wrap hidden sm:flex">
        <span>💡 ลากวางรูปภาพ, วาด, เพิ่มข้อความ/รูปทรง - แบบ Figma/ClickUp</span>
        <span className="hidden md:inline">|</span>
        <span className="hidden md:inline">⌨️ Delete: ลบ | Ctrl+Z: Undo | Ctrl+Shift+Z: Redo | Ctrl+C/V: Copy/Paste | Ctrl+D: Duplicate</span>
        <span className="hidden md:inline">|</span>
        <span className="hidden md:inline">🔍 Mouse Wheel: Zoom | P: Draw</span>
      </div>
    </div>
  );
}

