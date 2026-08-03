"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Users, Sparkles } from "lucide-react";
import {
  recruiterSignIn,
  recruiterSignUp,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
} from "@/lib/recruiter-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  // "auth" is the sign-in/sign-up card; "reset" swaps the whole card for recovery
  // rather than adding a third tab — recovery is a detour out of sign-in, not a
  // peer of it, and a tab would imply you can sit there.
  const [mode, setMode] = useState<"auth" | "reset">("auth");
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function goToReset() {
    setMode("reset");
    setResetStep("request");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirm("");
    setCode("");
  }

  function backToSignIn() {
    setMode("auth");
    setTab("signin");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirm("");
    setCode("");
  }

  async function handleReset(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (resetStep === "request") {
      if (!email.trim()) {
        setError("Enter your email address.");
        return;
      }
      setLoading(true);
      try {
        await requestPasswordReset(email.trim());
        // Worded so it reveals nothing either way. Supabase does not error on an
        // unknown address, and confirming one here would make this an
        // account-existence oracle for anyone who can load the page.
        setSuccess("If an account exists for that email, we sent it a verification code.");
        setResetStep("verify");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send a code. Try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!code.trim()) {
      setError("Enter the code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Verifying the code signs the user in; that session is what authorizes the
      // password write. They must happen together — see recruiter-service.ts.
      await verifyPasswordResetCode(email.trim(), code.trim());
      await updatePassword(password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code was not accepted. Request a new one and try again.",
      );
      setLoading(false);
    }
  }

  // Base UI's <Button> renders a native `type="button"` and ignores a passed
  // `type="submit"`, so submission is driven from onClick (and form onSubmit).
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
    <div className="flex min-h-screen flex-1">
      {/* Brand hero (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#06101e] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 15% 0%, rgba(43,128,255,0.16), transparent 70%), radial-gradient(55% 45% at 100% 100%, rgba(194,16,38,0.18), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg">
            BM
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Baseball Mechanics</p>
            <p className="text-sm font-bold">Recruiter Portal</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            The intelligence layer for player evaluation.
          </h1>
          <p className="max-w-md text-white/70">
            AI-graded mechanics, recruiting-ready reports, and prospect discovery — built for coaches and college recruiters.
          </p>
          <ul className="space-y-3">
            {[
              { icon: TrendingUp, text: "PMI / HMI / CMI mechanics scoring with trends" },
              { icon: Users, text: "Search, discover, and shortlist prospects" },
              { icon: Sparkles, text: "AI Recruit assistant ranks matches for you" },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">Recruiter accounts are separate from player or coach accounts.</p>
      </div>

      {/* Auth form */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center lg:hidden">
            <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
              BM
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Recruiter Portal</h1>
          </div>

          <Card>
            <CardHeader>
              {mode === "auth" ? (
                <Tabs value={tab} onValueChange={(v) => { setTab(v as "signin" | "signup"); setError(""); setSuccess(""); }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <div className="space-y-1">
                  {/* h2, not h1: the hero and the mobile header already own the page's h1. */}
                  <h2 className="text-lg font-bold tracking-tight">Reset your password</h2>
                  <p className="text-sm text-muted-foreground">
                    {resetStep === "request"
                      ? "We'll email you a verification code."
                      : "Enter the code we emailed you, then choose a new password."}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {mode === "auth" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {tab === "signup" && (
                    <p className="text-sm text-muted-foreground">
                      Create a free recruiter account to save players, add notes, and access the full scouting dashboard.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="recruiter@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>

                  {tab === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm password</Label>
                      <Input id="confirm" type="password" autoComplete="new-password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {success && <p className="text-sm text-success">{success}</p>}

                  <Button type="submit" className="w-full" disabled={loading} onClick={handleSubmit}>
                    {loading ? "Please wait…" : tab === "signup" ? "Create Account" : "Sign In"}
                  </Button>

                  {tab === "signin" && (
                    <p className="text-center">
                      <button
                        type="button"
                        onClick={goToReset}
                        className="rounded-sm text-sm text-brand-accent hover:underline"
                      >
                        Forgot password?
                      </button>
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {resetStep === "request" ? (
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="recruiter@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Sent to <span className="font-medium text-foreground">{email.trim()}</span>.
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="reset-code">Verification code</Label>
                        {/* Length is NOT assumed. Supabase's email OTP length is a project
                            setting (6-10 digits; this project is on 8), so a hardcoded
                            maxLength of 6 silently truncated the code and made every
                            verification fail. 10 is the ceiling, not the expected value. */}
                        <Input
                          id="reset-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={10}
                          placeholder="Code from your email"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="6+ characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-confirm">Confirm new password</Label>
                        <Input
                          id="new-confirm"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Repeat password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {success && <p className="text-sm text-success">{success}</p>}

                  <Button type="submit" className="w-full" disabled={loading} onClick={handleReset}>
                    {loading
                      ? "Please wait…"
                      : resetStep === "request"
                        ? "Send code"
                        : "Update password"}
                  </Button>

                  <p className="text-center">
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="rounded-sm text-sm text-brand-accent hover:underline"
                    >
                      Back to sign in
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
