import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister, useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Activity, Dumbbell, Apple, LineChart } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { Redirect } from "wouter";

// Extending schemas to include password confirmation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { data: user, isLoading } = useUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Activity className="w-8 h-8 animate-spin text-primary" /></div>;
  if (user) return <Redirect to="/dashboard" />;

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <PageTransition className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Visual Side */}
      <div className="hidden md:flex flex-1 relative bg-card overflow-hidden items-center justify-center border-r border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background z-0" />
        <div className="relative z-10 max-w-lg px-8 text-center">
          <Activity className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="heading-xl mb-6">Welcome to FitSync</h1>
          <p className="text-xl text-muted-foreground mb-12">
            The premium platform for tracking your workouts, nutrition, and body metrics all in one beautiful place.
          </p>
          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="bg-background/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
              <Dumbbell className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold">Track Workouts</h3>
              <p className="text-sm text-muted-foreground mt-1">Log exercises, sets, and personal records.</p>
            </div>
            <div className="bg-background/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
              <Apple className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold">Nutrition</h3>
              <p className="text-sm text-muted-foreground mt-1">Monitor macros and stay on top of your diet.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <Card className="w-full max-w-md p-8 shadow-2xl shadow-black/5 border-border/50 bg-card/95 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h2 className="heading-lg mb-2">{isLogin ? "Welcome back" : "Create account"}</h2>
            <p className="text-muted-foreground">
              {isLogin ? "Enter your credentials to access your account" : "Sign up to start tracking your fitness journey"}
            </p>
          </div>

          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  placeholder="name@example.com" 
                  {...loginForm.register("email")}
                  className="bg-background"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  {...loginForm.register("password")}
                  className="bg-background"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              
              {loginMutation.error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg">
                  {loginMutation.error.message || "Failed to login. Check credentials."}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Log In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  {...registerForm.register("name")}
                  className="bg-background"
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input 
                  id="reg-email" 
                  placeholder="name@example.com" 
                  {...registerForm.register("email")}
                  className="bg-background"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  placeholder="••••••••" 
                  {...registerForm.register("password")}
                  className="bg-background"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              {registerMutation.error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg">
                  {registerMutation.error.message || "Registration failed."}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-primary font-bold hover:underline"
              type="button"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
