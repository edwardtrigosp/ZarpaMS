"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  AlertTriangle,
  Loader2,
  Activity,
  Database,
  MessageSquare,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  name: string;
  status: "running" | "passed" | "failed" | "warning";
  data?: any;
  error?: string;
  message?: string;
}

interface TestResponse {
  timestamp: string;
  tests: TestResult[];
  success: boolean;
  messageId: string | null;
  deliveryStatus: string | null;
  executionTime?: string;
  error?: string;
  message?: string;
}

export default function PruebasInternasPage() {
  const [phoneNumber, setPhoneNumber] = useState("3219092779");
  const [message, setMessage] = useState("Hola prueba de whatsApp");
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResponse | null>(null);

  const handleRunTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    toast.loading("Ejecutando pruebas del sistema...", { id: "test-running" });

    try {
      const response = await fetch(
        `/api/test-send?phone=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(message)}`
      );
      
      const data: TestResponse = await response.json();
      setTestResults(data);

      if (data.success) {
        toast.success("✅ Todas las pruebas completadas exitosamente", { id: "test-running" });
      } else {
        toast.error("❌ Algunas pruebas fallaron", { id: "test-running" });
      }
    } catch (error) {
      console.error("Error running test:", error);
      toast.error("Error al ejecutar las pruebas", { id: "test-running" });
      setTestResults({
        timestamp: new Date().toISOString(),
        tests: [],
        success: false,
        messageId: null,
        deliveryStatus: null,
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-600">Exitoso</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>;
      case "warning":
        return <Badge className="bg-yellow-600">Advertencia</Badge>;
      case "running":
        return <Badge className="bg-blue-600">Ejecutando</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Pruebas Internas del Sistema</h1>
          </div>
          <p className="text-muted-foreground">
            Verifica la capacidad de envío de mensajes a través de Meta y el estado del sistema
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Test Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle>Configuración de Prueba</CardTitle>
              </div>
              <CardDescription>
                Configura los parámetros para el test de envío
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Número de Teléfono</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="3219092779"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Sin código de país (+57 se agregará automáticamente)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje de Prueba</Label>
                <Input
                  id="message"
                  type="text"
                  placeholder="Hola prueba de whatsApp"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Este texto es referencial - se usará una plantilla aprobada
                </p>
              </div>

              <Button 
                onClick={handleRunTest} 
                disabled={isLoading || !phoneNumber}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ejecutando Pruebas...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Ejecutar Pruebas del Sistema
                  </>
                )}
              </Button>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>ℹ️ Nota:</strong> Este test verificará:
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Configuración de WhatsApp Business API</li>
                    <li>Disponibilidad de plantillas aprobadas</li>
                    <li>Capacidad de envío a través de Meta</li>
                    <li>Persistencia en base de datos</li>
                    <li>Estado de entrega vía webhook (5 segundos)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Estado del Sistema</CardTitle>
              </div>
              <CardDescription>
                Información general del sistema de mensajería
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Estado General</span>
                    {testResults.success ? (
                      <Badge className="bg-green-600">Operativo</Badge>
                    ) : (
                      <Badge variant="destructive">Con Errores</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tiempo de ejecución:</span>
                      <span className="font-medium">{testResults.executionTime || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="font-mono text-xs">
                        {new Date(testResults.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {testResults.messageId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ID de Mensaje:</span>
                        <span className="font-mono text-xs">{testResults.messageId}</span>
                      </div>
                    )}
                    {testResults.deliveryStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estado de Entrega:</span>
                        <Badge variant="outline">{testResults.deliveryStatus}</Badge>
                      </div>
                    )}
                  </div>

                  {testResults.error && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        <strong>Error:</strong> {testResults.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {testResults.message && testResults.success && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                      <AlertDescription className="text-xs">
                        {testResults.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Ejecuta las pruebas para ver el estado del sistema
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Results Section */}
        {testResults && testResults.tests.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <CardTitle>Resultados Detallados</CardTitle>
                </div>
                <Badge variant="outline">
                  {testResults.tests.filter(t => t.status === "passed").length} / {testResults.tests.length} Exitosos
                </Badge>
              </div>
              <CardDescription>
                Detalles de cada prueba ejecutada en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.tests.map((test, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <h4 className="font-medium">{test.name}</h4>
                          {test.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {test.message}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(test.status)}
                    </div>

                    {test.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription className="text-xs">
                          <strong>Error:</strong> {test.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {test.data && (
                      <div className="bg-muted rounded-lg p-3 mt-2">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Datos de la prueba:
                        </p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">🔍 ¿Qué verifica este test?</h4>
              <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                <li><strong>Configuración:</strong> Verifica que WhatsApp Business API esté correctamente configurado</li>
                <li><strong>Plantillas:</strong> Confirma que existan plantillas aprobadas por Meta</li>
                <li><strong>Envío:</strong> Prueba la capacidad real de envío a través de la API de Meta</li>
                <li><strong>Base de Datos:</strong> Verifica que los mensajes se registren correctamente</li>
                <li><strong>Webhook:</strong> Espera 5 segundos para confirmar la actualización del estado de entrega</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">⚡ Capacidades del Sistema</h4>
              <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                <li><strong>Envío Diario:</strong> Hasta 1,000 mensajes por día</li>
                <li><strong>Capacidad Pico:</strong> Hasta 10,000 mensajes en modo ráfaga</li>
                <li><strong>Rate Limiting:</strong> Control automático para respetar límites de Meta</li>
                <li><strong>Webhooks:</strong> Actualización en tiempo real del estado de entrega</li>
              </ul>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <AlertDescription className="text-xs">
                <strong>💡 Consejo:</strong> Si las pruebas fallan, verifica:
                <ul className="list-disc ml-4 mt-1">
                  <li>Que las credenciales de WhatsApp estén correctamente configuradas</li>
                  <li>Que tengas al menos una plantilla aprobada por Meta</li>
                  <li>Que el webhook esté correctamente configurado</li>
                  <li>Que no hayas excedido los límites de envío diarios</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
