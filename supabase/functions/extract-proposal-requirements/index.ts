import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrl, documentName, opportunityId } = await req.json();
    
    if (!documentUrl || !documentName) {
      console.error('Missing required parameters:', { documentUrl, documentName });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting requirements from:', documentName);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the document
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('opportunity-documents')
      .download(documentUrl);

    if (downloadError) {
      console.error('Error downloading document:', downloadError);
      throw new Error(`Failed to download document: ${downloadError.message}`);
    }

    // Convert to base64 in chunks to avoid stack overflow
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64Doc = btoa(binaryString);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const EMS_CATEGORIES = {
      "EMS Service Scope": ["ambulance", "BLS", "ALS", "emergency medical", "paramedic", "EMT", "911", "CCT", "critical care"],
      "Staffing and Supervision Plan": ["staffing", "personnel", "supervisory", "shift", "coverage", "crew", "employee"],
      "Continuous Quality Improvement": ["quality improvement", "CQI", "performance metrics", "clinical care", "quality assurance"],
      "Corporate Experience": ["experience", "past performance", "references", "contracts", "municipal", "county"],
      "Training and Certification Plan": ["training", "certification", "education", "onboarding", "specialized training"],
      "Disaster Preparedness and Mutual Aid": ["disaster", "emergency response", "mutual aid", "incidents", "major events"],
      "Data and Interoperability Strategy": ["data", "interoperability", "ePCR", "records", "information systems"],
      "Vehicle Deployment Strategy": ["vehicle", "fleet", "deployment", "ambulance", "units", "equipment"],
      "Financial Capacity and Stability": ["financial", "audited", "fiscal", "stability", "insurance", "bonding"],
      "Performance Reporting and Metrics": ["reporting", "metrics", "APOT", "response time", "compliance", "KPI"]
    };

    const systemPrompt = `You are an expert proposal requirements analyst specializing in EMS procurement. Extract ALL requirements, submission instructions, deliverable specifications, and formatting requirements from RFP/solicitation documents.

IMPORTANT: Classify each requirement using these EMS-specific categories:
${Object.keys(EMS_CATEGORIES).join(', ')}

Parse the document and identify:

1. **Hierarchical Requirements Structure:**
   - Roman numeral sections (I., II., III., IV., etc.)
   - Letter sections (A., B., C., etc.)
   - Numbered questions/requirements (1., 2., 3., etc.)
   - Sub-lettered items (a., b., c., etc.)
   - Assign hierarchical IDs like: "A.1", "A.1.a", "IV.2.b"

2. **Deliverable Specifications:**
   - Page limits (per section or total)
   - File formats required (.pdf, .docx, .xlsx)
   - Margins, fonts, font sizes
   - Required sections, headings, volumes
   - Cover page requirements
   - Table of contents requirements
   - Number of copies (physical/electronic)

3. **Submission Requirements:**
   - Submission deadline
   - Submission method (portal, email, physical)
   - Number of volumes/binders
   - Organization/sequencing requirements
   - Labeling requirements

4. **Evaluation Criteria:**
   - Scoring factors
   - Evaluation weights
   - Required qualifications

Return a JSON object with this structure:
{
  "requirements": [
    {
      "id": "A.1",
      "section": "A",
      "subsection": "Technical Approach",
      "text": "Describe your approach to providing BLS and ALS services",
      "type": "technical_requirement",
      "category": "EMS Service Scope",
      "tags": ["BLS", "ALS"],
      "pageLimit": 10
    }
  ],
  "deliverableSpecs": {
    "pageLimit": 50,
    "format": "PDF",
    "margins": "1 inch all sides",
    "font": "Times New Roman or Arial",
    "fontSize": "12pt",
    "volumes": ["Technical", "Management", "Cost"],
    "sections": ["Cover Page", "Executive Summary", "Technical Approach", "Past Performance", "Management Plan", "Cost Proposal"]
  },
  "submissionDetails": {
    "deadline": "2025-01-15",
    "method": "Electronic via portal",
    "copies": "1 electronic, 3 physical"
  },
  "evaluationCriteria": [
    {
      "factor": "Technical Approach",
      "weight": 40,
      "description": "Quality and feasibility of proposed technical solution"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all requirements and deliverable specifications from this ${documentName.endsWith('.pdf') ? 'PDF' : 'document'}.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${documentName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};base64,${base64Doc}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;

    console.log('Raw AI response:', content);

    // Parse JSON from the response
    let extractedData;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return raw content if JSON parsing fails
      extractedData = {
        requirements: [],
        rawContent: content,
        error: 'Failed to parse structured requirements'
      };
    }

    console.log('Successfully extracted requirements:', {
      requirementCount: extractedData.requirements?.length || 0,
      hasDeliverableSpecs: !!extractedData.deliverableSpecs
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        documentName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-proposal-requirements:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
