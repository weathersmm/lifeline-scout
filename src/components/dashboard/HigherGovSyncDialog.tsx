import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  daysBack: z.coerce.number()
    .min(1, { message: "Must be at least 1 day" })
    .max(90, { message: "Cannot exceed 90 days" }),
  keywords: z.string()
    .trim()
    .max(1000, { message: "Keywords must be less than 1000 characters" })
    .optional(),
});

export const HigherGovSyncDialog = () => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daysBack: 7,
      keywords: "EMS ambulance emergency medical services",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-highergov-opportunities",
        {
          body: {
            days_back: values.daysBack,
            search_keywords: values.keywords || "EMS ambulance emergency medical services",
          },
        }
      );

      if (error) throw error;

      toast({
        title: "HigherGov sync completed",
        description: `Fetched ${data.stats.fetched} opportunities, classified ${data.stats.classified} as EMS-related, inserted ${data.stats.inserted}`,
      });

      setOpen(false);
      
      // Reload the page to show new opportunities
      window.location.reload();
    } catch (error) {
      console.error("HigherGov sync error:", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Database className="h-4 w-4" />
          Sync HigherGov
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync HigherGov Opportunities</DialogTitle>
          <DialogDescription>
            Automatically fetch and classify EMS opportunities from HigherGov API.
            AI will filter for relevant EMS opportunities only.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="daysBack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days Back</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="7"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Fetch opportunities posted in the last N days (1-90)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Keywords (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="EMS ambulance emergency medical services"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank to use default EMS-related keywords
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Start Sync"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
