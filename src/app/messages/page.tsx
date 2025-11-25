"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Send, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Zap, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// ✅ Get API key from localStorage
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('api_key');
    if (!apiKey) {
      const defaultKey = '123456789';
      localStorage.setItem('api_key', defaultKey);
      return defaultKey;
    }
    return apiKey;
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
  category: string
  status: string
}

interface Contact {
  phoneNumber: string
  name?: string
  variables?: Record<string, string>
}

export default function MessagesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Test message dialog state
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testName, setTestName] = useState("")
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("API Key no configurada");
    } else {
      fetchTemplates();
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?status=APPROVED&limit=50", {
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
      }
    } catch (err) {
      console.error("Error fetching templates:", err)
      toast.error("Error al cargar plantillas")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: Contact[] = []
        
        results.data.forEach((row: any) => {
          if (row.phoneNumber) {
            const contact: Contact = {
              phoneNumber: row.phoneNumber,
              name: row.name || undefined,
            }

            const variables: Record<string, string> = {}
            Object.keys(row).forEach((key) => {
              if (key !== "phoneNumber" && key !== "name" && row[key]) {
                variables[key] = row[key]
              }
            })

            if (Object.keys(variables).length > 0) {
              contact.variables = variables
            }

            parsed.push(contact)
          }
        })

        setContacts(parsed)
        setCurrentStep(2)
        toast.success(`✅ ${parsed.length} contactos cargados`, {
          description: "Listo para enviar"
        })
      },
      error: (error) => {
        toast.error("Error al leer el archivo CSV", {
          description: error.message
        })
      },
    })
  }

  const handleSendTestMessage = async () => {
    if (!selectedTemplate || !testPhone) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    if (!testPhone.startsWith("+")) {
      toast.error("El número debe incluir código de país (+52...)")
      return
    }

    const missingVars = selectedTemplate.variables.filter(v => !testVariables[v])
    if (missingVars.length > 0) {
      toast.error(`Completa las variables: ${missingVars.join(", ")}`)
      return
    }

    setSendingTest(true)

    try {
      const payload = {
        templateId: selectedTemplate.id,
        contacts: [{
          phoneNumber: testPhone,
          name: testName || undefined,
          variables: Object.keys(testVariables).length > 0 ? testVariables : undefined
        }]
      }

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success("✅ Mensaje de prueba enviado", {
          description: `Enviado a ${testPhone}`,
          action: {
            label: "Ver Webhook",
            onClick: () => router.push("/?tab=webhook")
          }
        })
        
        setTestPhone("")
        setTestName("")
        setTestVariables({})
        setTestDialogOpen(false)
      } else {
        const data = await res.json()
        toast.error("Error al enviar mensaje", {
          description: data.error || "Ocurrió un error"
        })
      }
    } catch (err) {
      toast.error("Error de conexión")
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendMessages = async () => {
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla")
      return
    }

    if (contacts.length === 0) {
      toast.error("Carga contactos desde un archivo CSV")
      return
    }

    const invalidNumbers = contacts.filter(c => !c.phoneNumber.startsWith("+"))
    if (invalidNumbers.length > 0) {
      toast.error("Números inválidos", {
        description: `${invalidNumbers.length} números sin código de país`
      })
      return
    }

    setLoading(true)

    try {
      const payload = {
        templateId: selectedTemplate.id,
        contacts,
      }

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success("📤 Mensajes enviados exitosamente", {
          description: `${data.messageCount} mensajes enviados`,
          duration: 5000
        })
        
        setContacts([])
        setCsvFile(null)
        setCurrentStep(1)
        
        const fileInput = document.getElementById("csv-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        const data = await res.json()
        toast.error("Error al enviar mensajes", {
          description: data.error || "Ocurrió un error"
        })
      }
    } catch (err) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    try {
      let sampleData: string
      
      if (selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0) {
        const headers = ['phoneNumber', 'name', ...selectedTemplate.variables]
        const headerRow = headers.join(',')
        
        const sampleRows = [
          `+5215551234567,Juan Pérez,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
          `+5215559876543,María García,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
          `+5215552468135,Carlos López,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`
        ]
        
        sampleData = [headerRow, ...sampleRows].join('\n')
      } else {
        sampleData = `phoneNumber,name
+5215551234567,Juan Pérez
+5215559876543,María García
+5215552468135,Carlos López`
      }

      const blob = new Blob(["\uFEFF" + sampleData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", selectedTemplate 
        ? `ejemplo_${selectedTemplate.name.toLowerCase().replace(/\s+/g, '_')}.csv`
        : "ejemplo_contactos.csv")
      
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success("✅ CSV de ejemplo descargado")
    } catch (error) {
      toast.error("Error al descargar CSV")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Envío de Mensajes</h2>
            <p className="text-muted-foreground">
              Proceso simple en 2 pasos
            </p>
          </div>
          
          {/* Test Message Dialog Trigger */}
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Envío Rápido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>⚡ Envío de Prueba Rápido</DialogTitle>
                <DialogDescription>
                  Envía un mensaje de prueba a un solo número
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="test-template">Plantilla *</Label>
                  <Select
                    value={selectedTemplate?.id.toString()}
                    onValueChange={(value) => {
                      const template = templates.find((t) => t.id.toString() === value)
                      setSelectedTemplate(template || null)
                      if (template && template.variables) {
                        const newVars: Record<string, string> = {}
                        template.variables.forEach(v => newVars[v] = "")
                        setTestVariables(newVars)
                      }
                    }}
                  >
                    <SelectTrigger id="test-template">
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-phone">Teléfono *</Label>
                    <Input
                      id="test-phone"
                      type="tel"
                      placeholder="+5215551234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-name">Nombre</Label>
                    <Input
                      id="test-name"
                      placeholder="Juan Pérez"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                    />
                  </div>
                </div>

                {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Variables de la plantilla</Label>
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable} className="space-y-2">
                        <Label htmlFor={`test-var-${variable}`} className="text-sm">
                          {variable} *
                        </Label>
                        <Input
                          id={`test-var-${variable}`}
                          placeholder={`Valor para ${variable}`}
                          value={testVariables[variable] || ""}
                          onChange={(e) => 
                            setTestVariables({...testVariables, [variable]: e.target.value})
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleSendTestMessage}
                  disabled={sendingTest || !selectedTemplate || !testPhone}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingTest ? "Enviando..." : "Enviar Prueba"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className="font-medium">Cargar Contactos</span>
          </div>
          
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              {currentStep > 2 ? <CheckCircle2 className="h-5 w-5" /> : "2"}
            </div>
            <span className="font-medium">Enviar Mensajes</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && (
                <>
                  <FileSpreadsheet className="h-5 w-5" />
                  Paso 1: Carga tu Archivo Excel/CSV
                </>
              )}
              {currentStep === 2 && (
                <>
                  <Send className="h-5 w-5" />
                  Paso 2: Revisa y Envía
                </>
              )}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Selecciona una plantilla y sube tu archivo con los contactos"}
              {currentStep === 2 && "Verifica los datos y envía los mensajes"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-3">
                  <Label htmlFor="template-select" className="text-base font-semibold">
                    1. Selecciona tu Plantilla
                  </Label>
                  <Select
                    value={selectedTemplate?.id.toString()}
                    onValueChange={(value) => {
                      const template = templates.find((t) => t.id.toString() === value)
                      setSelectedTemplate(template || null)
                      if (template) {
                        toast.success(`Plantilla "${template.name}" seleccionada`)
                      }
                    }}
                  >
                    <SelectTrigger id="template-select" className="h-12">
                      <SelectValue placeholder="Elige una plantilla aprobada" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline" className="text-xs">{template.category}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTemplate && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium">Vista Previa:</p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedTemplate.content}</p>
                      {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Variables necesarias:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.variables.map((v) => (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Download Example */}
                {selectedTemplate && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      2. Descarga el Formato de Ejemplo
                    </Label>
                    <Button 
                      onClick={downloadSampleCSV} 
                      variant="outline" 
                      className="w-full h-12 border-dashed border-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Archivo de Ejemplo (.csv)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Edita este archivo con tus datos reales antes de subirlo
                    </p>
                  </div>
                )}

                {/* File Upload */}
                <div className="space-y-3">
                  <Label htmlFor="csv-file" className="text-base font-semibold">
                    3. Sube tu Archivo con Contactos
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-muted/30">
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={!selectedTemplate}
                      className="hidden"
                    />
                    <label htmlFor="csv-file" className="cursor-pointer block">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        {csvFile ? csvFile.name : "Arrastra tu archivo aquí o haz clic para seleccionar"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Formatos: CSV, Excel (.xlsx, .xls)
                      </p>
                    </label>
                  </div>
                  
                  {!selectedTemplate && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-xs">Selecciona una plantilla primero</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Review & Send */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground mb-1">Plantilla</p>
                    <p className="font-semibold">{selectedTemplate?.name}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground mb-1">Total Contactos</p>
                    <p className="font-semibold text-2xl">{contacts.length}</p>
                  </div>
                </div>

                {/* Contacts Preview */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Vista Previa de Contactos</Label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Teléfono</th>
                          <th className="text-left p-3 font-medium">Nombre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.slice(0, 10).map((c, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                            <td className="p-3 font-mono text-xs">{c.phoneNumber}</td>
                            <td className="p-3">{c.name || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {contacts.length > 10 && (
                      <div className="p-3 bg-muted text-center text-sm text-muted-foreground border-t">
                        ... y {contacts.length - 10} contactos más
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentStep(1)
                      setContacts([])
                      setCsvFile(null)
                      const fileInput = document.getElementById("csv-file") as HTMLInputElement
                      if (fileInput) fileInput.value = ""
                    }}
                    className="flex-1"
                  >
                    Volver a Cargar
                  </Button>
                  <Button
                    onClick={handleSendMessages}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    {loading ? "Enviando..." : `Enviar ${contacts.length} Mensajes`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Formato del Archivo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Columnas requeridas:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phoneNumber</code> - Con código de país (+52)</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> - Nombre del contacto (opcional)</li>
              </ul>
              <p className="pt-2"><strong>Variables adicionales:</strong></p>
              <p className="text-muted-foreground">Dependen de la plantilla seleccionada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚡ Límites de Envío</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Límite Diario:</span>
                <Badge variant="secondary">1,000 mensajes</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Límite Pico:</span>
                <Badge variant="secondary">10,000 mensajes</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}