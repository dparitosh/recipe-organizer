import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { FileText, CheckCircle, Eye, EyeSlash } from '@phosphor-icons/react'
import { ApplicationConfig } from '@/lib/config/app-config'
import { toast } from 'sonner'
import { useState } from 'react'

interface FDCSettingsProps {
  config: ApplicationConfig
  onConfigChange: (updates: Partial<ApplicationConfig>) => void
}

export function FDCSettings({ config, onConfigChange }: FDCSettingsProps) {
  const [showApiKey, setShowApiKey] = useState(false)

  const handleFDCChange = (field: string, value: string | number) => {
    onConfigChange({
      fdc: {
        ...config.fdc,
        [field]: value,
      },
    })
  }

  const handleSave = () => {
    toast.success('FDC API settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">USDA FoodData Central API</h3>
            <p className="text-sm text-muted-foreground">
              Configure FoodData Central API for food and nutrient data
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fdc-base-url">API Base URL</Label>
            <Input
              id="fdc-base-url"
              type="text"
              value={config.fdc.apiBaseUrl}
              onChange={(e) => handleFDCChange('apiBaseUrl', e.target.value)}
              placeholder="https://api.nal.usda.gov/fdc/v1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fdc-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="fdc-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={config.fdc.apiKey}
                onChange={(e) => handleFDCChange('apiKey', e.target.value)}
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs gap-1"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <>
                    <EyeSlash size={14} />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Show
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from <a href="https://fdc.nal.usda.gov/api-key-signup.html" target="_blank" rel="noopener noreferrer" className="underline">FDC API Key Signup</a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fdc-page-size">Default Page Size</Label>
              <Input
                id="fdc-page-size"
                type="number"
                value={config.fdc.defaultPageSize}
                onChange={(e) => handleFDCChange('defaultPageSize', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fdc-max-page-size">Max Page Size</Label>
              <Input
                id="fdc-max-page-size"
                type="number"
                value={config.fdc.maxPageSize}
                onChange={(e) => handleFDCChange('maxPageSize', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fdc-rate-limit">Rate Limit (per hour)</Label>
            <Input
              id="fdc-rate-limit"
              type="number"
              value={config.fdc.rateLimitPerHour}
              onChange={(e) => handleFDCChange('rateLimitPerHour', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Maximum API requests per hour
            </p>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <CheckCircle size={18} weight="bold" />
            Save FDC API Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}
