'use client';

// OpaEvaluationPanel — on-demand OPA policy evaluation panel for a catalog
// component. Sends component metadata as input and displays pass/fail results.
// Phase 21 — FARM-T232

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { opa as opaApi } from '@/lib/api-client';
import type { CatalogComponent, OpaEvaluateResult, OpaStoredResult } from '@/types/api';

interface OpaEvaluationPanelProps {
  component: CatalogComponent;
}

export function OpaEvaluationPanel({ component }: OpaEvaluationPanelProps) {
  const [policyPath, setPolicyPath] = useState('');
  const [inputJson, setInputJson] = useState(
    JSON.stringify(
      { component: { id: component.id, name: component.name, kind: component.kind } },
      null,
      2,
    ),
  );
  const [result, setResult] = useState<OpaEvaluateResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ['opa-results', component.id],
    queryFn: () => opaApi.listResults(component.id),
  });

  async function handleEvaluate() {
    if (!policyPath.trim()) {
      setEvalError('Policy path is required');
      return;
    }
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(inputJson) as Record<string, unknown>;
    } catch {
      setEvalError('Input must be valid JSON');
      return;
    }
    setEvaluating(true);
    setEvalError(null);
    setResult(null);
    try {
      const res = await opaApi.evaluate({
        policyPath: policyPath.trim(),
        input,
        componentId: component.id,
      });
      setResult(res);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="space-y-6 pt-4" data-testid="opa-evaluation-panel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Evaluate Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="policy-path" className="text-xs font-medium">
              Policy Path
            </label>
            <Input
              id="policy-path"
              placeholder="e.g. app/rbac/allow"
              value={policyPath}
              onChange={(e) => setPolicyPath(e.target.value)}
              data-testid="policy-path-input"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="input-json" className="text-xs font-medium">
              Input (JSON)
            </label>
            <textarea
              id="input-json"
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              data-testid="input-json-textarea"
            />
          </div>
          {evalError && (
            <p className="text-xs text-destructive" data-testid="eval-error">
              {evalError}
            </p>
          )}
          <Button
            onClick={handleEvaluate}
            disabled={evaluating}
            size="sm"
            data-testid="evaluate-button"
          >
            {evaluating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              'Evaluate'
            )}
          </Button>
          {result && (
            <div className="rounded-lg border p-3 space-y-2" data-testid="eval-result">
              <div className="flex items-center gap-2">
                {result.allowed ? (
                  <CheckCircle
                    className="h-4 w-4 text-green-500"
                    data-testid="allowed-icon"
                  />
                ) : (
                  <XCircle
                    className="h-4 w-4 text-destructive"
                    data-testid="denied-icon"
                  />
                )}
                <Badge variant={result.allowed ? 'default' : 'destructive'}>
                  {result.allowed ? 'Allowed' : 'Denied'}
                </Badge>
                <span className="text-xs text-muted-foreground">{result.policyPath}</span>
              </div>
              {result.violations.length > 0 && (
                <ul className="space-y-1 mt-2" data-testid="violations-list">
                  {result.violations.map((v, i) => (
                    <li key={i} className="text-xs text-destructive flex items-start gap-1">
                      <span>•</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Evaluation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="evaluation-history">
              {history.map((r: OpaStoredResult) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                >
                  <span className="font-mono text-muted-foreground">{r.policyPath}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={r.allowed ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {r.allowed ? 'allowed' : 'denied'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(r.evaluatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
