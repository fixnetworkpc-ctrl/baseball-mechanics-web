"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterSignIn, recruiterSignUp } from "@/lib/recruiter-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Base UI's <Button> renders a native `type="button"` and ignores a passed
  // `type="submit"`, so neither a click nor Enter triggers native form submit.
  // Drive submission explicitly from the button's onClick (and the form's
  // onSubmit, for Enter) — accept any synthetic event so both call sites fit.
  async function handleSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (tab === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signup") {
        // Supabase returns a `user` even when confirmation is pending; only a
        // `session` means we're actually signed in. Branch on session.
        const { user, session } = await recruiterSignUp(email.trim(), password);
        if (session) {
          router.replace("/dashboard");
        } else if (user) {
          setSuccess("Account created! Check your email to confirm your address, then sign in.");
          setTab("signin");
        } else {
          setError("Could not create account. Please try again.");
        }
      } else {
        await recruiterSignIn(email.trim(), password);
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Baseball Mechanics
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Recruiter Portal</h1>
          <p className="text-sm text-muted-foreground">College scouting intelligence</p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as "signin" | "signup"); setError(""); setSuccess(""); }}>
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <p className="text-sm text-muted-foreground">
                  Create a free recruiter account to save players, add notes, and access the full scouting dashboard.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="recruiter@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  placeholder="6+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {tab === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600 dark:text-green-500">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading} onClick={handleSubmit}>
                {loading ? "Please wait…" : tab === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Recruiter accounts are separate from player or coach accounts.
        </p>
      </div>
    </div>
  );
}
