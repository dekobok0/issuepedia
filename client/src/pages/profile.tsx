import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            User profile coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
