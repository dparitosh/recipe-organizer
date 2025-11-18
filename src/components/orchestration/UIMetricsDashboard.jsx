import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Palette, SquareSplitHorizontal, Package, Layout } from '@phosphor-icons/react'

export function UIMetricsDashboard({ uiMetrics }) {
  if (!uiMetrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Layout size={32} className="opacity-50" />
            <p className="text-sm">No UI metrics available</p>
            <p className="text-xs">UI Designer agent did not generate metrics for this run</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Layout Section */}
      {uiMetrics.layout && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SquareSplitHorizontal size={20} />
              Layout Configuration
            </CardTitle>
            <CardDescription>Page structure and organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uiMetrics.layout.type && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Layout Type</p>
                <Badge variant="outline" className="text-sm">
                  {uiMetrics.layout.type}
                </Badge>
              </div>
            )}

            {uiMetrics.layout.sections && Array.isArray(uiMetrics.layout.sections) && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Sections ({uiMetrics.layout.sections.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uiMetrics.layout.sections.map((section, idx) => (
                      <Badge key={idx} variant="secondary">
                        {typeof section === 'string' ? section : section.name || `Section ${idx + 1}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {uiMetrics.layout.columns && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Columns</p>
                  <Badge>{uiMetrics.layout.columns}</Badge>
                </div>
              </>
            )}

            {uiMetrics.layout.gridSystem && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Grid System</p>
                  <p className="text-sm">{uiMetrics.layout.gridSystem}</p>
                </div>
              </>
            )}

            {uiMetrics.layout.responsiveBreakpoints && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Responsive Breakpoints</p>
                  <div className="space-y-1">
                    {Object.entries(uiMetrics.layout.responsiveBreakpoints).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Theme Section */}
      {uiMetrics.theme && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette size={20} />
              Theme Configuration
            </CardTitle>
            <CardDescription>Colors, fonts, and visual style</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uiMetrics.theme.palette && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Color Palette</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(uiMetrics.theme.palette).map(([colorName, colorValue]) => (
                    <div key={colorName} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: colorValue }}
                        aria-label={`${colorName} color: ${colorValue}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{colorName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{colorValue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uiMetrics.theme.typography && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Typography</p>
                  <div className="space-y-2">
                    {uiMetrics.theme.typography.fontFamily && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Font Family:</span>
                        <span className="font-medium">{uiMetrics.theme.typography.fontFamily}</span>
                      </div>
                    )}
                    {uiMetrics.theme.typography.baseFontSize && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Size:</span>
                        <span className="font-mono">{uiMetrics.theme.typography.baseFontSize}</span>
                      </div>
                    )}
                    {uiMetrics.theme.typography.headingFont && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Heading Font:</span>
                        <span className="font-medium">{uiMetrics.theme.typography.headingFont}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {uiMetrics.theme.spacing && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Spacing Scale</p>
                  <div className="flex flex-wrap gap-2">
                    {typeof uiMetrics.theme.spacing === 'string' ? (
                      <Badge variant="secondary">{uiMetrics.theme.spacing}</Badge>
                    ) : Array.isArray(uiMetrics.theme.spacing) ? (
                      uiMetrics.theme.spacing.map((space, idx) => (
                        <Badge key={idx} variant="secondary">
                          {space}
                        </Badge>
                      ))
                    ) : (
                      Object.entries(uiMetrics.theme.spacing).map(([key, value]) => (
                        <Badge key={key} variant="secondary">
                          {key}: {value}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {uiMetrics.theme.borderRadius && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Border Radius</p>
                  <Badge variant="secondary">{uiMetrics.theme.borderRadius}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Components Section */}
      {uiMetrics.components && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package size={20} />
              Component Inventory
            </CardTitle>
            <CardDescription>UI elements used in this design</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(uiMetrics.components) ? (
                  uiMetrics.components.map((component, idx) => {
                    const componentName =
                      typeof component === 'string' ? component : component.name || `Component ${idx + 1}`
                    const componentType =
                      typeof component === 'object' && component.type ? component.type : 'Component'
                    const componentVariant =
                      typeof component === 'object' && component.variant ? component.variant : null

                    return (
                      <Card key={idx} className="p-3">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{componentName}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {componentType}
                            </Badge>
                            {componentVariant && (
                              <Badge variant="secondary" className="text-xs">
                                {componentVariant}
                              </Badge>
                            )}
                          </div>
                          {typeof component === 'object' && component.props && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <p className="font-medium mb-1">Props:</p>
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(component.props, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })
                ) : typeof uiMetrics.components === 'object' ? (
                  Object.entries(uiMetrics.components).map(([componentName, componentData]) => (
                    <Card key={componentName} className="p-3">
                      <div className="space-y-2">
                        <p className="font-medium text-sm">{componentName}</p>
                        <div className="flex flex-wrap gap-1">
                          {typeof componentData === 'object' && componentData.type && (
                            <Badge variant="outline" className="text-xs">
                              {componentData.type}
                            </Badge>
                          )}
                          {typeof componentData === 'object' && componentData.variant && (
                            <Badge variant="secondary" className="text-xs">
                              {componentData.variant}
                            </Badge>
                          )}
                        </div>
                        {typeof componentData === 'object' && componentData.count && (
                          <p className="text-xs text-muted-foreground">Used {componentData.count} times</p>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No component data available</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Accessibility Section */}
      {uiMetrics.accessibility && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Accessibility Features</CardTitle>
            <CardDescription>WCAG compliance and a11y considerations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uiMetrics.accessibility.wcagLevel && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">WCAG Level:</span>
                <Badge>{uiMetrics.accessibility.wcagLevel}</Badge>
              </div>
            )}

            {uiMetrics.accessibility.features && Array.isArray(uiMetrics.accessibility.features) && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {uiMetrics.accessibility.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {uiMetrics.accessibility.colorContrast && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Color Contrast:</span>
                  <Badge variant="outline">{uiMetrics.accessibility.colorContrast}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      {uiMetrics.performance && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
            <CardDescription>UI performance considerations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(uiMetrics.performance).map(([metric, value]) => (
                <div key={metric}>
                  <p className="text-xs text-muted-foreground mb-1 capitalize">
                    {metric.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-sm font-medium">{typeof value === 'object' ? JSON.stringify(value) : value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
