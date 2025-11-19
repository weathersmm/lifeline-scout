import { CompetitorIntelligence } from "@/components/dashboard/CompetitorIntelligence";
import { AIFeatureErrorBoundary } from "@/components/AIFeatureErrorBoundary";

export default function CompetitorIntelligencePage() {
  return (
    <div className="container mx-auto py-8">
      <AIFeatureErrorBoundary featureName="Competitor Intelligence">
        <CompetitorIntelligence />
      </AIFeatureErrorBoundary>
    </div>
  );
}