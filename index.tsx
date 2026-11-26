import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Rafaela Viana — Agenda & Gestão" },
      { name: "description", content: "Agenda, clientes, serviços e financeiro do Studio Rafaela Viana, salvos na nuvem." },
      { property: "og:title", content: "Studio Rafaela Viana — Agenda & Gestão" },
      { property: "og:description", content: "Agenda, clientes, serviços e financeiro do Studio Rafaela Viana, salvos na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!session) return <Login />;
  return <StudioApp userId={session.user.id} email={session.user.email ?? ""} />;
}

function StudioApp({ userId, email }: { userId: string; email: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const lastSaved = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const post = (msg: unknown) => frame.current?.contentWindow?.postMessage(msg, window.location.origin);

    const save = async (data: unknown) => {
      const json = JSON.stringify(data);
      if (json === lastSaved.current) return;
      const { error } = await supabase
        .from("studio_data")
        .upsert({ user_id: userId, data: data as never, updated_at: new Date().toISOString() });
      if (error) post({ type: "studio-error" });
      else {
        lastSaved.current = json;
        post({ type: "studio-saved" });
      }
    };

    const onMsg = async (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== frame.current?.contentWindow) return;
      if (ev.data?.type === "studio-ready") {
        const { data } = await supabase.from("studio_data").select("data").eq("user_id", userId).maybeSingle();
        const d = data?.data ?? {};
        lastSaved.current = JSON.stringify(d);
        post({ type: "studio-load", data: d });
      } else if (ev.data?.type === "studio-save") {
        if (timer.current) clearTimeout(timer.current);
        const payload = ev.data.data;
        timer.current = setTimeout(() => void save(payload), 600);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [userId]);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-end gap-3 border-b bg-card px-4 py-1.5 text-xs text-muted-foreground">
        <span>{email}</span>
        <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()}>
          Sair
        </Button>
      </div>
      <iframe ref={frame} src="/app.html" title="Studio Rafaela Viana — Agenda & Gestão" className="w-full flex-1 border-0" />
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Conta criada! Confira seu e-mail para confirmar e depois entre.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Não foi possível entrar com Google.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-center text-sm tracking-widest text-primary">STUDIO</p>
        <h1 className="mb-1 text-center font-serif text-3xl italic text-primary">Rafaela Viana</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Agenda & Gestão</p>
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continuar com Google
        </Button>
        <div className="my-4 text-center text-xs text-muted-foreground">ou</div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        {msg && <p className="mt-3 text-center text-sm text-muted-foreground">{msg}</p>}
        <button type="button" className="mt-4 w-full text-center text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}
