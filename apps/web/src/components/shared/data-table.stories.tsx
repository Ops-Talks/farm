import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

const SAMPLE_ROWS = [
  { id: "1", name: "auth-service", kind: "Service", lifecycle: "production" },
  { id: "2", name: "catalog-api", kind: "API", lifecycle: "experimental" },
  { id: "3", name: "web-frontend", kind: "Website", lifecycle: "production" },
];

function DataTable({ state }: { state: "loading" | "populated" | "empty" }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Lifecycle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state === "loading" &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          {state === "populated" &&
            SAMPLE_ROWS.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.kind}</TableCell>
                <TableCell>{row.lifecycle}</TableCell>
              </TableRow>
            ))}
          {state === "empty" && (
            <TableRow>
              <TableCell colSpan={3} className="p-0">
                <EmptyState
                  title="No components found"
                  description="Register your first component to start building your catalog."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const meta: Meta = {
  title: "Patterns/DataTable",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Loading: Story = {
  name: "Loading skeleton (5 rows)",
  render: () => <DataTable state="loading" />,
};

export const Populated: Story = {
  name: "Populated state",
  render: () => <DataTable state="populated" />,
};

export const Empty: Story = {
  name: "Empty state",
  render: () => <DataTable state="empty" />,
};
