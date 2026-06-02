import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import quinceaneraImg from "@/assets/quinceanera-login.jpg";
import lcLabLogo from "@/assets/lc-lab-logo.jpeg.asset.json";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/admin" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido a LC-LAB");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Ya puedes iniciar sesión.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border relative overflow-hidden">
        <img
          src={quinceaneraImg}
          alt="Sesión fotográfica de quinceañera"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/55 to-background/85" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
              <Camera className="size-6 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl">LC-LAB</div>
              <div className="text-xs uppercase tracking-widest text-gold">Estudio Fotográfico</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-4">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Gestión profesional
            <br />
            de tu <span className="text-gold">estudio fotográfico</span>
          </h2>
          <p className="text-muted-foreground max-w-md">
            Productos, reservas, pedidos, boletas y facturas — todo en un solo panel.
          </p>
        </div>
        <div className="relative text-xs text-muted-foreground">
          © LC-LAB · Sistema administrativo
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "Accede al panel de LC-LAB" : "Registra una cuenta de personal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold"
              >
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                {mode === "login" ? "Ingresar" : "Crear cuenta"}
              </Button>
            </form>
            <div className="mt-4 text-sm text-center text-muted-foreground">
              {mode === "login" ? (
                <>
                  ¿Sin cuenta?{" "}
                  <button className="text-gold hover:underline" onClick={() => setMode("signup")}>
                    Regístrate
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button className="text-gold hover:underline" onClick={() => setMode("login")}>
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              <Link to="/admin" className="hover:text-gold">
                ← Volver
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
