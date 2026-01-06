"use client";

import Link from "next/link";
import { Card, Row, Col, Typography, Space } from "antd";
import {
  ToolOutlined,
  BankOutlined,
  TeamOutlined,
  MobileOutlined,
  LinkOutlined,
  CloudOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const cards = [
  {
    title: "รายการติดตั้ง",
    description: "ดูและแก้ไขข้อมูลการติดตั้งทั้งหมด",
    href: "/service-management/installations",
    iconComponent: ToolOutlined,
    color: "#1890ff",
  },
  {
    title: "โรงพยาบาล",
    description: "ลงทะเบียนและแก้ไขข้อมูลโรงพยาบาล",
    href: "/service-management/hospitals",
    iconComponent: BankOutlined,
    color: "#52c41a",
  },
  {
    title: "แผนก",
    description: "จัดการรายชื่อแผนกที่ใช้งาน",
    href: "/service-management/departments",
    iconComponent: TeamOutlined,
    color: "#faad14",
  },
  {
    title: "ลงทะเบียนซิมการ์ด",
    description: "บันทึกเบอร์ซิม เครือข่าย โรงพยาบาล และแผนก",
    href: "/service-management/sims",
    iconComponent: MobileOutlined,
    color: "#722ed1",
  },
  {
    title: "การเชื่อมต่อ",
    description: "จัดการข้อมูลการเชื่อมต่อ PACS, EMR, Server และอื่นๆ",
    href: "/service-management/connections/list",
    iconComponent: LinkOutlined,
    color: "#2f54eb",
  },
  {
    title: "ดูการรีโมต",
    description: "ดูข้อมูลการเชื่อมต่อ AnyDesk และ VPN สำหรับรีโมต",
    href: "/service-management/remote",
    iconComponent: CloudOutlined,
    color: "#13c2c2",
  },
  {
    title: "ข้อมูลต่อประกัน",
    description: "ดูและจัดการข้อมูลการต่อประกันทั้งหมด",
    href: "/service-management/warranty-extensions",
    iconComponent: SafetyCertificateOutlined,
    color: "#eb2f96",
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px 12px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%", marginBottom: 32 }}>
          <Paragraph style={{ fontSize: 16, color: "#595959", maxWidth: 600 }}>
            เลือกฟังก์ชันที่ต้องการจากการ์ดด้านล่าง เพื่อเข้าสู่หน้าจัดการข้อมูลแต่ละส่วน
          </Paragraph>
        </Space>

        <Row gutter={[16, 16]}>
          {cards.map((card) => {
            const IconComponent = card.iconComponent;
            return (
            <Col xs={24} sm={12} md={12} lg={8} key={card.href}>
              <Link href={card.href} style={{ textDecoration: "none" }}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    borderTop: `4px solid ${card.color}`,
                    borderRadius: 8,
                  }}
                  styles={{ body: { padding: 24 } }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {card.title}
                      </Title>
                      <ArrowRightOutlined style={{ color: card.color, fontSize: 16 }} />
                    </div>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      {card.description}
                    </Paragraph>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <IconComponent style={{ fontSize: 32, color: card.color }} />
                      </div>
                  </Space>
                </Card>
              </Link>
            </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
}
