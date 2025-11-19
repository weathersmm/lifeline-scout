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
    const { conversationId, question, opportunityId, documentName } = await req.json();
    
    if (!question || !opportunityId) {
      return new Response(
        JSON.stringify({ error: 'Question and opportunity ID are required' }),
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

    console.log('Processing document Q&A for opportunity:', opportunityId);

    // Get the opportunity and its parsed document data
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('lifecycle_notes, title, agency, summary')
      .eq('id', opportunityId)
      .single();

    if (oppError) throw oppError;

    // Extract parsed document data from lifecycle_notes
    let documentContext = '';
    if (opportunity.lifecycle_notes) {
      // Try to find Document Analysis section
      const docAnalysisMatch = opportunity.lifecycle_notes.match(/Document Analysis \((.*?)\):\n\n([\s\S]*?)(?=\n\n[A-Z]|$)/);
      if (docAnalysisMatch) {
        documentContext = docAnalysisMatch[2];
      } else {
        documentContext = opportunity.lifecycle_notes;
      }
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data: existingConv } = await supabase
        .from('document_qa_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = existingConv;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('document_qa_conversations')
        .insert({
          opportunity_id: opportunityId,
          document_name: documentName || 'RFP Document'
        })
        .select()
        .single();
      
      if (convError) throw convError;
      conversation = newConv;
    }

    // Get conversation history
    const { data: messages, error: msgError } = await supabase
      .from('document_qa_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Build conversation history for AI
    const conversationHistory = messages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    // Add current question
    conversationHistory.push({
      role: 'user',
      content: question
    });

    console.log('Calling Lovable AI for document Q&A');

    // Call Lovable AI
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
            content: `You are an expert RFP document analyzer helping users understand procurement documents. 

You have access to a parsed RFP document with the following context:

OPPORTUNITY DETAILS:
- Title: ${opportunity.title}
- Agency: ${opportunity.agency}
- Summary: ${opportunity.summary}

PARSED DOCUMENT DATA:
${documentContext}

Your task is to answer questions about this RFP document accurately and concisely. When answering:
1. Provide specific, actionable answers based on the document content
2. Cite specific sections or requirements when possible
3. If information is not in the document, clearly state that
4. Format your response clearly with sections if multiple points
5. Include relevant dates, requirements, or criteria directly from the document

Always maintain a helpful, professional tone and focus on providing accurate information from the document.`
          },
          ...conversationHistory
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI Q&A failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer returned from AI');
    }

    console.log('AI answer generated successfully');

    // Extract potential citations from the answer
    const citations: any[] = [];
    const citationMatches = answer.matchAll(/(?:according to|as stated in|per|from) (?:section |the )?([^.,\n]+)/gi);
    for (const match of citationMatches) {
      citations.push({
        text: match[1].trim(),
        source: 'RFP Document'
      });
    }

    // Save user question
    await supabase
      .from('document_qa_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: question
      });

    // Save AI answer with citations
    const { data: answerMessage, error: answerError } = await supabase
      .from('document_qa_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: answer,
        citations: citations.length > 0 ? citations : null
      })
      .select()
      .single();

    if (answerError) throw answerError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: conversation.id,
        answer: answer,
        citations: citations,
        messageId: answerMessage.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document Q&A error:', error);
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
