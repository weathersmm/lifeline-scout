import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Lock, Mail, Shield, Smartphone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { isLandingEntry } from "@/config/entryMode";

/**
 * Internal-only authentication page
 * Used when ENTRY_MODE=internal (scout-internal.ewproto.com)
 * No signup option - internal staff accounts only
 */
export default function InternalAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<'login' | 'enroll' | 'verify'>('login');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    // Check for stored session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasStoredSession(true);
      }
    });

    // Avoid redirect flicker: only navigate after a real sign-in event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const redirectPath = isLandingEntry ? "/dashboard" : "/";
        navigate(redirectPath);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Check if user has MFA enrolled
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    
    if (!factorsError && factors && factors.totp && factors.totp.length > 0) {
      // User has MFA enrolled, show verification
      setFactorId(factors.totp[0].id);
      setMfaStep('verify');
      setIsLoading(false);
    } else {
      // First time login, enroll in MFA
      await enrollMFA();
    }
  };

  const enrollMFA = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'LifeLine Internal Auth',
    });

    if (error) {
      // If factor already exists, list factors and go to verification
      if (error.message?.includes('already exists')) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors && factors.totp && factors.totp.length > 0) {
          setFactorId(factors.totp[0].id);
          setMfaStep('verify');
          toast({
            title: "Authenticator already set up",
            description: "Please enter your authentication code to continue.",
          });
          setIsLoading(false);
          return;
        }
      }
      
      toast({
        title: "Error setting up authenticator",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setMfaStep('enroll');
    }

    setIsLoading(false);
  };

  const handleVerifyEnrollment = async () => {
    if (totpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: totpCode,
    });

    if (error) {
      toast({
        title: "Error verifying code",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Authenticator enabled!",
      description: "Your account is now secured with two-factor authentication.",
    });
    
    const redirectPath = isLandingEntry ? "/dashboard" : "/";
    navigate(redirectPath);
    setIsLoading(false);
  };

  const handleVerifyMFA = async () => {
    if (totpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      toast({
        title: "Error",
        description: challengeError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: totpCode,
    });

    if (verifyError) {
      toast({
        title: "Invalid code",
        description: "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Welcome back!",
      description: "Successfully signed in.",
    });
    
    const redirectPath = isLandingEntry ? "/dashboard" : "/";
    navigate(redirectPath);
    setIsLoading(false);
  };


  // Render MFA Enrollment Screen
  if (mfaStep === 'enroll') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md border-border/50 shadow-elevated">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Set Up Authenticator</CardTitle>
            <CardDescription className="text-center">
              Scan this QR code with your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Or enter this code manually:</p>
                <code className="block px-4 py-2 bg-muted rounded text-sm font-mono break-all">
                  {secret}
                </code>
              </div>
            </div>

            <Separator />

            {/* Verification Code Input */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Enter 6-digit code from your app
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              onClick={handleVerifyEnrollment}
              className="w-full h-11" 
              disabled={isLoading || totpCode.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify & Enable"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Use Google Authenticator, Microsoft Authenticator, or Authy
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render MFA Verification Screen
  if (mfaStep === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md border-border/50 shadow-elevated">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-center">
              Enter the code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                6-digit authentication code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              onClick={handleVerifyMFA}
              className="w-full h-11" 
              disabled={isLoading || totpCode.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>

            <Button 
              onClick={() => {
                setMfaStep('login');
                setTotpCode('');
              }}
              variant="ghost"
              className="w-full" 
              disabled={isLoading}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Session Detected Banner */}
        {hasStoredSession && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Session detected</p>
                    <p className="text-xs text-muted-foreground">You're already signed in</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate(isLandingEntry ? "/dashboard" : "/")}
                  size="sm"
                  className="shrink-0"
                >
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full border-border/50 shadow-elevated">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Database className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">LifeLine Pipeline Scout</CardTitle>
          <CardDescription className="text-center">
            Internal Access - Staff Only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password + MFA Only */}
          <div className="text-center text-sm text-muted-foreground py-2 border border-border/50 rounded-md bg-muted/30">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Use email/password with mandatory MFA for secure access</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@lifeline.com"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Protected with two-factor authentication</span>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Internal accounts only. Contact IT for access.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
