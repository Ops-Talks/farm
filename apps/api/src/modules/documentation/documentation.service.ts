import {
  Injectable,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import axios from "axios";
import { isAxiosError } from "axios";
import { marked } from "marked";
import { Documentation } from "./entities/documentation.entity";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";
import {
  DocumentationTreeNode,
  SearchResult,
} from "./interfaces/documentation.interfaces";

/**
 * Maximum number of sanitization loop iterations for any single pass.
 * Prevents CPU amplification from pathological inputs while still handling
 * realistic nesting depths. When reached, the loop stops and remaining
 * sanitization steps continue (fail-closed).
 */
const MAX_SANITIZE_ITERATIONS = 20;

/**
 * Strips characters that are not in the strict allowlist.
 * Protects against injection via filenames, search queries, and title fields.
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9\s\-_.,:;!?@#%&()\/]/g, "");
}

/**
 * Strips dangerous HTML elements and attributes from rendered content.
 * Removes script/iframe/object/embed tags and event handler attributes.
 */
export function sanitizeHtml(html: string): string {
  const DANGEROUS_TAG_BLOCK_REGEX =
    /<\s*(script|iframe|object|embed|form|link|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
  const DANGEROUS_TAG_SELF_CLOSING_REGEX =
    /<\s*(script|iframe|object|embed|form|link|meta|base)[^>]*\/?>/gi;
  const EVENT_HANDLER_ATTR_REGEX = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;

  let sanitized = html;
  let previous: string;

  // Iteratively remove dangerous block-level tags until stable or iteration limit reached.
  let blockIter = 0;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(DANGEROUS_TAG_BLOCK_REGEX, "");
    blockIter++;
  } while (sanitized !== previous && blockIter < MAX_SANITIZE_ITERATIONS);

  // Iteratively remove dangerous self-closing tags until stable or iteration limit reached.
  let selfClosingIter = 0;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(DANGEROUS_TAG_SELF_CLOSING_REGEX, "");
    selfClosingIter++;
  } while (sanitized !== previous && selfClosingIter < MAX_SANITIZE_ITERATIONS);

  // Iteratively strip event-handler attributes (on*) until stable or iteration limit reached.
  let eventHandlerIter = 0;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(EVENT_HANDLER_ATTR_REGEX, "");
    eventHandlerIter++;
  } while (
    sanitized !== previous &&
    eventHandlerIter < MAX_SANITIZE_ITERATIONS
  );

  sanitized = sanitized.replace(
    /href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi,
    'href="#"',
  );
  return sanitized;
}

/**
 * Service handling technical documentation lifecycle.
 */
