"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Zap, ChevronRight, DollarSign, Calculator, MessageSquare, Users, Settings, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";

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
  const cleaned = phone.trim();
  // Add + if it doesn't start with one
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

// 💰 Tarifas por categoría de plantilla (USD por mensaje)
const CATEGORY_RATES: Record<string, number> = {
  'MARKETING': 0.06,
  'UTILITY': 0.03,
  'AUTHENTICATION': 0.03,
  'SERVICE': 0.01
};

// 💰 Nombres en español para categorías
const CATEGORY_NAMES: Record<string, string> = {
  'MARKETING': 'Marketing',
  'UTILITY': 'Utilidad',
  'AUTHENTICATION': 'Autenticación',
  'SERVICE': 'Servicio'
};

interface Template {
  id: number;
  name: string;
  content: string;
  variables: string[];
  category: string;
  status: string;
}

interface Contact {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
}

interface WhatsAppConfig {
  dailyLimit: number;
  peakLimit: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);
  const [tempDailyLimit, setTempDailyLimit] = useState(1000);

  // Test message dialog state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testName, setTestName] = useState("");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [sendingTest, setSendingTest] = useState(false);

  // 💰 Calcular costo total
  const calculateCost = () => {
    if (!selectedTemplate || contacts.length === 0) {
      return {
        count: 0,
        rate: 0,
        total: 0,
        category: '',
        categoryName: ''
      };
    }

    const category = selectedTemplate.category.toUpperCase();
    const rate = CATEGORY_RATES[category] || 0;
    const total = contacts.length * rate;

    return {
      count: contacts.length,
      rate,
      total,
      category,
      categoryName: CATEGORY_NAMES[category] || category
    };
  };

  const costData = calculateCost();

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("API Key no configurada");
    } else {
      fetchTemplates();
      fetchConfig();
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          dailyLimit: data.dailyLimit,
          peakLimit: data.peakLimit
        });
        setTempDailyLimit(data.dailyLimit);
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  };

  const handleSaveDailyLimit = async () => {
    if (!config) return;

    if (tempDailyLimit > config.peakLimit) {
      toast.error("El límite diario no puede exceder la capacidad de Meta", {
        description: `Capacidad máxima: ${config.peakLimit.toLocaleString()} mensajes`
      });
      return;
    }

    if (tempDailyLimit < 1) {
      toast.error("El límite diario debe ser al menos 1");
      return;
    }

    setSavingLimit(true);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify({
          dailyLimit: tempDailyLimit
        })
      });

      if (res.ok) {
        setConfig({ ...config, dailyLimit: tempDailyLimit });
        toast.success("✅ Límite diario actualizado", {
          description: `Nuevo límite: ${tempDailyLimit.toLocaleString()} mensajes/día`
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al actualizar límite");
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setSavingLimit(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?status=APPROVED&limit=50", {
        headers: getFetchHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const parsedData = data.map((template: Template) => ({
          ...template,
          variables: typeof template.variables === 'string' ?
          JSON.parse(template.variables) :
          Array.isArray(template.variables) ?
          template.variables :
          []
        }));
        setTemplates(parsedData);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      toast.error("Error al cargar plantillas");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // Si es archivo Excel (.xlsx, .xls), convertir a CSV primero
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Obtener la primera hoja
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertir a CSV
          const csvString = XLSX.utils.sheet_to_csv(worksheet);

          // Procesar el CSV generado
          Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const parsed: Contact[] = [];

              results.data.forEach((row: any) => {
                if (row.phoneNumber) {
                  const contact: Contact = {
                    phoneNumber: normalizePhoneNumber(row.phoneNumber),
                    name: row.name || undefined
                  };

                  const variables: Record<string, string> = {};
                  Object.keys(row).forEach((key) => {
                    if (key !== "phoneNumber" && key !== "name" && row[key]) {
                      variables[key] = row[key];
                    }
                  });

                  if (Object.keys(variables).length > 0) {
                    contact.variables = variables;
                  }

                  parsed.push(contact);
                }
              });

              setContacts(parsed);
              setCurrentStep(2);
              toast.success(`✅ ${parsed.length} contactos cargados desde Excel`, {
                description: "Números normalizados y listos para enviar"
              });
            },
            error: (error) => {
              toast.error("Error al procesar el archivo Excel", {
                description: error.message
              });
            }
          });
        } catch (error) {
          console.error("Error reading Excel file:", error);
          toast.error("Error al leer el archivo Excel", {
            description: "Verifica que el archivo no esté dañado"
          });
        }
      };

      reader.onerror = () => {
        toast.error("Error al leer el archivo");
      };

      reader.readAsArrayBuffer(file);
    } else {
      // Si es CSV, procesarlo directamente como antes
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed: Contact[] = [];

          results.data.forEach((row: any) => {
            if (row.phoneNumber) {
              const contact: Contact = {
                phoneNumber: normalizePhoneNumber(row.phoneNumber),
                name: row.name || undefined
              };

              const variables: Record<string, string> = {};
              Object.keys(row).forEach((key) => {
                if (key !== "phoneNumber" && key !== "name" && row[key]) {
                  variables[key] = row[key];
                }
              });

              if (Object.keys(variables).length > 0) {
                contact.variables = variables;
              }

              parsed.push(contact);
            }
          });

          setContacts(parsed);
          setCurrentStep(2);
          toast.success(`✅ ${parsed.length} contactos cargados`, {
            description: "Números normalizados y listos para enviar"
          });
        },
        error: (error) => {
          toast.error("Error al leer el archivo CSV", {
            description: error.message
          });
        }
      });
    }
  };

  const handleSendTestMessage = async () => {
    if (!selectedTemplate || !testPhone) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    const missingVars = selectedTemplate.variables.filter((v) => !testVariables[v]);
    if (missingVars.length > 0) {
      toast.error(`Completa las variables: ${missingVars.join(", ")}`);
      return;
    }

    setSendingTest(true);

    try {
      const normalizedPhone = normalizePhoneNumber(testPhone);

      const payload = {
        templateId: selectedTemplate.id,
        contacts: [{
          phoneNumber: normalizedPhone,
          name: testName || undefined,
          variables: Object.keys(testVariables).length > 0 ? testVariables : undefined
        }]
      };

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("✅ Mensaje de prueba enviado", {
          description: `Enviado a ${normalizedPhone}`,
          action: {
            label: "Ver Webhook",
            onClick: () => router.push("/?tab=webhook")
          }
        });

        setTestPhone("");
        setTestName("");
        setTestVariables({});
        setTestDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error("Error al enviar mensaje", {
          description: data.error || "Ocurrió un error"
        });
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendMessages = async () => {
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla");
      return;
    }

    if (contacts.length === 0) {
      toast.error("Carga contactos desde un archivo CSV");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        templateId: selectedTemplate.id,
        contacts
      };

      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: getFetchHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("📤 Mensajes enviados exitosamente", {
          description: `${data.messageCount} mensajes enviados`,
          duration: 5000
        });

        setContacts([]);
        setCsvFile(null);
        setCurrentStep(1);

        const fileInput = document.getElementById("csv-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        const data = await res.json();
        toast.error("Error al enviar mensajes", {
          description: data.error || "Ocurrió un error"
        });
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    try {
      if (!selectedTemplate) {
        toast.error("Selecciona una plantilla primero");
        return;
      }

      const variables = selectedTemplate.variables || [];
      const params = new URLSearchParams({
        templateName: selectedTemplate.name,
        variables: JSON.stringify(variables)
      });

      const downloadUrl = `/api/messages/sample-csv?${params.toString()}`;
      const fileName = `ejemplo_${selectedTemplate.name.toLowerCase().replace(/\s+/g, '_')}.csv`;

      // Create hidden link for download (works in iframe and normal context)
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast.success("✅ CSV de ejemplo descargado");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Error al descargar CSV");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-3xl font-bold mb-2">Envío de Mensajes</h2>
              <p className="text-muted-foreground">
                Envía mensajes masivos de WhatsApp con plantillas aprobadas
              </p>
            </div>
            
            {/* Test Message Dialog Trigger */}
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
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
                        const template = templates.find((t) => t.id.toString() === value);
                        setSelectedTemplate(template || null);
                        if (template && template.variables) {
                          const newVars: Record<string, string> = {};
                          template.variables.forEach((v) => newVars[v] = "");
                          setTestVariables(newVars);
                        }
                      }}>

                      <SelectTrigger id="test-template">
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) =>
                        <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        )}
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
                        onChange={(e) => setTestPhone(e.target.value)} />

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
                        onChange={(e) => setTestName(e.target.value)} />

                    </div>
                  </div>

                  {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 &&
                  <div className="space-y-3">
                      <Label className="text-sm font-medium">Variables de la plantilla</Label>
                      {selectedTemplate.variables.map((variable) =>
                    <div key={variable} className="space-y-2">
                          <Label htmlFor={`test-var-${variable}`} className="text-sm">
                            {variable} *
                          </Label>
                          <Input
                        id={`test-var-${variable}`}
                        placeholder={`Valor para ${variable}`}
                        value={testVariables[variable] || ""}
                        onChange={(e) =>
                        setTestVariables({ ...testVariables, [variable]: e.target.value })
                        } />

                        </div>
                    )}
                    </div>
                  }

                  <Button
                    onClick={handleSendTestMessage}
                    disabled={sendingTest || !selectedTemplate || !testPhone}
                    className="w-full">

                    <Send className="h-4 w-4 mr-2" />
                    {sendingTest ? "Enviando..." : "Enviar Prueba"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* NEW: Compact Limits Indicator */}
        {config && (
          <Alert className="mb-6 border-purple-500/20 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
            <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                    Límite Diario Configurado:
                  </span>
                  <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {config.dailyLimit.toLocaleString()} mensajes/día
                  </Badge>
                </div>
                <div className="h-4 w-px bg-purple-300 dark:bg-purple-700" />
                <div>
                  <span className="text-xs text-muted-foreground">
                    Capacidad Meta: {config.peakLimit.toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/configuracion?tab=limits")}
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Ajustar Límites
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${currentStep >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
              </div>
              <span className="font-medium">Cargar Contactos</span>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
            
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${currentStep >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                {currentStep > 2 ? <CheckCircle2 className="h-5 w-5" /> : "2"}
              </div>
              <span className="font-medium">Enviar Mensajes</span>
            </div>
          </div>
        </div>

        {/* 💰 Calculadora de Costos */}
        {selectedTemplate && contacts.length > 0 &&
        <Card className="mb-6 border-green-500/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 !w-full !h-[361px]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Estimación de Costo</CardTitle>
                  <CardDescription>Basado en la categoría de plantilla y cantidad de mensajes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs font-medium text-muted-foreground">Total de Mensajes</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{costData.count}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Categoría</p>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {costData.categoryName}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs font-medium text-muted-foreground">Tarifa Unitaria</p>
                    </div>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${costData.rate.toFixed(3)}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-600 to-emerald-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-xs opacity-90 mb-1 font-medium">Costo Total Estimado</p>
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="h-5 w-5" />
                      <p className="text-2xl font-bold">{costData.total.toFixed(2)}</p>
                      <span className="text-xs opacity-80">USD</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs text-blue-900 dark:text-blue-300">
                  <strong>Fórmula:</strong> {costData.count} mensajes × ${costData.rate.toFixed(3)} ({costData.categoryName}) = ${costData.total.toFixed(2)} USD
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        }

        {/* Main Card */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              {currentStep === 1 &&
              <>
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Paso 1: Carga tu Archivo</CardTitle>
                    <CardDescription>Selecciona una plantilla y sube tu archivo con los contactos</CardDescription>
                  </div>
                </>
              }
              {currentStep === 2 &&
              <>
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Paso 2: Revisa y Envía</CardTitle>
                    <CardDescription>Verifica los datos y envía los mensajes</CardDescription>
                  </div>
                </>
              }
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Step 1: Upload */}
            {currentStep === 1 &&
            <div className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-3">
                  <Label htmlFor="template-select" className="text-base font-semibold">
                    1. Selecciona tu Plantilla
                  </Label>
                  <Select
                  value={selectedTemplate?.id.toString()}
                  onValueChange={(value) => {
                    const template = templates.find((t) => t.id.toString() === value);
                    setSelectedTemplate(template || null);
                    if (template) {
                      toast.success(`Plantilla "${template.name}" seleccionada`);
                    }
                  }}>

                    <SelectTrigger id="template-select" className="h-12">
                      <SelectValue placeholder="Elige una plantilla aprobada" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) =>
                    <SelectItem key={template.id} value={template.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline" className="text-xs">{template.category}</Badge>
                          </div>
                        </SelectItem>
                    )}
                    </SelectContent>
                  </Select>

                  {selectedTemplate &&
                <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                      <AlertDescription>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Vista Previa:</p>
                        <p className="text-sm whitespace-pre-wrap text-blue-800 dark:text-blue-400">{selectedTemplate.content}</p>
                        {selectedTemplate.variables && selectedTemplate.variables.length > 0 &&
                    <div className="pt-3 mt-3 border-t border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Variables necesarias:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedTemplate.variables.map((v) =>
                        <Badge key={v} variant="secondary" className="text-xs">
                                  {v}
                                </Badge>
                        )}
                            </div>
                          </div>
                    }
                      </AlertDescription>
                    </Alert>
                }
                </div>

                {/* Download Example */}
                {selectedTemplate &&
              <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      2. Descarga el Formato de Ejemplo
                    </Label>
                    <Button
                  onClick={downloadSampleCSV}
                  variant="outline"
                  className="w-full h-12 border-dashed border-2">

                      <Download className="h-4 w-4 mr-2" />
                      Descargar Archivo de Ejemplo (.csv)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Edita este archivo con tus datos reales antes de subirlo
                    </p>
                  </div>
              }

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
                    className="hidden" />

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
                  
                  {!selectedTemplate &&
                <Alert className="border-amber-500/20 bg-amber-50 dark:bg-amber-950/20">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <AlertDescription className="text-xs text-amber-900 dark:text-amber-300">
                        Selecciona una plantilla primero para poder cargar contactos
                      </AlertDescription>
                    </Alert>
                }
                </div>
              </div>
            }

            {/* Step 2: Review & Send */}
            {currentStep === 2 &&
            <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Plantilla Seleccionada</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-300">{selectedTemplate?.name}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-500/20 bg-green-50 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Contactos</p>
                          <p className="font-semibold text-2xl text-green-900 dark:text-green-300">{contacts.length}</p>
                        </div>
                        <Users className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contacts Preview */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Vista Previa de Contactos</Label>
                  <Card>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr>
                            <th className="text-left p-3 font-medium">#</th>
                            <th className="text-left p-3 font-medium">Teléfono</th>
                            <th className="text-left p-3 font-medium">Nombre</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.slice(0, 10).map((c, i) =>
                        <tr key={i} className="border-t">
                              <td className="p-3 text-muted-foreground">{i + 1}</td>
                              <td className="p-3 font-mono text-xs">{c.phoneNumber}</td>
                              <td className="p-3">{c.name || "-"}</td>
                            </tr>
                        )}
                        </tbody>
                      </table>
                      {contacts.length > 10 &&
                    <div className="p-3 bg-muted text-center text-sm text-muted-foreground border-t">
                          ... y {contacts.length - 10} contactos más
                        </div>
                    }
                    </div>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setContacts([]);
                    setCsvFile(null);
                    const fileInput = document.getElementById("csv-file") as HTMLInputElement;
                    if (fileInput) fileInput.value = "";
                  }}
                  className="flex-1">

                    Volver a Cargar
                  </Button>
                  <Button
                  onClick={handleSendMessages}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base">

                    <Send className="h-5 w-5 mr-2" />
                    {loading ? "Enviando..." : `Enviar ${contacts.length} Mensajes`}
                  </Button>
                </div>
              </div>
            }
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Formato del Archivo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <p className="font-semibold mb-2">Columnas requeridas:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><code className="text-xs bg-muted px-1.5 py-0.5 rounded">phoneNumber</code> - Con código de país (+ se agrega automáticamente)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><code className="text-xs bg-muted px-1.5 py-0.5 rounded">name</code> - Nombre del contacto (opcional)</span>
                  </li>
                </ul>
              </div>
              <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                <AlertDescription className="text-xs text-blue-900 dark:text-blue-300">
                  <strong>Variables adicionales:</strong> Dependen de la plantilla seleccionada
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Límites de Envío
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Límite Diario:</span>
                <Badge variant="secondary" className="text-sm">1,000 mensajes</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Límite Pico:</span>
                <Badge variant="secondary" className="text-sm">10,000 mensajes</Badge>
              </div>
              <Alert className="border-amber-500/20 bg-amber-50 dark:bg-amber-950/20">
                <AlertDescription className="text-xs text-amber-900 dark:text-amber-300">
                  Los límites se actualizan automáticamente según tu tier de Meta
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}