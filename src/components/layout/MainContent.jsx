import { cn } from '@/lib/utils'

export function MainContent({ children, view, sidebarOpen }) {
  return (
    <main className={cn(
      "flex-1 overflow-auto transition-all duration-300",
      sidebarOpen ? "lg:ml-0" : "ml-0"
    )}>
      <div className="p-6 max-w-[1920px] mx-auto">
        {children}
      </div>
    </main>
  )
}
