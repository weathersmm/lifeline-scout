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
    
    if (!documentUrl || !opportunityId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Downloading document for parsing:', documentName);

    // Download the document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('opportunity-documents')
      .download(documentUrl);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download document: ${downloadError.message}`);
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = fileData.type || 'application/pdf';

    console.log('Parsing document with Lovable AI...');

    // Call Lovable AI to parse the document
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert RFP analyzer for emergency medical services procurement. Extract comprehensive information from procurement documents and return structured JSON with the following fields:

**Submission Requirements** (submission_requirements):
- Array of required deliverables, documents, certifications, forms
- Include page limits, format requirements, number of copies
- Note any mandatory vs optional submissions

**Deadlines** (deadlines):
- Array of critical dates: {date: "YYYY-MM-DD", description: "event", time: "HH:MM timezone"}
- Include: RFP issue date, questions due, pre-bid meetings, proposal due, interviews, award date

**Qualifications** (qualifications):
- Required licenses, certifications, experience levels
- Minimum years in business, similar contract experience
- Insurance requirements, bonding requirements
- Personnel qualifications and credentials

**Evaluation Criteria** (evaluation_criteria):
- Scoring methodology and point allocations
- Technical evaluation factors and weights
- Price evaluation methodology
- Past performance evaluation criteria

**Technical Requirements** (technical_requirements):
- Service scope: 911/BLS/ALS/CCT/NEMT specifications
- Response time requirements
- Coverage areas and hours of operation
- Fleet/equipment/technology requirements
- Staffing levels and qualifications

**Scope of Work** (scope_of_work):
- Comprehensive summary of services required
- Service delivery model and operational requirements

**Contract Terms** (contract_terms):
- estimated_value: Dollar amount or range if mentioned
- contract_duration: Length and renewal options
- payment_terms: Payment structure and schedule

**Key Contacts** (key_contacts):
- Agency contacts with roles, emails, phones
- Question submission process

**Submission Instructions** (submission_instructions):
- How to submit (email, portal, physical)
- Where to submit (address, portal URL)
- Format requirements (PDF, copies, bindings)
- Labeling and packaging instructions

Return ONLY valid JSON with these exact field names, no markdown formatting.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this RFP/procurement document (${documentName}) for an EMS opportunity. Extract all submission requirements, deadlines, qualifications, evaluation criteria, technical specifications, scope of work, contract terms, key contacts, and submission instructions. Be thorough and specific.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI parsing failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices?.[0]?.message?.content;

    if (!parsedContent) {
      throw new Error('No content returned from AI');
    }

    console.log('AI parsing complete, extracted content');

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = parsedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', parsedContent);
      // Return raw content if JSON parsing fails
      extractedData = {
        raw_content: parsedContent,
        error: 'Failed to parse as JSON'
      };
    }

    // Update the opportunity with extracted information
    const updateData: any = {
      lifecycle_notes: `Document Analysis (${documentName}):\n\n${JSON.stringify(extractedData, null, 2)}`
    };

    // Update estimated value if extracted
    if (extractedData.contract_terms?.estimated_value) {
      const valueMatch = extractedData.contract_terms.estimated_value.match(/[\d,]+/g);
      if (valueMatch) {
        const value = parseInt(valueMatch[0].replace(/,/g, ''));
        updateData.estimated_value_max = value;
      }
    }

    // Update deadlines if extracted
    if (extractedData.deadlines && Array.isArray(extractedData.deadlines)) {
      const proposalDueDate = extractedData.deadlines.find((d: any) => 
        d.description?.toLowerCase().includes('proposal') || 
        d.description?.toLowerCase().includes('submission') ||
        d.description?.toLowerCase().includes('due')
      );
      if (proposalDueDate?.date) {
        updateData.proposal_due = proposalDueDate.date;
      }

      const questionsDueDate = extractedData.deadlines.find((d: any) => 
        d.description?.toLowerCase().includes('question')
      );
      if (questionsDueDate?.date) {
        updateData.questions_due = questionsDueDate.date;
      }

      const preBidDate = extractedData.deadlines.find((d: any) => 
        d.description?.toLowerCase().includes('pre-bid') ||
        d.description?.toLowerCase().includes('prebid')
      );
      if (preBidDate?.date) {
        updateData.pre_bid_meeting = preBidDate.date;
      }
    }

    const { error: updateError } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', opportunityId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update opportunity: ${updateError.message}`);
    }

    console.log('Successfully parsed and updated opportunity');

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData,
        message: 'Document parsed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse document error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
