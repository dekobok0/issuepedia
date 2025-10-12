import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Techniques() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Engineering Techniques</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Techniques library coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
