import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReasoningLab } from "@/components/reasoning-lab/reasoning-lab";

export const metadata: Metadata = {
  title: "Time Hacker · 推理玩法研究",
  robots: { index: false, follow: false },
};

export default function ReasoningPage() {
  // Research is not a production campaign, even if this commit is later deployed.
  if (process.env.NODE_ENV !== "development") notFound();
  return <ReasoningLab />;
}
