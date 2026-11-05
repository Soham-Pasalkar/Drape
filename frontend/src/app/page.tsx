import Hero from "@/components/Hero";
import FeaturedCollections from "@/components/FeaturedCollections";
import EditorialSpread from "@/components/EditorialSpread";
import ShopTheLook from "@/components/ShopTheLook";
import VirtualTryOnPreview from "@/components/VirtualTryOnPreview";
import WardrobeAndStylist from "@/components/WardrobeAndStylist";
import CampaignFinale from "@/components/CampaignFinale";

export default function Home() {
  return (
    <>
      {/* Section A: Dominant Magazine-Cover Hero Campaign */}
      <Hero />

      {/* Section B: Large Image-Based Featured Collections */}
      <FeaturedCollections />

      {/* Section C: Asymmetric Magazine Spread (The DRAPE Edit) */}
      <EditorialSpread />

      {/* Section D: Curated Outfits & Product Breakdown (Shop The Look) */}
      <ShopTheLook />

      {/* Section E: Image-Led Virtual Try-On Studio Preview */}
      <VirtualTryOnPreview />

      {/* Section F: Digital Wardrobe & AI Fashion Stylist Storytelling */}
      <WardrobeAndStylist />

      {/* Section G: Photographic Campaign Finale */}
      <CampaignFinale />
    </>
  );
}
