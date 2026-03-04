import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Documentation } from "./entities/documentation.entity";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";

/**
 * Service responsible for managing technical documentation entries.
 * Associates documentation pages with components in the catalog.
 */
@Injectable()
export class DocumentationService {
  private readonly docs: Map<string, Documentation> = new Map();

  /**
   * Creates a new documentation entry.
   * @param createDocumentationDto - Data for the documentation entry to create
   * @returns The newly created documentation entry
   */
  create(createDocumentationDto: CreateDocumentationDto): Documentation {
    const doc: Documentation = {
      id: randomUUID(),
      title: createDocumentationDto.title,
      content: createDocumentationDto.content,
      componentId: createDocumentationDto.componentId,
      author: createDocumentationDto.author,
      version: createDocumentationDto.version ?? "1.0.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.docs.set(doc.id, doc);
    return doc;
  }

  /**
   * Retrieves all documentation entries.
   * @returns An array of all documentation entries
   */
  findAll(): Documentation[] {
    return Array.from(this.docs.values());
  }

  /**
   * Retrieves documentation entries for a specific component.
   * @param componentId - The ID of the component
   * @returns Documentation entries associated with the component
   */
  findByComponent(componentId: string): Documentation[] {
    return Array.from(this.docs.values()).filter(
      (doc) => doc.componentId === componentId,
    );
  }

  /**
   * Retrieves a single documentation entry by its ID.
   * @param id - The UUID of the documentation entry
   * @returns The documentation entry with the specified ID
   * @throws NotFoundException if no documentation with the given ID exists
   */
  findOne(id: string): Documentation {
    const doc = this.docs.get(id);
    if (!doc) {
      throw new NotFoundException(`Documentation with ID "${id}" not found`);
    }
    return doc;
  }

  /**
   * Updates an existing documentation entry.
   * @param id - The UUID of the documentation entry to update
   * @param updateDocumentationDto - Fields to update
   * @returns The updated documentation entry
   * @throws NotFoundException if no documentation with the given ID exists
   */
  update(
    id: string,
    updateDocumentationDto: UpdateDocumentationDto,
  ): Documentation {
    const existing = this.findOne(id);
    const updated: Documentation = {
      ...existing,
      ...updateDocumentationDto,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.docs.set(id, updated);
    return updated;
  }

  /**
   * Removes a documentation entry.
   * @param id - The UUID of the documentation entry to remove
   * @throws NotFoundException if no documentation with the given ID exists
   */
  remove(id: string): void {
    this.findOne(id);
    this.docs.delete(id);
  }
}
