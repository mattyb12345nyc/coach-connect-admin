import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, UserCheck } from "lucide-react";

interface SecurityPrivacySettingsProps {
  settings: {
    remove_branding?: boolean;
    private_deployment?: boolean;
    enable_recaptcha_for_public_chatbots?: boolean;
  };
  onChange: (field: string, value: any) => void;
}

export function SecurityPrivacySettings({ settings, onChange }: SecurityPrivacySettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure security features for your chatbot
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="enable_recaptcha_for_public_chatbots" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Enable reCAPTCHA for Public Chatbots
              </Label>
              <p className="text-sm text-muted-foreground">
                Protect public chatbots from spam and abuse with Google reCAPTCHA
              </p>
            </div>
            <Switch
              id="enable_recaptcha_for_public_chatbots"
              checked={settings.enable_recaptcha_for_public_chatbots || false}
              onCheckedChange={(checked) => onChange('enable_recaptcha_for_public_chatbots', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="private_deployment" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private Deployment
              </Label>
              <p className="text-sm text-muted-foreground">
                Restrict access to authorized users only
              </p>
            </div>
            <Switch
              id="private_deployment"
              checked={settings.private_deployment || false}
              onCheckedChange={(checked) => onChange('private_deployment', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Branding & Privacy
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control branding visibility and privacy settings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="remove_branding">Remove Branding</Label>
              <p className="text-sm text-muted-foreground">
                Hide third-party branding from the chat interface
              </p>
            </div>
            <Switch
              id="remove_branding"
              checked={settings.remove_branding ?? true}
              onCheckedChange={(checked) => onChange('remove_branding', checked)}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Some features may require specific subscription plans. 
              Removing branding and private deployment options are typically available 
              in premium plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}