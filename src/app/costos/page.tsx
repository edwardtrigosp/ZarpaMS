"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign } from "lucide-react";

export default function CostosPage() {
  const [calculatorData, setCalculatorData] = useState({
    marketingCount: 1000,
    utilityCount: 500,
    authCount: 100,
    serviceCount: 200,
    marketingRate: 0.06,
    utilityRate: 0.03,
    authRate: 0.03,
    serviceRate: 0.01
  });

  const totalCost = (
    calculatorData.marketingCount * calculatorData.marketingRate +
    calculatorData.utilityCount * calculatorData.utilityRate +
    calculatorData.authCount * calculatorData.authRate +
    calculatorData.serviceCount * calculatorData.serviceRate
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Costos por Mensaje</h2>
          <p className="text-muted-foreground">
            Estima tus costos mensuales según las tarifas de Meta por tipo de conversación
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <CardTitle>Calculadora de Costos</CardTitle>
            </div>
            <CardDescription>
              Estima tus costos mensuales según las tarifas de Meta por tipo de conversación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { id: 'marketing', label: 'Marketing', color: 'text-purple-600' },
                  { id: 'utility', label: 'Utilidad', color: 'text-blue-600' },
                  { id: 'auth', label: 'Autenticación', color: 'text-orange-600' },
                  { id: 'service', label: 'Servicio', color: 'text-green-600' }
                ].map((type) => (
                  <div key={type.id} className="p-4 border rounded-lg space-y-3">
                    <span className={`font-medium ${type.color}`}>{type.label}</span>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cantidad / Mes</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={calculatorData[`${type.id}Count` as keyof typeof calculatorData]}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          [`${type.id}Count`]: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Costo Unitario ($)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        step="0.001"
                        value={calculatorData[`${type.id}Rate` as keyof typeof calculatorData]}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          [`${type.id}Rate`]: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-semibold">
                        ${(calculatorData[`${type.id}Count` as keyof typeof calculatorData] *
                          calculatorData[`${type.id}Rate` as keyof typeof calculatorData]).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 bg-muted rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Costo Mensual Estimado</p>
                    <p className="text-sm text-muted-foreground">Basado en los volúmenes y tarifas ingresados</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${totalCost}
                  <span className="text-sm text-muted-foreground font-normal ml-1">/ mes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
