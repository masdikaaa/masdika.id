import { redirect } from "next/navigation";

export default function ManagedAppsRedirect() {
  redirect("/dashboard/apps");
}
