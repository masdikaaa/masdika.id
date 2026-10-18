import { redirect } from "next/navigation";

export default function KubernetesRedirectPage() {
  redirect("/k3s");
}
