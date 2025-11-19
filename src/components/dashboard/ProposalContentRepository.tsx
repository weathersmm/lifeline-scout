import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Copy, FileText, History, Sparkles } from 'lucide-react';
import { ContentBlockEditor } from './ContentBlockEditor';
import { ContentBlockVersionHistory } from './ContentBlockVersionHistory';
import { AIContentGenerator } from './AIContentGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LifecycleStage, Opportunity } from '@/types/opportunity';
import { useAuth } from '@/hooks/useAuth';

interface ContentBlock {
  id: string;
  title: string;
  content: string;
  content_type: string;
  lifecycle_stages: LifecycleStage[];
  tags: string[];
  created_by: string | null;
  created_at: string;
  is_template: boolean;
}

interface ProposalContentRepositoryProps {
  currentStage?: LifecycleStage;
  opportunityId?: string;
  opportunity?: Opportunity;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  past_performance: 'Past Performance',
  technical_approach: 'Technical Approach',
  team_bio: 'Team Bio',
  executive_summary: 'Executive Summary',
  management_approach: 'Management Approach',
  quality_control: 'Quality Control',
  staffing_plan: 'Staffing Plan',
  other: 'Other',
};

export const ProposalContentRepository = ({
  currentStage,
  opportunityId,
  opportunity
}: ProposalContentRepositoryProps) => {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [filteredBlocks, setFilteredBlocks] = useState<ContentBlock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedBlockForHistory, setSelectedBlockForHistory] = useState<string>('');
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const { toast } = useToast();
  const { effectiveRole } = useAuth();
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'member';

  useEffect(() => {
    fetchContentBlocks();
  }, []);

  useEffect(() => {
    filterBlocks();
  }, [searchTerm, selectedType, contentBlocks, currentStage]);

  const fetchContentBlocks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposal_content_blocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContentBlocks(data || []);
    } catch (error) {
      console.error('Error fetching content blocks:', error);
      toast({
        title: "Failed to load content blocks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterBlocks = () => {
    let filtered = [...contentBlocks];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(block =>
        block.title.toLowerCase().includes(term) ||
        block.content.toLowerCase().includes(term) ||
        block.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filter by content type
    if (selectedType !== 'all') {
      filtered = filtered.filter(block => block.content_type === selectedType);
    }

    // Filter by current stage if provided
    if (currentStage) {
      filtered = filtered.filter(block =>
        block.lifecycle_stages.length === 0 || block.lifecycle_stages.includes(currentStage)
      );
    }

    setFilteredBlocks(filtered);
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Content block copied successfully",
    });
  };

  const handleEdit = (block: ContentBlock) => {
    setEditingBlock(block);
    setEditorOpen(true);
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this content block?')) return;

    try {
      const { error } = await supabase
        .from('proposal_content_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: "Content block deleted",
      });

      fetchContentBlocks();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    setEditingBlock(null);
    setEditorOpen(true);
  };

  const handleViewHistory = (blockId: string) => {
    setSelectedBlockForHistory(blockId);
    setVersionHistoryOpen(true);
  };

  const handleAIGenerate = () => {
    setAiGeneratorOpen(true);
  };

  const handleContentGenerated = async (content: string, type: string) => {
    // Auto-populate editor with AI-generated content
    const newBlock = {
      id: '',
      title: `AI Generated - ${CONTENT_TYPE_LABELS[type]} - ${new Date().toLocaleDateString()}`,
      content: content,
      content_type: type,
      lifecycle_stages: currentStage ? [currentStage] : [],
      tags: opportunity?.serviceTags || [],
      created_by: null,
      created_at: new Date().toISOString(),
      is_template: false,
    };
    setEditingBlock(newBlock);
    setEditorOpen(true);
  };

  const groupedBlocks = filteredBlocks.reduce((acc, block) => {
    const type = block.content_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(block);
    return acc;
  }, {} as Record<string, ContentBlock[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Proposal Content Repository</h3>
          <p className="text-sm text-muted-foreground">
            Reusable content blocks for proposal development
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAIGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Content Block
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search content blocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Blocks */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading content blocks...
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No content blocks found</p>
          {canEdit && (
            <Button variant="outline" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Content Block
            </Button>
          )}
        </div>
      ) : (
        <Tabs defaultValue={Object.keys(groupedBlocks)[0]} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {Object.keys(groupedBlocks).map((type) => (
              <TabsTrigger key={type} value={type}>
                {CONTENT_TYPE_LABELS[type]} ({groupedBlocks[type].length})
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedBlocks).map(([type, blocks]) => (
            <TabsContent key={type} value={type} className="space-y-3">
              {blocks.map((block) => (
                <Card key={block.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{block.title}</CardTitle>
                        <CardDescription className="flex flex-wrap gap-1 mt-2">
                          {block.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewHistory(block.id)}
                          title="Version history"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopyContent(block.content)}
                          title="Copy content"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(block)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(block.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {block.content.substring(0, 300)}
                        {block.content.length > 300 && '...'}
                      </pre>
                    </div>
                    {block.lifecycle_stages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        <span className="text-xs text-muted-foreground">Stages:</span>
                        {block.lifecycle_stages.map((stage) => (
                          <Badge key={stage} variant="outline" className="text-xs">
                            {stage.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Editor Dialog */}
      <ContentBlockEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        block={editingBlock}
        onSaved={fetchContentBlocks}
      />

      {/* Version History Dialog */}
      <ContentBlockVersionHistory
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        contentBlockId={selectedBlockForHistory}
        onRestore={fetchContentBlocks}
      />

      {/* AI Content Generator */}
      <AIContentGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        opportunity={opportunity}
        onContentGenerated={handleContentGenerated}
      />
    </div>
  );
};
