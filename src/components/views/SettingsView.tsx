import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigg
import { Gear, CloudArrowDown } from '@phosph
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIServiceSettings } from '@/components/AIServiceSettings'
import { Gear, CloudArrowDown } from '@phosphor-icons/react'
import { toast } from 'sonner'

        <p className="text-muted-foreground mt-1">
        </p>

   

          
            <CloudArrowDown siz
          <

        <p className="text-muted-foreground mt-1">
          Configure backend connections and AI service
        </p>
      </div>

      <Tabs defaultValue="backend" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
          <TabsTrigger value="backend" className="gap-2">
            <Gear size={16} />
            Backend
          </TabsTrigger>
          <TabsTrigger value="ai-service" className="gap-2">
            <CloudArrowDown size={16} />
            AI Service
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backend" className="space-y-6 mt-6">

            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gear size={24} className="text-primary" />
              Backend Configuration
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backend-url">Backend API URL</Label>
                <Input
                  id="backend-url"

                  onChange={(e) => onBackendUrlChange(e.target.value)}

                />
                <p className="text-sm text-muted-foreground">
                  URL of the Python FastAPI backend server

              </div>

              <Button onClick={handleSave} className="w-full">
                Save Settings
              </Button>

          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Architecture</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-1">Frontend</h4>
                  <p className="text-muted-foreground">React 19 + JavaScript + Tailwind CSS v4</p>











































