import { notFound } from "next/navigation";
import { ReasoningCampaignPreview } from "@/components/reasoning-campaign/preview";
export const metadata = { title: "Time Hacker · 递进章节", robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ReasoningCampaignPreview />;
}
