// Import suppress warning ก่อน antd เพื่อให้ suppress warning ทำงาน
import "@/lib/service-management/suppress-antd-warning";
// Import patch ก่อน antd เพื่อให้ patch ทำงาน
import "@ant-design/v5-patch-for-react-19";
import LayoutClient from "@/components/service-management/LayoutClient";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export default function ServiceManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <AntdRegistry>
          <ConfigProvider locale={thTH}>
            <LayoutClient>{children}</LayoutClient>
          </ConfigProvider>
        </AntdRegistry>
  );
}
