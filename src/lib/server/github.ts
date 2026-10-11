export type GithubIssue = {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
  body: string | null;
  comments: number;
  labels: Array<{ name: string; color: string }>;
};

export type GithubPullRequest = GithubIssue & {
  draft: boolean;
  merged_at: string | null;
};

export class GithubApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GithubApiError';
    this.status = status;
  }
}

export function normalizeGithubRepositoryUrl(value: string): string | null {
  if (!value.trim()) return null;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return null;

  const [owner, rawRepository] = segments;
  const repository = rawRepository.replace(/\.git$/i, '');
  const validSegment = /^[A-Za-z0-9_.-]+$/;
  if (
    !validSegment.test(owner) ||
    !validSegment.test(repository) ||
    owner === '.' ||
    owner === '..' ||
    repository === '.' ||
    repository === '..'
  ) {
    return null;
  }

  return `https://github.com/${owner}/${repository}`;
}

export function parseGithubRepositoryUrl(value: string): { owner: string; repository: string } | null {
  const normalizedUrl = normalizeGithubRepositoryUrl(value);
  if (!normalizedUrl) return null;

  const [, owner, repository] = new URL(normalizedUrl).pathname.split('/');
  return { owner, repository };
}

function isGithubIssue(value: unknown): value is GithubIssue {
  if (!value || typeof value !== 'object') return false;
  return (
    'number' in value &&
    typeof value.number === 'number' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'state' in value &&
    (value.state === 'open' || value.state === 'closed') &&
    'html_url' in value &&
    typeof value.html_url === 'string' &&
    'created_at' in value &&
    typeof value.created_at === 'string' &&
    'updated_at' in value &&
    typeof value.updated_at === 'string' &&
    'comments' in value &&
    typeof value.comments === 'number' &&
    'body' in value &&
    (typeof value.body === 'string' || value.body === null) &&
    'user' in value &&
    (value.user === null || (
      typeof value.user === 'object' &&
      'login' in value.user &&
      typeof value.user.login === 'string'
    )) &&
    'labels' in value &&
    Array.isArray(value.labels) &&
    value.labels.every((label) =>
      typeof label === 'object' &&
      label !== null &&
      'name' in label &&
      typeof label.name === 'string' &&
      'color' in label &&
      typeof label.color === 'string'
    )
  );
}

function isGithubPullRequest(value: unknown): value is GithubPullRequest {
  return (
    isGithubIssue(value) &&
    'draft' in value &&
    typeof value.draft === 'boolean' &&
    'merged_at' in value &&
    (typeof value.merged_at === 'string' || value.merged_at === null)
  );
}

async function fetchGithubCollection<T>(
  url: string,
  token: string,
  isItem: (value: unknown) => value is T
): Promise<T[]> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Origins-Developer-Portal'
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new GithubApiError('GitHub repository not found or the configured token cannot access it.', 404);
    }
    if (response.status === 401 || response.status === 403) {
      throw new GithubApiError('GitHub access was denied. Check the server token and its read-only repository permissions.', 502);
    }
    throw new GithubApiError(`GitHub returned an error (${response.status}). Try again shortly.`, 502);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new GithubApiError('GitHub returned an unexpected response for this repository.', 502);
  }

  return payload.filter(isItem);
}

export async function fetchGithubProjectActivity(
  owner: string,
  repository: string,
  token: string
): Promise<{ issues: GithubIssue[]; pullRequests: GithubPullRequest[] }> {
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  const [issueRecords, pullRequests] = await Promise.all([
    fetchGithubCollection<(GithubIssue & { pull_request?: unknown })>(
      `${baseUrl}/issues?state=all&per_page=100&sort=updated`,
      token,
      (item): item is GithubIssue & { pull_request?: unknown } => isGithubIssue(item)
    ),
    fetchGithubCollection<GithubPullRequest>(
      `${baseUrl}/pulls?state=all&per_page=100&sort=updated`,
      token,
      isGithubPullRequest
    )
  ]);

  return {
    issues: issueRecords.filter((issue) => !issue.pull_request),
    pullRequests
  };
}
