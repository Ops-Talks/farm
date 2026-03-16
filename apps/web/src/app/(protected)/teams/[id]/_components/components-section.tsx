"use client";

import Link from "next/link";
import type { CatalogComponent } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderKanban } from "lucide-react";

interface ComponentsSectionProps {
  components: CatalogComponent[];
}

export function ComponentsSection({ components }: ComponentsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Owned Components</CardTitle>
        </div>
        <CardDescription>
          {components.length} component{components.length !== 1 ? "s" : ""} registered to this team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {components.length === 0 ? (
          <div className="py-10">
            <p className="text-sm text-muted-foreground text-center italic">
              This team doesn&apos;t own any components yet.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-wider">
                <TableHead>Component</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Lifecycle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/catalog/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {c.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {c.lifecycle}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
