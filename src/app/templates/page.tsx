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
import { Plus, Edit, Trash2, FileText } from "lucide-react"
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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
        // Parse variables if they come as JSON strings
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
                    rows={6}
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