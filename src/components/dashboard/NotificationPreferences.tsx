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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const serviceTags: ServiceTag[] = [
  'EMS 911', 'Non-Emergency', 'IFT', 'BLS', 'ALS', 'CCT',
  'MEDEVAC', 'Billing', 'CQI', 'EMS Tech', 'VR/Sim'
];

const priorities: Priority[] = ['high', 'medium', 'low'];

const formSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  enabled: z.boolean(),
  minPriority: z.enum(['high', 'medium', 'low'] as const),
  serviceTags: z.array(z.string()),
});

export const NotificationPreferences = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      enabled: false,
      minPriority: 'high',
      serviceTags: [],
    },
  });

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
        form.reset({
          email: data.email,
          enabled: data.enabled,
          minPriority: data.min_priority as Priority,
          serviceTags: data.service_tags as ServiceTag[],
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          enabled: values.enabled,
          email: values.email,
          service_tags: values.serviceTags as any,
          min_priority: values.minPriority,
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
    const currentTags = form.getValues('serviceTags');
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    form.setValue('serviceTags', newTags);
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Enable/Disable */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Notifications</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for matching opportunities
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      disabled={!form.watch('enabled')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Minimum Priority */}
            <FormField
              control={form.control}
              name="minPriority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Priority</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!form.watch('enabled')}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Tags */}
            <FormField
              control={form.control}
              name="serviceTags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Tags (Optional)</FormLabel>
                  <p className="text-sm text-muted-foreground mb-2">
                    Leave empty to receive all opportunities, or select specific tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {serviceTags.map((tag) => {
                      const isSelected = field.value.includes(tag);
                      const enabled = form.watch('enabled');
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};