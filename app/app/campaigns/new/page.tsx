import type { Metadata } from "next";
import { CreateCampaignForm } from "@/components/create-campaign-form";

export const metadata: Metadata = {
  title: "Start a campaign",
  description: "Create a verified patient crowdfunding campaign with Soroban escrow.",
};

export default function NewCampaignPage() {
  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Create a campaign</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
          Open a transparent medical escrow
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Define the care need, add the provider and an independent verifier, and publish
          the campaign on Stellar. Only the verifier can release funds against approved
          invoices.
        </p>
      </div>
      <div className="mt-8">
        <CreateCampaignForm />
      </div>
    </div>
  );
}
