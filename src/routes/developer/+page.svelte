<script>
  import { enhance } from '$app/forms';
  export let data;
  export let form;

  let section = 'Overview';
  let query = '';
  let assistantInput = '';
  let assistantBusy = false;
  let assistantError = '';
  let assistantReply = '';
  let range = '30 days';
  let selectedProjectId = '';
  let selectedOverviewProjectId = '';
  let githubProjectId = '';
  let githubIssues = [];
  let githubPullRequests = [];
  let githubLoading = false;
  let githubError = '';
  let githubLoadedProjectId = '';
  let inboxQuery = '';
  let messageDraft = '';
  let sendingMessage = false;

  $: projects = data?.projects ?? [];
  $: invoices = data?.invoices ?? [];
  $: quotes = data?.quotes ?? [];
  $: docs = data?.documents ?? [];
  $: messages = data?.messages ?? [];
  $: selectedProject = projects.find((project) => project.id === selectedProjectId);
  $: selectedOverviewProject = projects.find((project) => project.id === selectedOverviewProjectId);
  $: githubProjects = projects.filter((project) => project.githubRepositoryUrl);
  $: githubProject = projects.find((project) => project.id === githubProjectId);
  $: selectedConversation = data?.conversations?.find((conversation) => conversation.projectId === selectedProjectId);
  $: selectedThreadMessages = selectedConversation ? messages.filter((message) => message.conversationId === selectedConversation.id).slice().reverse() : [];
  $: filteredInboxProjects = projects
    .filter((project) => `${project.name} ${project.code} ${project.clientOwnerName} ${project.clientOrganizationName}`.toLowerCase().includes(inboxQuery.toLowerCase()))
    .sort((a, b) => {
      const aConversationId = data?.conversations?.find((conversation) => conversation.projectId === a.id)?.id;
      const bConversationId = data?.conversations?.find((conversation) => conversation.projectId === b.id)?.id;
      const aDate = messages.find((message) => message.conversationId === aConversationId)?.createdAt ?? 0;
      const bDate = messages.find((message) => message.conversationId === bConversationId)?.createdAt ?? 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  $: openProjects = projects.filter((p) => !['complete', 'paused'].includes(p.status));
  $: completeProjects = projects.filter((p) => p.status === 'complete').length;
  $: activeProjects = projects.filter((p) => ['in_progress', 'implementation'].includes(p.status)).length;
  $: overdueProjects = projects.filter((p) => p.dueDate && new Date(p.dueDate).getTime() < Date.now() && !['complete', 'paused'].includes(p.status)).length;
  $: stageOrder = ['planning', 'in_progress', 'implementation', 'testing', 'review', 'deployment', 'maintenance', 'complete'];
  $: stageSegments = stageOrder.map((stage) => ({ label: stage === 'in_progress' ? 'Implementing (legacy)' : stage.charAt(0).toUpperCase() + stage.slice(1), value: projects.filter((p) => p.status === stage).length }));
  $: reviewProjects = projects.filter((p) => p.status === 'review').length;
  $: averageProgress = projects.length ? Math.round(projects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / projects.length) : 0;
  $: paidTotal = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  $: overdueTotal = invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  $: filteredProjects = projects.filter((p) => `${p.name} ${p.code} ${p.status}`.toLowerCase().includes(query.toLowerCase()));
  $: statusSegments = [
    { label: 'Planning', value: projects.filter((p) => p.status === 'planning').length, color: '#69d6bb' },
    { label: 'Implementing', value: projects.filter((p) => ['in_progress', 'implementation'].includes(p.status)).length, color: '#7c9cff' },
    { label: 'Testing', value: projects.filter((p) => p.status === 'testing').length, color: '#6bd4e7' },
    { label: 'Review', value: projects.filter((p) => p.status === 'review').length, color: '#c4a7ff' },
    { label: 'Deployment', value: projects.filter((p) => p.status === 'deployment').length, color: '#f2c879' },
    { label: 'Maintenance', value: projects.filter((p) => p.status === 'maintenance').length, color: '#9ab5a1' },
    { label: 'Complete', value: completeProjects, color: '#8be0a7' },
    { label: 'Paused', value: projects.filter((p) => p.status === 'paused').length, color: '#ff8d9b' }
  ];
  $: pieGradient = (() => {
    const total = statusSegments.reduce((sum, s) => sum + s.value, 0);
    if (!total) return 'conic-gradient(#263346 0% 100%)';
    let start = 0;
    return `conic-gradient(${statusSegments.map((s) => { const from = start; start += s.value / total * 100; return `${s.color} ${from}% ${start}%`; }).join(', ')})`;
  })();

  const nav = [
    { name: 'Overview', icon: 'grid', group: 'Workspace' },
    { name: 'Projects', icon: 'layers', group: 'Workspace' },
    { name: 'Messages', icon: 'message-circle', group: 'Workspace' },
    { name: 'Documents', icon: 'file-text', group: 'Workspace' },
    { name: 'Analytics', icon: 'chart', group: 'Insights' },
    { name: 'Issues & PRs', icon: 'code', group: 'Insights' },
    { name: 'AI assistant', icon: 'sparkles', group: 'Insights' },
    { name: 'Integrations', icon: 'plug', group: 'System' }
  ];

  async function askAssistant() {
    const message = assistantInput.trim();
    if (!message || assistantBusy) return;
    assistantBusy = true;
    assistantError = '';
    assistantReply = '';
    try {
      const response = await fetch('/api/developer/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Assistant request failed.');
      assistantReply = typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result, null, 2);
      assistantInput = '';
    } catch (err) {
      assistantError = err?.message || 'Could not reach the assistant.';
    } finally { assistantBusy = false; }
  }

  function goTo(name) {
    section = name;
    if (name === 'Messages' && !selectedProjectId && projects.length) selectedProjectId = projects[0].id;
    if (name === 'Projects' && !selectedOverviewProjectId && projects.length) selectedOverviewProjectId = projects[0].id;
    if (name === 'Issues & PRs') {
      const projectId = githubProjectId || githubProjects[0]?.id || '';
      githubProjectId = projectId;
      const project = projects.find((item) => item.id === projectId);
      if (project?.githubRepositoryUrl && githubLoadedProjectId !== projectId) {
        loadGithubActivity(projectId);
      }
    }
    if (name === 'AI assistant') setTimeout(() => document.querySelector('#assistant-input')?.focus(), 0);
  }

  function openProjectMessage(projectId) {
    selectedProjectId = projectId;
    goTo('Messages');
  }

  function enhanceMessageSend() {
    sendingMessage = true;
    return async ({ result, update }) => {
      sendingMessage = false;
      await update();
      if (result.type === 'success') messageDraft = '';
    };
  }

  function openProjectOverview(projectId) {
    selectedOverviewProjectId = projectId;
    goTo('Projects');
  }

  async function loadGithubActivity(projectId) {
    const project = projects.find((item) => item.id === projectId);
    githubProjectId = projectId;
    githubError = '';
    githubIssues = [];
    githubPullRequests = [];
    githubLoadedProjectId = '';
    if (!project?.githubRepositoryUrl) return;

    githubLoading = true;
    try {
      const response = await fetch(`/api/developer/projects/${encodeURIComponent(projectId)}/github`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load GitHub activity.');
      if (githubProjectId !== projectId) return;
      githubIssues = Array.isArray(payload.issues) ? payload.issues : [];
      githubPullRequests = Array.isArray(payload.pullRequests) ? payload.pullRequests : [];
      githubLoadedProjectId = projectId;
    } catch (err) {
      if (githubProjectId === projectId) githubError = err?.message || 'Could not load GitHub activity.';
    } finally {
      if (githubProjectId === projectId) githubLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Developer Console · Origins</title>
  <meta name="description" content="Internal developer workspace, project telemetry and engineering tools." />
  <meta name="theme-color" content="#0b1020" />
</svelte:head>

<div class="dev-shell">
  <aside class="sidebar">
    <a class="brand" href="/developer" aria-label="Origins Developer Console home"><img class="brand-logo" src="/images/origins-logo.png" alt="Origins logo" /><span class="brand-copy"><strong>ORIGINS</strong><small>ENGINEERING CONSOLE</small></span></a>
    <div class="workspace-switch"><span class="workspace-icon"><img src="/images/origins-logo.png" alt="" /></span><span class="workspace-name"><strong>{data.organization?.name || 'Origins workspace'}</strong><small>Internal workspace</small></span><span class="switch-chevron">⌄</span></div>
    <div class="nav-label">WORKSPACE</div>
    {#each nav as item}
      {#if item.group !== nav[nav.indexOf(item) - 1]?.group}<div class="nav-label nav-label-spaced">{item.group.toUpperCase()}</div>{/if}
      <button class:active={section === item.name} class="nav-item" on:click={() => goTo(item.name)}><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{#if item.icon === 'grid'}<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>{:else if item.icon === 'layers'}<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>{:else if item.icon === 'message-circle'}<path d="M20.5 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8 11h8M8 14h5"/>{:else if item.icon === 'file-text'}<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>{:else if item.icon === 'chart'}<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-7"/><path d="M16 6h3v3"/>{:else if item.icon === 'code'}<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>{:else if item.icon === 'sparkles'}<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/>{:else}<path d="M9 7V4h6v3M5 7h14v13H5z"/><path d="M9 12h6"/>{/if}</svg></span><span>{item.name}</span>{#if item.name === 'Messages' && messages.length}<span class="nav-count">{messages.length}</span>{/if}</button>
    {/each}
    <div class="sidebar-bottom"><div class="system-status"><span class="pulse"></span><span><strong>Systems operational</strong><small>Workspace services</small></span><span class="status-dot"></span></div><a class="profile-mini" href="/developer" aria-label="Developer account and workspace"><span class="avatar">{(data.profile?.fullName || data.user?.email || 'D').slice(0,1).toUpperCase()}</span><span class="profile-name"><strong>{data.profile?.fullName || 'Developer'}</strong><small>{data.profile?.role || 'Team member'} · Developer account</small></span><span class="profile-menu">···</span></a><a class="client-link" href="/developer">← Developer workspace</a></div>
  </aside>

  <main class="main-area">
    <header class="topbar"><div class="breadcrumb"><span>Origins</span><span class="crumb-sep">/</span><strong>{section}</strong></div><div class="top-actions"><div class="env-pill"><span></span> DEVELOPMENT</div><button class="icon-button" aria-label="Notifications" title="Notifications">♧<i></i></button><div class="top-divider"></div><span class="top-avatar">{(data.profile?.fullName || data.user?.email || 'D').slice(0,1).toUpperCase()}</span></div></header>

    <div class="page-content">
      {#if data.setupRequired}
        <div class="setup-card"><span class="setup-icon">⌁</span><h1>Developer workspace is nearly ready</h1><p>Your signed-in account does not have a profile linked to an organization yet. Ask an organization owner to provision your team profile before accessing engineering data.</p><a href="/developer/login">Developer sign in</a></div>
      {:else}
        {#if form?.statusError}<div class="action-feedback error" role="alert">{form.statusError}</div>{/if}
        {#if form?.statusSuccess}<div class="action-feedback success" role="status">{form.statusSuccess}</div>{/if}
        <div class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> ENGINEERING OVERVIEW <span class="eyebrow-date">/ LIVE WORKSPACE DATA</span></div><h1>{section === 'Overview' ? 'Developer command center' : section}</h1><p class="heading-sub">A clear view of delivery, operations and team activity.</p></div><div class="heading-actions"><button class="outline-button" on:click={() => location.reload()}>↻ <span>Refresh data</span></button><button class="primary-button" on:click={() => goTo('AI assistant')}>✳ <span>Ask AI</span></button></div></div>

        {#if section === 'Overview' || section === 'Analytics'}
          <div class="metrics-grid">
            <article class="metric-card"><div class="metric-top"><span>Tracked projects</span><span class="metric-symbol blue">▦</span></div><div class="metric-value">{projects.length.toString().padStart(2,'0')}<span class="metric-unit">projects</span></div><div class="metric-foot"><span class="mini-bar"><i style={`width:${Math.min(projects.length * 8,100)}%`}></i></span><span>{openProjects.length} currently open</span></div></article>
            <article class="metric-card"><div class="metric-top"><span>Average completion</span><span class="metric-symbol violet">◴</span></div><div class="metric-value">{averageProgress}<span class="metric-unit">%</span></div><div class="metric-foot"><span class="trend-good">↗ delivery progress</span><span>across all projects</span></div></article>
            <article class="metric-card"><div class="metric-top"><span>Paid invoices</span><span class="metric-symbol green">＄</span></div><div class="metric-value">${paidTotal.toLocaleString('en-US',{maximumFractionDigits:0})}<span class="metric-unit">USD</span></div><div class="metric-foot"><span class="trend-good">{invoices.filter((i) => i.status === 'paid').length} settled</span><span>recorded payments</span></div></article>
            <article class="metric-card"><div class="metric-top"><span>Overdue exposure</span><span class="metric-symbol coral">!</span></div><div class="metric-value">${overdueTotal.toLocaleString('en-US',{maximumFractionDigits:0})}<span class="metric-unit">USD</span></div><div class="metric-foot"><span class:trend-warn={overdueTotal > 0} class="trend-good">{invoices.filter((i) => i.status === 'overdue').length} overdue</span><span>billing attention</span></div></article>
          </div>

          <div class="sdlc-insight-grid">
            <article class="sdlc-insight"><span class="insight-label">SDLC throughput</span><strong>{completeProjects}<small> / {projects.length}</small></strong><p>projects completed</p><div class="insight-track"><i style={`width:${projects.length ? completeProjects / projects.length * 100 : 0}%`}></i></div></article>
            <article class="sdlc-insight"><span class="insight-label">Active delivery</span><strong>{openProjects.length}</strong><p>projects not completed or paused</p><div class="insight-track"><i style={`width:${projects.length ? openProjects.length / projects.length * 100 : 0}%`}></i></div></article>
            <article class="sdlc-insight"><span class="insight-label">Deadline risk</span><strong class:danger-number={overdueProjects > 0}>{overdueProjects}</strong><p>overdue active projects</p><div class="insight-track risk-track"><i style={`width:${projects.length ? overdueProjects / projects.length * 100 : 0}%`}></i></div></article>
            <article class="sdlc-insight"><span class="insight-label">Delivery health</span><strong>{averageProgress}<small>%</small></strong><p>average recorded completion</p><div class="insight-track"><i style={`width:${averageProgress}%`}></i></div></article>
          </div>
          <div class="analytics-grid"><section class="panel delivery-panel"><div class="panel-heading"><div><h2>Delivery overview</h2><p>Project health at a glance</p></div><span class="live-label"><i></i> LIVE</span></div><div class="delivery-content"><div class="donut" style={`background:${pieGradient}`}><div class="donut-inner"><strong>{projects.length}</strong><span>PROJECTS</span></div></div><div class="legend-list">{#each statusSegments as seg}<div class="legend-row"><span class="legend-dot" style={`background:${seg.color}`}></span><span>{seg.label}</span><strong>{seg.value}</strong><span class="legend-percent">{projects.length ? Math.round(seg.value/projects.length*100) : 0}%</span></div>{/each}</div></div><div class="panel-bottom-note"><span class="note-check">✓</span> {completeProjects} completed · {activeProjects} in progress · {reviewProjects} in review</div></section>
            <section class="panel progress-panel"><div class="panel-heading"><div><h2>Progress distribution</h2><p>Completion by project · top 5</p></div><button class="text-button" on:click={() => goTo('Projects')}>View all ↗</button></div>{#if projects.length}<div class="progress-list">{#each projects.slice(0,5) as project}<div class="progress-item"><div class="progress-meta"><span>{project.name}</span><strong>{Math.max(0,Math.min(100,Number(project.progress)||0))}%</strong></div><div class="progress-track"><span style={`width:${Math.max(0,Math.min(100,Number(project.progress)||0))}%`}></span></div><div class="progress-sub"><span>{project.code}</span><span class={`status status-${project.status}`}>{project.status.replace('_',' ')}</span></div></div>{/each}</div>{:else}<div class="empty-state"><span>▦</span><strong>No projects yet</strong><p>Project analytics will appear when workspace data is available.</p></div>{/if}</section></div>

          <section class="panel projects-panel"><div class="panel-heading projects-heading"><div><h2>Project activity</h2><p>Latest projects across your organization</p></div><div class="table-actions"><label class="search-field"><span>⌕</span><input bind:value={query} placeholder="Search projects..." aria-label="Search projects" /></label><button class="outline-button compact" on:click={() => goTo('Projects')}>All projects ↗</button></div></div><div class="table-wrap"><table><thead><tr><th>PROJECT</th><th>STATUS</th><th>PROGRESS</th><th>PROJECT LEAD</th><th>DUE DATE</th></tr></thead><tbody>{#each filteredProjects.slice(0,6) as project}<tr><td><div class="project-cell"><span class="project-glyph">{project.code?.slice(0,2) || 'PR'}</span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td><td><span class={`status status-${project.status}`}><i></i>{project.status.replace('_',' ')}</span></td><td><div class="table-progress"><span>{Math.max(0,Math.min(100,Number(project.progress)||0))}%</span><div><i style={`width:${Math.max(0,Math.min(100,Number(project.progress)||0))}%`}></i></div></div></td><td>{project.leadName || '—'}</td><td>{project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td></tr>{/each}</tbody></table>{#if !filteredProjects.length}<div class="table-empty">No matching projects found.</div>{/if}</div><div class="table-footer"><span>Showing <strong>{Math.min(filteredProjects.length,6)}</strong> of <strong>{projects.length}</strong> projects</span><button class="text-button" on:click={() => goTo('Projects')}>Explore projects →</button></div></section>
        {/if}

        {#if section === 'Projects'}
          <section class="panel project-overview-panel">
            <div class="panel-heading">
              <div><h2>Project overview</h2><p>Manage project context and connect its GitHub repository.</p></div>
              <span class="subtle-pill">{projects.length} projects</span>
            </div>
            {#if selectedOverviewProject}
              <div class="overview-content">
                <div class="overview-summary">
                  <span class="project-glyph overview-glyph">{selectedOverviewProject.code?.slice(0, 2) || 'PR'}</span>
                  <div><span class="overview-kicker">{selectedOverviewProject.code}</span><h3>{selectedOverviewProject.name}</h3><p>{selectedOverviewProject.clientOrganizationName} · Owner: {selectedOverviewProject.clientOwnerName || 'Not assigned'}</p></div>
                  <label class="overview-project-select">Project
                    <select bind:value={selectedOverviewProjectId} aria-label="Choose project overview">
                      {#each projects as project}<option value={project.id}>{project.code} · {project.name}</option>{/each}
                    </select>
                  </label>
                </div>
                <div class="overview-facts">
                  <div><small>DELIVERY STAGE</small><strong>{selectedOverviewProject.status.replace('_', ' ')}</strong></div>
                  <div><small>PROGRESS</small><strong>{Number(selectedOverviewProject.progress) || 0}%</strong></div>
                  <div><small>PROJECT LEAD</small><strong>{selectedOverviewProject.leadName || 'Not assigned'}</strong></div>
                  <div><small>DUE DATE</small><strong>{selectedOverviewProject.dueDate ? new Date(selectedOverviewProject.dueDate).toLocaleDateString() : 'Not set'}</strong></div>
                </div>
                {#if form?.repositorySuccess}<div class="repo-feedback success" role="status">{form.repositorySuccess}</div>{/if}
                {#if form?.repositoryError}<div class="repo-feedback error" role="alert">{form.repositoryError}</div>{/if}
                <form method="POST" action="?/updateProjectRepository" class="repository-form">
                  <input type="hidden" name="projectId" value={selectedOverviewProject.id} />
                  <label for="github-repository-url">GitHub repository URL</label>
                  <div class="repository-input-row"><input id="github-repository-url" name="githubRepositoryUrl" type="url" maxlength="255" value={selectedOverviewProject.githubRepositoryUrl || ''} placeholder="https://github.com/owner/repository" /><button class="primary-button" type="submit">Save repository</button></div>
                  <p>Used only to load issues and pull requests in the developer console. A server-side read-only GitHub token is required.</p>
                </form>
              </div>
            {:else}
              <div class="empty-state"><span>▦</span><strong>No projects available</strong><p>Projects will appear here when they are added to a client workspace.</p></div>
            {/if}
          </section>
          <section class="panel full-panel"><div class="panel-heading"><div><h2>All client projects</h2><p>Projects across client workspaces · owner contact available per project</p></div><label class="search-field"><span>⌕</span><input bind:value={query} placeholder="Search projects..." /></label></div><div class="table-wrap"><table><thead><tr><th>PROJECT</th><th>STATUS</th><th>PROGRESS</th><th>LEAD</th><th>CLIENT OWNER</th><th>DUE DATE</th><th>CONTACT</th></tr></thead><tbody>{#each filteredProjects as project}<tr><td><div class="project-cell"><span class="project-glyph">{project.code?.slice(0,2) || 'PR'}</span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td><td><form method="POST" action="?/updateProjectStatus" class="stage-form"><input type="hidden" name="projectId" value={project.id}/><select name="status" aria-label={`Update SDLC stage for ${project.name}`} value={project.status} on:change={(event) => event.currentTarget.form?.requestSubmit()}><option value="planning">Planning</option><option value="in_progress">Implementing (legacy)</option><option value="implementation">Implementation</option><option value="testing">Testing / QA</option><option value="review">Review</option><option value="deployment">Deployment</option><option value="maintenance">Maintenance</option><option value="complete">Complete</option><option value="paused">Paused</option></select></form></td><td><div class="table-progress"><span>{Number(project.progress)||0}%</span><div><i style={`width:${Math.max(0,Math.min(100,Number(project.progress)||0))}%`}></i></div></div></td><td>{project.leadName || '—'}</td><td><div class="owner-cell"><strong>{project.clientOwnerName || 'Owner not assigned'}</strong><small>{project.clientOrganizationName}</small></div></td><td>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}</td><td><div class="project-actions"><button class="message-project-button secondary-action" type="button" on:click={() => openProjectOverview(project.id)}>Overview</button><button class="message-project-button" type="button" on:click={() => openProjectMessage(project.id)}>Message owner</button></div></td></tr>{/each}</tbody></table>{#if !filteredProjects.length}<div class="table-empty">No projects found.</div>{/if}</div></section>
        {/if}

        {#if section === 'Issues & PRs'}
          <section class="panel github-page">
            <div class="panel-heading github-heading">
              <div><span class="overview-kicker">GITHUB CONNECT</span><h2>Issues & pull requests</h2><p>Live activity for repositories linked to client projects.</p></div>
              {#if githubProject?.githubRepositoryUrl}
                <a class="github-repo-link" href={githubProject.githubRepositoryUrl} target="_blank" rel="noreferrer">Open repository ↗</a>
              {/if}
            </div>
            {#if githubProjects.length}
              <div class="github-toolbar">
                <label>Project repository
                  <select value={githubProjectId} on:change={(event) => loadGithubActivity(event.currentTarget.value)}>
                    {#each githubProjects as project}<option value={project.id}>{project.code} · {project.name} — {project.githubRepositoryUrl}</option>{/each}
                  </select>
                </label>
                <button type="button" class="outline-button" on:click={() => loadGithubActivity(githubProjectId)} disabled={githubLoading}>{githubLoading ? 'Refreshing…' : '↻ Refresh GitHub'}</button>
              </div>
              {#if githubError}<div class="github-alert" role="alert">{githubError}</div>{/if}
              {#if githubLoading}
                <div class="github-loading"><span class="github-spinner"></span><strong>Loading GitHub activity</strong><p>Fetching issues and pull requests for {githubProject?.name || 'this project'}.</p></div>
              {:else if !githubProject?.githubRepositoryUrl}
                <div class="empty-state github-empty"><span>⌘</span><strong>Select a linked repository</strong><p>Choose a project with a GitHub repository configured in its Project overview.</p></div>
              {:else if githubLoadedProjectId === githubProjectId}
                <div class="github-stats">
                  <article><span>OPEN ISSUES</span><strong>{githubIssues.filter((item) => item.state === 'open').length}</strong></article>
                  <article><span>OPEN PULL REQUESTS</span><strong>{githubPullRequests.filter((item) => item.state === 'open').length}</strong></article>
                  <article><span>TOTAL ISSUES</span><strong>{githubIssues.length}</strong></article>
                  <article><span>PULL REQUESTS</span><strong>{githubPullRequests.length}</strong></article>
                </div>
                <div class="github-columns">
                  <section class="github-list">
                    <header><div><h3>Issues</h3><p>Repository issues, including closed items</p></div><span>{githubIssues.length}</span></header>
                    {#if githubIssues.length}
                      {#each githubIssues as issue}
                        <a class="github-item" href={issue.html_url} target="_blank" rel="noreferrer">
                          <span class:closed={issue.state === 'closed'} class="github-state-icon">{issue.state === 'open' ? '○' : '✓'}</span>
                          <span class="github-item-main"><strong>{issue.title}</strong><span>#{issue.number} · {issue.user?.login || 'Unknown author'} · Updated {new Date(issue.updated_at).toLocaleDateString()}</span><span class="github-labels">{#each issue.labels ?? [] as label}<i style={`--label-color:#${label.color}`}>{label.name}</i>{/each}</span></span>
                          <span class="github-comments" aria-label={`${issue.comments} comments`}>◌ {issue.comments}</span>
                        </a>
                      {/each}
                    {:else}<div class="github-list-empty">No issues found for this repository.</div>{/if}
                  </section>
                  <section class="github-list">
                    <header><div><h3>Pull requests</h3><p>Review activity for this project</p></div><span>{githubPullRequests.length}</span></header>
                    {#if githubPullRequests.length}
                      {#each githubPullRequests as pullRequest}
                        <a class="github-item" href={pullRequest.html_url} target="_blank" rel="noreferrer">
                          <span class:merged={pullRequest.merged_at} class:closed={!pullRequest.merged_at && pullRequest.state === 'closed'} class="github-state-icon">{pullRequest.merged_at ? '↗' : pullRequest.state === 'open' ? '⑂' : '×'}</span>
                          <span class="github-item-main"><strong>{pullRequest.title}</strong><span>#{pullRequest.number} · {pullRequest.user?.login || 'Unknown author'} · {pullRequest.merged_at ? 'Merged' : pullRequest.draft ? 'Draft' : pullRequest.state === 'open' ? 'Open' : 'Closed'}</span><span class="github-labels">{#each pullRequest.labels ?? [] as label}<i style={`--label-color:#${label.color}`}>{label.name}</i>{/each}</span></span>
                          <span class="github-comments" aria-label={`${pullRequest.comments} comments`}>◌ {pullRequest.comments}</span>
                        </a>
                      {/each}
                    {:else}<div class="github-list-empty">No pull requests found for this repository.</div>{/if}
                  </section>
                </div>
                <p class="github-note">Showing up to 100 recently updated items per list. Data is fetched from GitHub when you open this page.</p>
              {/if}
            {:else}
              <div class="github-setup-empty"><span>⌘</span><h3>No repositories connected</h3><p>Open a project in the Projects section and add its GitHub repository URL to the project overview. The issues and pull requests will appear here.</p><button class="primary-button" type="button" on:click={() => goTo('Projects')}>Open project overview</button></div>
            {/if}
          </section>
        {/if}

        {#if section === 'Messages'}
          <section class="panel full-panel messages-page">
            <div class="panel-heading">
              <div><h2>Messages</h2><p>Direct project conversations with client owners.</p></div>
              <span class="subtle-pill"><i class="inbox-live-dot"></i> Secure workspace</span>
            </div>

            {#if form?.sendSuccess}<div class="message-alert success" role="status">{form.sendSuccess}</div>{/if}
            {#if form?.sendError}<div class="message-alert error" role="alert">{form.sendError}</div>{/if}

            <div class="messenger-shell">
              <aside class="messenger-inbox">
                <div class="inbox-heading"><div><span class="composer-kicker">WORKSPACE</span><h3>Project inbox</h3></div><span class="inbox-count">{filteredInboxProjects.length}</span></div>
                <label class="inbox-search"><span aria-hidden="true">⌕</span><input bind:value={inboxQuery} placeholder="Search people or projects" aria-label="Search conversations" /></label>
                <div class="inbox-list">
                  {#each filteredInboxProjects as project}
                    {@const conversation = data.conversations.find((item) => item.projectId === project.id)}
                    {@const latestMessage = conversation ? messages.find((message) => message.conversationId === conversation.id) : undefined}
                    <button type="button" class:active={selectedProjectId === project.id} class="inbox-contact" on:click={() => selectedProjectId = project.id}>
                      <span class="contact-avatar">{(project.clientOwnerName || 'O').slice(0, 1).toUpperCase()}</span>
                      <span class="contact-preview">
                        <span class="contact-topline"><strong>{project.clientOwnerName || 'Owner not assigned'}</strong><time>{latestMessage ? new Date(latestMessage.createdAt).toLocaleDateString() : ''}</time></span>
                        <span class="contact-project">{project.code} · {project.name}</span>
                        <span class="contact-snippet">{latestMessage?.body || project.clientOrganizationName}</span>
                      </span>
                    </button>
                  {/each}
                  {#if !filteredInboxProjects.length}
                    <div class="inbox-empty">No matching projects.</div>
                  {/if}
                </div>
              </aside>

              {#if selectedProject}
                <section class="messenger-thread" aria-label={`Conversation with ${selectedProject.clientOwnerName || 'project owner'}`}>
                  <header class="chat-header">
                    <span class="contact-avatar chat-avatar">{(selectedProject.clientOwnerName || 'O').slice(0, 1).toUpperCase()}</span>
                    <div class="chat-recipient"><strong>{selectedProject.clientOwnerName || 'Owner not assigned'}</strong><span>{selectedProject.clientOrganizationName} <i></i> {selectedProject.code} · {selectedProject.name}</span></div>
                    <span class="chat-presence"><i></i> PROJECT CHANNEL</span>
                  </header>

                  <div class="chat-history">
                    <div class="chat-day-label"><span>{selectedProject.code} · {selectedProject.name}</span></div>
                    {#if selectedThreadMessages.length}
                      {#each selectedThreadMessages as message}
                        <article class:sent={message.senderId === data.profile.id} class="chat-bubble">
                          <span class="bubble-author">{message.senderName || (message.senderId === data.profile.id ? data.profile.fullName : selectedProject.clientOwnerName || 'Project owner')}</span>
                          <p>{message.body}</p>
                          <time>{new Date(message.createdAt).toLocaleString()}</time>
                        </article>
                      {/each}
                    {:else}
                      <div class="chat-welcome"><span class="welcome-avatar">{(selectedProject.clientOwnerName || 'O').slice(0, 1).toUpperCase()}</span><strong>Start a conversation</strong><p>Your messages with {selectedProject.clientOwnerName || 'the project owner'} about this project will appear here.</p></div>
                    {/if}
                  </div>

                  <form method="POST" action="?/sendMessage" class="chat-composer" use:enhance={enhanceMessageSend}>
                    <input type="hidden" name="projectId" value={selectedProject.id} />
                    <textarea name="body" bind:value={messageDraft} maxlength="5000" required rows="2" placeholder={`Message ${selectedProject.clientOwnerName || 'project owner'}…`} aria-label="Write a project message"></textarea>
                    <div class="chat-compose-footer"><span>Messages stay in this project’s secure workspace.</span><button class="primary-button send-chat-button" type="submit" disabled={sendingMessage || !messageDraft.trim()} aria-label="Send message">{sendingMessage ? 'Sending…' : 'Send'} <span aria-hidden="true">↑</span></button></div>
                  </form>
                </section>
              {:else}
                <div class="messenger-no-selection"><span>✳</span><strong>Select a project conversation</strong><p>Choose an owner from your inbox to view the thread and send a message.</p></div>
              {/if}
            </div>
          </section>
        {/if}

        {#if section === 'Documents'}
          <section class="panel full-panel"><div class="panel-heading"><div><h2>Workspace documents</h2><p>Files indexed in the organization workspace</p></div><span class="subtle-pill">{docs.length} documents</span></div>{#if docs.length}<div class="document-list">{#each docs as doc}<div class="document-row"><span class="doc-icon">▧</span><div><strong>{doc.name}</strong><small>{doc.mimeType || 'Unknown file type'} · {doc.sizeBytes ? `${(doc.sizeBytes/1024).toFixed(0)} KB` : 'Size unavailable'}</small></div><span class="doc-date">{new Date(doc.createdAt).toLocaleDateString()}</span></div>{/each}</div>{:else}<div class="empty-state"><span>▧</span><strong>No documents yet</strong><p>Documents attached to projects will appear here.</p></div>{/if}</section>
        {/if}

        {#if section === 'AI assistant'}
          <div class="assistant-layout"><section class="panel assistant-panel"><div class="assistant-header"><span class="assistant-orb">✳</span><div><h2>Origins AI assistant</h2><p>Engineering help, workspace context and connected knowledge</p></div><span class="subtle-pill">OpenClaw bridge</span></div><div class="assistant-welcome"><span class="welcome-kicker">YOUR ENGINEERING COPILOT</span><h3>What can we solve today?</h3><p>Ask for help with a technical issue, project context, or connected team knowledge. Responses depend on your configured OpenClaw tools and permissions.</p><div class="suggestion-grid"><button on:click={() => assistantInput = 'Summarize current project delivery risks.'}>⌁ <span><strong>Delivery risks</strong><small>Summarize project risks</small></span></button><button on:click={() => assistantInput = 'Find relevant decisions in connected Lark messages.'}>▤ <span><strong>Search team knowledge</strong><small>Look through Lark messages</small></span></button><button on:click={() => assistantInput = 'Help me debug an intermittent API failure.'}>⌘ <span><strong>Debug an issue</strong><small>Investigate an API failure</small></span></button><button on:click={() => assistantInput = 'Create a checklist for a safe production release.'}>✓ <span><strong>Release checklist</strong><small>Plan a safe deployment</small></span></button></div></div>{#if assistantReply}<div class="assistant-response"><strong>Assistant response</strong><pre>{assistantReply}</pre></div>{/if}{#if assistantError}<div class="assistant-error" role="alert">{assistantError}</div>{/if}<form class="assistant-composer" on:submit|preventDefault={askAssistant}><textarea id="assistant-input" bind:value={assistantInput} maxlength="4000" rows="3" placeholder="Ask a question about your code, projects or team knowledge..." aria-label="Message the AI assistant"></textarea><div class="composer-footer"><span>Do not submit secrets, credentials or customer-sensitive data.</span><button class="primary-button" type="submit" disabled={assistantBusy || !assistantInput.trim()}>{assistantBusy ? 'Working…' : 'Send message ↑'}</button></div></form></section><aside class="panel integration-card"><h3>Connected knowledge</h3><p>Available context sources for your assistant.</p><div class="integration-item"><span class="integration-logo openclaw">⌘</span><span><strong>OpenClaw</strong><small>Assistant gateway</small></span><span class="integration-state">{assistantBusy ? 'ACTIVE' : 'CONFIGURE'}</span></div><div class="integration-item"><span class="integration-logo lark">L</span><span><strong>Lark Suite</strong><small>Messages & team docs</small></span><span class="integration-state muted">VIA OPENCLAW</span></div><div class="integration-divider"></div><h4>Setup requirements</h4><ol class="setup-steps"><li><span>1</span>Configure the OpenClaw API URL and server token.</li><li><span>2</span>Enable Lark tools in OpenClaw and grant least-privilege scopes.</li><li><span>3</span>Test access using a non-sensitive channel.</li></ol><p class="security-note">Access to Lark data must be explicitly authorized in OpenClaw. This portal does not bypass Lark permissions.</p></aside></div>
        {/if}

        {#if section === 'Integrations'}
          <div class="integration-page-grid"><section class="panel integration-detail"><div class="integration-big-icon">⌘</div><div class="integration-detail-copy"><span class="integration-category">AI GATEWAY</span><h2>OpenClaw</h2><p>Route developer questions to your self-hosted or managed OpenClaw endpoint. Credentials stay on the server and are never sent to the browser.</p><div class="config-list"><div><span>Endpoint</span><strong>OPENCLAW_API_URL</strong></div><div><span>Server token</span><strong>OPENCLAW_API_TOKEN</strong></div><div><span>Request timeout</span><strong>20 seconds</strong></div></div><span class="integration-state large muted">ENVIRONMENT CONFIGURATION REQUIRED</span></div></section><section class="panel integration-detail"><div class="integration-big-icon lark-bg">L</div><div class="integration-detail-copy"><span class="integration-category">TEAM KNOWLEDGE</span><h2>Lark Suite</h2><p>Use OpenClaw's Lark integration to search only messages and documents the connected identity is permitted to access.</p><div class="config-list"><div><span>Connection path</span><strong>Lark → OpenClaw tools</strong></div><div><span>Permissions</span><strong>Least privilege / approved scopes</strong></div><div><span>Portal status</span><strong>Not independently verified</strong></div></div><span class="integration-state large muted">CONNECT THROUGH OPENCLAW</span></div></section></div><div class="security-banner"><span>◇</span><div><strong>Security by design</strong><p>Keep provider secrets in server environment variables, scope all database reads by organization, and validate connector permissions before exposing team content.</p></div></div>
        {/if}

        <footer class="page-footer"><span>ORIGINS ENGINEERING CONSOLE <i>·</i> PRIVATE WORKSPACE</span><span>Data shown is sourced from the connected workspace database.</span></footer>
      {/if}
    </div>
  </main>
</div>

<style>
  :global(*){box-sizing:border-box} :global(body){margin:0;background:#0b1020;color:#e8edf8;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} :global(button),:global(input),:global(textarea){font:inherit} :global(button){cursor:pointer}
  .dev-shell{min-height:100vh;background:#0b1020;display:flex;color:#e8edf8;font-size:13px;--muted:#7f8ba5;--line:#202a3d;--panel:#11192a;--blue:#7c9cff}.sidebar{width:248px;flex-shrink:0;background:#0d1424;border-right:1px solid #20283a;min-height:100vh;padding:23px 14px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}.brand{display:flex;align-items:center;gap:10px;padding:0 10px 24px;color:inherit;text-decoration:none}.brand-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#8da8ff,#7157c9);display:grid;place-items:center;font-size:22px;font-weight:800;color:#fff;box-shadow:0 6px 18px #657be52b}.brand-mark span{color:#c5fff0}.brand-copy{display:flex;flex-direction:column;gap:3px;letter-spacing:1.7px}.brand-copy strong{font-size:12px}.brand-copy small{font-size:8px;color:#7e8ca8;letter-spacing:1.25px}.workspace-switch{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #29334a;border-radius:10px;background:#131d30;margin-bottom:25px}.workspace-icon{display:grid;place-items:center;width:29px;height:29px;background:#283753;border-radius:8px;color:#b7c9ff;font-weight:700}.workspace-name,.profile-name{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.workspace-name strong,.profile-name strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.workspace-name small,.profile-name small{font-size:10px;color:var(--muted)}.switch-chevron{color:#8592ad}.nav-label{font-size:9px;color:#66748f;letter-spacing:1.5px;font-weight:700;padding:0 11px 10px}.nav-label-spaced{padding-top:22px}.nav-item{width:100%;height:39px;display:flex;align-items:center;gap:12px;padding:0 11px;background:transparent;color:#9ca8c0;border:0;border-radius:8px;text-align:left;margin-bottom:3px;font-size:12px}.nav-item:hover{background:#182238;color:#e9efff}.nav-item.active{background:linear-gradient(90deg,#24375a,#1a2740);color:#eaf0ff;box-shadow:inset 2px 0 #8ca5ff}.nav-icon{display:grid;place-items:center;width:19px;height:19px;flex-shrink:0;color:#8595b6}.nav-icon svg{width:18px;height:18px;display:block}.nav-item.active .nav-icon{color:#a9bcff}.nav-count{margin-left:auto;border-radius:5px;background:#2d3b5a;padding:2px 6px;font-size:10px}.sidebar-bottom{margin-top:auto}.system-status{border:1px solid #25334a;background:#121d2f;border-radius:9px;padding:11px 9px;display:flex;align-items:center;gap:8px;margin:0 1px 15px}.pulse,.status-dot{width:7px;height:7px;border-radius:50%;background:#54d6a3;box-shadow:0 0 0 4px #54d6a317}.system-status span:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1}.system-status strong{font-size:10px;font-weight:600}.system-status small{font-size:9px;color:#7d8aa4}.status-dot{width:5px;height:5px;box-shadow:none}.profile-mini{display:flex;align-items:center;gap:9px;padding:10px 5px;text-decoration:none;color:inherit;border-top:1px solid #202a3d}.avatar,.top-avatar{display:grid;place-items:center;border-radius:50%;background:#344666;color:#d8e3ff;font-weight:700;width:30px;height:30px}.profile-menu{color:#8795ae;font-size:18px}.client-link{display:block;text-decoration:none;color:#8b9aba;padding:12px 7px 3px;font-size:10px}.client-link:hover{color:#d8e3ff}.main-area{flex:1;min-width:0}.topbar{height:66px;border-bottom:1px solid #20283a;display:flex;align-items:center;justify-content:space-between;padding:0 35px;background:#0e1525}.breadcrumb{display:flex;align-items:center;gap:10px;color:#7785a0;font-size:11px}.breadcrumb strong{color:#dce4f5;font-weight:600}.crumb-sep{color:#3c4962}.top-actions{display:flex;align-items:center;gap:17px}.env-pill{display:flex;align-items:center;gap:7px;border:1px solid #3d3a35;background:#25221e;color:#e8c88a;padding:6px 9px;border-radius:5px;font-size:9px;letter-spacing:1px;font-weight:700}.env-pill span{width:5px;height:5px;border-radius:50%;background:#e8bc64}.icon-button{position:relative;border:0;background:transparent;color:#a2aec4;font-size:20px}.icon-button i{position:absolute;width:5px;height:5px;right:0;top:1px;background:#ff8b9a;border-radius:50%}.top-divider{height:25px;width:1px;background:#283247}.top-avatar{width:28px;height:28px;font-size:11px}.page-content{padding:29px 35px 22px;max-width:1600px;margin:auto}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:25px}.eyebrow{font-size:9px;font-weight:700;letter-spacing:1.6px;color:#8ea7ff;display:flex;align-items:center;gap:9px}.eyebrow-line{width:17px;height:1px;background:#8ea7ff}.eyebrow-date{color:#65738f;font-weight:500}.page-heading h1{font-size:27px;letter-spacing:-.8px;margin:11px 0 6px;font-weight:650}.heading-sub{margin:0;color:#7f8ca5;font-size:12px}.heading-actions{display:flex;gap:8px}.outline-button,.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:7px;padding:10px 13px;font-size:11px;font-weight:600}.outline-button{background:#121a2a;border:1px solid #303a50;color:#c5cee0}.outline-button:hover{background:#1a263b}.primary-button{background:#849cff;color:#0b1120;border:1px solid #849cff;box-shadow:0 5px 16px #738af021}.primary-button:hover{background:#a0b2ff}.primary-button:disabled{opacity:.45;cursor:not-allowed}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:15px}.metric-card,.panel{background:linear-gradient(145deg,#121b2d,#101827);border:1px solid #263147;border-radius:11px}.metric-card{padding:17px 17px 13px;min-height:130px}.metric-top{display:flex;align-items:center;justify-content:space-between;color:#a0abc1;font-size:11px}.metric-symbol{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;font-size:15px}.blue{background:#27375a;color:#92adff}.violet{background:#362c55;color:#c8a7ff}.green{background:#1e423e;color:#7ce0c1}.coral{background:#492d3b;color:#ff9ba8}.metric-value{font-size:27px;font-weight:650;letter-spacing:-.7px;margin:10px 0 12px}.metric-unit{font-size:10px;color:#7887a3;font-weight:500;letter-spacing:0;margin-left:6px}.metric-foot{border-top:1px solid #202b3f;padding-top:10px;display:flex;align-items:center;justify-content:space-between;gap:5px;color:#7786a0;font-size:9px}.mini-bar{width:32px;height:4px;background:#27344c;border-radius:5px;overflow:hidden}.mini-bar i{display:block;height:100%;background:#8ba3ff;border-radius:5px}.trend-good{color:#6fd4b1}.trend-warn{color:#ff9ba8}.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:15px}.panel{overflow:hidden}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:18px 19px 0}.panel-heading h2,.assistant-header h2,.integration-detail h2{margin:0;font-size:13px;font-weight:650;letter-spacing:-.15px}.panel-heading p{margin:5px 0 0;color:#7c8aa4;font-size:10px}.live-label{display:flex;align-items:center;gap:6px;font-size:9px;color:#72d6b1;letter-spacing:1px}.live-label i{width:5px;height:5px;background:#65d6ac;border-radius:50%}.delivery-content{display:flex;align-items:center;justify-content:space-evenly;gap:20px;padding:20px 25px 17px}.donut{width:142px;height:142px;border-radius:50%;display:grid;place-items:center;position:relative;flex-shrink:0}.donut:after{content:'';position:absolute;inset:13px;background:#121b2b;border:1px solid #263147;border-radius:50%}.donut-inner{z-index:1;display:flex;align-items:center;flex-direction:column;gap:5px}.donut-inner strong{font-size:29px;letter-spacing:-1px}.donut-inner span{font-size:8px;letter-spacing:1.3px;color:#7f8ba4}.legend-list{flex:1;min-width:0;max-width:240px}.legend-row{display:grid;grid-template-columns:8px minmax(75px,1fr) 18px 30px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #202a3d;font-size:10px;color:#a8b3c8}.legend-row:last-child{border:0}.legend-dot{width:7px;height:7px;border-radius:3px}.legend-row strong{color:#e6ecf8;font-size:10px;text-align:right}.legend-percent{color:#72819d;text-align:right;font-size:9px}.panel-bottom-note{border-top:1px solid #202a3d;background:#101726;padding:11px 18px;color:#8997b0;font-size:10px}.note-check{color:#72d6b1;margin-right:5px}.text-button{border:0;background:transparent;color:#91a8ff;font-size:10px;font-weight:600;padding:3px}.text-button:hover{color:#c5d1ff}.progress-list{padding:20px 19px 10px}.progress-item{margin-bottom:17px}.progress-meta{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:10px;color:#c4cee0}.progress-meta strong{font-size:10px;color:#e5ecfa}.progress-track,.table-progress div{height:5px;border-radius:5px;background:#273249;overflow:hidden}.progress-track span,.table-progress i{display:block;height:100%;background:linear-gradient(90deg,#718cf1,#b39cff);border-radius:5px}.progress-sub{display:flex;justify-content:space-between;margin-top:7px;font-size:9px;color:#72809b;text-transform:uppercase;letter-spacing:.5px}.status{display:inline-flex;align-items:center;gap:5px;border-radius:5px;padding:4px 7px;text-transform:capitalize;font-size:9px;white-space:nowrap}.status i{width:5px;height:5px;border-radius:50%;background:currentColor}.status-in_progress{color:#9db3ff;background:#253455}.status-review{color:#c5a8ff;background:#342b4e}.status-planning{color:#79ddc2;background:#1b3938}.status-complete{color:#e8c97e;background:#3b3425}.status-paused{color:#ff9ca8;background:#442b39}.empty-state{display:flex;align-items:center;flex-direction:column;text-align:center;padding:36px 20px;color:#7f8ba4}.empty-state>span{font-size:23px;color:#7d94dc;margin-bottom:10px}.empty-state strong{font-size:12px;color:#d4ddef}.empty-state p{font-size:10px;line-height:1.6;max-width:260px}.projects-panel{margin-bottom:20px}.projects-heading{align-items:center;padding-bottom:16px}.table-actions{display:flex;align-items:center;gap:8px}.search-field{display:flex;align-items:center;gap:7px;border:1px solid #2b354b;background:#0d1524;border-radius:6px;padding:0 9px;color:#8290ab;height:31px;min-width:180px}.search-field input{background:transparent;border:0;outline:0;color:#e1e9f8;font-size:10px;width:100%;min-width:0}.search-field input::placeholder{color:#687793}.compact{padding:8px 10px;font-size:10px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}thead{background:#0f1726}th{font-size:8px;letter-spacing:1px;font-weight:700;color:#687894;padding:11px 16px;border-top:1px solid #222d42;border-bottom:1px solid #222d42}td{padding:12px 16px;border-bottom:1px solid #202a3c;color:#96a3bc;font-size:10px}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:#172135}.project-cell{display:flex;align-items:center;gap:10px}.owner-cell{display:flex;flex-direction:column;gap:4px;min-width:125px}.owner-cell strong{font-size:10px;color:#d9e2f3;font-weight:600}.owner-cell small{font-size:9px;color:#72819c}.contact-owner{position:relative}.owner-message-form{position:absolute;right:0;top:27px;z-index:5;width:285px;padding:13px;background:#101b2c;border:1px solid #34445a;border-radius:10px;box-shadow:0 18px 45px #0007;display:flex;flex-direction:column;gap:9px;white-space:normal}.global-feedback{margin:12px 35px 0}.action-feedback{margin:0 18px 15px;padding:11px 13px;border-radius:8px;font-size:11px}.action-feedback.error{background:#3b2028;border:1px solid #75404c;color:#ffb8c2}.action-feedback.success{background:#143426;border:1px solid #28664a;color:#a4f1c6}.project-glyph{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:#25334e;color:#b3c5ff;font-size:9px;font-weight:700}.project-cell>span:last-child{display:flex;flex-direction:column;gap:4px}.project-cell strong{font-size:10px;color:#d9e2f3;font-weight:600}.project-cell small{font-size:9px;color:#72819c}.table-progress{display:flex;align-items:center;gap:8px}.table-progress>span{width:25px;color:#c5d0e6;font-size:9px}.table-progress div{width:65px;height:4px}.table-progress i{background:#8aa3ff}.table-footer{display:flex;align-items:center;justify-content:space-between;padding:11px 17px;border-top:1px solid #222c40;color:#7785a0;font-size:9px}.table-footer strong{color:#b8c4da}.table-empty{text-align:center;padding:25px;color:#8290aa;font-size:11px}.page-footer{display:flex;justify-content:space-between;gap:12px;padding:10px 2px;color:#5e6d87;font-size:8px;letter-spacing:.35px}.page-footer i{font-style:normal;color:#91a8ff;margin:0 4px}.full-panel{margin-bottom:18px}.subtle-pill{display:inline-flex;border:1px solid #303a50;background:#182236;border-radius:5px;padding:5px 8px;color:#9baac5;font-size:9px;white-space:nowrap}.message-list,.document-list{padding:8px 18px 18px}.message-row{display:flex;align-items:flex-start;gap:11px;padding:14px 0;border-bottom:1px solid #222c40}.message-row:last-child{border-bottom:0}.message-avatar{display:grid;place-items:center;flex-shrink:0;width:30px;height:30px;border-radius:9px;background:#283653;color:#a9bcff}.message-body{flex:1;min-width:0}.message-meta{display:flex;justify-content:space-between;gap:10px;align-items:center}.read-indicator{font-size:9px;color:#73829d}.read-indicator.unread{color:#8ca7ff}.integration-note{margin:0 18px 18px;border:1px solid #3d3641;background:#211d2b;border-radius:7px;padding:11px;color:#c6b3e9;font-size:10px}.document-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #222c40}.document-row:last-child{border-bottom:0}.doc-icon{width:33px;height:36px;border-radius:7px;display:grid;place-items:center;background:#25334e;color:#a5bbff;font-size:17px}.document-row>div{display:flex;flex-direction:column;gap:5px;flex:1}.document-row strong{font-size:11px;color:#dce5f6}.document-row small{font-size:9px;color:#7888a4}.doc-date{font-size:9px;color:#8492ac}.assistant-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.8fr);gap:15px}.assistant-panel{padding-bottom:0}.assistant-header{display:flex;align-items:center;gap:11px;padding:18px;border-bottom:1px solid #252f43}.assistant-orb{display:grid;place-items:center;width:37px;height:37px;border-radius:12px;background:linear-gradient(145deg,#6c86eb,#9c75d6);font-size:21px;color:white}.assistant-header>div{flex:1}.assistant-header p{margin:5px 0 0;font-size:10px;color:#7e8ca6}.assistant-welcome{padding:26px 24px 18px}.welcome-kicker,.integration-category{color:#9aaeff;font-size:8px;letter-spacing:1.5px;font-weight:700}.assistant-welcome h3{font-size:22px;letter-spacing:-.5px;margin:9px 0}.assistant-welcome>p{max-width:500px;color:#8a98b2;font-size:11px;line-height:1.7;margin:0}.suggestion-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:21px}.suggestion-grid button{display:flex;align-items:center;gap:11px;text-align:left;padding:12px;background:#151f32;border:1px solid #2a354d;border-radius:8px;color:#9eb2ff;font-size:16px}.suggestion-grid button:hover{background:#1c2941;border-color:#52659a}.suggestion-grid button span{display:flex;flex-direction:column;gap:5px}.suggestion-grid strong{font-size:10px;color:#d9e3f7}.suggestion-grid small{font-size:9px;color:#7d8ba5}.assistant-composer{padding:15px 18px;border-top:1px solid #253047;background:#101726}.assistant-composer textarea{width:100%;resize:vertical;background:#0c1423;border:1px solid #303b52;border-radius:8px;padding:12px;color:#e0e8f8;outline:0;font-size:11px;line-height:1.6}.assistant-composer textarea:focus{border-color:#778ee5}.assistant-composer textarea::placeholder{color:#697995}.composer-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:9px}.composer-footer>span{font-size:9px;color:#73819b}.assistant-response{margin:0 18px 15px;border:1px solid #2d3a52;border-radius:8px;padding:13px;background:#0e1727}.assistant-response>strong{font-size:10px;color:#a9bcff}.assistant-response pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:11px;line-height:1.7;color:#c4d0e4}.assistant-error{margin:0 18px 15px;border:1px solid #6b3946;border-radius:7px;background:#2b1b29;padding:11px;color:#ffabb7;font-size:10px}.integration-card{padding:19px;height:max-content}.integration-card h3{font-size:13px;margin:0 0 6px}.integration-card>p{font-size:10px;line-height:1.6;color:#7e8ca6;margin:0 0 18px}.integration-item{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #253047}.integration-logo{display:grid;place-items:center;width:31px;height:31px;border-radius:8px;background:#293956;color:#b6c7ff;font-size:16px;font-weight:700}.integration-logo.lark,.lark-bg{background:#3d303f;color:#ffb6b4}.integration-item>span:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1}.integration-item strong{font-size:10px}.integration-item small{font-size:9px;color:#7e8ca6}.integration-state{font-size:7px;letter-spacing:.5px;color:#80d9ba;background:#1c3a37;border-radius:4px;padding:5px}.integration-state.muted{color:#c7b6e7;background:#322a45}.integration-divider{height:1px;background:#253047;margin:19px 0}.integration-card h4{font-size:10px;margin:0 0 12px}.setup-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.setup-steps li{display:flex;align-items:flex-start;gap:9px;color:#94a1b9;font-size:10px;line-height:1.5}.setup-steps li span{display:grid;place-items:center;width:19px;height:19px;border:1px solid #34415a;border-radius:6px;color:#a9bcff;flex-shrink:0}.security-note{border-top:1px solid #253047;padding-top:13px;margin:16px 0 0!important;color:#c7b48c!important;font-size:9px!important}.integration-page-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.integration-detail{display:flex;gap:15px;padding:21px}.integration-big-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:#293956;color:#c0ceff;font-size:22px;flex-shrink:0}.integration-big-icon.lark-bg{background:#3d303f}.integration-detail-copy{min-width:0}.integration-detail h2{font-size:17px;margin:5px 0 8px}.integration-detail-copy>p{font-size:10px;color:#8a98b1;line-height:1.7;margin:0 0 16px}.config-list{border-top:1px solid #2a344a;margin-bottom:15px}.config-list div{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #252f43;font-size:9px}.config-list div span{color:#7c8aa4}.config-list div strong{font-weight:600;color:#c5d0e5;text-align:right}.integration-state.large{display:inline-block;white-space:normal;line-height:1.4}.security-banner{display:flex;gap:13px;padding:16px;margin-top:15px;border:1px solid #3b3850;background:#191b2e;border-radius:9px;color:#c9b8f0}.security-banner>span{font-size:22px}.security-banner strong{font-size:11px}.security-banner p{font-size:10px;line-height:1.6;color:#a39abf;margin:5px 0 0}.setup-card{max-width:580px;margin:12vh auto;padding:35px;border:1px solid #2c3850;border-radius:14px;background:#121b2c;text-align:center}.setup-icon{font-size:30px;color:#9aafff}.setup-card h1{font-size:22px}.setup-card p{font-size:12px;color:#91a0ba;line-height:1.7}.setup-card a{display:inline-block;margin-top:10px;color:#a5b8ff}
  @media(max-width:1150px){.sidebar{width:215px}.page-content{padding:25px 22px}.topbar{padding:0 22px}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.delivery-content{padding:18px}.donut{width:120px;height:120px}.donut:after{inset:11px}.integration-detail{padding:16px;gap:10px}}
  @media(max-width:800px){.sidebar{width:64px;padding:18px 8px}.brand{padding:0 6px 25px}.brand-copy,.workspace-name,.switch-chevron,.nav-label,.nav-item>span:not(.nav-icon),.system-status,.profile-name,.profile-menu,.client-link{display:none}.workspace-switch{justify-content:center;padding:7px}.nav-item{justify-content:center;padding:0}.nav-icon{font-size:18px}.profile-mini{justify-content:center}.analytics-grid,.assistant-layout,.integration-page-grid{grid-template-columns:1fr}.page-heading{align-items:flex-start;flex-direction:column}.heading-actions{align-self:flex-end}.page-content{padding:22px 16px}.global-feedback{margin:10px 16px 0}.topbar{padding:0 16px}.projects-heading{align-items:flex-start;flex-direction:column}.table-actions{width:100%}.search-field{flex:1}.page-footer{flex-direction:column}.assistant-header{flex-wrap:wrap}.assistant-header .subtle-pill{margin-left:48px}}
  @media(max-width:480px){.metrics-grid{grid-template-columns:1fr 1fr;gap:8px}.metric-card{padding:12px;min-height:120px}.metric-value{font-size:22px}.metric-foot{flex-wrap:wrap}.delivery-content{flex-direction:column}.legend-list{width:100%;max-width:none}.page-heading h1{font-size:23px}.eyebrow-date{display:none}.env-pill{font-size:8px}.top-actions{gap:10px}.suggestion-grid{grid-template-columns:1fr}.composer-footer{align-items:flex-start;flex-direction:column}.integration-detail{flex-direction:column}.integration-detail-copy{width:100%}.config-list div{flex-wrap:wrap}.message-meta{align-items:flex-start;flex-direction:column;gap:5px}}

  /* Origins engineering visual system: same green brand, distinct control-room UI */
  .dev-shell{background:#07110d!important;color:#f5faf7!important;min-height:100vh;background-image:radial-gradient(ellipse at 85% 0%,rgba(0,212,126,.07),transparent 35%)!important}
  .sidebar{background:#09170f!important;border-right:1px solid #23372a!important}
  .brand{display:flex!important;align-items:center!important;gap:12px!important}.brand-logo{width:112px;height:42px;object-fit:contain;object-position:left center;flex-shrink:0}
  .brand-mark{display:none!important}.brand-copy strong{color:#f5faf7!important;letter-spacing:.16em}.brand-copy small{color:#7e9687!important}
  .workspace-switch,.metric-card,.panel,.project-row,.setup-card,.integration-detail,.integration-card{background:#0d1d13!important;border-color:#263d2e!important;box-shadow:0 12px 35px rgba(0,0,0,.12)!important}
  .topbar{background:rgba(7,17,13,.92)!important;border-bottom:1px solid #23372a!important;backdrop-filter:blur(16px)}
  .nav-item{color:#9bb0a1!important;border:1px solid transparent!important}.nav-item:hover,.nav-item.active{background:#12301f!important;color:#48e6a0!important;border-color:#24563a!important}.nav-icon,.eyebrow-line{color:#00d47e!important}.nav-count,.env-pill{background:#123522!important;color:#62e7a7!important;border-color:#24563a!important}.env-pill>span,.live-label i,.status-dot,.pulse{background:#00d47e!important}
  .page-heading h1,.metric-value,.panel-heading h2,.project-name,.integration-detail h2,.setup-card h1{color:#f0f8f2!important}.heading-sub,.metric-top,.metric-foot,.panel-heading p,.project-meta,.document-row small,.integration-card>p{color:#8ba394!important}
  .metric-symbol.blue,.metric-symbol.violet,.assistant-orb,.doc-icon,.integration-big-icon{background:#153b26!important;color:#63e9a8!important}.metric-symbol.green{background:#163c28!important;color:#63e9a8!important}.metric-symbol.coral{background:#3b2820!important;color:#ffc18b!important}
  .primary-button,.assistant-composer button,.search-field:focus-within{background:#00d47e!important;color:#062014!important;border-color:#00d47e!important}.outline-button,.icon-button{background:#0d1d13!important;border-color:#2b4433!important;color:#c8d8ce!important}.outline-button:hover,.icon-button:hover{border-color:#00a965!important;color:#00d47e!important}
  .donut-inner{background:#0d1d13!important}.legend-row,.table-row,.document-row,.integration-item,.config-list,.assistant-header,.integration-divider{border-color:#263d2e!important}.legend-dot{box-shadow:0 0 0 3px #0d1d13!important}.mini-bar{background:#20382a!important}.mini-bar i{background:#00d47e!important}.trend-good{color:#54dfa0!important}.trend-warn{color:#ffb66d!important}
  .suggestion-grid button{background:#102519!important;border-color:#294a34!important;color:#00d47e!important}.suggestion-grid button:hover{background:#153522!important;border-color:#00a965!important}.suggestion-grid strong,.message-meta strong,.document-row strong{color:#e1eee5!important}.suggestion-grid small,
  .assistant-composer{background:#0a190f!important;border-color:#263d2e!important}.assistant-composer textarea,.search-field input{background:#07140c!important;border-color:#304b38!important;color:#f5faf7!important}.assistant-response{background:#0b1a10!important;border-color:#2a4633!important}.assistant-response>strong{color:#62e7a7!important}.integration-logo{background:#153b26!important;color:#63e9a8!important}.integration-logo.lark,.lark-bg{background:#263a2c!important;color:#b5e4c5!important}.integration-state{background:#153b26!important;color:#63e9a8!important}.integration-state.muted{background:#292e25!important;color:#d1d9a6!important}.security-banner{background:#18261a!important;border-color:#3a4930!important;color:#d3e4b5!important}.security-banner p{color:#a4b99a!important}.setup-card a{color:#00d47e!important}
  .sidebar-bottom{border-color:#263d2e!important}.system-status{background:#0c1c12!important;border-color:#263d2e!important}.profile-mini:hover{background:#102519!important}.avatar,.top-avatar,.workspace-icon{background:#17422b!important;color:#6ce9ac!important}.client-link{color:#8ca294!important}.client-link:hover{color:#00d47e!important}
  @media(max-width:800px){.brand-logo{width:40px;height:38px;object-fit:cover;object-position:left center}.brand-copy{display:none!important}}
  .sdlc-insight-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 15px}.sdlc-insight{border:1px solid #263d2e;background:linear-gradient(145deg,#0d1d13,#0a170f);border-radius:12px;padding:16px;min-width:0}.insight-label{display:block;color:#8ba394;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.sdlc-insight>strong{display:block;color:#f0f8f2;font-size:28px;letter-spacing:-.04em;margin:10px 0 4px}.sdlc-insight>strong small{font-size:13px;color:#8ba394;font-weight:500}.sdlc-insight p{margin:0 0 13px;color:#8ba394;font-size:10px}.insight-track{height:4px;background:#20382a;border-radius:9px;overflow:hidden}.insight-track i{display:block;height:100%;background:#00d47e;border-radius:9px}.risk-track i{background:#ff8d9b}.danger-number{color:#ff9aa7!important}.stage-form select{max-width:145px;width:100%;background:#0b1a10;border:1px solid #2b4433;color:#cfe0d4;border-radius:7px;padding:7px 8px;font:inherit;font-size:10px}.stage-form select:focus-visible{outline:2px solid #00d47e;outline-offset:2px}@media(max-width:1000px){.sdlc-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.sdlc-insight-grid{grid-template-columns:1fr 1fr}.sdlc-insight{padding:12px}.sdlc-insight>strong{font-size:23px}}
  .message-project-button{border:1px solid #2b6544;border-radius:7px;padding:8px 10px;background:#102519;color:#67e6a8;font:inherit;font-weight:600;white-space:nowrap}.message-project-button:hover{background:#153522;border-color:#00a965}
  .main-area{background:radial-gradient(ellipse at 82% -10%,rgba(0,212,126,.075),transparent 38%),#07110d}.page-content{max-width:1740px;padding-top:34px}.sidebar{box-shadow:12px 0 42px rgba(0,0,0,.12)}.brand{padding-bottom:28px}.workspace-switch,.panel,.metric-card,.sdlc-insight,.setup-card,.integration-detail,.integration-card{border-radius:15px;box-shadow:0 18px 54px rgba(0,0,0,.16),inset 0 1px rgba(255,255,255,.025)!important}.metric-card{transition:transform .24s ease,border-color .24s ease}.metric-card:hover,.sdlc-insight:hover{transform:translateY(-3px);border-color:#315740}.page-heading h1{font-size:clamp(30px,3.2vw,42px);letter-spacing:-1.3px}.eyebrow{color:#58d99a}.topbar{padding-inline:clamp(20px,3.3vw,48px)}.table-wrap{scrollbar-width:thin}.table-wrap table th{letter-spacing:.12em}.primary-button{border-radius:9px;font-weight:700;transition:transform .18s ease,box-shadow .18s ease}.primary-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px #00d47e30}
  .messages-page{padding:0!important;overflow:hidden}.messages-page>.panel-heading{padding:22px 24px 18px;border-bottom:1px solid #20382a;align-items:center}.messages-page>.panel-heading h2{font-size:18px;letter-spacing:-.35px}.messages-page>.panel-heading p{font-size:11px}.inbox-live-dot{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:#00d47e;box-shadow:0 0 0 4px #00d47e18}.messenger-shell{display:grid;grid-template-columns:minmax(270px,340px) minmax(0,1fr);min-height:690px;max-height:calc(100vh - 205px);background:#09160f}.messenger-inbox{display:flex;flex-direction:column;min-height:0;border-right:1px solid #263d2e;background:linear-gradient(180deg,#0d1b12,#0b170f)}.inbox-heading{display:flex;align-items:center;justify-content:space-between;padding:22px 20px 15px}.inbox-heading h3{margin:5px 0 0;color:#eff7f0;font-size:17px;letter-spacing:-.35px}.inbox-count{display:grid;place-items:center;min-width:25px;height:25px;padding:0 7px;border:1px solid #294a34;border-radius:8px;background:#102519;color:#72e5ad;font-size:10px;font-weight:700}.inbox-search{display:flex;align-items:center;gap:9px;margin:0 15px 14px;padding:0 12px;height:40px;border:1px solid #263d2e;border-radius:10px;background:#07130c;color:#819687}.inbox-search:focus-within{border-color:#00a965;box-shadow:0 0 0 3px #00d47e18}.inbox-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#e7f2e9;font:inherit;font-size:11px}.inbox-search input::placeholder{color:#738879}.inbox-list{overflow:auto;min-height:0;padding:0 8px 12px;scrollbar-width:thin;scrollbar-color:#294a34 transparent}.inbox-contact{display:flex;align-items:center;gap:12px;width:100%;padding:13px 11px;border:1px solid transparent;border-radius:11px;background:transparent;text-align:left;color:inherit;transition:background .18s ease,border-color .18s ease}.inbox-contact:hover{background:#102519}.inbox-contact.active{border-color:#24563a;background:linear-gradient(110deg,#143522,#102519);box-shadow:inset 2px 0 #00d47e}.contact-avatar{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border:1px solid #2e6041;border-radius:50%;background:linear-gradient(145deg,#1a5536,#123521);color:#8cf0bc;font-size:14px;font-weight:700}.contact-preview{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}.contact-topline{display:flex;align-items:center;justify-content:space-between;gap:8px}.contact-topline strong{overflow:hidden;color:#e4efe6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.contact-topline time{flex:0 0 auto;color:#779080;font-size:9px}.contact-project,.contact-snippet{overflow:hidden;color:#89a191;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.contact-snippet{color:#a8b9ad}.inbox-empty{padding:20px;color:#8ba394;font-size:11px}.messenger-thread{display:flex;flex-direction:column;min-width:0;min-height:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,212,126,.035),transparent 70%),#09160f}.chat-header{display:flex;align-items:center;gap:12px;min-height:75px;padding:13px 22px;border-bottom:1px solid #263d2e;background:rgba(13,29,19,.92)}.chat-avatar{width:43px;height:43px;flex-basis:43px}.chat-recipient{display:flex;flex:1;flex-direction:column;gap:5px;min-width:0}.chat-recipient strong{overflow:hidden;color:#eff7f0;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.chat-recipient>span{overflow:hidden;color:#8ca394;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.chat-recipient>span i{display:inline-block;width:3px;height:3px;margin:0 5px 2px;border-radius:50%;background:#52d993}.chat-presence{display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid #294a34;border-radius:7px;color:#80d9a8;font-size:8px;font-weight:700;letter-spacing:.08em;white-space:nowrap}.chat-presence i{width:5px;height:5px;border-radius:50%;background:#00d47e}.chat-history{display:flex;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px clamp(16px,4vw,46px);scrollbar-width:thin;scrollbar-color:#294a34 transparent}.chat-day-label{display:flex;justify-content:center;margin:2px 0 12px}.chat-day-label span{padding:7px 11px;border:1px solid #263d2e;border-radius:8px;background:#0d1d13;color:#8ba394;font-size:9px}.chat-bubble{position:relative;align-self:flex-start;width:fit-content;max-width:min(78%,660px);padding:11px 13px 9px;border:1px solid #294333;border-radius:4px 13px 13px 13px;background:linear-gradient(145deg,#12281b,#102318);box-shadow:0 8px 20px rgba(0,0,0,.09)}.chat-bubble.sent{align-self:flex-end;border-color:#1c6741;border-radius:13px 4px 13px 13px;background:linear-gradient(145deg,#12452b,#103820)}.bubble-author{display:block;margin-bottom:5px;color:#87e5b0;font-size:9px;font-weight:700}.chat-bubble p{margin:0;color:#e0eee4;font-size:12px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.chat-bubble time{display:block;margin-top:6px;color:#86a08e;font-size:8px;text-align:right}.chat-welcome{display:flex;flex:1;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:26px}.welcome-avatar{display:grid;place-items:center;width:62px;height:62px;margin-bottom:15px;border:1px solid #356d4a;border-radius:50%;background:radial-gradient(circle at 30% 20%,#205b39,#10301e);color:#9af0bd;font-size:20px;font-weight:700;box-shadow:0 0 0 8px #16362250,0 14px 42px #00d47e14}.chat-welcome strong{color:#e7f3e9;font-size:15px}.chat-welcome p,.messenger-no-selection p{max-width:310px;color:#88a091;font-size:11px;line-height:1.7}.chat-composer{padding:13px 18px 15px;border-top:1px solid #263d2e;background:#0d1b12}.chat-composer textarea{display:block;width:100%;min-height:54px;max-height:140px;resize:vertical;padding:12px 14px;border:1px solid #2a4933;border-radius:10px;outline:0;background:#07130c;color:#eef8f0;font:inherit;font-size:12px;line-height:1.55}.chat-composer textarea::placeholder{color:#718879}.chat-composer textarea:focus{border-color:#00a965;box-shadow:0 0 0 3px #00d47e18}.chat-compose-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px}.chat-compose-footer>span{color:#779080;font-size:9px}.send-chat-button{min-width:92px;min-height:35px;padding:8px 13px}.send-chat-button span{font-size:15px}.messenger-no-selection{display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:440px;text-align:center}.messenger-no-selection>span{display:grid;place-items:center;width:60px;height:60px;margin-bottom:17px;border:1px solid #294a34;border-radius:18px;background:#102519;color:#66dfa2;font-size:25px}.messenger-no-selection strong{color:#e8f4eb;font-size:15px}.message-alert{margin:12px 20px 0!important}
  @media(max-width:900px){.messenger-shell{grid-template-columns:minmax(230px,290px) minmax(0,1fr);max-height:calc(100vh - 175px)}.chat-presence{display:none}.page-content{padding-inline:20px}}
  @media(max-width:650px){.messenger-shell{grid-template-columns:1fr;max-height:none;min-height:0}.messenger-inbox{max-height:255px;border-right:0;border-bottom:1px solid #263d2e}.inbox-list{max-height:160px}.messenger-thread{min-height:480px}.chat-header{padding-inline:14px}.chat-history{min-height:260px;padding:18px 13px}.chat-bubble{max-width:88%}.chat-composer{padding-inline:12px}.messages-page>.panel-heading{padding:18px}.page-content{padding:22px 12px}.page-heading{align-items:flex-start;flex-direction:column}}
  .project-overview-panel{margin-bottom:14px;padding-bottom:20px}.overview-content{padding:18px 20px 0}.overview-summary{display:flex;align-items:center;gap:13px}.overview-glyph{width:48px;height:48px;flex:0 0 48px;font-size:14px}.overview-kicker{color:#65dda0;font-size:9px;font-weight:700;letter-spacing:.12em}.overview-summary h3{margin:4px 0;color:#f0f8f2;font-size:17px}.overview-summary p{margin:0;color:#8ba394;font-size:10px}.overview-project-select{display:flex;flex-direction:column;gap:6px;margin-left:auto;color:#91a99a;font-size:9px;font-weight:600}.overview-project-select select,.github-toolbar select{min-width:230px;max-width:100%;height:38px;padding:0 10px;border:1px solid #304b38;border-radius:8px;background:#09160f;color:#e5f0e8;font:inherit;font-size:10px}.overview-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0;padding:14px;border:1px solid #263d2e;border-radius:10px;background:#0a190f}.overview-facts>div{display:flex;flex-direction:column;gap:7px;min-width:0}.overview-facts small{color:#7f9887;font-size:8px;letter-spacing:.09em}.overview-facts strong{overflow:hidden;color:#e3efe6;font-size:10px;text-overflow:ellipsis;text-transform:capitalize;white-space:nowrap}.repository-form{padding-top:3px}.repository-form>label,.github-toolbar label{display:flex;flex-direction:column;gap:8px;color:#cfe0d4;font-size:10px;font-weight:650}.repository-input-row{display:flex;gap:9px}.repository-input-row input{flex:1;min-width:0;height:42px;padding:0 12px;border:1px solid #304b38;border-radius:9px;outline:none;background:#07140c;color:#eff7f0;font:inherit;font-size:11px}.repository-input-row input:focus{border-color:#00a965;box-shadow:0 0 0 3px #00d47e18}.repository-input-row input::placeholder{color:#718879}.repository-form>p{margin:9px 0 0;color:#83988a;font-size:9px;line-height:1.6}.repo-feedback{margin:13px 0;padding:10px 12px;border:1px solid;border-radius:8px;font-size:10px}.repo-feedback.success{border-color:#286340;background:#102519;color:#73e7ac}.repo-feedback.error{border-color:#733c3d;background:#2a1717;color:#ffb0ae}.project-actions{display:flex;flex-wrap:wrap;gap:6px}.secondary-action{background:#09160f!important;color:#c3d4c8!important;border-color:#304b38!important}
  .github-page{padding-bottom:20px}.github-heading{align-items:center;padding:22px 24px}.github-heading h2{margin:4px 0;color:#f0f8f2;font-size:19px}.github-heading p{margin:5px 0 0;color:#8ba394;font-size:10px}.github-repo-link{padding:9px 11px;border:1px solid #304b38;border-radius:8px;color:#87e5b0;font-size:10px;text-decoration:none}.github-repo-link:hover{border-color:#00a965;background:#102519}.github-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:13px;margin:0 22px 16px;padding:15px;border:1px solid #263d2e;border-radius:11px;background:#0a190f}.github-toolbar label{flex:1;min-width:0}.github-toolbar select{width:100%;min-width:0}.github-toolbar .outline-button{min-height:38px;white-space:nowrap}.github-toolbar .outline-button:disabled{opacity:.55;cursor:wait}.github-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 22px 17px}.github-stats article{display:flex;flex-direction:column;gap:10px;padding:15px;border:1px solid #263d2e;border-radius:10px;background:linear-gradient(145deg,#102519,#0b190f)}.github-stats article span{color:#88a091;font-size:8px;font-weight:700;letter-spacing:.09em}.github-stats article strong{color:#eff8f1;font-size:24px;letter-spacing:-.04em}.github-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:0 22px}.github-list{overflow:hidden;min-width:0;border:1px solid #263d2e;border-radius:11px;background:#09160f}.github-list>header{display:flex;align-items:center;justify-content:space-between;padding:14px 15px;border-bottom:1px solid #263d2e}.github-list>header h3{margin:0;color:#edf6ef;font-size:13px}.github-list>header p{margin:4px 0 0;color:#849a8b;font-size:9px}.github-list>header>span{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border:1px solid #294a34;border-radius:7px;background:#102519;color:#83e4ad;font-size:9px;font-weight:700}.github-item{display:flex;align-items:flex-start;gap:10px;padding:13px 14px;border-bottom:1px solid #1d3325;color:inherit;text-decoration:none;transition:background .16s ease}.github-item:last-child{border-bottom:0}.github-item:hover{background:#102519}.github-state-icon{display:grid;place-items:center;width:17px;height:17px;flex:0 0 17px;border:1px solid #438758;border-radius:50%;color:#65dfa0;font-size:11px;font-weight:700}.github-state-icon.closed{border-color:#66766b;color:#9aa99e}.github-state-icon.merged{border-color:#a16ee5;color:#c09af0}.github-item-main{display:flex;flex:1;flex-direction:column;gap:5px;min-width:0}.github-item-main>strong{color:#e4efe6;font-size:10px;line-height:1.5}.github-item-main>span:nth-child(2){color:#82998a;font-size:8px}.github-labels{display:flex;flex-wrap:wrap;gap:4px}.github-labels i{padding:3px 6px;border:1px solid color-mix(in srgb,var(--label-color) 45%,transparent);border-radius:99px;background:color-mix(in srgb,var(--label-color) 12%,transparent);color:#c6d7cb;font-size:8px;font-style:normal}.github-comments{flex:0 0 auto;color:#819687;font-size:8px;white-space:nowrap}.github-list-empty{padding:22px 14px;color:#8ba394;font-size:10px}.github-note{margin:14px 22px 0;color:#7e9384;font-size:9px}.github-alert{margin:0 22px 15px;padding:11px 13px;border:1px solid #704641;border-radius:9px;background:#271714;color:#ffb3a2;font-size:10px;line-height:1.6}.github-loading,.github-setup-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:270px;padding:28px;text-align:center}.github-loading strong,.github-setup-empty h3{margin:13px 0 0;color:#edf6ef;font-size:14px}.github-loading p,.github-setup-empty p{max-width:430px;color:#8ba394;font-size:10px;line-height:1.7}.github-spinner{width:26px;height:26px;border:2px solid #23412d;border-top-color:#00d47e;border-radius:50%;animation:github-spin .7s linear infinite}@keyframes github-spin{to{transform:rotate(360deg)}}.github-setup-empty>span{display:grid;place-items:center;width:56px;height:56px;border:1px solid #2d583a;border-radius:17px;background:#102519;color:#83e4ad;font-size:24px}.github-setup-empty .primary-button{margin-top:8px}.github-empty{min-height:230px}
  @media(max-width:900px){.github-columns{grid-template-columns:1fr}.github-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:600px){.overview-content{padding:16px 14px 0}.overview-summary{align-items:flex-start;flex-wrap:wrap}.overview-project-select{width:100%;margin:3px 0 0}.overview-project-select select{width:100%;min-width:0}.overview-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.repository-input-row{align-items:stretch;flex-direction:column}.repository-input-row .primary-button{min-height:40px}.github-heading{align-items:flex-start;flex-direction:column;padding:18px}.github-toolbar{align-items:stretch;flex-direction:column;margin-inline:12px}.github-toolbar .outline-button{justify-content:center}.github-columns,.github-stats{margin-inline:12px}.github-note{margin-inline:12px}.github-stats article{padding:12px}.github-item{padding:12px 10px}}
  @media(prefers-reduced-motion:reduce){.github-spinner{animation:none}}
  .dev-shell>.sidebar{padding:25px 13px 16px;background:radial-gradient(ellipse at 0 0,rgba(0,212,126,.08),transparent 42%),linear-gradient(180deg,#0c1c12,#08130d);border-right-color:#203a29;box-shadow:15px 0 48px rgba(0,0,0,.17)}
  .dev-shell .brand{padding:2px 9px 29px}
  .dev-shell .workspace-switch{position:relative;margin:0 2px 25px;padding:11px;border-color:#294433;border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.016));box-shadow:0 10px 26px rgba(0,0,0,.14),inset 0 1px rgba(255,255,255,.04);transition:border-color .2s ease,transform .2s ease}
  .dev-shell .workspace-switch:hover{transform:translateY(-1px);border-color:#356e49}
  .dev-shell .workspace-icon{width:34px;height:34px;border:1px solid #2c6240;border-radius:10px;background:linear-gradient(145deg,#1b5234,#123521);color:#8cebb5;box-shadow:0 6px 16px #00d47e16}
  .dev-shell .workspace-icon img{width:26px;height:26px;object-fit:contain;filter:drop-shadow(0 2px 7px #00d47e24)}
  .dev-shell .nav-label{padding-inline:12px;color:#76917f}
  .dev-shell .nav-item{height:43px;padding-inline:12px;border:1px solid transparent;border-radius:11px;color:#a0b4a5;font-weight:550;transition:transform .2s ease,border-color .2s ease,background .2s ease,color .2s ease}
  .dev-shell .nav-item:hover{transform:translateX(2px);border-color:#25432f;background:rgba(255,255,255,.035);color:#e8f3ea}
  .dev-shell .nav-item.active{border-color:#24563a;background:linear-gradient(100deg,#143622,#102418);color:#edfaf0;box-shadow:inset 2px 0 #00d47e,0 7px 20px rgba(0,0,0,.11)}
  .dev-shell .nav-item.active .nav-icon{color:#68e5a6}
  .dev-shell .nav-item:focus-visible,.dev-shell .workspace-switch:focus-visible,.dev-shell .profile-mini:focus-visible,.dev-shell .client-link:focus-visible{outline:2px solid #00d47e;outline-offset:3px}
  .dev-shell .nav-count{min-width:22px;text-align:center;border:1px solid #28603e;background:#123522;color:#85eab3}
  .dev-shell .sidebar-bottom{padding-top:18px}
  .dev-shell .system-status{margin-inline:2px;padding:13px 11px;border-color:#294433;border-radius:13px;background:linear-gradient(145deg,rgba(0,212,126,.07),rgba(255,255,255,.018));box-shadow:inset 0 1px rgba(255,255,255,.025)}
  .dev-shell .profile-mini{margin-top:11px;padding:10px;border:1px solid #294433;border-radius:13px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.012));transition:border-color .2s ease,background .2s ease}
  .dev-shell .profile-mini:hover{border-color:#356e49;background:linear-gradient(145deg,rgba(0,212,126,.08),rgba(255,255,255,.02))}
  .dev-shell .avatar{width:35px;height:35px;border:1px solid #2c6240;background:linear-gradient(145deg,#1b5234,#123521);box-shadow:0 6px 16px #00d47e16}
  .dev-shell .client-link{margin:6px 2px 0;padding:10px;border:1px solid transparent;border-radius:9px;transition:color .2s ease,background .2s ease,border-color .2s ease}
  .dev-shell .client-link:hover{border-color:#294433;background:#102519}
  .dev-shell .primary-button,.dev-shell .outline-button{min-height:38px;border-radius:9px;font-weight:650;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
  .dev-shell .primary-button{background:linear-gradient(135deg,#21e493,#00bd70)!important;border-color:#1bd98a!important;box-shadow:0 8px 20px #00d47e20,inset 0 1px #ffffff2b}
  .dev-shell .primary-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 25px #00d47e30,inset 0 1px #ffffff38}
  .dev-shell .outline-button{border-color:#304b38;border-radius:9px;background:linear-gradient(145deg,#112318,#0c1a11)!important}
  .dev-shell .outline-button:hover:not(:disabled){transform:translateY(-1px);border-color:#42724f;background:#153522!important}
  @media(max-width:800px){.dev-shell>.sidebar{padding-inline:8px}.dev-shell .workspace-switch{margin-inline:0}}
  @media(prefers-reduced-motion:reduce){.dev-shell .nav-item,.dev-shell .workspace-switch,.dev-shell .profile-mini,.dev-shell .client-link,.dev-shell .primary-button,.dev-shell .outline-button{transition:none!important}}
</style>
