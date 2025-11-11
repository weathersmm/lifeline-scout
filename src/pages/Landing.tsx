import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, Eye, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Database className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">LifeLine Pipeline Scout</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            EMS Opportunity Intelligence Platform
          </p>
        </div>

        {/* Entry Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Internal Entry */}
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Internal</CardTitle>
              <CardDescription className="text-center text-base">
                For LifeLine staff and authorized users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Access real opportunity pipeline data</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Configure automated scraping and notifications</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Generate weekly reports for business development</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Full admin and management capabilities</span>
                </li>
              </ul>
              <Button 
                onClick={() => navigate("/internal-auth")} 
                className="w-full h-12 text-base"
                size="lg"
              >
                Sign In to Internal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Demo Entry */}
          <Card className="border-2 border-border hover:border-accent transition-colors">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="p-3 rounded-full bg-accent/10">
                  <Eye className="h-8 w-8 text-accent-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">External Demo</CardTitle>
              <CardDescription className="text-center text-base">
                For prospects and test drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Explore with synthetic demo data</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>See all features and capabilities in action</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>No real data or commitments required</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Perfect for evaluating the platform</span>
                </li>
              </ul>
              <Button 
                onClick={() => navigate("/demo")} 
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
              >
                View Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground">
          Questions? Contact your LifeLine IT administrator
        </p>
      </div>
    </div>
  );
}
