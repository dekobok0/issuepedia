import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreatePrompt() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Prompt creation form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
