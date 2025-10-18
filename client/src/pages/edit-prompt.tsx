import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPromptSchema } from "@shared/schema";
import type { PromptTechnique, Prompt } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const editPromptFormSchema = insertPromptSchema.extend({
  title: z.string().min(10, "Title must be at least 10 characters").max(255),
  promptBodyText: z.string().min(20, "Prompt must be at least 20 characters"),
  rationale: z.string().min(30, "Rationale must be at least 30 characters"),
}).omit({
  authorId: true,
  status: true,
});

type EditPromptForm = z.infer<typeof editPromptFormSchema>;

export default function EditPrompt() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<number[]>([]);

  // Fetch prompt data
  const { data: promptData, isLoading: promptLoading } = useQuery<Prompt & { techniques: PromptTechnique[] }>({
    queryKey: ['/api/v1/prompts', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/prompts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch prompt');
      return res.json();
    },
  });

  // Fetch available techniques
  const { data: techniques = [], isLoading: techniquesLoading } = useQuery<PromptTechnique[]>({
    queryKey: ['/api/v1/techniques'],
  });

  const form = useForm<EditPromptForm>({
    resolver: zodResolver(editPromptFormSchema),
    defaultValues: {
      title: "",
      promptBodyText: "",
      rationale: "",
      version: 1,
      promptBodyJson: null,
      parentPromptId: null,
    },
  });

  // Update form when prompt data loads
  useEffect(() => {
    if (promptData) {
      form.reset({
        title: promptData.title,
        promptBodyText: promptData.promptBodyText || "",
        rationale: promptData.rationale,
        version: promptData.version,
        promptBodyJson: promptData.promptBodyJson,
        parentPromptId: promptData.parentPromptId,
      });
      
      // Set selected techniques
      if (promptData.techniques) {
        setSelectedTechniqueIds(promptData.techniques.map(t => t.id));
      }
    }
  }, [promptData, form]);

  const updatePromptMutation = useMutation({
    mutationFn: async (data: EditPromptForm) => {
      // Force status to pending_review when updating
      const updateData = { ...data, status: 'pending_review' };
      const res = await apiRequest('PUT', `/api/v1/prompts/${id}`, updateData);
      return await res.json();
    },
    onSuccess: async (updatedPrompt: any) => {
      // Get current techniques
      const currentTechniqueIds = new Set(promptData?.techniques?.map(t => t.id) || []);
      const newTechniqueIds = new Set(selectedTechniqueIds);

      // Remove techniques that are no longer selected
      const techniquesToRemove = Array.from(currentTechniqueIds).filter(tid => !newTechniqueIds.has(tid));
      if (techniquesToRemove.length > 0) {
        await Promise.all(
          techniquesToRemove.map(techniqueId =>
            apiRequest('DELETE', `/api/v1/prompts/${id}/techniques/${techniqueId}`, {})
          )
        );
      }

      // Add new techniques
      const techniquesToAdd = selectedTechniqueIds.filter(tid => !currentTechniqueIds.has(tid));
      if (techniquesToAdd.length > 0) {
        await Promise.all(
          techniquesToAdd.map(techniqueId =>
            apiRequest('POST', `/api/v1/prompts/${id}/techniques`, { techniqueId })
          )
        );
      }

      toast({
        title: "Prompt updated!",
        description: "Your prompt has been updated and submitted for review.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/prompts', id] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update prompt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPromptForm) => {
    updatePromptMutation.mutate(data);
  };

  const handleAddTechnique = (techniqueIdStr: string) => {
    const techniqueId = parseInt(techniqueIdStr);
    if (!selectedTechniqueIds.includes(techniqueId)) {
      setSelectedTechniqueIds([...selectedTechniqueIds, techniqueId]);
    }
  };

  const handleRemoveTechnique = (techniqueId: number) => {
    setSelectedTechniqueIds(selectedTechniqueIds.filter(id => id !== techniqueId));
  };

  const availableTechniques = techniques.filter(
    t => !selectedTechniqueIds.includes(t.id)
  );

  const selectedTechniques = techniques.filter(
    t => selectedTechniqueIds.includes(t.id)
  );

  if (promptLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!promptData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Prompt not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">Edit Prompt</CardTitle>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Update your prompt and resubmit for review
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Math Problem Solver with Step-by-Step Reasoning"
                        data-testid="input-title"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title for your prompt
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promptBodyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your prompt here..."
                        className="min-h-[200px] font-mono text-sm"
                        data-testid="input-prompt-text"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The actual prompt text that will be used with AI models
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rationale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rationale</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why this prompt works and when to use it..."
                        className="min-h-[120px]"
                        data-testid="input-rationale"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Explain the reasoning behind your prompt design
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Label>Techniques</Label>
                <div className="flex gap-2 items-start">
                  <Select
                    onValueChange={handleAddTechnique}
                    disabled={techniquesLoading || availableTechniques.length === 0}
                  >
                    <SelectTrigger className="w-[300px]" data-testid="select-technique">
                      <SelectValue placeholder="Select a technique..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTechniques.map((technique) => (
                        <SelectItem 
                          key={technique.id} 
                          value={technique.id.toString()}
                          data-testid={`option-technique-${technique.id}`}
                        >
                          {technique.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTechniques.length > 0 && (
                  <div className="flex flex-wrap gap-2" data-testid="selected-techniques">
                    {selectedTechniques.map((technique) => (
                      <Badge
                        key={technique.id}
                        variant="outline"
                        className="gap-1"
                        data-testid={`badge-technique-${technique.id}`}
                      >
                        {technique.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveTechnique(technique.id)}
                          className="ml-1 hover:bg-muted rounded-sm p-0.5"
                          data-testid={`button-remove-technique-${technique.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Select the prompt engineering techniques used in this prompt
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updatePromptMutation.isPending}
                  data-testid="button-submit-prompt"
                >
                  {updatePromptMutation.isPending ? "Updating..." : "Update & Submit for Review"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
