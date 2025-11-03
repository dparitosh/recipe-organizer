import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadCSV, downloadJSON, flattenForExport } from '@/lib/utils/export'
import { toast } from 'sonner'
import { DownloadSimple, FileCsv, FileText } from '@phosphor-icons/react'

interface DataExportButtonProps {
  data: any[]
  filename: string
  disabled?: boolean
  flatten?: boolean
}

export function DataExportButton({ data, filename, disabled, flatten = true }: DataExportButtonProps) {
  const handleExportCSV = () => {
    try {
      const exportData = flatten ? flattenForExport(data) : data
      downloadCSV(exportData, filename)
      toast.success('CSV file downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export CSV')
    }
  }

  const handleExportJSON = () => {
    try {
      downloadJSON(data, filename)
      toast.success('JSON file downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export JSON')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={disabled || !data || data.length === 0}
        >
          <DownloadSimple size={18} weight="bold" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
          <FileCsv size={18} weight="bold" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} className="gap-2 cursor-pointer">
          <FileText size={18} weight="bold" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
