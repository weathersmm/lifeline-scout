import { CompetitorIntelligence } from "@/components/dashboard/CompetitorIntelligence";
import { AIFeatureCircuitBreaker } from "@/components/AIFeatureCircuitBreaker";

export default function CompetitorIntelligencePage() {
  return (
    <div className="container mx-auto py-8">
      <AIFeatureCircuitBreaker featureName="Competitor Intelligence">
        <CompetitorIntelligence />
      </AIFeatureCircuitBreaker>
    </div>
  );
}