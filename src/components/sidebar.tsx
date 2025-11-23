"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, LayoutDashboard, FileText, Send, History, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/",
  },
  {
    icon: FileText,
    label: "Plantillas",
    href: "/templates",
  },
  {
    icon: Send,
    label: "Mensajes",
    href: "/messages",
  },
  {
    icon: History,
    label: "Historial",
    href: "/history",
  },
]

export const Sidebar = () => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-600" />
              <span className="font-bold text-sidebar-foreground">WhatsApp API</span>
            </div>
          )}
          {collapsed && (
            <MessageSquare className="h-6 w-6 text-green-600 mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Footer - Collapse Button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3",
              collapsed && "justify-center px-2"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  )
}
