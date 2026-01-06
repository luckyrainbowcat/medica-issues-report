"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Space, Typography, Upload, Avatar, message } from "antd";
import { ArrowLeftOutlined, UserOutlined, CameraOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { API_URL } from "@/lib/service-management/api";

const { Title } = Typography;

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  avatar: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // อ่านข้อมูลจาก currentUser (ใช้ key เดียวกันกับ Issues Tracker)
    const savedUser = localStorage.getItem("currentUser");
    const savedProfile = localStorage.getItem("profile"); // fallback สำหรับข้อมูลเก่า
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        // แปลงข้อมูลจาก currentUser format เป็น profile format
        const profileData = {
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          avatar: userData.profilePicture || "",
        };
        setProfile(profileData);
        form.setFieldsValue(profileData);
      } catch (e) {
        console.error("Error loading profile from currentUser:", e);
      }
    } else if (savedProfile) {
      // Fallback: อ่านจาก profile key (สำหรับข้อมูลเก่า)
      try {
        const data = JSON.parse(savedProfile);
        setProfile(data);
        form.setFieldsValue(data);
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    }
  }, [form]);

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

  const uploadProps: UploadProps = {
    name: "image",
    showUploadList: false,
    beforeUpload: async (file) => {
      if (!file.type.startsWith("image/")) {
        message.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return false;
      }

      setUploading(true);
      try {
        const url = await uploadImage(file);
        setProfile((prev) => ({ ...prev, avatar: url }));
        message.success("อัปโหลดรูปภาพสำเร็จ");
      } catch (error: any) {
        message.error(error.message || "อัปโหลดรูปภาพไม่สำเร็จ");
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  const onFinish = (values: ProfileData) => {
    if (!values.name.trim()) {
      message.error("กรุณากรอกชื่อ");
      return;
    }

    setSaving(true);
    try {
      // อ่านข้อมูล currentUser เดิม (ถ้ามี)
      const savedUser = localStorage.getItem("currentUser");
      let userData: any = {};
      
      if (savedUser) {
        try {
          userData = JSON.parse(savedUser);
        } catch (e) {
          console.error("Error parsing currentUser:", e);
        }
      }
      
      // อัปเดตข้อมูล user
      const updatedUser = {
        ...userData,
        name: values.name.trim(),
        email: values.email?.trim() || "",
        phone: values.phone?.trim() || "",
        profilePicture: profile.avatar || userData.profilePicture || "",
      };
      
      // บันทึกทั้ง currentUser (สำหรับ Issues Tracker) และ profile (สำหรับ backward compatibility)
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      localStorage.setItem("profile", JSON.stringify({ ...values, avatar: profile.avatar }));
      
      // Trigger custom event เพื่อให้ Header component รู้ว่ามีการอัปเดต
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("customStorageChange"));
      }
      
      message.success("บันทึกข้อมูลสำเร็จ");
      setTimeout(() => {
        router.push("/service-management");
      }, 1000);
    } catch (error: any) {
      message.error("บันทึกข้อมูลไม่สำเร็จ");
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "12px", background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "flex-start" : "center",
              gap: 16,
            }}>
              <Title level={2} style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
                โปรไฟล์
              </Title>
              <Link href="/service-management" style={{ width: isMobile ? "100%" : "auto" }}>
                <Button icon={<ArrowLeftOutlined />} block={isMobile} size={isMobile ? "middle" : undefined}>
                  กลับ
                </Button>
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                {profile.avatar ? (
                  <Avatar
                    size={isMobile ? 96 : 128}
                    src={profile.avatar.startsWith("http") ? profile.avatar : `${API_URL}${profile.avatar}`}
                    style={{ border: "4px solid #f0f0f0" }}
                  />
                ) : (
                  <div
                    style={{
                      width: isMobile ? 96 : 128,
                      height: isMobile ? 96 : 128,
                      borderRadius: "50%",
                      backgroundColor: "#1890ff",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: isMobile ? 36 : 48,
                      fontWeight: 600,
                      border: "4px solid #f0f0f0",
                    }}
                  >
                    {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
                <Upload {...uploadProps}>
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<CameraOutlined />}
                    loading={uploading}
                    size={isMobile ? "middle" : "large"}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  />
                </Upload>
              </div>
              <p style={{ color: "#8c8c8c", fontSize: isMobile ? 12 : 14, textAlign: "center" }}>
                คลิกที่ไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์
              </p>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={profile}
            >
              <Form.Item
                name="name"
                label={
                  <span>
                    ชื่อ <span style={{ color: "#ff4d4f" }}>*</span>
                  </span>
                }
                rules={[{ required: true, message: "กรุณากรอกชื่อ" }]}
              >
                <Input placeholder="กรอกชื่อ" />
              </Form.Item>

              <Form.Item name="email" label="อีเมล">
                <Input type="email" placeholder="example@email.com" />
              </Form.Item>

              <Form.Item name="phone" label="เบอร์โทร">
                <Input type="tel" placeholder="08x-xxx-xxxx" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving} block size="large">
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </div>
    </div>
  );
}
