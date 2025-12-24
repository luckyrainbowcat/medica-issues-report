'use client';

import { useState, useRef, useEffect } from 'react';

interface SimpleEditorProps {
  initialContent?: any;
  onSave: (content: any) => Promise<void>;
  onEditingChange?: (isEditing: boolean) => void;
}

interface ImageData {
  url: string;
  id: string;
}

export default function SimpleEditor({ initialContent, onSave, onEditingChange }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState<string>('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState<{ url: string; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);

  const isInitialMount = useRef(true);
  const lastInitialContent = useRef<any>(null);

  useEffect(() => {
    // Only update on initial mount or if initialContent actually changed
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastInitialContent.current = initialContent;
    } else {
      // Check if initialContent actually changed
      const currentContent = typeof initialContent === 'string' 
        ? initialContent 
        : initialContent?.html || '';
      const lastContent = typeof lastInitialContent.current === 'string'
        ? lastInitialContent.current
        : lastInitialContent.current?.html || '';
      
      // Only update if content actually changed and editor is empty or different
      if (currentContent !== lastContent) {
        const editorContent = editorRef.current?.innerHTML || '';
        // Only update if editor is empty or content is significantly different
        if (!editorContent || editorContent.trim() === '' || editorContent !== currentContent) {
          lastInitialContent.current = initialContent;
        } else {
          // Editor has content, don't overwrite it
          return;
        }
      } else {
        return;
      }
    }

    if (initialContent && editorRef.current) {
      let htmlContent = '';
      if (typeof initialContent === 'string') {
        htmlContent = initialContent;
      } else if (initialContent.html) {
        htmlContent = initialContent.html;
      }
      
      if (htmlContent) {
        editorRef.current.innerHTML = htmlContent;
        setContent(htmlContent);
        
        // Extract images from HTML if any
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const imgElements = doc.querySelectorAll('img');
        const extractedImages: ImageData[] = [];
        imgElements.forEach((img, index) => {
          if (img.src) {
            const imageId = `img-${index}-${Date.now()}`;
            extractedImages.push({ url: img.src, id: imageId });
          }
        });
        setImages(extractedImages);
      }
    }
  }, [initialContent]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const imageId = `img-${Date.now()}`;
      const newImage: ImageData = { url: result.url, id: imageId };
      
      setImages(prev => [...prev, newImage]);
      
      // Insert image into editor at the top
      if (editorRef.current) {
        const img = document.createElement('img');
        img.src = result.url;
        img.className = 'max-w-full h-auto cursor-pointer border-2 border-transparent hover:border-blue-400 rounded';
        img.dataset.imageId = imageId;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.margin = '10px 0';
        img.style.display = 'block';
        
        img.addEventListener('click', () => {
          setSelectedImage(img);
        });

        // Insert at the top of editor (before first child or at the beginning)
        const firstChild = editorRef.current.firstChild;
        if (firstChild) {
          editorRef.current.insertBefore(img, firstChild);
        } else {
          editorRef.current.appendChild(img);
        }
        
        // Add line break after image
        const br = document.createElement('br');
        if (firstChild) {
          editorRef.current.insertBefore(br, firstChild?.nextSibling || null);
        } else {
          editorRef.current.appendChild(br);
        }
        
        // Move cursor to after the image
        const range = document.createRange();
        const selection = window.getSelection();
        if (selection) {
          range.setStartAfter(br);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`ไม่สามารถอัปโหลดรูปภาพได้: ${error.message || 'Unknown error'}`);
    }
  };

  const saveContent = async () => {
    if (!editorRef.current) return;
    
    setSaving(true);
    try {
      const htmlContent = editorRef.current?.innerHTML || '';
      const contentData = {
        html: htmlContent,
        text: editorRef.current?.innerText || '',
        images: images,
      };
      
      await onSave(contentData);
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file);
        }
      }
    }
  };

  const handleCrop = () => {
    if (!cropCanvasRef.current || !cropImageRef.current || !cropImage) return;

    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = cropImageRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const width = Math.abs(cropEnd.x - cropStart.x) * scaleX;
    const height = Math.abs(cropEnd.y - cropStart.y) * scaleY;

    if (width < 10 || height < 10) {
      alert('กรุณาลากเพื่อเลือกพื้นที่ที่ต้องการ crop');
      return;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        const file = new File([blob], 'cropped.png', { type: 'image/png' });
        
        // Upload cropped image
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        // Keep the same imageId for the cropped image so we can crop again
        const imageId = cropImage.id;
        const newImage: ImageData = { url: result.url, id: imageId };
        
        // Update images array - replace old image with new one
        setImages(prev => {
          const filtered = prev.filter(img => img.id !== imageId);
          return [...filtered, newImage];
        });
        
        // Replace old image with cropped one
        if (editorRef.current) {
          const oldImg = editorRef.current.querySelector(`img[data-image-id="${cropImage.id}"]`) as HTMLImageElement;
          if (oldImg) {
            // Update the existing image with cropped version
            oldImg.src = result.url;
            // Keep the same imageId so we can crop again
            // Update cropImage state with new URL but keep same ID
            setCropImage({ url: result.url, id: cropImage.id });
            // Update cropImageRef to point to the updated image
            if (cropImageRef.current) {
              cropImageRef.current.src = result.url;
            }
            // Update selectedImage if it's the same image
            if (selectedImage && selectedImage === oldImg) {
              setSelectedImage(oldImg);
            }
            // Force re-attachment of event listeners by triggering content update
            // This ensures the image can be clicked again after crop
            setTimeout(() => {
              if (editorRef.current) {
                const updatedImg = editorRef.current.querySelector(`img[data-image-id="${cropImage.id}"]`) as HTMLImageElement;
                if (updatedImg) {
                  // Re-attach click handler
                  const allImgs = editorRef.current.querySelectorAll('img');
                  allImgs.forEach((img) => {
                    const imgEl = img as HTMLImageElement;
                    if (imgEl === updatedImg) {
                      imgEl.style.borderColor = selectedImage === updatedImg ? '#3b82f6' : 'transparent';
                    }
                  });
                }
              }
            }, 100);
          } else {
            // If old image not found, insert new one at the top
            const img = document.createElement('img');
            img.src = result.url;
            img.className = 'max-w-full h-auto cursor-pointer border-2 border-transparent hover:border-blue-400 rounded';
            img.dataset.imageId = imageId;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.margin = '10px 0';
            img.style.display = 'block';
            
            img.addEventListener('click', () => {
              setSelectedImage(img);
            });

            // Insert at the top of editor
            const firstChild = editorRef.current.firstChild;
            if (firstChild) {
              editorRef.current.insertBefore(img, firstChild);
            } else {
              editorRef.current.appendChild(img);
            }
            const br = document.createElement('br');
            if (firstChild) {
              editorRef.current.insertBefore(br, firstChild?.nextSibling || null);
            } else {
              editorRef.current.appendChild(br);
            }
          }
        }
        
        // Reset crop selection but keep modal open
        setCropStart({ x: 0, y: 0 });
        setCropEnd({ x: 0, y: 0 });
        setIsCropping(false);
        
        // Don't close modal - allow multiple crops
        // setShowCropModal(false);
        // setCropImage(null);
        // setSelectedImage(null);
      } catch (error: any) {
        console.error('Error cropping image:', error);
        alert(`ไม่สามารถ crop รูปภาพได้: ${error.message || 'Unknown error'}`);
      }
    }, 'image/png');
  };

  // Use event delegation for image clicks - works for all images including dynamically added ones
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Set up styles for all existing images
    const setupImageStyles = () => {
      const imgElements = editor.querySelectorAll('img');
      imgElements.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        imgElement.className = 'max-w-full h-auto cursor-pointer border-2 border-transparent hover:border-blue-400 rounded';
        imgElement.style.maxWidth = '100%';
        imgElement.style.height = 'auto';
        imgElement.style.margin = '10px 0';
        imgElement.style.display = 'block';
        
        if (!imgElement.dataset.imageId) {
          imgElement.dataset.imageId = `img-${Date.now()}-${Math.random()}`;
        }
      });
    };

    // Event delegation - handle clicks on any image
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        const imgElement = target as HTMLImageElement;
        
        // Select image
        console.log('Image clicked, setting selectedImage:', imgElement);
        setSelectedImage(imgElement);
        
        // Remove selection from other images
        const allImgs = editor.querySelectorAll('img');
        allImgs.forEach((otherImg) => {
          if (otherImg !== imgElement) {
            (otherImg as HTMLImageElement).style.borderColor = 'transparent';
          }
        });
        
        // Highlight selected image
        imgElement.style.borderColor = '#3b82f6';
      }
    };

    // Set up initial styles
    setupImageStyles();
    
    // Attach event listener to editor (event delegation)
    editor.addEventListener('click', handleImageClick);
    
    // Use MutationObserver to watch for new images added to DOM
    const observer = new MutationObserver((mutations) => {
      let hasNewImages = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'IMG' || element.querySelector('img')) {
              hasNewImages = true;
            }
          }
        });
      });
      if (hasNewImages) {
        setupImageStyles();
      }
    });

    observer.observe(editor, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      editor.removeEventListener('click', handleImageClick);
      observer.disconnect();
    };
  }, [content, images]);

  // Update selected image border when selection changes
  useEffect(() => {
    console.log('selectedImage changed:', selectedImage);
    if (editorRef.current) {
      const imgElements = editorRef.current.querySelectorAll('img');
      imgElements.forEach((img) => {
        if (img === selectedImage) {
          (img as HTMLImageElement).style.borderColor = '#3b82f6';
        } else {
          (img as HTMLImageElement).style.borderColor = 'transparent';
        }
      });
    }
  }, [selectedImage]);

  const handleCropSelected = () => {
    console.log('handleCropSelected called, selectedImage:', selectedImage);
    if (selectedImage) {
      const imageId = selectedImage.dataset.imageId || `img-${Date.now()}`;
      console.log('Opening crop modal for image:', imageId, selectedImage.src);
      setCropImage({ url: selectedImage.src, id: imageId });
      setShowCropModal(true);
    } else {
      console.log('No image selected');
      alert('กรุณาเลือกรูปภาพที่ต้องการ crop');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedImage && editorRef.current) {
      if (confirm('คุณต้องการลบรูปภาพนี้หรือไม่?')) {
        selectedImage.remove();
        setSelectedImage(null);
        // Remove from images state
        const imageId = selectedImage.dataset.imageId;
        if (imageId) {
          setImages(prev => prev.filter(img => img.id !== imageId));
        }
      }
    } else {
      alert('กรุณาเลือกรูปภาพที่ต้องการลบ');
    }
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          แนบรูป
        </button>
        <div className="h-6 w-px bg-gray-400"></div>
        <button
          onClick={handleCropSelected}
          disabled={!selectedImage}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          title="Crop รูปภาพที่เลือก"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Crop
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={!selectedImage}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          title="ลบรูปภาพที่เลือก"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          ลบรูป
        </button>
        <div className="flex-1"></div>
        <button
          onClick={saveContent}
          disabled={saving}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2 text-sm font-medium"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImageUpload(file);
            }
          }}
        />
      </div>

      {/* Editor */}
      <div className="p-6 bg-white">
        <div
          ref={editorRef}
          contentEditable
          onPaste={handlePaste}
          onFocus={() => onEditingChange?.(true)}
          onBlur={() => {
            // Delay to check if user is still editing
            setTimeout(() => {
              if (!document.activeElement?.closest('[contenteditable]')) {
                onEditingChange?.(false);
              }
            }, 100);
          }}
          className="min-h-[400px] outline-none prose max-w-none focus:ring-2 focus:ring-blue-300 rounded-lg border-2 border-gray-200 p-6"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          suppressContentEditableWarning
          placeholder="พิมพ์ข้อความที่นี่..."
        />
        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        `}</style>
      </div>

      {/* Crop Modal */}
      {showCropModal && cropImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-50">
            <h2 className="text-xl font-bold mb-4">Crop รูปภาพ</h2>
            <p className="text-sm text-gray-600 mb-4">ลากเพื่อเลือกพื้นที่ที่ต้องการ crop</p>
            <div className="relative border-2 border-gray-300 mb-4 inline-block" style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <img
                ref={cropImageRef}
                src={cropImage.url}
                alt="Crop"
                className="max-w-full h-auto block"
                draggable={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsCropping(true);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  setCropStart({ x, y });
                  setCropEnd({ x, y });
                }}
                onMouseMove={(e) => {
                  if (isCropping && cropImageRef.current) {
                    const rect = cropImageRef.current.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
                    setCropEnd({ x, y });
                  }
                }}
                onMouseUp={() => setIsCropping(false)}
                onMouseLeave={() => setIsCropping(false)}
                style={{ userSelect: 'none', pointerEvents: 'auto' }}
              />
              {(isCropping || (cropStart.x !== cropEnd.x || cropStart.y !== cropEnd.y)) && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                  style={{
                    left: Math.min(cropStart.x, cropEnd.x),
                    top: Math.min(cropStart.y, cropEnd.y),
                    width: Math.abs(cropEnd.x - cropStart.x),
                    height: Math.abs(cropEnd.y - cropStart.y),
                  }}
                />
              )}
            </div>
            <canvas ref={cropCanvasRef} className="hidden" />
            <div className="flex gap-2">
              <button
                onClick={handleCrop}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Crop
              </button>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                  setIsCropping(false);
                  setCropStart({ x: 0, y: 0 });
                  setCropEnd({ x: 0, y: 0 });
                  setSelectedImage(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

