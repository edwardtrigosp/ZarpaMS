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
import { Plus, Edit, Trash2, FileText, Sparkles } from "lucide-react"
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
    name: "Evento Político - Inscripción de Candidato",
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
    name: "Evento Político - Convocatoria General",
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPredefined, setShowPredefined] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    variables: "",
    language: "es",
    category: "MARKETING",
    status: "DRAFT",
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

  const handleUsePredefinedTemplate = (predefinedId: string) => {
    const predefined = PREDEFINED_TEMPLATES.find(t => t.id === predefinedId)
    if (predefined) {
      setFormData({
        name: predefined.name,
        content: predefined.content,
        variables: predefined.variables.join(", "),
        language: "es",
        category: predefined.category,
        status: "DRAFT",
      })
      setShowPredefined(false)
      toast.success("Plantilla cargada", {
        description: "Puedes personalizarla antes de guardar"
      })
    }
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess("")

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
      status: formData.status,
    }

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : "/api/templates"
      const method = editingTemplate ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: getFetchHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const successMsg = editingTemplate
          ? "Plantilla actualizada exitosamente"
          : "Plantilla creada exitosamente"
        setSuccess(successMsg)
        toast.success(successMsg)
        setIsDialogOpen(false)
        fetchTemplates()
        resetForm()
      } else {
        const data = await res.json()
        const errorMsg = data.error || "Error al guardar la plantilla"
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      setError("Error de conexión")
      toast.error("Error de conexión")
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      variables: (template.variables || []).join(", "),
      language: template.language,
      category: template.category,
      status: template.status,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return

    try {
      const res = await fetch(`/api/templates/${id}`, { 
        method: "DELETE",
        headers: getFetchHeaders()
      })
      if (res.ok) {
        setSuccess("Plantilla eliminada exitosamente")
        toast.success("Plantilla eliminada exitosamente")
        fetchTemplates()
      } else {
        const data = await res.json()
        const errorMsg = data.error || "Error al eliminar la plantilla"
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      setError("Error de conexión")
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
      status: "DRAFT",
    })
    setEditingTemplate(null)
    setShowPredefined(false)
  }

  const extractVariables = (content: string) => {
    const matches = content.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    return matches.map((m) => m.replace(/\{\{|\}\}/g, ""))
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
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Plantillas de Mensajes</h2>
            <p className="text-muted-foreground">
              Crea y gestiona plantillas para tus campañas de mensajería
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Editar Plantilla" : "Nueva Plantilla"}
                </DialogTitle>
                <DialogDescription>
                  Crea una plantilla de mensaje con variables personalizables
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Plantillas Predefinidas Section */}
                {!editingTemplate && (
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Plantilla</Label>
                  <Input
                    id="name"
                    placeholder="ejemplo: recordatorio_cita"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
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
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="APPROVED">Aprobado</SelectItem>
                        <SelectItem value="REJECTED">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Info sobre aprobación de Meta */}
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <AlertDescription className="text-xs">
                    <strong>📝 Importante:</strong> Las plantillas deben ser aprobadas por Meta antes de poder usarse para envíos masivos. Cambia el estado a "Pendiente" cuando esté lista para enviar a aprobación.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={handleSubmit}>
                    {editingTemplate ? "Actualizar" : "Crear"} Plantilla
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
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera plantilla para comenzar a enviar mensajes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
                      <div className="flex gap-2 mb-2">
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge className={getStatusColor(template.status)}>
                          {template.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3">
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
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