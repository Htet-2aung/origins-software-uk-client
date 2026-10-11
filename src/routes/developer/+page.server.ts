import { redirect, error, fail } from '@sveltejs/kit';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles, organizations, projects, invoices, quotes, documents, conversations, messages } from '$lib/server/db/schema';
import { normalizeGithubRepositoryUrl } from '$lib/server/github';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/developer/login');

  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
    if (!profile) throw error(403, 'A provisioned internal team profile is required for developer portal access.');
    if (profile.role === 'client') throw error(403, 'Developer portal access is restricted to internal team members.');

    const [organization, projectRows] = await Promise.all([
      db.select().from(organizations).where(eq(organizations.id, profile.organizationId)).limit(1).then(rows => rows[0]),
      // Client projects belong to the client organization, not necessarily the internal developer organization.
      // Internal roles can see projects across organizations; client accounts are rejected above.
      db.select().from(projects).orderBy(desc(projects.createdAt)).limit(250)
    ]);
    const projectOrgIds = [...new Set(projectRows.map(row => row.organizationId))];
    const [ownerRows, invoiceRows, quoteRows, documentRows, conversationRows] = await Promise.all([
      projectOrgIds.length ? db.select().from(profiles).where(inArray(profiles.organizationId, projectOrgIds)) : Promise.resolve([]),
      db.select().from(invoices).where(eq(invoices.organizationId, profile.organizationId)).orderBy(desc(invoices.issuedAt)).limit(100),
      db.select().from(quotes).where(eq(quotes.organizationId, profile.organizationId)).orderBy(desc(quotes.createdAt)).limit(100),
      db.select().from(documents).where(eq(documents.organizationId, profile.organizationId)).orderBy(desc(documents.createdAt)).limit(100),
      projectOrgIds.length ? db.select().from(conversations).where(inArray(conversations.organizationId, projectOrgIds)).orderBy(desc(conversations.createdAt)).limit(150) : Promise.resolve([])
    ]);
    const clientOwners = ownerRows.filter(row => row.role === 'owner');
    const projectOrgRows = projectOrgIds.length ? await db.select().from(organizations).where(inArray(organizations.id, projectOrgIds)) : [];
    const projectOrgMap = new Map(projectOrgRows.map(row => [row.id, row.name]));
    const ownerMap = new Map(clientOwners.map(row => [row.organizationId, row]));
    const enrichedProjects = projectRows.map(row => {
      const owner = ownerMap.get(row.organizationId);
      return { ...row, clientOrganizationName: projectOrgMap.get(row.organizationId) ?? 'Client workspace', clientOwnerId: owner?.id ?? '', clientOwnerName: owner?.fullName ?? '', clientOwnerEmail: owner?.email ?? '' };
    });
    const projectMap = new Map(enrichedProjects.map(project => [project.id, project]));
    const enrichedConversations = conversationRows.map(conversation => {
      const project = conversation.projectId ? projectMap.get(conversation.projectId) : undefined;
      return {
        ...conversation,
        projectName: project?.name ?? 'Workspace conversation',
        projectCode: project?.code ?? '',
        clientOwnerId: project?.clientOwnerId ?? '',
        clientOwnerName: project?.clientOwnerName ?? '',
        clientOrganizationName: project?.clientOrganizationName ?? 'Client workspace'
      };
    });
    const conversationIds = conversationRows.map(row => row.id);
    const messageRows = conversationIds.length ? await db.select().from(messages).where(inArray(messages.conversationId, conversationIds)).orderBy(desc(messages.createdAt)).limit(300) : [];
    const conversationIdSet = new Set(conversationIds);
    const senderIds = [...new Set(messageRows.map(message => message.senderId).filter((id): id is string => Boolean(id)))];
    const messageSenderRows = senderIds.length ? await db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(inArray(profiles.id, senderIds)) : [];
    const messageSenderMap = new Map(messageSenderRows.map(sender => [sender.id, sender.fullName]));
    return {
      user: { id: locals.user.id, email: locals.user.email ?? '' }, profile, organization,
      projects: enrichedProjects, invoices: invoiceRows, quotes: quoteRows, documents: documentRows,
      conversations: enrichedConversations,
      messages: messageRows.filter(message => conversationIdSet.has(message.conversationId)).map(message => ({
        ...message,
        senderName: message.senderId ? messageSenderMap.get(message.senderId) ?? '' : ''
      })),
      setupRequired: false
    };
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
    console.error('[developer-portal] Failed to load workspace', cause);
    throw error(503, 'The developer workspace is temporarily unavailable. Please refresh in a moment.');
  }
};

