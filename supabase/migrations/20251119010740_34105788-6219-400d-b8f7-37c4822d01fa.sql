-- Create table for document Q&A conversations
CREATE TABLE IF NOT EXISTS public.document_qa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for Q&A messages
CREATE TABLE IF NOT EXISTS public.document_qa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.document_qa_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_qa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_qa_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Authenticated users can view conversations"
  ON public.document_qa_conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage conversations"
  ON public.document_qa_conversations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- RLS policies for messages
CREATE POLICY "Authenticated users can view messages"
  ON public.document_qa_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage messages"
  ON public.document_qa_messages
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Create indexes for performance
CREATE INDEX idx_document_qa_conversations_opportunity 
  ON public.document_qa_conversations(opportunity_id);

CREATE INDEX idx_document_qa_messages_conversation 
  ON public.document_qa_messages(conversation_id);

CREATE INDEX idx_document_qa_messages_created 
  ON public.document_qa_messages(created_at);

-- Add update trigger for conversations
CREATE TRIGGER update_document_qa_conversations_updated_at
  BEFORE UPDATE ON public.document_qa_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();