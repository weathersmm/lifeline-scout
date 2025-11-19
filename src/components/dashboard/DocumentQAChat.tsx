import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, MessageSquare, Quote } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ text: string; source: string }> | null;
  created_at: string;
}

interface DatabaseMessage {
  id: string;
  role: string;
  content: string;
  citations: any;
  created_at: string;
  conversation_id: string;
}

interface DocumentQAChatProps {
  opportunityId: string;
  opportunityTitle: string;
  documentName?: string;
}

export const DocumentQAChat = ({ 
  opportunityId, 
  opportunityTitle,
  documentName = "RFP Document" 
}: DocumentQAChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversation();
  }, [opportunityId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversation = async () => {
    try {
      // Get most recent conversation for this opportunity
      const { data: conversations, error: convError } = await supabase
        .from('document_qa_conversations')
        .select('id')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (convError) throw convError;

      if (conversations && conversations.length > 0) {
        const convId = conversations[0].id;
        setConversationId(convId);

        // Load messages
        const { data: msgs, error: msgError } = await supabase
          .from('document_qa_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;
        
        // Convert database messages to Message type
        const convertedMessages: Message[] = (msgs || []).map((msg: DatabaseMessage) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          citations: msg.citations as Array<{ text: string; source: string }> | null,
          created_at: msg.created_at
        }));
        
        setMessages(convertedMessages);
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userQuestion = question.trim();
    setQuestion("");
    setIsLoading(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: 'temp-user',
      role: 'user',
      content: userQuestion,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { data, error } = await supabase.functions.invoke('document-qa', {
        body: { 
          conversationId,
          question: userQuestion,
          opportunityId,
          documentName
        }
      });

      if (error) throw error;

      if (data.success) {
        // Update conversation ID if this was the first message
        if (!conversationId) {
          setConversationId(data.conversationId);
        }

        // Reload messages to get the actual saved messages
        await loadConversation();
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (error: any) {
      console.error('Error asking question:', error);
      toast({
        title: "Question failed",
        description: error.message || "Failed to get answer from document",
        variant: "destructive",
      });

      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Document Q&A Assistant
        </CardTitle>
        <CardDescription>
          Ask questions about {documentName} for {opportunityTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium mb-2">No questions yet</p>
              <p className="text-sm">
                Ask questions about submission requirements, deadlines, qualifications, or any other RFP details
              </p>
              <div className="mt-4 text-xs space-y-1">
                <p>Example: "What are the insurance requirements?"</p>
                <p>Example: "When is the pre-bid meeting?"</p>
                <p>Example: "What evaluation criteria will be used?"</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Quote className="h-3 w-3" />
                          <span>Citations:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.citations.map((citation, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {citation.text}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a question about this RFP document..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            onClick={askQuestion}
            disabled={!question.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
