import type { Metadata } from "next";
import { CampaignDetail } from "@/components/campaign-detail";

export const metadata: Metadata = {
  title: "Campaign",
  description: "Follow a verified medical escrow campaign on CareBridge.",
};

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetail id={id} />;
}
