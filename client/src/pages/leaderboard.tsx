import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Leaderboard() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Reputation leaderboard coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
