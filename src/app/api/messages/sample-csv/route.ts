import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const templateName = searchParams.get("templateName") || "contactos"
    const variablesParam = searchParams.get("variables")
    
    let variables: string[] = []
    if (variablesParam) {
      try {
        variables = JSON.parse(variablesParam)
      } catch {
        variables = []
      }
    }

    let sampleData: string
    
    if (variables.length > 0) {
      const headers = ['phoneNumber', 'name', ...variables]
      const headerRow = headers.join(',')
      
      const sampleRows = [
        `+5215551234567,Juan Pérez,${variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
        `+5215559876543,María García,${variables.map((v, i) => `Valor ${i + 1}`).join(',')}`,
        `+5215552468135,Carlos López,${variables.map((v, i) => `Valor ${i + 1}`).join(',')}`
      ]
      
      sampleData = [headerRow, ...sampleRows].join('\n')
    } else {
      sampleData = `phoneNumber,name
+5215551234567,Juan Pérez
+5215559876543,María García
+5215552468135,Carlos López`
    }

    // Add BOM for Excel UTF-8 compatibility
    const csvContent = "\uFEFF" + sampleData
    
    const fileName = `ejemplo_${templateName.toLowerCase().replace(/\s+/g, '_')}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating sample CSV:", error)
    return NextResponse.json(
      { error: "Error al generar CSV de ejemplo" },
      { status: 500 }
    )
  }
}
