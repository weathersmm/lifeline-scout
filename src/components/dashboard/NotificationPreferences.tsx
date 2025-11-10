import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, X } from 'lucide-react';
import { ServiceTag, Priority, ContractType } from '@/types/opportunity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const serviceTags: ServiceTag[] = [
  'EMS 911', 'Non-Emergency', 'IFT', 'BLS', 'ALS', 'CCT',
  'MEDEVAC', 'Billing', 'CQI', 'EMS Tech', 'VR/Sim'
];

const priorities: Priority[] = ['high', 'medium', 'low'];

export const NotificationPreferences = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedServiceTags, setSelectedServiceTags] = useState<ServiceTag[]>([]);
  const [minPriority, setMinPriority] = useState<Priority>('high');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEnabled(data.enabled);
        setEmail(data.email);
        setSelectedServiceTags(data.service_tags as ServiceTag[]);
        setMinPriority(data.min_priority as Priority);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to save preferences",
        });
        return;
      }

      if (!email) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Email is required",
        });
        return;
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          enabled,
          email,
          service_tags: selectedServiceTags,
          min_priority: minPriority,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
      setOpen(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceTag = (tag: ServiceTag) => {
    setSelectedServiceTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4 mr-2" />
          Email Alerts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Notification Preferences</DialogTitle>
          <DialogDescription>
            Get notified when new high-priority opportunities matching your criteria are discovered
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for matching opportunities
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!enabled}
            />
          </div>

          {/* Minimum Priority */}
          <div className="space-y-2">
            <Label>Minimum Priority</Label>
            <Select
              value={minPriority}
              onValueChange={(value) => setMinPriority(value as Priority)}
              disabled={!enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Only notify for opportunities at or above this priority level
            </p>
          </div>

          {/* Service Tags */}
          <div className="space-y-2">
            <Label>Service Tags (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Leave empty to receive all opportunities, or select specific tags
            </p>
            <div className="flex flex-wrap gap-2">
              {serviceTags.map((tag) => {
                const isSelected = selectedServiceTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${!enabled && 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => enabled && toggleServiceTag(tag)}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};