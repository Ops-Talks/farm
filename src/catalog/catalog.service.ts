import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Component, ComponentLifecycle } from "./entities/component.entity";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";

/**
 * Service responsible for managing the software component catalog.
 * Provides CRUD operations for components tracked in Farm.
 */
@Injectable()
export class CatalogService {
  private readonly components: Map<string, Component> = new Map();

  /**
   * Creates a new component and adds it to the catalog.
   * @param createComponentDto - Data for the component to create
   * @returns The newly created component
   */
  create(createComponentDto: CreateComponentDto): Component {
    const component: Component = {
      id: randomUUID(),
      name: createComponentDto.name,
      kind: createComponentDto.kind,
      description: createComponentDto.description ?? "",
      owner: createComponentDto.owner,
      lifecycle:
        createComponentDto.lifecycle ?? ComponentLifecycle.EXPERIMENTAL,
      tags: createComponentDto.tags ?? [],
      links: [],
      metadata: createComponentDto.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.components.set(component.id, component);
    return component;
  }

  /**
   * Retrieves all components from the catalog.
   * @returns An array of all registered components
   */
  findAll(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Retrieves a single component by its unique identifier.
   * @param id - The UUID of the component to retrieve
   * @returns The component with the specified ID
   * @throws NotFoundException if no component with the given ID exists
   */
  findOne(id: string): Component {
    const component = this.components.get(id);
    if (!component) {
      throw new NotFoundException(`Component with ID "${id}" not found`);
    }
    return component;
  }

  /**
   * Updates an existing component's data.
   * @param id - The UUID of the component to update
   * @param updateComponentDto - Fields to update
   * @returns The updated component
   * @throws NotFoundException if no component with the given ID exists
   */
  update(id: string, updateComponentDto: UpdateComponentDto): Component {
    const existing = this.findOne(id);
    const updated: Component = {
      ...existing,
      ...updateComponentDto,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.components.set(id, updated);
    return updated;
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   * @throws NotFoundException if no component with the given ID exists
   */
  remove(id: string): void {
    this.findOne(id);
    this.components.delete(id);
  }
}
