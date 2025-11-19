# AI Feature Error Boundaries

This document describes the error boundary implementation for AI-powered features in PipeLine Scout.

## Overview

All AI-powered features are wrapped with `AIFeatureErrorBoundary` components to gracefully handle edge function failures, rate limiting, and other runtime errors without breaking the UI.

## Components

### AIFeatureErrorBoundary

A React error boundary component that catches JavaScript errors anywhere in its child component tree and displays a fallback UI.

**Location**: `src/components/AIFeatureErrorBoundary.tsx`

**Features**:
- Catches and displays runtime errors
- Shows user-friendly error messages
- Provides "Try Again" and "Reload Page" buttons
- Displays common error causes (rate limiting, network issues, etc.)
- Logs errors to console for debugging

**Usage**:
```tsx
<AIFeatureErrorBoundary featureName="Feature Name">
  <YourAIFeatureComponent />
</AIFeatureErrorBoundary>
```

### AIFeatureSuspense

A Suspense wrapper with a loading fallback optimized for AI features.

**Location**: `src/components/AIFeatureSuspense.tsx`

**Features**:
- Shows skeleton loading states
- Customizable loading message
- Optimized for AI feature loading patterns

**Usage**:
```tsx
<AIFeatureSuspense loadingMessage="Loading AI Feature...">
  <YourAIFeatureComponent />
</AIFeatureSuspense>
```

## Protected Features

The following AI-powered features are protected with error boundaries:

### Opportunity Management
- **AI-Enhanced Overview** (`OpportunityOverviewEnhancer`)
  - Location: Details tab in OpportunityDetailDialog
  - Generates comprehensive opportunity intelligence

### Strategic Analysis
- **Competitive Assessment** (`CompetitiveAssessmentDashboard`)
  - Location: Competitive tab in OpportunityDetailDialog
  - SWOT analysis and competitor benchmarking

- **Price-to-Win Analysis** (`PTWAnalysis`)
  - Location: PTW tab in OpportunityDetailDialog
  - Pricing strategy and margin optimization

- **Go/No-Go Evaluation** (`GoNoGoMatrix`)
  - Location: Go/No-Go tab in OpportunityDetailDialog
  - 7-gate decision framework

### Predictive Features
- **Win Probability Predictor** (`WinProbabilityPredictor`)
  - Location: ML Predict tab in OpportunityDetailDialog
  - Machine learning-based win probability

### Document Processing
- **Capture Plan Generator** (`CapturePlanGenerator`)
  - Location: Capture Plan tab in OpportunityDetailDialog
  - Automated capture plan generation

- **Document Q&A** (`DocumentQAChat`)
  - Location: Doc Q&A tab in OpportunityDetailDialog
  - AI-powered document question answering

### Proposal Management
- **Proposal Content Repository** (`ProposalContentRepository`)
  - Location: Content tab in OpportunityDetailDialog
  - Content block management

- **Proposal Generator** (`ProposalGenerator`)
  - Location: Dialog triggered from template library
  - Generates proposals from templates

### Competitive Intelligence
- **AI Competitor Intelligence Gatherer** (`CompetitorIntelligenceGatherer`)
  - Location: CompetitorIntelligence component (AI tab)
  - Automated competitor research

- **Competitor Intelligence Page** (`CompetitorIntelligencePage`)
  - Location: Standalone page
  - Full competitor intelligence dashboard

## Common Errors Handled

### Rate Limiting (429)
- **Cause**: Too many requests to AI gateway
- **User Message**: "Rate limits exceeded, please try again later."
- **Solution**: Wait and retry, or upgrade plan

### Payment Required (402)
- **Cause**: Out of Lovable AI credits
- **User Message**: "Payment required, please add funds to your Lovable AI workspace."
- **Solution**: Add credits in Settings → Workspace → Usage

### Network Errors
- **Cause**: Connectivity issues or timeouts
- **User Message**: "Network connectivity issues"
- **Solution**: Check connection and retry

### Invalid Data
- **Cause**: Missing or malformed data
- **User Message**: "Invalid or missing data"
- **Solution**: Verify data integrity and retry

## Best Practices

### When to Add Error Boundaries

Add `AIFeatureErrorBoundary` when:
1. Component calls Supabase edge functions
2. Component uses Lovable AI Gateway
3. Component processes AI-generated content
4. Component depends on external AI services

### Error Boundary Naming

Use descriptive `featureName` props that clearly identify the feature:
- ✅ "AI-Enhanced Overview"
- ✅ "Competitive Assessment"
- ✅ "Win Probability Predictor"
- ❌ "Component"
- ❌ "Feature"

### Nested Error Boundaries

You can nest error boundaries for granular error handling:
```tsx
<AIFeatureErrorBoundary featureName="Dashboard">
  <AIFeatureErrorBoundary featureName="Specific Widget">
    <Widget />
  </AIFeatureErrorBoundary>
</AIFeatureErrorBoundary>
```

## Testing Error Boundaries

### Manual Testing

1. **Simulate Network Failure**:
   - Open DevTools → Network tab
   - Set throttling to "Offline"
   - Trigger AI feature

2. **Simulate Rate Limiting**:
   - Call AI feature repeatedly
   - Should see 429 error after hitting limits

3. **Simulate Component Error**:
   - Temporarily throw error in component
   - Verify error boundary catches it

### What to Verify

- ✅ Error boundary displays fallback UI
- ✅ Error message is user-friendly
- ✅ "Try Again" button works
- ✅ Error is logged to console
- ✅ Other features continue working

## Troubleshooting

### Error Boundary Not Catching Error

**Problem**: Error passes through boundary
**Causes**:
- Error thrown in event handler (not during render)
- Error thrown in async code
- Error thrown in server component

**Solution**: Add try-catch in event handlers and async functions

### Error Boundary Caught But Not Displaying

**Problem**: Blank screen instead of fallback
**Causes**:
- Error in error boundary itself
- Error in fallback component

**Solution**: Check browser console for additional errors

## Security Considerations

### Never Display Sensitive Data in Errors

```tsx
// ❌ BAD - Exposes API keys
<p>Error: {error.message} - API Key: {apiKey}</p>

// ✅ GOOD - Generic message
<p>Error: An error occurred while processing your request</p>
```

### Log Full Errors Securely

```tsx
// ✅ Log full error for debugging (server-side only)
console.error('Full error details:', error);

// ✅ Show user-friendly message
return <ErrorFallback message="Something went wrong" />;
```

## Future Improvements

- [ ] Add Sentry or error tracking integration
- [ ] Implement automatic retry with exponential backoff
- [ ] Add offline mode detection and queuing
- [ ] Implement circuit breaker pattern
- [ ] Add error analytics dashboard
- [ ] Create error notification system

## Related Documentation

- [Security Testing Guide](../tests/README_SECURITY_TESTS.md)
- [Edge Functions Documentation](../supabase/functions/README.md)
- [Lovable AI Documentation](https://docs.lovable.dev/features/ai)
