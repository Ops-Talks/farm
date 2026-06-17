# Version Updates Action Plan

## Overview

Mapeamento e plano de ação para resolver problemas de versão de dependências no monorepo Farm. Organizado por workspace para permitir execução paralela.

## Problemas Identificados

### apps/api

| ID | Problema | Severidade | Impacto Atual | Fix Upstream |
|----|----------|-----------|---------------|--------------|
| P1 | rxjs duplicado: root 7.8.1 vs api 7.8.2 | **CRÍTICO** | ~126 erros TS, `make check` quebra | Sim (override) |
| P2 | multer DoS (GHSA-72gw-mp4g-v24j, GHSA-3p4h-7m6x-2hcm) | **HIGH** | npm audit, pinned via @nestjs/platform-express | Breaking (terminus 7→8) |
| P3 | @opentelemetry/core < 2.8.0 (GHSA-8988-4f7v-96qf) | Moderate | npm audit, mem leak em Baggage propagation | Não disponível |

### apps/web

| ID | Problema | Severidade | Impacto Atual | Fix Upstream |
|----|----------|-----------|---------------|--------------|
| P4 | postcss XSS (GHSA-qx2v-qp2m-jg93) | Moderate | npm audit, bundled via Next.js | Breaking (next) |
| P5 | elliptic (GHSA-848j-6mx2-7j84) | Moderate | npm audit, via storybook/webpack | Breaking (storybook) |
| P6 | esbuild (GHSA-g7r4-m6w7-qqqr) | Moderate | npm audit, só Windows | Disponível |
| P7 | middleware → proxy deprecation | Low | Warning no build Next.js | Renomear arquivo |

### Shared/Root

| ID | Problema | Severidade | Impacto Atual | Fix Upstream |
|----|----------|-----------|---------------|--------------|
| P8 | Lockfile SWC patching automático | Low | Build auto-patcha lockfile | `npm install` |
| P9 | typescript-eslint 8.61 no-unsafe-* downgraded | Low | 4 regras em warn em vez de error | Revisar se já dá para re-promover |

## Arquitetura do Plano

```
┌─────────────────────────────────────────────────────────────┐
│                    Version Updates Plan                      │
├─────────────────┬───────────────────┬───────────────────────┤
│   apps/api      │    apps/web       │    Shared/Root        │
│                 │                   │                       │
│  E200           │  E201             │  E202                 │
│  ├─ S700 (rxjs) │  ├─ S703 (postcss)│  ├─ S707 (lockfile)   │
│  ├─ S701 (multer)│ ├─ S704 (elliptic)│ └─ S708 (eslint)     │
│  └─ S702 (otel) │  ├─ S705 (esbuild)│                       │
│                 │  └─ S706 (middle.) │                       │
└─────────────────┴───────────────────┴───────────────────────┘
```

Todos os workspaces podem ser executados em paralelo (`apps/api` e `apps/web` não compartilham dependências de runtime).

## Stories e Tasks

### FARM-E200: apps/api — Dependency Resolution & Advisory Fixes

#### FARM-S700: Fix rxjs duplicate (7.8.1 vs 7.8.2)

**Tasks:**
- T1: Add `"rxjs": "7.8.2"` to root `package.json` `overrides`
- T2: `rm -rf apps/api/node_modules/rxjs` + `npm install`
- T3: Verify `npm ls rxjs` shows single 7.8.2 globally
- T4: Run `make check` — must pass with 0 errors

**Contexto:** `@nestjs/axios@4.0.1` depende de `rxjs@7.8.1` (hoisted para root). O workspace `apps/api` declara `"rxjs": "^7.8.2"` que instala `7.8.2` localmente. O override força todos a usarem `7.8.2`, eliminando a incompatibilidade estrutural de tipos.

#### FARM-S701: Resolve multer high advisories

**Tasks:**
- T1: Verificar se `@nestjs/platform-express` publicou versão compatível com multer >= 2.2.0
- T2: Se sim, atualizar override `"multer": "2.2.0"` em root `package.json`
- T3: Se não, adicionar GHSA-72gw-mp4g-v24j e GHSA-3p4h-7m6x-2hcm ao allowlist em `scripts/audit-actionable.mjs`
- T4: `npm audit` com 0 high/critical

#### FARM-S702: Document/address opentelemetry moderate

**Tasks:**
- T1: Verificar upstream (`@opentelemetry/core >= 2.8.0`) se já publicado
- T2: Se sim, atualizar versão do `@opentelemetry/exporter-trace-otlp-http` e dependentes
- T3: Se não, adicionar GHSA-8988-4f7v-96qf ao allowlist em `scripts/audit-actionable.mjs`

### FARM-E201: apps/web — Next.js & Storybook Advisory Fixes

#### FARM-S703: Fix postcss XSS via Next.js

**Tasks:**
- T1: Verificar Next.js >= 16.3.0-canary.5 inclui postcss >= 8.5.10
- T2: Se sim, atualizar `next` dep em `apps/web/package.json`
- T3: Se não, adicionar GHSA-qx2v-qp2m-jg93 ao allowlist

#### FARM-S704: Fix elliptic advisory

**Tasks:**
- T1: Verificar se `@storybook/nextjs@10.4.x` tem elliptic >= 6.7.0
- T2: Atualizar storybook se disponível
- T3: Add GHSA-848j-6mx2-7j84 ao allowlist se não houver fix

#### FARM-S705: Fix esbuild advisory

**Tasks:**
- T1: Atualizar esbuild para versão corrigida via `npm update esbuild`
- T2: Verificar GHSA não aparece mais no audit

#### FARM-S706: Migrate middleware to proxy (Next.js)

**Tasks:**
- T1: Renomear `apps/web/src/middleware.ts` → `apps/web/src/proxy.ts`
- T2: Atualizar `package.json` scripts se referenciarem middleware
- T3: Rodar build web — zero warnings de deprecação

### FARM-E202: Shared/Root — Lockfile & ESLint Fine-Tuning

#### FARM-S707: Fix lockfile SWC patching

**Tasks:**
- T1: `npm install` para regenerar lockfile com `@next/swc` dependencies
- T2: Verificar se `package-lock.json` foi atualizado
- T3: Build web sem "Found lockfile missing swc dependencies"

#### FARM-S708: typescript-eslint final adjustments

**Tasks:**
- T1: Revisar se `@typescript-eslint/no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access` podem voltar para `error`
- T2: Corrigir violações residuais se aplicável
- T3: Caso contrário, manter documentação no `eslint.config.mjs` sobre o motivo

## Critérios de Sucesso

1. `make check` passa com 0 erros
2. `npm audit` sem vulnerabilidades high ou critical
3. Zero warnings de deprecação no build web (`middleware` → `proxy`)
4. `npm ls rxjs` mostra uma única versão (7.8.2)
5. Lockfile não é mais alterado automaticamente no build
