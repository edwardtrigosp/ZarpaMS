"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, CheckCircle, XCircle, TrendingUp, Users, Send, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// ✅ Get API key from localStorage
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('api_key') || '';
  }
  return '';
};

const setApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('api_key', key);
  }
};

// ✅ Helper to add API key to fetch headers
const getFetchHeaders = () => {
  const apiKey = getApiKey();
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {})
  };
};

interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  isVerified: boolean;
  dailyLimit: number;
  peakLimit: number;
}

interface Stats {
  dailyCount: number;
  dailyLimit: number;
  remainingDaily: number;
  utilizationDaily: number;
  peakCount: number;
  peakLimit: number;
  remainingPeak: number;
  utilizationPeak: number;
}

export default function HomePage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  useEffect(() => {
    const savedKey = getApiKey();
    setApiKeyState(savedKey);

    if (!savedKey) {
      setShowApiKeySetup(true);
    } else {
      fetchConfig();
      fetchStats();
    }

    // ✅ Auto-refresh stats every 10 seconds
    const interval = setInterval(() => {
      if (savedKey && !showApiKeySetup) {
        fetchStats();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [showApiKeySetup]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else if (res.status === 401) {
        setShowApiKeySetup(true);
        toast.error("API Key inválida o faltante");
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/messages/stats", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleRefreshStats = async () => {
    setRefreshing(true);
    toast.loading("Actualizando estadísticas...", { id: "refresh-stats" });
    
    await fetchStats();
    
    toast.success("Estadísticas actualizadas", { id: "refresh-stats" });
    setRefreshing(false);
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor ingresa una API Key válida");
      return;
    }

    setApiKey(apiKey);
    setApiKeyState(apiKey);
    setShowApiKeySetup(false);
    toast.success("API Key guardada exitosamente");

    // Reload data with new API key
    fetchConfig();
    fetchStats();
  };

  if (showApiKeySetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Configuración de Seguridad</CardTitle>
            </div>
            <CardDescription>
              Para usar la aplicación, necesitas configurar tu API Key de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-semibold">📋 ¿Cómo obtener tu API Key?</p>
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Abre tu archivo <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> en el proyecto</li>
                    <li>Busca la variable <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">API_SECRET_KEY</code></li>
                    <li>Copia el valor y pégalo abajo</li>
                  </ol>
                  <p className="text-xs mt-3 text-muted-foreground">
                    💡 <strong>¿No tienes una API Key?</strong> Lee el archivo <code>SECURITY_SETUP.md</code> para generarla
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Pega tu API_SECRET_KEY aquí"
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                className="font-mono" />

            </div>

            <Button onClick={handleSaveApiKey} className="w-full">
              Guardar y Continuar
            </Button>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>🔒 Seguridad:</strong> Tu API Key se guarda localmente en tu navegador y solo se envía a tu propio servidor.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>);

  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Gestiona tu plataforma de mensajería automatizada de WhatsApp
            </p>
          </div>
          <Button 
            onClick={handleRefreshStats} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviados Hoy</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.dailyCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                de {stats?.dailyLimit || 1000} diarios
              </p>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all" 
                  style={{ width: `${Math.min(stats?.utilizationDaily || 0, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.remainingDaily || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.utilizationDaily || 0}% utilizado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capacidad Pico</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.peakCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                de {stats?.peakLimit || 10000} máximo
              </p>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 rounded-full h-2 transition-all" 
                  style={{ width: `${Math.min(stats?.utilizationPeak || 0, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              {config?.isVerified ?
              <CheckCircle className="h-4 w-4 text-green-600" /> :
              <XCircle className="h-4 w-4 text-destructive" />
              }
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {config?.isVerified ?
                <Badge variant="default" className="bg-green-600">Verificado</Badge> :
                <Badge variant="destructive">No Verificado</Badge>
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {config?.isVerified ? "Conexión activa" : "Requiere verificación"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 flex items-center justify-center">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            Las estadísticas se actualizan automáticamente cada 10 segundos
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Acciones Rápidas</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/templates">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Gestionar Plantillas</CardTitle>
                  <CardDescription>
                    Crea y edita plantillas de mensajes para tus campañas
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/messages">
                <CardHeader>
                  <Send className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Enviar Mensajes</CardTitle>
                  <CardDescription>
                    Envía mensajes masivos a tu lista de contactos
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/history">
                <CardHeader>
                  <MessageSquare className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Ver Historial</CardTitle>
                  <CardDescription>
                    Revisa el historial de mensajes enviados y su estado
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </div>);

}