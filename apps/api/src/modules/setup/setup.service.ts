import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import { RegistryService } from "../registry/registry.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Organization } from "../organization/entities/organization.entity";

export interface SetupChecklistItem {
  key: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  dismissed: boolean;
}

const CHECKLIST_KEYS = [
  "setup-kubernetes",
  "setup-registry",
  "create-component",
  "create-team",
  "configure-integrations",
] as const;

/**
 * Service providing the admin setup checklist with real-time completion status.
 */
@Injectable()
export class SetupService {
  constructor(
    private readonly kubernetesService: KubernetesService,
    private readonly registryService: RegistryService,
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(IntegrationCredential)
    private readonly credRepo: Repository<IntegrationCredential>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Returns the full setup checklist with completion and dismissed status.
   *
   * @param orgId - Optional organization UUID for dismissed state lookup
   */
  async getChecklist(orgId?: string): Promise<SetupChecklistItem[]> {
    const [componentCount, teamCount, credCount, org] = await Promise.all([
      orgId
        ? this.componentRepo.count({ where: { organizationId: orgId } })
        : this.componentRepo.count(),
      orgId
        ? this.teamRepo.count({ where: { organizationId: orgId } })
        : this.teamRepo.count(),
      orgId ? this.credRepo.count({ where: { orgId } }) : this.credRepo.count(),
      orgId ? this.orgRepo.findOne({ where: { id: orgId } }) : null,
    ]);
    const dismissed: string[] =
      (org?.settings?.dismissedChecklist as string[]) ?? [];
    const kubernetesEnabled = this.kubernetesService.isEnabled();
    const registryEnabled = this.registryService.adapterType !== null;

    return [
      {
        key: "setup-kubernetes",
        title: "Connect a Kubernetes cluster",
        description:
          "Configure KUBECONFIG to unlock deployments, operators, GitOps, and autoscaling.",
        href: "/kubernetes",
        completed: kubernetesEnabled,
        dismissed: dismissed.includes("setup-kubernetes"),
      },
      {
        key: "setup-registry",
        title: "Configure a container registry",
        description:
          "Set REGISTRY_TYPE to surface image metadata and vulnerability scans.",
        href: "/integrations/settings",
        completed: registryEnabled,
        dismissed: dismissed.includes("setup-registry"),
      },
      {
        key: "create-component",
        title: "Register your first component",
        description: "Add a service, library, or tool to the software catalog.",
        href: "/catalog",
        completed: componentCount > 0,
        dismissed: dismissed.includes("create-component"),
      },
      {
        key: "create-team",
        title: "Create a team",
        description: "Group users and assign component ownership.",
        href: "/teams",
        completed: teamCount > 0,
        dismissed: dismissed.includes("create-team"),
      },
      {
        key: "configure-integrations",
        title: "Set up a CI/CD integration",
        description:
          "Connect ArgoCD, Jenkins, GitHub Actions, or another pipeline tool.",
        href: "/integrations/settings",
        completed: credCount > 0,
        dismissed: dismissed.includes("configure-integrations"),
      },
    ];
  }

  /**
   * Marks a checklist item as dismissed for the given organization.
   * Ignored silently when orgId is not provided or the key is invalid.
   *
   * @param orgId - Organization UUID
   * @param key - Checklist item key
   */
  async dismissItem(orgId: string | undefined, key: string): Promise<void> {
    if (!orgId) return;
    if (!CHECKLIST_KEYS.includes(key as (typeof CHECKLIST_KEYS)[number]))
      return;
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) return;
    const existing: string[] =
      (org.settings?.dismissedChecklist as string[]) ?? [];
    if (existing.includes(key)) return;
    await this.orgRepo.save({
      ...org,
      settings: {
        ...(org.settings ?? {}),
        dismissedChecklist: [...existing, key],
      },
    });
  }
}
