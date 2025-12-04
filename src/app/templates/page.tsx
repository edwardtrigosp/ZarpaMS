"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, FileText, Sparkles, RefreshCw, Send, CheckCircle2, Clock, XCircle } from "lucide-react"
import { toast } from "sonner"

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

interface Template {
  id: number
  name: string
  content: string
  variables: string[]
  language: string
  category: string
  status: string
  metaTemplateId: string | null
  createdAt: string
  updatedAt: string
}

// Plantillas predefinidas
const PREDEFINED_TEMPLATES = [
  {
    id: "evento_politico",
    name: "evento_politico_inscripcion",
    category: "MARKETING",
    content: `¡Tenemos una cita importante por {{ciudad}}! 🗓️🚀

Este {{fecha}}, nuestro proyecto arranca oficialmente. {{candidato}} se inscribe como candidato a {{cargo}} ¡y queremos que estén ahí con nosotros!

Tu apoyo nos da la fuerza para empezar con toda. 

Lugar: {{lugar}}
Hora: {{hora}}
{{instruccion_adicional}}`,
    variables: ["ciudad", "fecha", "candidato", "cargo", "lugar", "hora", "instruccion_adicional"],
    description: "Plantilla para convocar a eventos de inscripción de candidatos políticos"
  },
  {
    id: "evento_politico_simple",
    name: "evento_politico_general",
    category: "MARKETING",
    content: `🗓️ ¡Te esperamos en {{ciudad}}!

{{mensaje_principal}}

📍 Lugar: {{lugar}}
🕐 Hora: {{hora}}
📅 Fecha: {{fecha}}

¡Tu presencia es muy importante para nosotros!`,
    variables: ["ciudad", "mensaje_principal", "lugar", "hora", "fecha"],
    description: "Plantilla simple para eventos políticos"
  }
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPredefined, setShowPredefined] = useState(false)
  const [filterMetaOnly, setFilterMetaOnly] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    variables: "",
    language: "es",
    category: "MARKETING",
  })

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("API Key no configurada", {
        description: "Configura tu API Key en el Dashboard primero"
      });
    } else {
      fetchTemplates();
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?limit=50", {
        headers: getFetchHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        const parsedData = data.map((template: Template) => ({
          ...template,
          variables: typeof template.variables === 'string' 
            ? JSON.parse(template.variables) 
            : Array.isArray(template.variables) 
              ? template.variables 
              : []
        }))
        setTemplates(parsedData)
      } else if (res.status === 401) {
        toast.error("API Key inválida", {
          description: "Verifica tu API Key en el Dashboard"
        });
      }
    } catch (err) {
      console.error("Error fetching templates:", err)
      toast.error("Error al cargar plantillas")
    } finally {
      setLoading(false)
    }
  }

  const syncTemplatesFromMeta = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/whatsapp/templates?sync=true", {
        headers: getFetchHeaders()
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success("Sincronización completada", {
          description: `${data.count} plantillas sincronizadas desde Meta`
        })
        fetchTemplates()
      } else {
        const data = await res.json()
        toast.error("Error al sincronizar", {
          description: data.error || "No se pudo conectar con Meta"
        })
      }
    } catch (err) {
      console.error("Error syncing templates:", err)
      toast.error("Error de conexión al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  const handleUsePredefinedTemplate = (predefinedId: string) => {
    const predefined = PREDEFINED_TEMPLATES.find(t => t.id === predefinedId)
    if (predefined) {
      setFormData({
        name: predefined.name,
        content: predefined.content,
        variables: predefined.variables.join(", "),
        language: "es",
        category: predefined.category,
      })
      setShowPredefined(false)
      toast.success("Plantilla cargada", {
        description: "Puedes personalizarla antes de enviar a Meta"
      })
    }
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess("")
    setSubmitting(true)

    const variables = formData.variables
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "")

    const payload = {
      name: formData.name,
      content: formData.content,
      variables,
      language: formData.language,
      category: formData.category,
    }

    try {
      // Create template in Meta
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess("Plantilla creada y enviada a Meta para aprobación")
        toast.success("¡Plantilla enviada a Meta!", {
          description: "Estado: PENDING - Espera la aprobación de Meta (usualmente 6-48 horas)"
        })
        setIsDialogOpen(false)
        fetchTemplates()
        resetForm()
      } else {
        const data = await res.json()
        const errorMsg = data.error || "Error al crear plantilla en Meta"
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      setError("Error de conexión")
      toast.error("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, metaTemplateId: string | null) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla? Esto también la eliminará de Meta si existe.")) return

    try {
      const res = await fetch(`/api/templates/${id}`, { 
        method: "DELETE",
        headers: getFetchHeaders()
      })
      if (res.ok) {
        toast.success("Plantilla eliminada exitosamente")
        fetchTemplates()
      } else {
        const data = await res.json()
        const errorMsg = data.error || "Error al eliminar la plantilla"
        toast.error(errorMsg)
      }
    } catch (err) {
      toast.error("Error de conexión")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      content: "",
      variables: "",
      language: "es",
      category: "MARKETING",
    })
    setEditingTemplate(null)
    setShowPredefined(false)
  }

  const extractVariables = (content: string) => {
    const matches = content.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))]
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "MARKETING":
        return "bg-blue-500"
      case "UTILITY":
        return "bg-green-500"
      case "AUTHENTICATION":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-600"
      case "PENDING":
        return "bg-yellow-600"
      case "DRAFT":
        return "bg-gray-600"
      case "REJECTED":
        return "bg-red-600"
      case "DISABLED":
        return "bg-orange-600"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="h-3 w-3" />
      case "PENDING":
        return <Clock className="h-3 w-3" />
      case "REJECTED":
      case "DISABLED":
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const filteredTemplates = filterMetaOnly 
    ? templates.filter(t => t.metaTemplateId !== null)
    : templates

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Plantillas de WhatsApp</h2>
              <p className="text-muted-foreground">
                Crea plantillas y envíalas automáticamente a Meta para aprobación
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={syncTemplatesFromMeta}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? "Sincronizando..." : "Sincronizar con Meta"}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Plantilla
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nueva Plantilla para Meta</DialogTitle>
                    <DialogDescription>
                      La plantilla se enviará automáticamente a Meta para aprobación
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Plantillas Predefinidas Section */}
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowPredefined(!showPredefined)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {showPredefined ? "Ocultar" : "Usar"} Plantillas Predefinidas
                      </Button>

                      {showPredefined && (
                        <div className="grid gap-3">
                          {PREDEFINED_TEMPLATES.map((predefined) => (
                            <Card
                              key={predefined.id}
                              className="cursor-pointer hover:border-primary transition-colors"
                              onClick={() => handleUsePredefinedTemplate(predefined.id)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-sm font-medium">
                                      {predefined.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                      {predefined.description}
                                    </CardDescription>
                                  </div>
                                  <Badge className={getCategoryColor(predefined.category)} variant="secondary">
                                    {predefined.category}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="bg-muted p-3 rounded-md">
                                  <p className="text-xs whitespace-pre-wrap line-clamp-4">
                                    {predefined.content}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {predefined.variables.map((v) => (
                                    <Badge key={v} variant="outline" className="text-xs">
                                      {v}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre de la Plantilla</Label>
                      <Input
                        id="name"
                        placeholder="evento_politico_2025 (solo minúsculas, números y guiones bajos)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      />
                      <p className="text-xs text-muted-foreground">
                        El nombre se convertirá automáticamente al formato de Meta (minúsculas + guiones bajos)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenido del Mensaje</Label>
                      <Textarea
                        id="content"
                        placeholder="Usa {{variable}} para variables dinámicas"
                        rows={8}
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables encontradas: {extractVariables(formData.content).join(", ") || "ninguna"}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger id="category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utilidad</SelectItem>
                            <SelectItem value="AUTHENTICATION">Autenticación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Idioma</Label>
                        <Select
                          value={formData.language}
                          onValueChange={(value) => setFormData({ ...formData, language: value })}
                        >
                          <SelectTrigger id="language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="es_MX">Español (México)</SelectItem>
                            <SelectItem value="en_US">Inglés (US)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Info sobre aprobación de Meta */}
                    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                      <AlertDescription className="text-xs">
                        <strong>📝 Proceso automático:</strong> Al crear la plantilla, se enviará automáticamente a Meta para aprobación. El tiempo de aprobación típico es de 6-48 horas. Usa el botón "Sincronizar con Meta" para actualizar los estados.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-4">
                      <Button onClick={handleSubmit} disabled={submitting}>
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? "Enviando a Meta..." : "Crear y Enviar a Meta"}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={filterMetaOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMetaOnly(!filterMetaOnly)}
            >
              {filterMetaOnly ? "Mostrando: Solo plantillas de Meta" : "Mostrando: Todas las plantillas"}
            </Button>
            <span className="text-xs text-muted-foreground">
              ({filteredTemplates.length} plantilla{filteredTemplates.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {success && (
          <Alert className="mb-4 border-green-600 text-green-600">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando plantillas...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filterMetaOnly ? "No hay plantillas de Meta" : "No hay plantillas"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filterMetaOnly 
                  ? "Crea una plantilla nueva o desactiva el filtro para ver todas"
                  : "Crea tu primera plantilla para comenzar a enviar mensajes"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.metaTemplateId && (
                          <Badge variant="outline" className="text-xs">
                            Meta ✓
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge className={getStatusColor(template.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(template.status)}
                            {template.status}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3 whitespace-pre-wrap">
                    {template.content}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables && template.variables.length > 0 ? (
                        template.variables.map((v) => (
                          <Badge key={v} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Ninguna</span>
                      )}
                    </div>
                  </div>
                  {template.metaTemplateId && (
                    <div className="mb-4 p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">
                        ID Meta: <code className="text-xs">{template.metaTemplateId}</code>
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id, template.metaTemplateId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}