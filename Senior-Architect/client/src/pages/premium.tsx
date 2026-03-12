import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Crown, Check, Sparkles, Camera, Brain, Zap, Shield, ChevronRight,
  Star, Dumbbell, Apple, TrendingUp, X
} from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    title: "AI Food Photo Scanning",
    description: "Upload a photo of any meal — AI instantly detects calories and macros",
    premium: true,
  },
  {
    icon: Brain,
    title: "AI Coaching Insights",
    description: "Personalized AI-powered coaching tips based on your real data",
    premium: true,
  },
  {
    icon: Dumbbell,
    title: "Advanced Workout Tracking",
    description: "Full CRUD for workouts, exercises, and detailed metrics",
    premium: false,
  },
  {
    icon: Apple,
    title: "Nutrition Logging",
    description: "Log meals from a database of 38+ foods with macro tracking",
    premium: false,
  },
  {
    icon: TrendingUp,
    title: "Progress Analytics",
    description: "30-day trend charts for body metrics and workout volume",
    premium: false,
  },
  {
    icon: Zap,
    title: "Gamification & Leaderboard",
    description: "XP system, levels, streaks, achievements, and global ranking",
    premium: false,
  },
];

const TESTIMONIALS = [
  { name: "Sarah M.", text: "The AI food scanner saved me hours. Just take a photo and it's logged!", level: "Lv.14" },
  { name: "Jake T.", text: "AI coaching insights helped me break 3 PRs in one month.", level: "Lv.22" },
  { name: "Emma R.", text: "Worth every cent. The personalized insights are game-changing.", level: "Lv.9" },
];

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Premium() {
  const { data: user, isLoading } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalSandbox, setPaypalSandbox] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalRendered, setPaypalRendered] = useState(false);

  // Check URL params for success/cancelled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Welcome to Premium! 🎉", description: "Your premium access is now active." });
    } else if (params.get("cancelled") === "true") {
      toast({ title: "Subscription cancelled", description: "You can subscribe anytime.", variant: "destructive" });
    }
  }, []);

  // Load PayPal client ID
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch("/api/paypal/client-id", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.clientId) {
        setPaypalClientId(data.clientId);
        setPaypalSandbox(!!data.sandbox);
      }
    }).catch(() => {});
  }, []);

  // Load PayPal SDK
  useEffect(() => {
    if (!paypalClientId || paypalLoaded) return;
    const script = document.createElement("script");
    const buyerCountry = paypalSandbox ? "&buyer-country=US" : "";
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&vault=true&intent=subscription&currency=EUR${buyerCountry}`;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [paypalClientId, paypalLoaded, paypalSandbox]);

  // Render PayPal buttons
  useEffect(() => {
    if (!paypalLoaded || paypalRendered || !window.paypal || user?.isPremium) return;
    const container = document.getElementById("paypal-button-container");
    if (!container || container.children.length > 0) return;
    setPaypalRendered(true);

    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "subscribe" },
      createSubscription: async (_data: any, actions: any) => {
        const planId = import.meta.env.VITE_PAYPAL_PLAN_ID;
        if (planId) {
          return actions.subscription.create({ plan_id: planId });
        }
        // Fallback: use backend
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/paypal/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: user?.email }),
        });
        const data = await res.json();
        return data.id;
      },
      onApprove: async (data: any) => {
        setIsUpgrading(true);
        try {
          const token = localStorage.getItem("auth_token");
          const res = await apiRequest("POST", "/api/paypal/verify-subscription", {
            subscriptionId: data.subscriptionID,
          });
          const result = await res.json();
          if (result.success) {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            toast({ title: "Welcome to FitSync Premium! 🎉", description: "All premium features are now unlocked." });
            navigate("/dashboard");
          }
        } catch {
          toast({ title: "Verification failed", description: "Please contact support.", variant: "destructive" });
        } finally {
          setIsUpgrading(false);
        }
      },
      onError: (err: any) => {
        console.error("PayPal error:", err);
        toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      },
    }).render("#paypal-button-container");
  }, [paypalLoaded, paypalRendered, user]);

  if (isLoading) return null;

  if (user?.isPremium) {
    return (
      <PageTransition className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-black mb-3">You're a Premium Member!</h1>
          <p className="text-muted-foreground mb-8 text-lg">All AI features are unlocked. Enjoy FitSync to the fullest.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
            <Card className="p-4 border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3">
              <Camera className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-sm">AI Food Scanner</span>
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            </Card>
            <Card className="p-4 border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3">
              <Brain className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-sm">AI Coaching</span>
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            </Card>
          </div>
          <Button onClick={() => navigate("/nutrition")} className="gap-2">
            <Camera className="w-4 h-4" /> Try AI Food Scanner
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="p-6 md:p-8 max-w-5xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 px-4 py-1.5 text-sm font-bold">
          <Crown className="w-3.5 h-3.5 mr-1.5" /> FitSync Premium
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Unlock Your Full
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
            Fitness Potential
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          AI-powered tools that learn from your data to help you train smarter, eat better, and recover faster.
        </p>
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-3xl font-black">€9.99</div>
            <div className="text-xs text-muted-foreground">/month</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <div className="text-sm font-semibold text-green-500">Cancel anytime</div>
            <div className="text-xs text-muted-foreground">No commitments</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <div className="text-sm font-semibold text-primary">Secure</div>
            <div className="text-xs text-muted-foreground">PayPal protected</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-xl font-bold mb-5 text-center">Everything You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className={`p-5 border-border/50 ${f.premium ? "bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20" : "bg-card"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.premium ? "bg-yellow-500/15 text-yellow-500" : "bg-primary/10 text-primary"}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-sm">{f.title}</h3>
                {f.premium ? (
                  <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 border-yellow-500/30 shrink-0">
                    <Crown className="w-2.5 h-2.5 mr-0.5" /> PRO
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">Free</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* PayPal Subscription Box */}
      <div className="max-w-md mx-auto">
        <Card className="p-6 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 shadow-lg shadow-yellow-500/10">
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="font-black text-xl">Go Premium Today</h3>
            </div>
            <p className="text-3xl font-black">€9.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
          </div>

          <ul className="space-y-2 mb-6">
            {["AI Food Photo Scanner", "AI Coaching Insights", "All future AI features", "Priority support"].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-green-500" />
                </div>
                {item}
              </li>
            ))}
          </ul>

          {paypalClientId ? (
            <div id="paypal-button-container" data-testid="paypal-button-container" />
          ) : (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-4 text-center text-sm text-muted-foreground border border-dashed border-border">
                <Shield className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-medium">PayPal integration pending</p>
                <p className="text-xs mt-1">Add PAYPAL_CLIENT_ID and PAYPAL_PLAN_ID to enable subscriptions</p>
              </div>
              <Button
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                onClick={() => toast({ title: "PayPal not configured", description: "Add PAYPAL_CLIENT_ID to enable payments.", variant: "destructive" })}
                data-testid="button-subscribe-paypal"
              >
                <Crown className="w-4 h-4 mr-2" /> Subscribe with PayPal
              </Button>
            </div>
          )}

          {isUpgrading && (
            <div className="text-center mt-3 text-sm text-muted-foreground">
              Verifying subscription...
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            <Shield className="w-3 h-3 inline mr-1" />
            Secured by PayPal. Cancel anytime from your PayPal account.
          </p>
        </Card>
      </div>

      {/* Testimonials */}
      <div>
        <h2 className="text-xl font-bold mb-5 text-center">What Premium Members Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-5 border-border/50">
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-3 italic">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.level}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
