import { redirect } from "next/navigation";

export default function ConnectionsListRedirect() {
  redirect("/service-management/connections/list");
}

