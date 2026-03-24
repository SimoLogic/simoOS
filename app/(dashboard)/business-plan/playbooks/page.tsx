import React from "react";
import { PlaybookMarketplaceApp } from "@/components/business-plan/playbooks/PlaybookMarketplaceApp";

export const metadata = {
  title: "Playbook Marketplace | SIMO Intellisense",
  description: "Browse and assign published operational playbooks.",
};

export default function PlaybooksPage() {
  return (
    <div className="h-full w-full">
      <PlaybookMarketplaceApp />
    </div>
  );
}
