"use client"

// Simple state-driven Tabs component that mirrors the shadcn Tabs API.
// Avoids the @radix-ui/react-tabs peer dependency while providing the same
// consumer-facing interface: Tabs, TabsList, TabsTrigger, TabsContent.

import * as React from "react"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  activeTab: "",
  setActiveTab: () => {},
});

// ---------------------------------------------------------------------------
// Tabs root
// ---------------------------------------------------------------------------

interface TabsProps extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  /** Initial tab shown when the component is uncontrolled. */
  defaultValue?: string;
  /** Controlled active tab value. */
  value?: string;
  /** Called when the active tab changes. */
  onValueChange?: (value: string) => void;
}

function Tabs({
  defaultValue = "",
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultValue);

  // Controlled when `value` prop is provided, otherwise use internal state.
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = React.useCallback(
    (v: string) => {
      if (value === undefined) setInternalTab(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div data-slot="tabs" className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TabsList
// ---------------------------------------------------------------------------

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// TabsTrigger
// ---------------------------------------------------------------------------

interface TabsTriggerProps extends React.ComponentProps<"button"> {
  value: string;
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground",
        className,
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// TabsContent
// ---------------------------------------------------------------------------

interface TabsContentProps extends React.ComponentProps<"div"> {
  value: string;
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { activeTab } = React.useContext(TabsContext);

  // Hidden instead of unmounted so that nested queries stay mounted and
  // do not re-fetch when the user switches back to this tab.
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      data-state={activeTab === value ? "active" : "inactive"}
      data-slot="tabs-content"
      className={cn(
        "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