const allowedProjectStatuses = new Set(['planning', 'in_progress', 'implementation', 'testing', 'review', 'deployment', 'maintenance', 'complete', 'paused']);
const progressByStatus: Record<string, number> = { planning: 5, in_progress: 25, implementation: 45, testing: 70, review: 85, deployment: 95, maintenance: 98, complete: 100, paused: 0 };

export const actions = {
  updateProjectStatus: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/developer/login');
    const [actor] = await db.select({ id: profiles.id, role: profiles.role }).from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
    if (!actor || actor.role === 'client') return fail(403, { statusError: 'Developer access is required to update project status.' });
    const form = await request.formData();
    const projectId = String(form.get('projectId') ?? '').trim();
    const status = String(form.get('status') ?? '').trim();
    if (!projectId || !allowedProjectStatuses.has(status)) return fail(400, { statusError: 'Choose a valid project and SDLC stage.' });
    const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!existing) return fail(404, { statusError: 'Project not found.' });
    await db.update(projects).set({ status: status as typeof projects.$inferInsert.status, progress: progressByStatus[status] }).where(eq(projects.id, projectId));
    return { statusSuccess: `Project stage updated to ${status.replace('_', ' ')}.`, updatedProjectId: projectId };
  },
  updateProjectRepository: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/developer/login');
    const [actor] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
    if (!actor || actor.role === 'client') return fail(403, { repositoryError: 'Developer access is required to update project settings.' });

    const form = await request.formData();
    const projectId = String(form.get('projectId') ?? '').trim();
    const repositoryInput = String(form.get('githubRepositoryUrl') ?? '').trim();
    if (!projectId) return fail(400, { repositoryError: 'Choose a valid project.' });
    if (repositoryInput.length > 255) return fail(400, { repositoryError: 'GitHub repository URL must be 255 characters or fewer.' });

    const githubRepositoryUrl = normalizeGithubRepositoryUrl(repositoryInput);
    if (repositoryInput && !githubRepositoryUrl) {
      return fail(400, { repositoryError: 'Enter a GitHub repository URL like https://github.com/owner/repository.' });
    }

    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) return fail(404, { repositoryError: 'Project not found.' });

    await db.update(projects).set({ githubRepositoryUrl }).where(eq(projects.id, projectId));
    return {
      repositorySuccess: githubRepositoryUrl ? 'GitHub repository saved.' : 'GitHub repository removed.',
      updatedRepositoryProjectId: projectId
    };
  },
  sendMessage: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/developer/login');
    const [sender] = await db.select().from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
    if (!sender || sender.role === 'client') return fail(403, { sendError: 'Only authorized internal team members can contact a project owner.' });
    const form = await request.formData();
    const projectId = String(form.get('projectId') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    if (!projectId || !body || body.length > 5000) return fail(400, { sendError: 'Choose a project and enter a message under 5,000 characters.' });
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) return fail(404, { sendError: 'Project not found or no longer available.' });
    // Only message an explicit owner profile; never guess a recipient when ownership is unclear.
    const [recipient] = await db.select().from(profiles).where(and(eq(profiles.organizationId, project.organizationId), eq(profiles.role, 'owner'))).limit(1);
    if (!recipient) return fail(409, { sendError: 'This project organization has no owner profile. Ask an administrator to assign a client owner first.' });
    let [conversation] = await db.select().from(conversations).where(eq(conversations.projectId, project.id)).orderBy(desc(conversations.createdAt)).limit(1);
    if (!conversation) {
      [conversation] = await db.insert(conversations).values({ organizationId: project.organizationId, projectId: project.id, subject: `Project ${project.code}: ${project.name}` }).returning();
    }
    await db.insert(messages).values({ conversationId: conversation.id, senderId: sender.id, body });
    return { sendSuccess: `Message sent to ${recipient.fullName} for ${project.name}.`, selectedProjectId: project.id };
  }
};
