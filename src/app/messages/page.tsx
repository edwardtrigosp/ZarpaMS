"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Send, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Zap, ChevronRight, DollarSign, Calculator } from "lucide-react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import * as XLSX from "xlsx"
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

// ✅ Helper function to normalize phone numbers
const normalizePhoneNumber = (phone: string): string => {
  // Remove any whitespace
  const cleaned = phone.trim()
  // Add + if it doesn't start with one
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

// 💰 Tarifas por categoría de plantilla (USD por mensaje)
const CATEGORY_RATES: Record<string, number> = {
  'MARKETING': 0.06,
  'UTILITY': 0.03,
  'AUTHENTICATION': 0.03,
  'SERVICE': 0.01
}

// 💰 Nombres en español para categorías
const CATEGORY_NAMES: Record<string, string> = {
  'MARKETING': 'Marketing',
  'UTILITY': 'Utilidad',
  'AUTHENTICATION': 'Autenticación',
  'SERVICE': 'Servicio'
}

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

  // 💰 Calcular costo total
  const calculateCost = () => {
    if (!selectedTemplate || contacts.length === 0) {
      return {
        count: 0,
        rate: 0,
        total: 0,
        category: '',
        categoryName: ''
      }
    }

    const category = selectedTemplate.category.toUpperCase()
    const rate = CATEGORY_RATES[category] || 0
    const total = contacts.length * rate

    return {
      count: contacts.length,
      rate,
      total,
      category,
      categoryName: CATEGORY_NAMES[category] || category
    }
  }

  const costData = calculateCost()

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
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    // Si es archivo Excel (.xlsx, .xls), convertir a CSV primero
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Obtener la primera hoja
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convertir a CSV
          const csvString = XLSX.utils.sheet_to_csv(worksheet)
          
          // Procesar el CSV generado
          Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const parsed: Contact[] = []
              
              results.data.forEach((row: any) => {
                if (row.phoneNumber) {
                  const contact: Contact = {
                    phoneNumber: normalizePhoneNumber(row.phoneNumber),
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
              toast.success(`✅ ${parsed.length} contactos cargados desde Excel`, {
                description: "Números normalizados y listos para enviar"
              })
            },
            error: (error) => {
              toast.error("Error al procesar el archivo Excel", {
                description: error.message
              })
            },
          })
        } catch (error) {
          console.error("Error reading Excel file:", error)
          toast.error("Error al leer el archivo Excel", {
            description: "Verifica que el archivo no esté dañado"
          })
        }
      }
      
      reader.onerror = () => {
        toast.error("Error al leer el archivo")
      }
      
      reader.readAsArrayBuffer(file)
    } else {
      // Si es CSV, procesarlo directamente como antes
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed: Contact[] = []
          
          results.data.forEach((row: any) => {
            if (row.phoneNumber) {
              const contact: Contact = {
                phoneNumber: normalizePhoneNumber(row.phoneNumber),
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
            description: "Números normalizados y listos para enviar"
          })
        },
        error: (error) => {
          toast.error("Error al leer el archivo CSV", {
            description: error.message
          })
        },
      })
    }
  }

  const handleSendTestMessage = async () => {
    if (!selectedTemplate || !testPhone) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    const missingVars = selectedTemplate.variables.filter(v => !testVariables[v])
    if (missingVars.length > 0) {
      toast.error(`Completa las variables: ${missingVars.join(", ")}`)
      return
    }

    setSendingTest(true)

    try {
      const normalizedPhone = normalizePhoneNumber(testPhone)
      
      const payload = {
        templateId: selectedTemplate.id,
        contacts: [{
          phoneNumber: normalizedPhone,
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
          description: `Enviado a ${normalizedPhone}`,
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
      if (!selectedTemplate) {
        toast.error("Selecciona una plantilla primero")
        return
      }

      const variables = selectedTemplate.variables || []
      const params = new URLSearchParams({
        templateName: selectedTemplate.name,
        variables: JSON.stringify(variables)
      })

      const downloadUrl = `/api/messages/sample-csv?${params.toString()}`
      const fileName = `ejemplo_${selectedTemplate.name.toLowerCase().replace(/\s+/g, '_')}.csv`
      
      // Create hidden link for download (works in iframe and normal context)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      link.target = "_blank"
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link)
      }, 100)
      
      toast.success("✅ CSV de ejemplo descargado")
    } catch (error) {
      console.error("Error downloading CSV:", error)
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
                      placeholder="5215551234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Con código de país (+ opcional)
                    </p>
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

        {/* 💰 Calculadora de Costos */}
        {selectedTemplate && contacts.length > 0 && (
          <Card className="mb-6 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-600 rounded-lg">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cálculo de Costo de Envío</CardTitle>
                  <CardDescription>Estimación basada en tarifas de Meta por categoría de plantilla</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Total de Mensajes</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{costData.count}</p>
                </div>
                
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Categoría</p>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {costData.categoryName}
                  </Badge>
                </div>
                
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Tarifa Unitaria</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    ${costData.rate.toFixed(3)}
                  </p>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-lg border border-green-700">
                  <p className="text-xs opacity-90 mb-1">Costo Total Estimado</p>
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="h-5 w-5" />
                    <p className="text-2xl font-bold">{costData.total.toFixed(2)}</p>
                    <span className="text-xs opacity-80">USD</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Fórmula:</strong> {costData.count} mensajes × ${costData.rate.toFixed(3)} ({costData.categoryName}) = ${costData.total.toFixed(2)} USD
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phoneNumber</code> - Con código de país (+ se agrega automáticamente)</li>
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