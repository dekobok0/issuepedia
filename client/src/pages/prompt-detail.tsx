import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PromptDetail() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Viewing prompt: {id}
          </p>
          <p className="text-muted-foreground mt-2">
            Full prompt detail page coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
