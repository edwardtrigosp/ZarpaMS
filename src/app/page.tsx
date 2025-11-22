"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, CheckCircle, XCircle, TrendingUp, Users, Send, FileText, Webhook, Copy, Check, ExternalLink } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  businessAccountId: string
  webhookVerifyToken: string
  isVerified: boolean
  dailyLimit: number
  peakLimit: number
}

interface Stats {
  dailyCount: number
  dailyLimit: number
  remainingDaily: number
  utilizationDaily: number
  peakCount: number
  peakLimit: number
  remainingPeak: number
  utilizationPeak: number
}

interface WebhookInfo {
  webhookUrl: string
  webhookPath: string
  instructions: string[]
}

export default function HomePage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)

  const [formData, setFormData] = useState({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    dailyLimit: 1000,
    peakLimit: 10000,
  })

  useEffect(() => {
    fetchConfig()
    fetchStats()
    fetchWebhookInfo()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setFormData({
          phoneNumberId: data.phoneNumberId,
          accessToken: data.accessToken,
          businessAccountId: data.businessAccountId,
          webhookVerifyToken: data.webhookVerifyToken,
          dailyLimit: data.dailyLimit,
          peakLimit: data.peakLimit,
        })
      }
    } catch (err) {
      console.error("Error fetching config:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/messages/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }

  const fetchWebhookInfo = async () => {
    try {
      const res = await fetch("/api/whatsapp/webhook-url")
      if (res.ok) {
        const data = await res.json()
        setWebhookInfo(data)
      }
    } catch (err) {
      console.error("Error fetching webhook info:", err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setSuccess("Configuración guardada exitosamente")
        toast.success("Configuración guardada exitosamente")
      } else {
        const data = await res.json()
        setError(data.error || "Error al guardar la configuración")
        toast.error(data.error || "Error al guardar la configuración")
      }
    } catch (err) {
      setError("Error de conexión")
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: formData.phoneNumberId,
          accessToken: formData.accessToken,
          businessAccountId: formData.businessAccountId,
        }),
      })

      if (res.ok) {
        setSuccess("Conexión verificada exitosamente")
        toast.success("Conexión verificada exitosamente")
        fetchConfig()
      } else {
        const data = await res.json()
        setError(data.error || "Error al verificar la conexión")
        toast.error(data.error || "Error al verificar la conexión")
      }
    } catch (err) {
      setError("Error de conexión")
      toast.error("Error de conexión")
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    if (!text || text === "Cargando..." || text === "No configurado") {
      toast.error("No hay contenido para copiar")
      return
    }

    let copySuccess = false
    
    try {
      // Method 1: Modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        copySuccess = true
      }
    } catch (err) {
      console.log("Clipboard API failed, trying fallback methods")
    }

    if (!copySuccess) {
      try {
        // Method 2: execCommand with textarea
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          copySuccess = true
        } catch (err) {
          console.log("execCommand failed")
        }
        
        document.body.removeChild(textArea)
      } catch (err) {
        console.log("Textarea method failed")
      }
    }

    if (!copySuccess) {
      try {
        // Method 3: Create selection range
        const input = document.getElementById(type === 'url' ? 'webhook-url-input' : 'verify-token-input') as HTMLInputElement
        if (input) {
          input.focus()
          input.select()
          input.setSelectionRange(0, text.length)
          document.execCommand('copy')
          copySuccess = true
        }
      } catch (err) {
        console.log("Selection range method failed")
      }
    }
    
    if (copySuccess) {
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
      }
      toast.success("✅ Copiado al portapapeles")
    } else {
      // Show dialog as final fallback
      if (type === 'url') {
        setShowUrlDialog(true)
      } else {
        setShowTokenDialog(true)
      }
      toast.error("Usa el cuadro de diálogo para copiar manualmente")
    }
  }

  const selectAllText = (inputId: string) => {
    try {
      const input = document.getElementById(inputId) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
        input.setSelectionRange(0, input.value.length)
        toast.info("✏️ Texto seleccionado. Presiona Ctrl+C (o Cmd+C en Mac) para copiar", {
          duration: 4000
        })
      }
    } catch (err) {
      console.error("Selection error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold">WhatsApp Business API</h1>
            </div>
            <nav className="flex gap-4">
              <Link href="/">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/templates">
                <Button variant="ghost">Plantillas</Button>
              </Link>
              <Link href="/messages">
                <Button variant="ghost">Mensajes</Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost">Historial</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Gestiona tu plataforma de mensajería automatizada de WhatsApp
          </p>
        </div>

        {/* Stats Cards */}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              {config?.isVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {config?.isVerified ? (
                  <Badge variant="default" className="bg-green-600">Verificado</Badge>
                ) : (
                  <Badge variant="destructive">No Verificado</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {config?.isVerified ? "Conexión activa" : "Requiere verificación"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="quick-actions">Acciones Rápidas</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de WhatsApp Business API</CardTitle>
                <CardDescription>
                  Configura las credenciales de Meta para conectar con WhatsApp Business API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-600 text-green-600">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      placeholder="123456789012345"
                      value={formData.phoneNumberId}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumberId: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAccountId">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      placeholder="987654321098765"
                      value={formData.businessAccountId}
                      onChange={(e) =>
                        setFormData({ ...formData, businessAccountId: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      placeholder="EAABsbCS1iHgBO..."
                      value={formData.accessToken}
                      onChange={(e) =>
                        setFormData({ ...formData, accessToken: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                    <Input
                      id="webhookVerifyToken"
                      placeholder="my_secure_verify_token"
                      value={formData.webhookVerifyToken}
                      onChange={(e) =>
                        setFormData({ ...formData, webhookVerifyToken: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dailyLimit">Límite Diario</Label>
                    <Input
                      id="dailyLimit"
                      type="number"
                      value={formData.dailyLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="peakLimit">Límite Pico</Label>
                    <Input
                      id="peakLimit"
                      type="number"
                      value={formData.peakLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, peakLimit: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                  <Button onClick={handleVerify} variant="outline" disabled={verifying}>
                    {verifying ? "Verificando..." : "Verificar Conexión"}
                  </Button>
                </div>
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
                {/* Webhook URL */}
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
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(webhookInfo?.webhookUrl || "", 'url')}
                      title="Copiar URL"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowUrlDialog(true)}
                      title="Ver en cuadro grande"
                    >
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

                {/* Verify Token */}
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
                        disabled={!config?.webhookVerifyToken}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(config?.webhookVerifyToken || "", 'token')}
                      disabled={!config?.webhookVerifyToken}
                      title="Copiar Token"
                    >
                      {copiedToken ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTokenDialog(true)}
                      disabled={!config?.webhookVerifyToken}
                      title="Ver en cuadro grande"
                    >
                      Ver
                    </Button>
                  </div>
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-xs">
                      <strong>💡 Cómo copiar:</strong> Usa el botón "Copiar" o "Ver" para copiar el token fácilmente
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <Label>Instrucciones de Configuración</Label>
                  <Alert>
                    <AlertDescription>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        {webhookInfo?.instructions.map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Link to Meta Console */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://developers.facebook.com/apps', '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Meta Developer Console
                  </Button>
                </div>

                {/* Webhook Features */}
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

          <TabsContent value="quick-actions" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </main>

      {/* URL Dialog */}
      {showUrlDialog && (
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
                e.currentTarget.select()
                toast.info("✏️ Texto seleccionado. Presiona Ctrl+C para copiar")
              }}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(webhookInfo?.webhookUrl || "")
                    toast.success("✅ Copiado!")
                    setShowUrlDialog(false)
                  } catch (err) {
                    toast.error("Selecciona el texto y presiona Ctrl+C")
                  }
                }}
              >
                Copiar al Portapapeles
              </Button>
              <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token Dialog */}
      {showTokenDialog && (
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
                e.currentTarget.select()
                toast.info("✏️ Texto seleccionado. Presiona Ctrl+C para copiar")
              }}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(config?.webhookVerifyToken || "")
                    toast.success("✅ Copiado!")
                    setShowTokenDialog(false)
                  } catch (err) {
                    toast.error("Selecciona el texto y presiona Ctrl+C")
                  }
                }}
              >
                Copiar al Portapapeles
              </Button>
              <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}