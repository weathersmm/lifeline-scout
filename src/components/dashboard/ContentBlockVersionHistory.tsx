import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { History, RotateCcw, Eye } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ContentBlockVersion {
  id: string;
  version_number: number;
  title: string;
  content: string;
  content_type: string;
  lifecycle_stages: string[];
  tags: string[];
  created_at: string;
  change_description?: string;
}

interface ContentBlockVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentBlockId: string;
  onRestore: () => void;
}

export const ContentBlockVersionHistory = ({
  open,
  onOpenChange,
  contentBlockId,
  onRestore
}: ContentBlockVersionHistoryProps) => {
  const [versions, setVersions] = useState<ContentBlockVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ContentBlockVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && contentBlockId) {
      fetchVersions();
    }
  }, [open, contentBlockId]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposal_content_block_versions')
        .select('*')
        .eq('content_block_id', contentBlockId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Failed to load version history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (version: ContentBlockVersion) => {
    if (!confirm(`Restore to version ${version.version_number}? This will create a new version with the restored content.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from('proposal_content_blocks')
        .update({
          title: version.title,
          content: version.content,
          content_type: version.content_type as any,
          lifecycle_stages: version.lifecycle_stages as any,
          tags: version.tags,
        })
        .eq('id', contentBlockId);

      if (error) throw error;

      toast({
        title: "Version restored",
        description: `Restored to version ${version.version_number}`,
      });

      onRestore();
      onOpenChange(false);
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore failed",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[600px]">
          {/* Version List */}
          <div className="border-r pr-4">
            <h3 className="font-semibold mb-3">Versions</h3>
            <ScrollArea className="h-[540px]">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading versions...</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No version history available</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">v{version.version_number}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{version.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {version.content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Version Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Preview</h3>
              {selectedVersion && (
                <Button
                  size="sm"
                  onClick={() => handleRestore(selectedVersion)}
                  disabled={isRestoring}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              )}
            </div>
            <ScrollArea className="h-[540px]">
              {selectedVersion ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="font-medium">{selectedVersion.title}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Content Type</Label>
                    <Badge variant="secondary">{selectedVersion.content_type}</Badge>
                  </div>

                  {selectedVersion.tags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedVersion.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Content</Label>
                    <div className="bg-muted p-3 rounded-md mt-1">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {selectedVersion.content}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Select a version to preview</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);
