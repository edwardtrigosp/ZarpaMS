"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Webhook, Copy, Check, ExternalLink, RefreshCw, Activity, Clock, Edit2, Save } from "lucide-react";
import { toast } from "sonner";

// ✅ Get API key from localStorage
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('api_key') || '';
  }
  return '';
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

interface WebhookInfo {
  webhookUrl: string;
  webhookPath: string;
  instructions: string[];
}

interface WebhookEvent {
  id: number;
  eventType: string;
  rawPayload: any;
  messageId: string | null;
  phoneNumber: string | null;
  status: string | null;
  processed: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
  variables: string[];
  category: string;
  status: string;
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);

  const [formData, setFormData] = useState({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    dailyLimit: 1000,
    peakLimit: 10000
  });

  useEffect(() => {
    fetchConfig();
    fetchWebhookInfo();
    fetchWebhookEvents();
  }, []);

  // Auto-refresh webhook events every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchWebhookEvents(true); // silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setFormData({
          phoneNumberId: data.phoneNumberId,
          accessToken: data.accessToken,
          businessAccountId: data.businessAccountId,
          webhookVerifyToken: data.webhookVerifyToken,
          dailyLimit: data.dailyLimit,
          peakLimit: data.peakLimit
        });
      } else if (res.status === 401) {
        toast.error("API Key inválida o faltante");
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookInfo = async () => {
    try {
      const res = await fetch("/api/whatsapp/webhook-url", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo(data);
      }
    } catch (err) {
      console.error("Error fetching webhook info:", err);
    }
  };

  const fetchWebhookEvents = async (silent = false) => {
    if (!silent) setLoadingEvents(true);
    try {
      const res = await fetch("/api/whatsapp/webhook-logs?limit=20", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookEvents(data);
      }
    } catch (err) {
      console.error("Error fetching webhook events:", err);
    } finally {
      if (!silent) setLoadingEvents(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("¿Estás seguro de que quieres limpiar todos los logs del webhook?")) {
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/webhook-logs", {
        method: "DELETE",
        headers: getFetchHeaders()
      });

      if (res.ok) {
        toast.success("Logs del webhook limpiados exitosamente");
        fetchWebhookEvents();
      } else {
        toast.error("Error al limpiar los logs");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSuccess("✅ Credenciales guardadas exitosamente");
        toast.success("✅ Credenciales guardadas exitosamente", {
          description: "Tu configuración de WhatsApp ha sido actualizada",
          duration: 5000
        });
        setIsEditingCredentials(false);
      } else {
        const data = await res.json();
        setError(data.error || "Error al guardar la configuración");
        toast.error(data.error || "Error al guardar la configuración");
      }
    } catch (err) {
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify({
          phoneNumberId: formData.phoneNumberId,
          accessToken: formData.accessToken,
          businessAccountId: formData.businessAccountId
        })
      });

      if (res.ok) {
        setSuccess("Conexión verificada exitosamente");
        toast.success("Conexión verificada exitosamente");
        fetchConfig();
      } else {
        const data = await res.json();
        setError(data.error || "Error al verificar la conexión");
        toast.error(data.error || "Error al verificar la conexión");
      }
    } catch (err) {
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    if (!text || text === "Cargando..." || text === "No configurado") {
      toast.error("No hay contenido para copiar");
      return;
    }

    let copySuccess = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copySuccess = true;
      }
    } catch (err) {
      console.log("Clipboard API failed, trying fallback methods");
    }

    if (!copySuccess) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          copySuccess = true;
        } catch (err) {
          console.log("execCommand failed");
        }

        document.body.removeChild(textArea);
      } catch (err) {
        console.log("Textarea method failed");
      }
    }

    if (!copySuccess) {
      try {
        const input = document.getElementById(type === 'url' ? 'webhook-url-input' : 'verify-token-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
          input.setSelectionRange(0, text.length);
          document.execCommand('copy');
          copySuccess = true;
        }
      } catch (err) {
        console.log("Selection range method failed");
      }
    }

    if (copySuccess) {
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
      toast.success("✅ Copiado al portapapeles");
    } else {
      if (type === 'url') {
        setShowUrlDialog(true);
      } else {
        setShowTokenDialog(true);
      }
      toast.error("Usa el cuadro de diálogo para copiar manualmente");
    }
  };

  const selectAllText = (inputId: string) => {
    try {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
        input.setSelectionRange(0, input.value.length);
        toast.info("✏️ Texto seleccionado. Presiona Ctrl+C (o Cmd+C en Mac) para copiar", {
          duration: 4000
        });
      }
    } catch (err) {
      console.error("Selection error:", err);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'verification':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'message_status':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'incoming_message':
        return <Activity className="h-4 w-4 text-purple-600" />;
      case 'incoming_webhook':
        return <Webhook className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventBadgeVariant = (eventType: string, processed: boolean) => {
    if (!processed) return "destructive";

    switch (eventType) {
      case 'verification':
        return "default";
      case 'message_status':
        return "default";
      case 'incoming_message':
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Hace un momento";
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;

    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Configuración</h2>
          <p className="text-muted-foreground">
            Gestiona las credenciales de WhatsApp Business API y configuración del webhook
          </p>
        </div>

        <Tabs defaultValue="credenciales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credenciales">Credenciales</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="webhook-status">Estado del Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="credenciales" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configuración de WhatsApp Business API</CardTitle>
                    <CardDescription>
                      {isEditingCredentials ?
                      "Edita las credenciales de Meta para conectar con WhatsApp Business API" :
                      "Tus credenciales están configuradas y guardadas de forma segura"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditingCredentials && config &&
                    <>
                        <Button
                        variant="outline"
                        onClick={async () => {
                          const loadingToast = toast.loading("Sincronizando plantillas desde Meta...");
                          try {
                            const res = await fetch("/api/whatsapp/sync-templates", {
                              headers: getFetchHeaders()
                            });
                            if (res.ok) {
                              const data = await res.json();
                              toast.success(`✅ ${data.synced} plantilla(s) sincronizada(s)`, {
                                description: data.templates?.map((t: any) => t.name).join(", ") || "Plantillas actualizadas"
                              });
                            } else {
                              const data = await res.json();
                              toast.error(data.error || "Error al sincronizar");
                            }
                          } catch (err) {
                            toast.error("Error de conexión");
                          } finally {
                            toast.dismiss(loadingToast);
                          }
                        }}>

                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sincronizar Plantillas
                        </Button>
                        <Button
                        variant="outline"
                        onClick={() => setIsEditingCredentials(true)}>

                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar Credenciales
                        </Button>
                      </>
                    }
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error &&
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                }

                {success &&
                <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-300">
                      {success}
                    </AlertDescription>
                  </Alert>
                }

                {!isEditingCredentials && config ?
                <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900 dark:text-blue-300">
                        <strong>✅ Configuración Activa</strong>
                        <p className="text-sm mt-2">
                          Tus credenciales de WhatsApp Business API están configuradas correctamente.
                          Puedes editar la configuración haciendo clic en "Editar Credenciales" arriba.
                        </p>
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                        <p className="font-mono text-sm mt-1">{config.phoneNumberId}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Business Account ID</Label>
                        <p className="font-mono text-sm mt-1">{config.businessAccountId}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Estado</Label>
                        <div className="mt-1">
                          {config.isVerified ?
                        <Badge className="bg-green-600">✓ Verificado</Badge> :

                        <Badge variant="destructive">No Verificado</Badge>
                        }
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Límites</Label>
                        <p className="text-sm mt-1">Diario: {config.dailyLimit} | Pico: {config.peakLimit}</p>
                      </div>
                    </div>
                  </div> :

                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                        <Input
                        id="phoneNumberId"
                        placeholder="123456789012345"
                        value={formData.phoneNumberId}
                        onChange={(e) =>
                        setFormData({ ...formData, phoneNumberId: e.target.value })
                        } />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessAccountId">Business Account ID *</Label>
                        <Input
                        id="businessAccountId"
                        placeholder="987654321098765"
                        value={formData.businessAccountId}
                        onChange={(e) =>
                        setFormData({ ...formData, businessAccountId: e.target.value })
                        } />

                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="accessToken">Access Token *</Label>
                        <Input
                        id="accessToken"
                        type="password"
                        placeholder="EAABsbCS1iHgBO..."
                        value={formData.accessToken}
                        onChange={(e) =>
                        setFormData({ ...formData, accessToken: e.target.value })
                        } />

                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="webhookVerifyToken">Webhook Verify Token *</Label>
                        <Input
                        id="webhookVerifyToken"
                        placeholder="my_secure_verify_token"
                        value={formData.webhookVerifyToken}
                        onChange={(e) =>
                        setFormData({ ...formData, webhookVerifyToken: e.target.value })
                        } />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dailyLimit">Límite Diario</Label>
                        <Input
                        id="dailyLimit"
                        type="number"
                        value={formData.dailyLimit}
                        onChange={(e) =>
                        setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })
                        } />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="peakLimit">Límite Pico</Label>
                        <Input
                        id="peakLimit"
                        type="number"
                        value={formData.peakLimit}
                        onChange={(e) =>
                        setFormData({ ...formData, peakLimit: parseInt(e.target.value) })
                        } />

                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={handleSave} disabled={saving} size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Guardando..." : "Guardar Credenciales"}
                      </Button>
                      <Button onClick={handleVerify} variant="outline" disabled={verifying}>
                        {verifying ? "Verificando..." : "Verificar Conexión"}
                      </Button>
                      {config &&
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditingCredentials(false);
                        setError("");
                        setSuccess("");
                      }}>

                          Cancelar
                        </Button>
                    }
                    </div>
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  <CardTitle>Configuración del Webhook</CardTitle>
                </div>
                <CardDescription>
                  Configura el webhook en Meta Developer Console para recibir actualizaciones de estado de mensajes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>URL del Webhook</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="webhook-url-input"
                        value={webhookInfo?.webhookUrl || "Cargando..."}
                        readOnly
                        className="font-mono text-sm cursor-pointer select-all pr-20"
                        onClick={() => selectAllText('webhook-url-input')}
                        onFocus={(e) => e.target.select()} />

                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(webhookInfo?.webhookUrl || "", 'url')}
                      title="Copiar URL">

                      {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowUrlDialog(true)}
                      title="Ver en cuadro grande">

                      Ver
                    </Button>
                  </div>
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-xs">
                      <strong>💡 Cómo copiar:</strong>
                      <ol className="list-decimal ml-4 mt-1 space-y-1">
                        <li>Haz clic en el botón <strong>"Copiar"</strong> (📋)</li>
                        <li>Si no funciona, haz clic en <strong>"Ver"</strong> para abrir un cuadro grande</li>
                        <li>O haz clic en el campo de texto y presiona <strong>Ctrl+A</strong> luego <strong>Ctrl+C</strong></li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label>Verify Token Actual</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="verify-token-input"
                        value={config?.webhookVerifyToken || "No configurado"}
                        readOnly
                        className="font-mono text-sm cursor-pointer select-all"
                        onClick={() => selectAllText('verify-token-input')}
                        onFocus={(e) => e.target.select()}
                        disabled={!config?.webhookVerifyToken} />

                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(config?.webhookVerifyToken || "", 'token')}
                      disabled={!config?.webhookVerifyToken}
                      title="Copiar Token">

                      {copiedToken ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTokenDialog(true)}
                      disabled={!config?.webhookVerifyToken}
                      title="Ver en cuadro grande">

                      Ver
                    </Button>
                  </div>
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-xs">
                      <strong>💡 Cómo copiar:</strong> Usa el botón "Copiar" o "Ver" para copiar el token fácilmente
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label>Instrucciones de Configuración</Label>
                  <Alert>
                    <AlertDescription>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        {webhookInfo?.instructions.map((instruction, index) =>
                        <li key={index}>{instruction}</li>
                        )}
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://developers.facebook.com/apps', '_blank')}
                    className="w-full !whitespace-pre-line">

                    <ExternalLink className="h-4 w-4 mr-2" />Abrir Meta Developer

                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Funcionalidades del Webhook</Label>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Actualizaciones de Estado</p>
                        <p className="text-xs text-muted-foreground">
                          Recibe notificaciones cuando los mensajes son enviados, entregados o leídos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Manejo de Errores</p>
                        <p className="text-xs text-muted-foreground">
                          Actualiza automáticamente el estado de mensajes fallidos con detalles del error
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Respuestas de Usuarios</p>
                        <p className="text-xs text-muted-foreground">
                          Registra cuando los usuarios responden a tus mensajes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook-status" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <div>
                      <CardTitle>Estado del Webhook en Tiempo Real</CardTitle>
                      <CardDescription>
                        Monitorea todos los eventos recibidos desde WhatsApp Business API
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-muted-foreground">
                        {autoRefresh ? 'Auto-actualización activa' : 'Pausado'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAutoRefresh(!autoRefresh)}>

                      {autoRefresh ? 'Pausar' : 'Reanudar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchWebhookEvents()}
                      disabled={loadingEvents}>

                      <RefreshCw className={`h-4 w-4 ${loadingEvents ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleClearLogs}>

                      Limpiar Logs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Eventos</p>
                          <p className="text-2xl font-bold">{webhookEvents.length}</p>
                        </div>
                        <Activity className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Procesados</p>
                          <p className="text-2xl font-bold text-green-600">
                            {webhookEvents.filter((e) => e.processed).length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Con Errores</p>
                          <p className="text-2xl font-bold text-red-600">
                            {webhookEvents.filter((e) => !e.processed || e.errorMessage).length}
                          </p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Último Evento</p>
                          <p className="text-sm font-bold">
                            {webhookEvents.length > 0 ? formatTimestamp(webhookEvents[0].createdAt) : 'N/A'}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {loadingEvents && webhookEvents.length === 0 ?
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                  </div> :
                webhookEvents.length === 0 ?
                <Alert>
                    <AlertDescription className="text-center">
                      <Webhook className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">No se han recibido eventos del webhook aún</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Los eventos aparecerán aquí cuando Meta envíe actualizaciones a tu webhook
                      </p>
                    </AlertDescription>
                  </Alert> :

                <div className="space-y-2">
                    {webhookEvents.map((event) =>
                  <Card key={event.id} className={`${!event.processed || event.errorMessage ? 'border-red-200 dark:border-red-900' : ''}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getEventIcon(event.eventType)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={getEventBadgeVariant(event.eventType, event.processed)}>
                                    {event.eventType}
                                  </Badge>
                                  {event.status &&
                              <Badge variant="outline">{event.status}</Badge>
                              }
                                  {event.processed ?
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      ✓ Procesado
                                    </Badge> :

                              <Badge variant="destructive">
                                      ✗ No procesado
                                    </Badge>
                              }
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(event.createdAt)}
                                </span>
                              </div>

                              {event.messageId &&
                          <p className="text-sm">
                                  <span className="font-medium">ID del Mensaje:</span>{' '}
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{event.messageId}</code>
                                </p>
                          }

                              {event.phoneNumber &&
                          <p className="text-sm">
                                  <span className="font-medium">Teléfono:</span> {event.phoneNumber}
                                </p>
                          }

                              {event.errorMessage &&
                          <Alert variant="destructive" className="py-2">
                                  <AlertDescription className="text-xs">
                                    <strong>Error:</strong> {event.errorMessage}
                                  </AlertDescription>
                                </Alert>
                          }

                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Ver payload completo
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(event.rawPayload, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {showUrlDialog &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUrlDialog(false)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">URL del Webhook</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowUrlDialog(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona todo el texto y copia con <strong>Ctrl+C</strong> (Windows/Linux) o <strong>Cmd+C</strong> (Mac)
            </p>
            <textarea
            readOnly
            value={webhookInfo?.webhookUrl || ""}
            className="w-full h-32 p-4 border rounded-lg font-mono text-sm resize-none select-all"
            onClick={(e) => {
              e.currentTarget.select();
              toast.info("✏️ Texto seleccionado. Presiona Ctrl+C para copiar");
            }}
            onFocus={(e) => e.target.select()} />

            <div className="flex gap-2 mt-4">
              <Button
              className="flex-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(webhookInfo?.webhookUrl || "");
                  toast.success("✅ Copiado!");
                  setShowUrlDialog(false);
                } catch (err) {
                  toast.error("Selecciona el texto y presiona Ctrl+C");
                }
              }}>

                Copiar al Portapapeles
              </Button>
              <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      }

      {showTokenDialog &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTokenDialog(false)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Verify Token</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowTokenDialog(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona todo el texto y copia con <strong>Ctrl+C</strong> (Windows/Linux) o <strong>Cmd+C</strong> (Mac)
            </p>
            <textarea
            readOnly
            value={config?.webhookVerifyToken || ""}
            className="w-full h-32 p-4 border rounded-lg font-mono text-sm resize-none select-all"
            onClick={(e) => {
              e.currentTarget.select();
              toast.info("✏️ Texto seleccionado. Presiona Ctrl+C para copiar");
            }}
            onFocus={(e) => e.target.select()} />

            <div className="flex gap-2 mt-4">
              <Button
              className="flex-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(config?.webhookVerifyToken || "");
                  toast.success("✅ Copiado!");
                  setShowTokenDialog(false);
                } catch (err) {
                  toast.error("Selecciona el texto y presiona Ctrl+C");
                }
              }}>

                Copiar al Portapapeles
              </Button>
              <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      }
    </div>);

}