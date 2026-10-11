import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles, projects } from '$lib/server/db/schema';
import { fetchGithubProjectActivity, GithubApiError, parseGithubRepositoryUrl } from '$lib/server/github';

export const GET = async ({ locals, params }) => {
  if (!locals.user) return json({ error: 'Authentication required.' }, { status: 401 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    return json({ error: 'Project not found.' }, { status: 404 });
  }

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, locals.user.id))
    .limit(1);
  if (!profile || profile.role === 'client') {
    return json({ error: 'Developer access required.' }, { status: 403 });
  }

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      githubRepositoryUrl: projects.githubRepositoryUrl
    })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) return json({ error: 'Project not found.' }, { status: 404 });

  const repository = project.githubRepositoryUrl
    ? parseGithubRepositoryUrl(project.githubRepositoryUrl)
    : null;
  if (!repository) {
    return json({ error: 'Add a valid GitHub repository URL in this project’s overview first.' }, { status: 400 });
  }

  const token = env.GITHUB_TOKEN?.trim();
  if (!token) {
    return json({ error: 'GitHub integration is not configured. Add a read-only GITHUB_TOKEN to the server environment.' }, { status: 503 });
  }

  try {
    const activity = await fetchGithubProjectActivity(repository.owner, repository.repository, token);
    return json({ repositoryUrl: project.githubRepositoryUrl, ...activity });
  } catch (cause) {
    if (cause instanceof GithubApiError) {
      return json({ error: cause.message }, { status: cause.status });
    }
    console.error('[developer-github] Failed to fetch repository activity', {
      projectId: project.id,
      cause
    });
    const message = cause instanceof Error && cause.name === 'TimeoutError'
      ? 'GitHub took too long to respond. Try again.'
      : 'Could not connect to GitHub. Try again shortly.';
    return json({ error: message }, { status: 502 });
  }
};
