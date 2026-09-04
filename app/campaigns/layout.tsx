import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign Agents — Embodied Arena",
  description: "A human-approved agent team for compliant email, X, Instagram, and TikTok campaigns.",
};

export default function CampaignsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
