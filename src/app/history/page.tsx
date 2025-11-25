"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search, Filter, ChevronLeft, ChevronRight, MessageSquare, Phone, CheckCircle2, XCircle, Clock, Send, Eye, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
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
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
        return <Send className="h-4 w-4" />
      case "DELIVERED":
        return <CheckCircle2 className="h-4 w-4" />
      case "READ":
        return <Eye className="h-4 w-4" />
      case "QUEUED":
        return <Clock className="h-4 w-4" />
      case "FAILED":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "DELIVERED":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      case "READ":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      case "QUEUED":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
      case "FAILED":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
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

  // Calculate stats
  const stats = {
    total: total,
    sent: messages.filter(m => m.status === "SENT").length,
    delivered: messages.filter(m => m.status === "DELIVERED").length,
    failed: messages.filter(m => m.status === "FAILED").length,
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Historial de Mensajes</h2>
              <p className="text-muted-foreground">
                Monitorea el estado de todos tus mensajes enviados
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Enviados</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.delivered}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fallidos</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters - Collapsible */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-4">
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

                <div className="flex gap-2">
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
          )}
        </div>

        {/* Messages List */}
        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Cargando mensajes...</p>
              </div>
            </CardContent>
          </Card>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay mensajes</h3>
                <p className="text-muted-foreground">
                  No se encontraron mensajes con los filtros aplicados
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card key={msg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(msg.status)} flex items-center gap-1.5 px-3 py-1`}
                        >
                          {getStatusIcon(msg.status)}
                          {getStatusLabel(msg.status)}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="font-medium">{msg.phoneNumber}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ID: {msg.id}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="mb-3">
                        <p className={`text-sm ${expandedId === msg.id ? '' : 'line-clamp-2'}`}>
                          {msg.messageContent}
                        </p>
                        {msg.messageContent.length > 100 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 mt-1 text-xs"
                            onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                          >
                            {expandedId === msg.id ? (
                              <>Ver menos <ChevronUp className="h-3 w-3 ml-1" /></>
                            ) : (
                              <>Ver más <ChevronDown className="h-3 w-3 ml-1" /></>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Creado:</span>
                          <span className="font-medium">
                            {format(new Date(msg.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                          </span>
                        </div>
                        
                        {msg.sentAt && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="text-muted-foreground">Enviado:</span>
                              <span className="font-medium">
                                {format(new Date(msg.sentAt), "dd/MM/yy HH:mm", { locale: es })}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {msg.deliveredAt && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                              <span className="text-muted-foreground">Entregado:</span>
                              <span className="font-medium">
                                {format(new Date(msg.deliveredAt), "dd/MM/yy HH:mm", { locale: es })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Error Message */}
                      {msg.errorMessage && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                Error
                              </p>
                              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                                {msg.errorMessage}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Meta Message ID - Only when expanded */}
                      {expandedId === msg.id && msg.metaMessageId && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Meta Message ID:</span>
                            <br />
                            <code className="text-xs mt-1 block break-all">{msg.metaMessageId}</code>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
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
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm font-medium">
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
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}