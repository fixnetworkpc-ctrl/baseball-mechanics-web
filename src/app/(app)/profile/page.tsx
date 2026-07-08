"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getRecruiterProfile, saveRecruiterProfile } from "@/lib/recruiter-service";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO", "Other"] as const;

type Form = {
  college: string;
  organization: string;
  division: string;
  conference: string;
  state: string;
};

const EMPTY_FORM: Form = { college: "", organization: "", division: "", conference: "", state: "" };

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (active) setEmail(session?.user?.email ?? "");

      const prof = await getRecruiterProfile();
      if (active && prof) {
        setForm({
          college: prof.college || "",
          organization: prof.organization || "",
          division: prof.division || "",
          conference: prof.conference || "",
          state: prof.state || "",
        });
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveRecruiterProfile(form);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Recruiter Profile</h1>

      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">{email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="college">College / University</Label>
            <Input
              id="college"
              placeholder="e.g. University of Michigan"
              value={form.college}
              onChange={(e) => set("college", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              placeholder="e.g. Scouting network or club name"
              value={form.organization}
              onChange={(e) => set("organization", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={form.division} onValueChange={(v) => set("division", v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conference">Conference</Label>
            <Input
              id="conference"
              placeholder="e.g. Big Ten"
              value={form.conference}
              onChange={(e) => set("conference", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              placeholder="e.g. MI"
              maxLength={2}
              className="w-24 uppercase"
              value={form.state}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
          </div>

          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