@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

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
    organizationId?: string,
  ): Promise<Documentation> {
    const sanitized = {
      ...createDocumentationDto,
      title: sanitizeInput(createDocumentationDto.title),
      author: sanitizeInput(createDocumentationDto.author),
      version: sanitizeInput(createDocumentationDto.version),
    };
    const documentation = this.documentationRepository.create({
      ...sanitized,
      ...(organizationId ? { organizationId } : {}),
    });
    return await this.documentationRepository.save(documentation);
  }

  /**
   * Retrieves all documentation entries.
   * @returns All documentation
   */
  async findAll(
    skip = 0,
    take = 20,
    componentId?: string,
    organizationId?: string,
  ): Promise<[Documentation[], number]> {
    const where: Record<string, unknown> = {};
    if (componentId) where.componentId = componentId;
    if (organizationId) where.organizationId = organizationId;
    return await this.documentationRepository.findAndCount({
      where,
      skip,
      take,
    });
  }

  /**
   * Retrieves a single entry by ID.
   * When orgId is provided the result is additionally scoped to that
   * organization — a mismatch returns 404 to avoid leaking resource existence.
   * @param id - UUID
   * @param orgId - Optional organization UUID to scope the lookup
   * @returns The found documentation
   * @throws NotFoundException if not found (or org does not match)
   */
  async findOne(id: string, orgId?: string): Promise<Documentation> {
    const where: FindOptionsWhere<Documentation> = { id };
    if (orgId) where.organizationId = orgId;
    const documentation = await this.documentationRepository.findOne({ where });
    if (!documentation) {
      throw new NotFoundException(`Documentation with ID "${id}" not found`);
    }
    return documentation;
  }

  /**
   * Fetches the raw Markdown content from the documentation's source URL.
   * @param id - The UUID of the documentation entry
   * @param orgId - Optional organization UUID to scope the lookup
   * @returns The raw Markdown content as a string
   */
  async getContent(id: string, orgId?: string): Promise<string> {
    const doc = await this.findOne(id, orgId);
    try {
      const response = await axios.get<string>(doc.sourceUrl, {
        timeout: 10000,
      });
      return response.data;
    } catch (err) {
      if (isAxiosError(err)) {
        if (!err.response) {
          this.logger.error(
            `Documentation source unreachable: ${doc.sourceUrl}`,
            {
              errorCode: err.code,
              context: DocumentationService.name,
            },
          );
          throw new ServiceUnavailableException(
            "Documentation source is currently unreachable",
          );
        }
        if (err.response.status === 404) {
          throw new NotFoundException(
            `Documentation source URL returned 404: ${doc.sourceUrl}`,
          );
        }
        this.logger.error(
          `Documentation source returned upstream error: ${doc.sourceUrl}`,
          { status: err.response.status, context: DocumentationService.name },
        );
        throw new BadGatewayException(
          "Documentation source returned an upstream error",
        );
      }
      this.logger.error("Failed to fetch documentation content", {
        url: doc.sourceUrl,
        error: err instanceof Error ? err.message : String(err),
        context: DocumentationService.name,
      });
      throw new InternalServerErrorException(
        "Failed to fetch documentation content",
      );
    }
  }

  /**
   * Fetches Markdown content and renders it to sanitized HTML.
   * @param id - The UUID of the documentation entry
   * @returns Sanitized HTML string
   */
  async renderContent(id: string): Promise<string> {
    const markdown = await this.getContent(id);
    const rawHtml = await marked(markdown);
    return sanitizeHtml(rawHtml);
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
   * Builds a navigation tree for documentation entries belonging to a component.
   * @param componentId - UUID of the component
   * @returns Array of root-level tree nodes with nested children
   */
  async buildTree(componentId: string): Promise<DocumentationTreeNode[]> {
    const docs = await this.documentationRepository.find({
      where: { componentId },
      order: { order: "ASC", title: "ASC" },
    });

    const nodeMap = new Map<string, DocumentationTreeNode>();
    for (const doc of docs) {
      nodeMap.set(doc.id, {
        id: doc.id,
        title: doc.title,
        parentId: doc.parentId,
        order: doc.order,
        children: [],
      });
    }

    const roots: DocumentationTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Searches documentation entries by title matching.
   * @param query - The search query string
   * @param componentId - Optional component ID to scope the search
   * @returns Array of search results with relevance scores
   */
  async search(query: string, componentId?: string): Promise<SearchResult[]> {
    const queryLower = sanitizeInput(query).toLowerCase();
    const where: Record<string, unknown> = {};
    if (componentId) {
      where.componentId = componentId;
    }

    const docs = await this.documentationRepository.find({ where });
    const results: SearchResult[] = [];

    for (const doc of docs) {
      const titleLower = doc.title.toLowerCase();
      if (titleLower.includes(queryLower)) {
        const score = queryLower === titleLower ? 1.0 : 0.5;
        results.push({
          id: doc.id,
          title: doc.title,
          componentId: doc.componentId,
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Updates an entry.
   * @param id - UUID
   * @param updateDocumentationDto - Fields to update
   * @param orgId - Optional organization UUID to scope the lookup
   * @returns The updated documentation
   */
  async update(
    id: string,
    updateDocumentationDto: UpdateDocumentationDto,
    orgId?: string,
  ): Promise<Documentation> {
    const sanitized = { ...updateDocumentationDto };
    if (sanitized.title) sanitized.title = sanitizeInput(sanitized.title);
    if (sanitized.author) sanitized.author = sanitizeInput(sanitized.author);
    if (sanitized.version) sanitized.version = sanitizeInput(sanitized.version);
    const documentation = await this.findOne(id, orgId);
    const updated = this.documentationRepository.merge(
      documentation,
      sanitized,
    );
    return await this.documentationRepository.save(updated);
  }

  /**
   * Removes an entry.
   * @param id - UUID
   * @param orgId - Optional organization UUID to scope the lookup
   */
  async remove(id: string, orgId?: string): Promise<void> {
    const documentation = await this.findOne(id, orgId);
    await this.documentationRepository.remove(documentation);
  }
}
