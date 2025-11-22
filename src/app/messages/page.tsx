"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Upload, Send, CheckCircle2, Info, Zap } from "lucide-react"
import Link from "next/link"
import Papa from "papaparse"
import { toast } from "sonner"

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
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  
  // Test message state
  const [testTemplate, setTestTemplate] = useState<Template | null>(null)
  const [testPhone, setTestPhone] = useState("")
  const [testName, setTestName] = useState("")
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?status=APPROVED&limit=50")
      if (res.ok) {
        const data = await res.json()
        // Parse variables field if it's a JSON string
        const parsedData = data.map((template: Template) => ({
          ...template,
          variables: typeof template.variables === 'string' 
            ? JSON.parse(template.variables) 
            : Array.isArray(template.variables) 
              ? template.variables 
              : []
        }))
        setTemplates(parsedData)
        
        if (parsedData.length > 0) {
          toast.success(`${parsedData.length} plantillas aprobadas cargadas`)
        } else {
          toast.info("No hay plantillas aprobadas. Ve a Plantillas para crear una.")
        }
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

            // Extract variable columns
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
        toast.success(`✅ ${parsed.length} contactos cargados exitosamente`, {
          description: `Se procesaron ${parsed.length} contactos del archivo CSV`
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
    // Validaciones
    if (!testTemplate) {
      toast.error("Selecciona una plantilla para la prueba")
      return
    }

    if (!testPhone) {
      toast.error("Ingresa un número de teléfono")
      return
    }

    if (!testPhone.startsWith("+")) {
      toast.error("El número debe incluir código de país (+52...)")
      return
    }

    // Validar que todas las variables requeridas estén llenas
    const missingVars = testTemplate.variables.filter(v => !testVariables[v])
    if (missingVars.length > 0) {
      toast.error(`Completa las variables: ${missingVars.join(", ")}`)
      return
    }

    setSendingTest(true)
    
    const loadingToast = toast.loading("Enviando mensaje de prueba...", {
      description: `A: ${testPhone}`
    })

    try {
      const payload = {
        templateId: testTemplate.id,
        contacts: [{
          phoneNumber: testPhone,
          name: testName || undefined,
          variables: Object.keys(testVariables).length > 0 ? testVariables : undefined
        }]
      }

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success("✅ Mensaje de prueba enviado", {
          description: `Mensaje enviado a ${testPhone}. Revisa el historial y el webhook.`,
          duration: 5000
        })
        
        // Limpiar formulario de prueba
        setTestPhone("")
        setTestName("")
        setTestVariables({})
      } else {
        const data = await res.json()
        toast.error("Error al enviar mensaje de prueba", {
          description: data.error || "Ocurrió un error inesperado"
        })
      }
    } catch (err) {
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor"
      })
    } finally {
      toast.dismiss(loadingToast)
      setSendingTest(false)
    }
  }

  const handleSendMessages = async () => {
    // Validaciones
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla", {
        description: "Debes elegir una plantilla aprobada antes de enviar mensajes"
      })
      return
    }

    if (contacts.length === 0) {
      toast.error("Carga contactos desde un archivo CSV", {
        description: "Necesitas subir un archivo CSV con al menos un contacto"
      })
      return
    }

    // Validar que los números tengan el formato correcto
    const invalidNumbers = contacts.filter(c => !c.phoneNumber.startsWith("+"))
    if (invalidNumbers.length > 0) {
      toast.error("Números de teléfono inválidos", {
        description: `${invalidNumbers.length} números no incluyen código de país (+52...)`
      })
      return
    }

    setLoading(true)
    
    const loadingToast = toast.loading(
      scheduledDate ? "Programando mensajes..." : "Enviando mensajes...", 
      {
        description: `Procesando ${contacts.length} contactos`
      }
    )

    try {
      const payload = {
        templateId: selectedTemplate.id,
        contacts,
        scheduledAt: scheduledDate || undefined,
      }

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(
          scheduledDate ? "🗓️ Mensajes programados exitosamente" : "📤 Mensajes enviados exitosamente",
          {
            description: `${data.messageCount} mensajes ${scheduledDate ? "programados para " + new Date(scheduledDate).toLocaleString('es-MX') : "guardados en el historial"}`,
            duration: 5000
          }
        )
        
        // Limpiar formulario
        setContacts([])
        setCsvFile(null)
        setScheduledDate("")
        
        // Resetear el input de archivo
        const fileInput = document.getElementById("csv-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        const data = await res.json()
        toast.error("Error al enviar mensajes", {
          description: data.error || "Ocurrió un error inesperado"
        })
      }
    } catch (err) {
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor"
      })
    } finally {
      toast.dismiss(loadingToast)
      setLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    try {
      let sampleData: string
      
      if (selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0) {
        // Generate CSV based on selected template variables
        const headers = ['phoneNumber', 'name', ...selectedTemplate.variables]
        const headerRow = headers.join(',')
        
        // Generate sample rows with example data for each variable
        const sampleRows = [
          `+5215551234567,Juan Pérez,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
          `+5215559876543,María García,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
          `+5215552468135,Carlos López,${selectedTemplate.variables.map((v, i) => `Valor ${i + 1}`).join(',')}`
        ]
        
        sampleData = [headerRow, ...sampleRows].join('\n')
      } else {
        // Default generic CSV
        sampleData = `phoneNumber,name,date,time,discount
+5215551234567,Juan Pérez,25 de enero,10:00 AM,20%
+5215559876543,María García,26 de enero,2:30 PM,15%
+5215552468135,Carlos López,27 de enero,4:00 PM,25%`
      }

      // Add BOM for UTF-8 encoding
      const blob = new Blob(["\uFEFF" + sampleData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", selectedTemplate 
        ? `ejemplo_${selectedTemplate.name.toLowerCase().replace(/\s+/g, '_')}.csv`
        : "ejemplo_contactos.csv")
      
      // Required for Firefox
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      
      // Trigger download
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success("✅ CSV de ejemplo descargado", {
        description: "Revisa tu carpeta de Descargas. Edita el archivo con tus datos reales antes de subirlo"
      })
      
      console.log("CSV download triggered successfully")
    } catch (error) {
      console.error("Error downloading CSV:", error)
      toast.error("Error al descargar CSV", {
        description: "Intenta nuevamente o verifica los permisos del navegador"
      })
    }
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
          <h2 className="text-3xl font-bold mb-2">Envío Masivo de Mensajes</h2>
          <p className="text-muted-foreground">
            Envía mensajes a múltiples contactos usando tus plantillas aprobadas
          </p>
        </div>

        {/* Test Message Card */}
        <Card className="mb-6 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-400">
              <Zap className="h-6 w-6" />
              ⚡ Envío de Prueba Rápido
            </CardTitle>
            <CardDescription>
              Envía un mensaje de prueba a un solo número sin necesidad de subir CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="test-template">Plantilla</Label>
                <Select
                  value={testTemplate?.id.toString()}
                  onValueChange={(value) => {
                    const template = templates.find((t) => t.id.toString() === value)
                    setTestTemplate(template || null)
                    // Inicializar variables vacías
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

              <div className="space-y-2">
                <Label htmlFor="test-phone">Número de Teléfono *</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  placeholder="+5215551234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-name">Nombre (Opcional)</Label>
                <Input
                  id="test-name"
                  placeholder="Juan Pérez"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>

              {/* Variables dinámicas */}
              {testTemplate && testTemplate.variables && testTemplate.variables.length > 0 && (
                <>
                  {testTemplate.variables.map((variable) => (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={`test-var-${variable}`}>
                        Variable: {variable} *
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
                </>
              )}
            </div>

            {testTemplate && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm font-medium mb-2">Vista Previa del Mensaje:</p>
                <p className="text-sm whitespace-pre-wrap">{testTemplate.content}</p>
              </div>
            )}

            <Button
              onClick={handleSendTestMessage}
              disabled={sendingTest || !testTemplate || !testPhone}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              size="lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              {sendingTest ? "Enviando..." : "Enviar Mensaje de Prueba"}
            </Button>
            
            {(!testTemplate || !testPhone) && (
              <p className="text-xs text-center text-muted-foreground">
                {!testTemplate && "→ Selecciona una plantilla primero"}
                {testTemplate && !testPhone && "→ Ingresa un número de teléfono"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tutorial Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Info className="h-5 w-5" />
              📝 Guía Rápida - Primer Mensaje
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-blue-900 dark:text-blue-300">
            <p><strong>Paso 1:</strong> Selecciona una plantilla aprobada del dropdown</p>
            <p><strong>Paso 2:</strong> Descarga el CSV de ejemplo y edítalo con tus datos reales</p>
            <p><strong>Paso 3:</strong> Sube tu archivo CSV con los contactos</p>
            <p><strong>Paso 4:</strong> Haz clic en "Enviar Mensajes" y revisa el historial</p>
            <p className="pt-2 border-t border-blue-200 dark:border-blue-800">
              💡 <strong>Tip:</strong> Los números deben incluir código de país (ej: +5215551234567)
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className={selectedTemplate ? "border-green-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>1. Selecciona una Plantilla</CardTitle>
                    <CardDescription>
                      Elige una plantilla aprobada para enviar
                    </CardDescription>
                  </div>
                  {selectedTemplate && (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedTemplate?.id.toString()}
                  onValueChange={(value) => {
                    const template = templates.find((t) => t.id.toString() === value)
                    setSelectedTemplate(template || null)
                    if (template) {
                      toast.success(`Plantilla "${template.name}" seleccionada`, {
                        description: template.variables.length > 0 
                          ? `Variables: ${template.variables.join(", ")}` 
                          : "Sin variables"
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} - {template.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTemplate && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Vista Previa:</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplate.variables.map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={contacts.length > 0 ? "border-green-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>2. Carga Contactos (CSV)</CardTitle>
                    <CardDescription>
                      Sube un archivo CSV con los números de teléfono
                    </CardDescription>
                  </div>
                  {contacts.length > 0 && (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Archivo CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    El CSV debe incluir columnas: phoneNumber, name, y cualquier variable de la plantilla
                  </p>
                </div>

                <Button variant="outline" onClick={downloadSampleCSV} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Descargar CSV de Ejemplo
                </Button>

                {contacts.length > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium mb-2 text-green-700 dark:text-green-400">
                      ✅ Contactos Cargados: {contacts.length}
                    </p>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {contacts.slice(0, 5).map((c, i) => (
                        <div key={i} className="text-green-900 dark:text-green-300">
                          {c.phoneNumber} {c.name ? `- ${c.name}` : ""}
                        </div>
                      ))}
                      {contacts.length > 5 && (
                        <div className="text-green-600 dark:text-green-500">
                          ...y {contacts.length - 5} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Opciones de Envío</CardTitle>
                <CardDescription>
                  Configura cuándo enviar los mensajes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-date">Programar Envío (Opcional)</Label>
                  <Input
                    id="scheduled-date"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deja vacío para enviar inmediatamente
                  </p>
                </div>

                <Button
                  onClick={handleSendMessages}
                  disabled={loading || !selectedTemplate || contacts.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Enviando..." : scheduledDate ? "Programar Mensajes" : "Enviar Mensajes"}
                </Button>
                
                {(!selectedTemplate || contacts.length === 0) && (
                  <p className="text-xs text-center text-muted-foreground">
                    {!selectedTemplate && "→ Selecciona una plantilla primero"}
                    {selectedTemplate && contacts.length === 0 && "→ Carga contactos desde CSV"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Límites de Envío</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Límite Diario:</span>
                  <Badge>1,000 mensajes</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Límite Pico:</span>
                  <Badge>10,000 mensajes</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formato del CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">Columnas Requeridas:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>phoneNumber (formato: +52XXXXXXXXXX)</li>
                      <li>name (opcional, nombre del contacto)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Columnas Opcionales:</p>
                    <p className="text-muted-foreground">
                      Cualquier variable usada en tu plantilla (ej: date, time, discount)
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Ejemplo:</p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`phoneNumber,name,date,time
+5215551234567,Juan,25 enero,10:00
+5215559876543,María,26 enero,14:30`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consejos de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Verifica que los números incluyan el código de país (+52)</li>
                  <li>✓ Usa plantillas APROBADAS por Meta</li>
                  <li>✓ Respeta los límites diarios y pico</li>
                  <li>✓ Programa envíos para evitar sobrecarga</li>
                  <li>✓ Revisa el historial después del envío</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}