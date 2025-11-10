import { CheckCircle2, XCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;
  const isStrong = strength === 5;

  const getStrengthColor = () => {
    if (strength <= 2) return "text-destructive";
    if (strength <= 3) return "text-amber-500";
    if (strength === 4) return "text-amber-400";
    return "text-emerald-500";
  };

  const getStrengthText = () => {
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength === 4) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Strength:</span>
        <span className={`font-medium ${getStrengthColor()}`}>
          {getStrengthText()}
        </span>
      </div>
      
      <div className="space-y-1">
        <RequirementItem met={checks.length} text="At least 12 characters" />
        <RequirementItem met={checks.uppercase} text="One uppercase letter" />
        <RequirementItem met={checks.lowercase} text="One lowercase letter" />
        <RequirementItem met={checks.number} text="One number" />
        <RequirementItem met={checks.special} text="One special character (!@#$%^&*)" />
      </div>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );
}
