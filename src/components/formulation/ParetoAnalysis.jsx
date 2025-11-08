import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

const METRICS = {
  percentage: {
    label: 'Formulation Percentage',
    description: 'Shows which ingredients make up the largest share of the formulation.',
    accessor: (ingredient) => Number(ingredient.percentage) || 0,
    format: (value) => `${value.toFixed(2)}%`,
    emptyMessage: 'Percentages are missing for these ingredients.',
  },
  cost: {
    label: 'Ingredient Cost Impact',
    description: 'Highlights ingredients contributing the most to total cost.',
    accessor: (ingredient) => {
      const costPerUnit = Number(ingredient.cost) || 0;
      const quantity = Number(ingredient.quantity) || 0;
      return costPerUnit * quantity;
    },
    format: (value) => `$${value.toFixed(2)}`,
    emptyMessage: 'Add cost data to ingredients to unlock cost-based analysis.',
  },
  quantity: {
    label: 'Ingredient Quantity',
    description: 'Compares ingredients based on absolute quantity usage.',
    accessor: (ingredient) => Number(ingredient.quantity) || 0,
    format: (value, ingredient) => {
      const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
      return `${value.toFixed(2)}${unit}`;
    },
    emptyMessage: 'No quantity data available.',
  },
};

const truncateLabel = (label) => {
  if (!label) return 'Unknown';
  return label.length > 18 ? `${label.slice(0, 17)}…` : label;
};

const computeParetoRows = (ingredients, metricKey) => {
  const metric = METRICS[metricKey];
  const mapped = ingredients.map((ingredient) => {
    const rawValue = metric.accessor(ingredient);
    return {
      id: ingredient.id || ingredient.materialId || ingredient.name,
      name: ingredient.name || 'Unknown Ingredient',
      rawValue,
      formattedValue: metric.format(rawValue, ingredient),
      unit: ingredient.unit,
    };
  });

  const filtered = mapped.filter((item) => item.rawValue && item.rawValue > 0);
  if (!filtered.length) {
    return {
      rows: [],
      total: 0,
      coverageCount: 0,
      coveragePercent: 0,
    };
  }

  const sorted = [...filtered].sort((a, b) => b.rawValue - a.rawValue);
  const total = sorted.reduce((sum, item) => sum + item.rawValue, 0);
  let cumulative = 0;

  const rows = sorted.map((item) => {
    cumulative += item.rawValue;
    const share = total > 0 ? (item.rawValue / total) * 100 : 0;
    const cumulativePercent = total > 0 ? (cumulative / total) * 100 : 0;

    return {
      ...item,
      label: truncateLabel(item.name),
      share,
      cumulative: cumulativePercent,
    };
  });

  const coverageIndex = rows.findIndex((row) => row.cumulative >= 80);
  const coverageCount = coverageIndex === -1 ? rows.length : coverageIndex + 1;
  const coveragePercent = coverageIndex === -1 ? rows[rows.length - 1].cumulative : rows[coverageIndex].cumulative;

  return {
    rows,
    total,
    coverageCount,
    coveragePercent,
  };
};

export const ParetoAnalysis = ({ ingredients = [] }) => {
  const [metricKey, setMetricKey] = useState('percentage');
  const metric = METRICS[metricKey];

  const { rows, total, coverageCount, coveragePercent } = useMemo(
    () => computeParetoRows(ingredients, metricKey),
    [ingredients, metricKey]
  );

     const chartConfig = useMemo(
       () => ({
         share: {
           label: `${metric.label} (share of total)`,
           color: '#2563eb',
         },
         cumulative: {
           label: 'Cumulative %',
           color: '#9333ea',
         },
       }),
       [metric.label]
     );

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-xl font-semibold">Pareto Analysis</h4>
          <p className="text-sm text-muted-foreground">{metric.description}</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger aria-label="Pareto metric">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRICS).map(([key, option]) => (
                <SelectItem key={key} value={key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          {metric.emptyMessage}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-xs uppercase text-muted-foreground">Total {metric.label}</p>
              <p className="text-2xl font-semibold">
                {metric.format(total, { unit: rows[0]?.unit })}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-xs uppercase text-muted-foreground">80% Coverage</p>
              <p className="text-2xl font-semibold">
                Top {coverageCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">Cumulative {coveragePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-4 space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Top Contributors</p>
              {rows.slice(0, 3).map((row) => (
                <div key={row.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{row.name}</span>
                  <Badge variant="secondary">{row.share.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-[320px]">
            <ComposedChart data={rows} margin={{ left: 12, right: 12, top: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-25} height={60} textAnchor="end" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
                 <ChartTooltip
                   content={(
                     <ChartTooltipContent
                       formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}%` : value)}
                     />
                   )}
                 />
              <ChartLegend />
              <Bar dataKey="share" fill="var(--color-share)" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke="var(--color-cumulative)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
              <span className="col-span-5">Ingredient</span>
              <span className="col-span-3 text-right">Contribution</span>
              <span className="col-span-2 text-right">Share</span>
              <span className="col-span-2 text-right">Cumulative</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 rounded-md border border-border/60 p-2 text-sm">
                <span className="col-span-5 truncate" title={row.name}>
                  {row.name}
                </span>
                <span className="col-span-3 text-right">
                  {row.formattedValue}
                </span>
                <span className="col-span-2 text-right">
                  {row.share.toFixed(1)}%
                </span>
                <span className="col-span-2 text-right">
                  {row.cumulative.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default ParetoAnalysis;
