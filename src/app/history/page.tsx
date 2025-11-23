"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, Filter, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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

interface MessageLog {
  id: number
  templateId: number | null
  contactId: number | null
  phoneNumber: string
  messageContent: string
  status: string
  metaMessageId: string | null
  errorMessage: string | null
  scheduledAt: string | null
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
}

export default function HistoryPage() {
  const [messages, setMessages] = useState<MessageLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20

  const [filters, setFilters] = useState({
    status: "",
    phoneNumber: "",
    startDate: "",
    endDate: "",
    search: "",
  })

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("API Key no configurada", {
        description: "Configura tu API Key en el Dashboard primero"
      });
      setLoading(false);
    } else {
      fetchMessages();
    }
  }, [page, filters])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      })

      if (filters.status) params.append("status", filters.status)
      if (filters.phoneNumber) params.append("phoneNumber", filters.phoneNumber)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.search) params.append("search", filters.search)

      const res = await fetch(`/api/messages/history?${params}`, {
        headers: getFetchHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setTotal(data.total)
      } else if (res.status === 401) {
        toast.error("API Key inválida", {
          description: "Verifica tu API Key en el Dashboard"
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
      toast.error("Error al cargar mensajes")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const headers = [
      "ID",
      "Número",
      "Contenido",
      "Estado",
      "Fecha Envío",
      "Fecha Entrega",
      "Error",
    ]

    const rows = messages.map((msg) => [
      msg.id,
      msg.phoneNumber,
      msg.messageContent.replace(/\n/g, " "),
      msg.status,
      msg.sentAt ? format(new Date(msg.sentAt), "dd/MM/yyyy HH:mm", { locale: es }) : "",
      msg.deliveredAt ? format(new Date(msg.deliveredAt), "dd/MM/yyyy HH:mm", { locale: es }) : "",
      msg.errorMessage || "",
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historial_mensajes_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
        return "bg-blue-600"
      case "DELIVERED":
        return "bg-green-600"
      case "READ":
        return "bg-purple-600"
      case "QUEUED":
        return "bg-yellow-600"
      case "FAILED":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SENT: "Enviado",
      DELIVERED: "Entregado",
      READ: "Leído",
      QUEUED: "En Cola",
      FAILED: "Fallido",
    }
    return labels[status] || status
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Historial de Mensajes</h2>
            <p className="text-muted-foreground">
              Revisa el estado de todos los mensajes enviados
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => {
                    setFilters({ ...filters, status: value })
                    setPage(1)
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Todos</SelectItem>
                    <SelectItem value="SENT">Enviado</SelectItem>
                    <SelectItem value="DELIVERED">Entregado</SelectItem>
                    <SelectItem value="READ">Leído</SelectItem>
                    <SelectItem value="QUEUED">En Cola</SelectItem>
                    <SelectItem value="FAILED">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Número</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+52..."
                  value={filters.phoneNumber}
                  onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Desde</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value })
                    setPage(1)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Hasta</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value })
                    setPage(1)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Texto..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => {
                setPage(1)
                fetchMessages()
              }}>
                Aplicar Filtros
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    status: "",
                    phoneNumber: "",
                    startDate: "",
                    endDate: "",
                    search: "",
                  })
                  setPage(1)
                }}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay mensajes</h3>
                <p className="text-muted-foreground">
                  No se encontraron mensajes con los filtros aplicados
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Contenido</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Enviado</TableHead>
                        <TableHead>Entregado</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium">{msg.id}</TableCell>
                          <TableCell>{msg.phoneNumber}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="line-clamp-2 text-sm">
                              {msg.messageContent}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(msg.status)}>
                              {getStatusLabel(msg.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {msg.sentAt
                              ? format(new Date(msg.sentAt), "dd/MM/yy HH:mm", {
                                  locale: es,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {msg.deliveredAt
                              ? format(new Date(msg.deliveredAt), "dd/MM/yy HH:mm", {
                                  locale: es,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">
                            {msg.errorMessage ? (
                              <span className="text-destructive line-clamp-1">
                                {msg.errorMessage}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(page - 1) * limit + 1} a{" "}
                    {Math.min(page * limit, total)} de {total} mensajes
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        Página {page} de {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}