import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadCSV, downloadJSON, flattenForExport } from '@/lib/utils/export.js'
import { DownloadSimple, FileCsv, FileText } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function DataExportButton({ data, filename, disabled, flatten = true }) {
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

  const isDisabled = disabled || !data || data.length === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isDisabled}>
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
