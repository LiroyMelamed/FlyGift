import type { Metadata } from "next";
import { LandingShell } from "@/components/landing/LandingShell";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroAirplane } from "@/components/landing/HeroAirplane";
import { StoryConcept } from "@/components/landing/StoryConcept";
import { StorySearch } from "@/components/landing/StorySearch";
import { StoryGiftCard } from "@/components/landing/StoryGiftCard";
import { FinaleCTA } from "@/components/landing/FinaleCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "FlyGift — מתנת הטיסה",
  description:
    "FlyGift — שלחו את החוויה, לא רק את הכרטיס. כרטיסי מתנה דיגיטליים לטיסות ומלונות ברחבי העולם.",
};

export default function LandingPage() {
  return (
    <LandingShell>
      <main className="relative min-h-dvh w-full overflow-x-hidden text-text-primary">
        <LandingNavbar />
        <HeroAirplane />
        <StoryConcept />
        <StorySearch />
        <StoryGiftCard />
        <FinaleCTA />
        <LandingFooter />
      </main>
    </LandingShell>
  );
}
