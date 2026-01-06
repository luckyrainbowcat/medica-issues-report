"use client";

import { useRef, useState, useEffect } from "react";
import { Upload, Button, Space, Typography, Image, message } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { API_URL } from "@/lib/service-management/api";

type ImageUploaderProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  sectionName: string;
  maxImages?: number;
};

export default function ImageUploader({
  images = [],
  onImagesChange,
  sectionName,
  maxImages,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ฟังก์ชันสำหรับอ่าน cookie
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [cookieName, value] = cookie.trim().split("=");
      if (cookieName === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    // ดึง token จาก cookie
    const token = getCookie("authToken");
    
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/upload-image`, {
      method: "POST",
      credentials: "include", // ส่ง cookie ไปด้วย
      headers,
      body: formData,
    });

    if (!res.ok) {
      // ถ้าเป็น 401 หรือ 403 แสดงว่า token หมดอายุหรือไม่ถูกต้อง
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          // ลบ cookie
          document.cookie = "authToken=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
          document.cookie = "isLoggedIn=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
          window.location.href = "/login";
        }
      }
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "อัปโหลดรูปภาพไม่สำเร็จ");
    }

    const data = await res.json();
    return data.url;
  };

  const processPendingFiles = async () => {
    if (pendingFilesRef.current.length === 0) return;

    const filesToUpload = [...pendingFilesRef.current];
    pendingFilesRef.current = [];

    // กรองเฉพาะไฟล์รูปภาพ
    const imageFiles = filesToUpload.filter((file) => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      message.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // ตรวจสอบจำนวนรูปภาพทั้งหมด
    const totalImages = images.length + imageFiles.length;
    if (maxImages !== undefined && totalImages > maxImages) {
      message.warning(`สามารถอัปโหลดได้สูงสุด ${maxImages} รูป`);
      return;
    }

    setUploading(true);
    try {
      // อัปโหลดทุกไฟล์พร้อมกัน
      const uploadPromises = imageFiles.map((file) => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...urls]);
      message.success(`อัปโหลดรูปภาพสำเร็จ ${urls.length} รูป`);
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "image",
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      if (!file.type.startsWith("image/")) {
        message.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return false;
      }

      // เพิ่มไฟล์เข้า pending list
      pendingFilesRef.current.push(file);

      // ล้าง timeout เก่า
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }

      // รอ 100ms เพื่อให้ไฟล์อื่นๆ ถูกเพิ่มเข้ามาก่อน แล้วค่อยอัปโหลดทั้งหมด
      uploadTimeoutRef.current = setTimeout(() => {
        processPendingFiles();
      }, 100);

      return false; // ป้องกันการอัปโหลดอัตโนมัติ
    },
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    message.success("ลบรูปภาพสำเร็จ");
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Typography.Text strong>รูปภาพ ({sectionName})</Typography.Text>

      <Upload.Dragger {...uploadProps} disabled={uploading || (maxImages !== undefined && images.length >= maxImages)}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined style={{ fontSize: isMobile ? 36 : 48, color: "#1890ff" }} />
        </p>
        <p className="ant-upload-text" style={{ fontSize: isMobile ? 14 : 16 }}>
          {uploading
            ? "กำลังอัปโหลด..."
            : maxImages !== undefined && images.length >= maxImages
            ? `อัปโหลดครบแล้ว (${maxImages} รูป)`
            : maxImages !== undefined
            ? `เลือกรูปภาพ (${images.length}/${maxImages})`
            : `เลือกรูปภาพ (${images.length} รูป)`}
        </p>
        <p className="ant-upload-hint" style={{ fontSize: isMobile ? 12 : 14 }}>
          {isMobile ? "แตะเพื่อเลือกรูปภาพ" : "ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
        </p>
      </Upload.Dragger>

      {images.length > 0 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile 
            ? "repeat(auto-fill, minmax(100px, 1fr))" 
            : "repeat(auto-fill, minmax(150px, 1fr))", 
          gap: isMobile ? 12 : 16 
        }}>
          {images.map((img, index) => (
            <div key={index} style={{ position: "relative" }}>
              <Image
                src={img.startsWith("http") ? img : `${API_URL}${img}`}
                alt={`${sectionName} ${index + 1}`}
                style={{ 
                  width: "100%", 
                  height: isMobile ? 100 : 120, 
                  objectFit: "cover", 
                  borderRadius: 8 
                }}
                preview={{
                  mask: <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: isMobile ? 12 : 14,
                  }}>ดู</div>,
                }}
              />
              <Button
                type="primary"
                danger
                shape="circle"
                icon={<DeleteOutlined />}
                size={isMobile ? "small" : "small"}
                style={{
                  position: "absolute",
                  top: isMobile ? 4 : 8,
                  right: isMobile ? 4 : 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  minWidth: isMobile ? 24 : undefined,
                  height: isMobile ? 24 : undefined,
                  fontSize: isMobile ? 12 : undefined,
                }}
                onClick={() => removeImage(index)}
              />
            </div>
          ))}
        </div>
      )}
    </Space>
  );
}
