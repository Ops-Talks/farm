import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { Documentation } from "./entities/documentation.entity";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";

/**
 * Service handling technical documentation lifecycle.
 */
@Injectable()
export class DocumentationService {
  constructor(
    @InjectRepository(Documentation)
    private readonly documentationRepository: Repository<Documentation>,
  ) {}

  /**
   * Creates a new documentation entry.
   * @param createDocumentationDto - Entry data
   * @returns The newly created documentation
   */
  async create(
    createDocumentationDto: CreateDocumentationDto,
  ): Promise<Documentation> {
    const documentation = this.documentationRepository.create(
      createDocumentationDto,
    );
    return await this.documentationRepository.save(documentation);
  }

  /**
   * Retrieves all documentation entries.
   * @returns All documentation
   */
  async findAll(): Promise<Documentation[]> {
    return await this.documentationRepository.find();
  }

  /**
   * Retrieves a single entry by ID.
   * @param id - UUID
   * @returns The found documentation
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<Documentation> {
    const documentation = await this.documentationRepository.findOneBy({ id });
    if (!documentation) {
      throw new NotFoundException(`Documentation with ID "${id}" not found`);
    }
    return documentation;
  }

  /**
   * Fetches the raw Markdown content from the documentation's source URL.
   * @param id - The UUID of the documentation entry
   * @returns The raw Markdown content as a string
   */
  async getContent(id: string): Promise<string> {
    const doc = await this.findOne(id);
    try {
      const response = await axios.get<string>(doc.sourceUrl);
      return response.data;
    } catch {
      throw new NotFoundException(
        `Failed to fetch content from ${doc.sourceUrl}`,
      );
    }
  }

  /**
   * Finds documentation associated with a specific component.
   * @param componentId - UUID of the component
   * @returns Array of associated documentation
   */
  async findByComponent(componentId: string): Promise<Documentation[]> {
    return await this.documentationRepository.find({ where: { componentId } });
  }

  /**
   * Updates an entry.
   * @param id - UUID
   * @param updateDocumentationDto - Fields to update
   * @returns The updated documentation
   */
  async update(
    id: string,
    updateDocumentationDto: UpdateDocumentationDto,
  ): Promise<Documentation> {
    const documentation = await this.findOne(id);
    const updated = this.documentationRepository.merge(
      documentation,
      updateDocumentationDto,
    );
    return await this.documentationRepository.save(updated);
  }

  /**
   * Removes an entry.
   * @param id - UUID
   */
  async remove(id: string): Promise<void> {
    const documentation = await this.findOne(id);
    await this.documentationRepository.remove(documentation);
  }
}
