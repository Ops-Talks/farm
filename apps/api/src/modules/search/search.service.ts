import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";

export interface QuickSearchResult {
  type: "component" | "team" | "documentation" | "environment" | "pipeline";
  id: string;
  name: string;
  description?: string;
  url: string;
}

/**
 * Service for performing cross-entity quick search.
 * Searches components, teams, documentation, environments, and pipelines.
 */
@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Documentation)
    private readonly docRepo: Repository<Documentation>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
  ) {}

  /**
   * Performs a case-insensitive search across all entity types.
   * Returns up to `limit` combined results.
   *
   * @param query - Search term (minimum 2 characters)
   * @param limit - Maximum total results to return (default 10)
   */
  async quickSearch(query: string, limit = 10): Promise<QuickSearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    const q = `%${query.trim()}%`;
    const perType = Math.max(2, Math.ceil(limit / 5));
    const [components, teams, docs, environments, pipelines] =
      await Promise.all([
        this.componentRepo
          .createQueryBuilder("c")
          .where("c.name LIKE :q OR c.description LIKE :q", { q })
          .limit(perType)
          .getMany(),
        this.teamRepo
          .createQueryBuilder("t")
          .where("t.name LIKE :q", { q })
          .limit(perType)
          .getMany(),
        this.docRepo
          .createQueryBuilder("d")
          .where("d.title LIKE :q", { q })
          .limit(perType)
          .getMany(),
        this.envRepo
          .createQueryBuilder("e")
          .where("e.name LIKE :q", { q })
          .limit(perType)
          .getMany(),
        this.pipelineRepo
          .createQueryBuilder("p")
          .where("p.name LIKE :q", { q })
          .limit(perType)
          .getMany(),
      ]);
    const results: QuickSearchResult[] = [
      ...components.map((c) => ({
        type: "component" as const,
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        url: `/catalog/${c.id}`,
      })),
      ...teams.map((t) => ({
        type: "team" as const,
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        url: `/teams/${t.id}`,
      })),
      ...docs.map((d) => ({
        type: "documentation" as const,
        id: d.id,
        name: d.title,
        url: `/docs/${d.id}`,
      })),
      ...environments.map((e) => ({
        type: "environment" as const,
        id: e.id,
        name: e.name,
        url: `/environments/${e.id}`,
      })),
      ...pipelines.map((p) => ({
        type: "pipeline" as const,
        id: p.id,
        name: p.name,
        url: `/pipelines/${p.id}`,
      })),
    ];
    return results.slice(0, limit);
  }
}
