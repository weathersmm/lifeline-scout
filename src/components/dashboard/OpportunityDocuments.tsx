import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface OpportunityDocument {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  file_path: string;
}

interface OpportunityDocumentsProps {
  opportunityId: string;
  documents: OpportunityDocument[];
  onDocumentsUpdate: () => void;
  canEdit: boolean;
}

export const OpportunityDocuments = ({
  opportunityId,
  documents,
  onDocumentsUpdate,
  canEdit
}: OpportunityDocumentsProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 52428800) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${opportunityId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('opportunity-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update opportunity documents array
      const newDoc: OpportunityDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString(),
        file_path: fileName
      };

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({
          documents: [...documents, newDoc] as any
        })
        .eq('id', opportunityId);

      if (updateError) throw updateError;

      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully`,
      });

      onDocumentsUpdate();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (doc: OpportunityDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('opportunity-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: OpportunityDocument) => {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('opportunity-documents')
        .remove([doc.file_path]);

      if (deleteError) throw deleteError;

      // Update opportunity documents array
      const updatedDocs = documents.filter(d => d.id !== doc.id);

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ documents: updatedDocs as any })
        .eq('id', opportunityId);

      if (updateError) throw updateError;

      toast({
        title: "Document deleted",
        description: `${doc.name} has been deleted`,
      });

      onDocumentsUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="flex-1"
          />
          <Button disabled={isUploading} size="icon" variant="outline">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(doc.size)} • {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
