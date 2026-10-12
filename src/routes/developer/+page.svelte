<script>
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  export let data;
  export let form;

  let theme = 'dark';
  let sidebarCollapsed = false;
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

  onMount(() => {
    const savedTheme = localStorage.getItem('origins-portal-theme')
      ?? localStorage.getItem('origins-developer-theme')
      ?? localStorage.getItem('origins-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme;
    sidebarCollapsed = localStorage.getItem('origins-developer-sidebar-collapsed') === 'true';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('origins-developer-sidebar-collapsed', String(sidebarCollapsed));
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('origins-portal-theme', theme);
    localStorage.setItem('origins-developer-theme', theme);
  }

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

<div class:light-theme={theme === 'light'} class="dev-shell">
  <aside class:collapsed={sidebarCollapsed} class="sidebar" id="developer-sidebar">
    <div class="sidebar-brand-row">
      <a class="brand" href="/developer" aria-label="Origins Developer Console home"><img class="brand-logo" src="/images/origins-logo.png" alt="Origins logo" /><span class="brand-copy"><strong>ORIGINS</strong><small>ENGINEERING CONSOLE</small></span></a>
      <button class="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!sidebarCollapsed} aria-controls="developer-sidebar-navigation" title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} on:click={toggleSidebar}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{#if sidebarCollapsed}<path d="m9 18 6-6-6-6"/>{:else}<path d="m15 18-6-6 6-6"/>{/if}</svg>
      </button>
    </div>
    <div class="workspace-switch" title={sidebarCollapsed ? data.organization?.name || 'Origins workspace' : undefined}><span class="workspace-icon"><img src="/images/origins-logo.png" alt="" /></span><span class="workspace-name"><strong>{data.organization?.name || 'Origins workspace'}</strong><small>Internal workspace</small></span><span class="switch-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg></span></div>
    <nav class="sidebar-navigation" id="developer-sidebar-navigation" aria-label="Developer workspace navigation">
      {#each nav as item}
        {#if item.group !== nav[nav.indexOf(item) - 1]?.group}<div class="nav-label nav-label-spaced">{item.group}</div>{/if}
        <button class:active={section === item.name} class="nav-item" aria-label={item.name} aria-current={section === item.name ? 'page' : undefined} title={sidebarCollapsed ? item.name : undefined} on:click={() => goTo(item.name)}><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{#if item.icon === 'grid'}<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>{:else if item.icon === 'layers'}<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>{:else if item.icon === 'message-circle'}<path d="M20.5 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8 11h8M8 14h5"/>{:else if item.icon === 'file-text'}<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>{:else if item.icon === 'chart'}<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-7"/><path d="M16 6h3v3"/>{:else if item.icon === 'code'}<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>{:else if item.icon === 'sparkles'}<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/>{:else}<path d="M9 7V4h6v3M5 7h14v13H5z"/><path d="M9 12h6"/>{/if}</svg></span><span class="nav-text">{item.name}</span>{#if item.name === 'Messages' && messages.length}<span class="nav-count">{messages.length}</span>{/if}</button>
      {/each}
    </nav>
    <div class="sidebar-bottom"><div class="system-status" title={sidebarCollapsed ? 'Systems operational' : undefined}><span class="pulse"></span><span><strong>Systems operational</strong><small>Workspace services</small></span><span class="status-dot"></span></div><a class="profile-mini" href="/developer" aria-label="Developer account and workspace"><span class="avatar">{(data.profile?.fullName || data.user?.email || 'D').slice(0,1).toUpperCase()}</span><span class="profile-name"><strong>{data.profile?.fullName || 'Developer'}</strong><small>{data.profile?.role || 'Team member'} · Developer account</small></span><span class="profile-menu" aria-hidden="true">···</span></a><a class="client-link" href="/developer" aria-label="Developer workspace"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg><span>Developer workspace</span></a></div>
  </aside>

  <main class="main-area">
    <header class="topbar"><div class="breadcrumb"><span>Origins</span><span class="crumb-sep">/</span><strong>{section}</strong></div><div class="top-actions"><div class="env-pill"><span></span> DEVELOPMENT</div><button class="icon-button theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} on:click={toggleTheme}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button><button class="icon-button" aria-label="Notifications" title="Notifications">♧<i></i></button><div class="top-divider"></div><span class="top-avatar">{(data.profile?.fullName || data.user?.email || 'D').slice(0,1).toUpperCase()}</span></div></header>

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
  .dev-shell>.sidebar{
    background:
      radial-gradient(ellipse at 8% 0%,rgba(126,157,255,.15),transparent 36%),
      linear-gradient(160deg,rgba(20,31,54,.78),rgba(10,17,32,.9));
    border-right-color:rgba(205,218,255,.12);
    box-shadow:12px 0 48px #03081355,inset -1px 0 #ffffff0b;
    backdrop-filter:blur(28px) saturate(155%);
    -webkit-backdrop-filter:blur(28px) saturate(155%);
  }
  .dev-shell .workspace-switch,.dev-shell .system-status{
    border-color:#ffffff18;
    background:linear-gradient(145deg,#ffffff12,#ffffff06);
    box-shadow:inset 0 1px #ffffff12,0 12px 30px #02081722;
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
  }
  .dev-shell .workspace-icon{background:linear-gradient(145deg,#ffffff20,#ffffff0c);border:1px solid #ffffff18}
  .dev-shell .nav-item{border:1px solid transparent;transition:background .2s ease,border-color .2s ease,color .2s ease,transform .2s ease}
  .dev-shell .nav-item:hover{background:linear-gradient(100deg,#ffffff12,#ffffff06);border-color:#ffffff10;transform:translateX(2px)}
  .dev-shell .nav-item.active{background:linear-gradient(105deg,#829eff35,#829eff12 72%,#ffffff08);border-color:#a9bcff24;box-shadow:inset 2px 0 #a9bcff,0 10px 28px #050a1730}
  .dev-shell .profile-mini{border-top-color:#ffffff13}
  .dev-shell .theme-toggle{width:34px;height:34px;display:grid;place-items:center;border:1px solid #ffffff14;border-radius:10px;background:#ffffff08;font-size:19px;transition:background .2s ease,border-color .2s ease,transform .2s ease}
  .dev-shell .theme-toggle:hover{background:#ffffff15;border-color:#ffffff2b;transform:translateY(-1px)}
  .dev-shell.light-theme{
    --muted:#69768a;--line:#dce3ec;--panel:#fff;--blue:#526fca;
    color-scheme:light;background:#f4f6fa!important;color:#1d293b!important;
    background-image:radial-gradient(ellipse at 84% 0%,rgba(63,130,101,.07),transparent 38%)!important;
  }
  :global(body:has(.dev-shell.light-theme)){background:#f4f6fa;color:#1d293b}
  .dev-shell.light-theme .main-area,.dev-shell.light-theme .page-content{
    background:transparent!important;color:#1d293b!important;
  }
  .dev-shell.light-theme .sidebar{
    position:sticky;isolation:isolate;overflow:hidden;
    background:linear-gradient(155deg,rgba(255,255,255,.82),rgba(244,248,252,.68) 48%,rgba(235,241,248,.78))!important;
    border-right:1px solid rgba(255,255,255,.82)!important;
    box-shadow:1px 0 0 rgba(80,100,130,.1),14px 0 45px rgba(42,59,81,.08),inset -1px 0 rgba(255,255,255,.9)!important;
    backdrop-filter:blur(36px) saturate(185%);-webkit-backdrop-filter:blur(36px) saturate(185%);
  }
  .dev-shell.light-theme .sidebar::before{
    position:absolute;z-index:-1;inset:0;pointer-events:none;content:"";
    background:radial-gradient(ellipse at 12% 2%,rgba(255,255,255,.95),transparent 36%),
      linear-gradient(112deg,rgba(255,255,255,.38),transparent 38%,rgba(255,255,255,.12) 78%,transparent);
  }
  .dev-shell.light-theme .brand-copy strong,.dev-shell.light-theme .workspace-name strong,
  .dev-shell.light-theme .profile-name strong,.dev-shell.light-theme .system-status strong,
  .dev-shell.light-theme .nav-item{color:#253247!important}
  .dev-shell.light-theme .brand-copy small,.dev-shell.light-theme .workspace-name small,
  .dev-shell.light-theme .profile-name small,.dev-shell.light-theme .nav-label,
  .dev-shell.light-theme .client-link,.dev-shell.light-theme .system-status small{color:#78859a!important}
  .dev-shell.light-theme .workspace-switch,.dev-shell.light-theme .system-status{
    border-color:rgba(255,255,255,.9)!important;
    background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(255,255,255,.39))!important;
    box-shadow:0 10px 28px rgba(57,76,99,.08),inset 0 1px 0 rgba(255,255,255,.98),inset 0 -1px rgba(196,208,222,.24)!important;
    backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);
  }
  .dev-shell.light-theme .workspace-icon{background:linear-gradient(145deg,#fff,#e8eef7)!important;color:#52688f!important;border-color:#e3e9f1!important}
  .dev-shell.light-theme .nav-item{border-color:transparent!important}
  .dev-shell.light-theme .nav-item:hover{
    background:linear-gradient(110deg,rgba(255,255,255,.78),rgba(255,255,255,.35))!important;
    border-color:rgba(255,255,255,.92)!important;color:#1d2b40!important;
    box-shadow:0 7px 20px rgba(54,74,99,.07),inset 0 1px rgba(255,255,255,.95);
  }
  .dev-shell.light-theme .nav-item.active{
    background:linear-gradient(105deg,rgba(255,255,255,.94),rgba(232,240,255,.76) 66%,rgba(255,255,255,.5))!important;
    border-color:rgba(255,255,255,.98)!important;color:#334d87!important;
    box-shadow:inset 3px 0 #6884d4,0 9px 26px rgba(62,86,130,.1),inset 0 1px rgba(255,255,255,.98)!important;
    backdrop-filter:blur(20px) saturate(170%);-webkit-backdrop-filter:blur(20px) saturate(170%);
  }
  .dev-shell.light-theme .nav-item.active .nav-icon,.dev-shell.light-theme .nav-icon{color:#687997!important}
  .dev-shell.light-theme .nav-item.active .nav-icon{color:#526fca!important}
  .dev-shell.light-theme .nav-count{background:#e8edf6!important;color:#586983!important}
  .dev-shell.light-theme .avatar,.dev-shell.light-theme .top-avatar{background:#e1e9f5!important;color:#40577e!important}
  .dev-shell.light-theme .profile-mini{border-top-color:#dce3ec!important}
  .dev-shell.light-theme .topbar{
    position:sticky;top:0;z-index:20;
    background:rgba(247,249,252,.72)!important;border-bottom:1px solid rgba(211,220,231,.72)!important;
    box-shadow:0 8px 30px rgba(32,51,74,.035),inset 0 1px rgba(255,255,255,.86);
    backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);
  }
  .dev-shell.light-theme .breadcrumb{color:#79869a!important}
  .dev-shell.light-theme .breadcrumb strong{color:#28354a!important}
  .dev-shell.light-theme .crumb-sep,.dev-shell.light-theme .top-divider{color:#aab4c2!important;background-color:#dfe5ed}
  .dev-shell.light-theme .page-heading h1,.dev-shell.light-theme .panel-heading h2,
  .dev-shell.light-theme .metric-value,.dev-shell.light-theme .sdlc-insight strong,
  .dev-shell.light-theme .legend-row strong,.dev-shell.light-theme .progress-meta,
  .dev-shell.light-theme .panel h3,.dev-shell.light-theme .panel h4{color:#202d41!important}
  .dev-shell.light-theme .heading-sub,.dev-shell.light-theme .panel-heading p,
  .dev-shell.light-theme .metric-top,.dev-shell.light-theme .metric-unit,
  .dev-shell.light-theme .metric-foot,.dev-shell.light-theme .insight-label,
  .dev-shell.light-theme .sdlc-insight p,.dev-shell.light-theme .progress-sub,
  .dev-shell.light-theme .legend-row,.dev-shell.light-theme .page-footer,
  .dev-shell.light-theme .subtle-pill,.dev-shell.light-theme .table-footer,
  .dev-shell.light-theme .document-row small,.dev-shell.light-theme .integration-card>p{color:#6c788c!important}
  .dev-shell.light-theme .metric-card,.dev-shell.light-theme .panel,
  .dev-shell.light-theme .sdlc-insight,.dev-shell.light-theme .setup-card,
  .dev-shell.light-theme .integration-detail,.dev-shell.light-theme .integration-card{
    background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(250,252,254,.93))!important;
    border-color:#e0e6ee!important;
    box-shadow:0 16px 42px rgba(36,54,77,.065),inset 0 1px rgba(255,255,255,.98)!important;
  }
  .dev-shell.light-theme .metric-card:hover,.dev-shell.light-theme .sdlc-insight:hover{
    border-color:#cad5e4!important;box-shadow:0 20px 45px rgba(36,54,77,.09),inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .metric-foot,.dev-shell.light-theme .legend-row,
  .dev-shell.light-theme .table-wrap,.dev-shell.light-theme .profile-mini,
  .dev-shell.light-theme .document-row,.dev-shell.light-theme .integration-item,
  .dev-shell.light-theme .config-list,.dev-shell.light-theme .assistant-header,
  .dev-shell.light-theme .integration-divider{border-color:#e5eaf0!important}
  .dev-shell.light-theme .donut:after,.dev-shell.light-theme .donut-inner{background:#fff!important;border-color:#e2e7ee!important}
  .dev-shell.light-theme .mini-bar,.dev-shell.light-theme .insight-track{background:#e6ebf1!important}
  .dev-shell.light-theme .legend-dot{box-shadow:0 0 0 3px #fff!important}
  .dev-shell.light-theme .outline-button,.dev-shell.light-theme .icon-button{
    color:#46566e!important;background:linear-gradient(145deg,#fff,#f5f7fa)!important;
    border-color:#dce3eb!important;box-shadow:0 4px 12px rgba(33,51,75,.04),inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .outline-button:hover,.dev-shell.light-theme .icon-button:hover{
    color:#385b9e!important;background:#edf2f9!important;border-color:#cad5e3!important;
  }
  .dev-shell.light-theme .primary-button,.dev-shell.light-theme .assistant-composer button{
    background:linear-gradient(135deg,#26bd7a,#159d65)!important;border-color:#159d65!important;
    color:#fff!important;box-shadow:0 7px 18px rgba(20,145,91,.18),inset 0 1px rgba(255,255,255,.3)!important;
  }
  .dev-shell.light-theme .primary-button:hover:not(:disabled),.dev-shell.light-theme .assistant-composer button:hover:not(:disabled){
    background:linear-gradient(135deg,#2bc886,#159d65)!important;box-shadow:0 10px 22px rgba(20,145,91,.22)!important;
  }
  .dev-shell.light-theme .env-pill{background:#fff8e8!important;border-color:#ebdfc8!important;color:#87682f!important}
  .dev-shell.light-theme .eyebrow,.dev-shell.light-theme .overview-kicker{color:#278159!important}
  .dev-shell.light-theme .table-wrap table th{color:#778398!important;border-bottom-color:#e0e6ed!important}
  .dev-shell.light-theme .table-wrap table td{color:#56647a!important;border-bottom-color:#e9edf2!important}
  .dev-shell.light-theme .table-wrap table td strong{color:#26344a!important}
  .dev-shell.light-theme .table-wrap table tbody tr:hover{background:#f6f8fb}
  .dev-shell.light-theme .project-glyph,.dev-shell.light-theme .metric-symbol.blue,
  .dev-shell.light-theme .metric-symbol.violet,.dev-shell.light-theme .assistant-orb,
  .dev-shell.light-theme .doc-icon,.dev-shell.light-theme .integration-big-icon{
    background:#e9eef9!important;color:#526fca!important;
  }
  .dev-shell.light-theme .metric-symbol.green,.dev-shell.light-theme .integration-logo,
  .dev-shell.light-theme .integration-state,.dev-shell.light-theme .github-list>header>span,
  .dev-shell.light-theme .github-setup-empty>span{
    background:#e5f4ec!important;color:#248456!important;border-color:#cde8d8!important;
  }
  .dev-shell.light-theme .metric-symbol.coral{background:#fff0e8!important;color:#c06e37!important}
  .dev-shell.light-theme .suggestion-grid button{background:#f7f9fc!important;border-color:#e1e7ef!important;color:#50637e!important}
  .dev-shell.light-theme .suggestion-grid button:hover{background:#edf2f8!important;border-color:#d3ddea!important}
  .dev-shell.light-theme .suggestion-grid strong,.dev-shell.light-theme .document-row strong{color:#29374c!important}
  .dev-shell.light-theme .suggestion-grid small{color:#758197!important}
  .dev-shell.light-theme .assistant-composer,.dev-shell.light-theme .assistant-response,
  .dev-shell.light-theme .overview-facts,.dev-shell.light-theme .github-toolbar,
  .dev-shell.light-theme .github-list,.dev-shell.light-theme .github-stats article,
  .dev-shell.light-theme .github-setup-empty>span,.dev-shell.light-theme .security-banner{
    background:#f6f8fb!important;border-color:#e1e7ef!important;color:#34435a!important;
  }
  .dev-shell.light-theme .overview-summary h3,.dev-shell.light-theme .github-heading h2,
  .dev-shell.light-theme .github-list>header h3,.dev-shell.light-theme .github-stats article strong,
  .dev-shell.light-theme .github-loading strong,.dev-shell.light-theme .github-setup-empty h3,
  .dev-shell.light-theme .integration-detail h2,.dev-shell.light-theme .assistant-response>strong{color:#243249!important}
  .dev-shell.light-theme .overview-summary p,.dev-shell.light-theme .overview-facts small,
  .dev-shell.light-theme .repository-form>p,.dev-shell.light-theme .github-heading p,
  .dev-shell.light-theme .github-list>header p,.dev-shell.light-theme .github-stats article span,
  .dev-shell.light-theme .github-item-main>span:nth-child(2),.dev-shell.light-theme .github-comments,
  .dev-shell.light-theme .github-note,.dev-shell.light-theme .github-loading p,
  .dev-shell.light-theme .github-setup-empty p,.dev-shell.light-theme .integration-detail-copy>p,
  .dev-shell.light-theme .security-banner p{color:#6d7a8e!important}
  .dev-shell.light-theme .overview-facts strong,.dev-shell.light-theme .github-item-main>strong{color:#2b3950!important}
  .dev-shell.light-theme .repository-form>label,.dev-shell.light-theme .github-toolbar label{color:#45536b!important}
  .dev-shell.light-theme .repo-feedback.success{background:#e8f5ed!important;color:#267b4e!important;border-color:#c7e6d3!important}
  .dev-shell.light-theme .repo-feedback.error,.dev-shell.light-theme .github-alert{background:#fff0ee!important;color:#a84d45!important;border-color:#f0cfcb!important}
  .dev-shell.light-theme .github-repo-link{background:#f5f8fc;border-color:#dce4ed;color:#36734e}
  .dev-shell.light-theme .github-item{border-bottom-color:#e8edf2}
  .dev-shell.light-theme .github-item:hover{background:#f0f4f8}
  .dev-shell.light-theme .github-labels i{color:#44536a}
  .dev-shell.light-theme .integration-state.muted{background:#f3f0df!important;color:#786a31!important}
  .dev-shell.light-theme .security-banner{background:#f1f6ef!important;color:#456244!important}
  .dev-shell.light-theme .overview-project-select,.dev-shell.light-theme .github-toolbar label{color:#56647a}
  .dev-shell.light-theme .table-wrap .status{color:#53647a}
  .dev-shell.light-theme .trend-good{color:#26855b!important}
  .dev-shell.light-theme .trend-warn,.dev-shell.light-theme .danger-number{color:#bc5b56!important}
  .dev-shell.light-theme .messenger-shell{
    background:rgba(255,255,255,.86)!important;border:1px solid #e0e6ee;
    box-shadow:0 16px 42px rgba(36,54,77,.065),inset 0 1px #fff;
  }
  .dev-shell.light-theme .messenger-inbox,.dev-shell.light-theme .messenger-thread,
  .dev-shell.light-theme .inbox-list,.dev-shell.light-theme .chat-history{background-color:#fbfcfe!important}
  .dev-shell.light-theme .messenger-inbox{border-right-color:#e3e8ef}
  .dev-shell.light-theme .inbox-contact{color:#35445e}
  .dev-shell.light-theme .inbox-contact:hover{background:#f2f5f9}
  .dev-shell.light-theme .inbox-contact.active{background:linear-gradient(110deg,#edf3ff,#f8faff)!important;border-color:#dce6fb!important;box-shadow:inset 2px 0 #6681d0}
  .dev-shell.light-theme .inbox-heading h3,.dev-shell.light-theme .contact-topline strong,
  .dev-shell.light-theme .chat-recipient strong{color:#27364d}
  .dev-shell.light-theme .contact-project,.dev-shell.light-theme .contact-snippet,
  .dev-shell.light-theme .contact-topline time,.dev-shell.light-theme .chat-recipient span,
  .dev-shell.light-theme .bubble-author,.dev-shell.light-theme .chat-bubble time{color:#748197}
  .dev-shell.light-theme .chat-header,.dev-shell.light-theme .chat-composer{background:#fbfcfe!important;border-color:#e3e8ef}
  .dev-shell.light-theme .chat-bubble{background:#f0f3f7!important;border-color:#e0e6ed;color:#35445e}
  .dev-shell.light-theme .chat-bubble.sent{background:#e7efff!important;border-color:#d4e0fb;color:#2a3c60}
  .dev-shell.light-theme .inbox-count{background:#edf2f9;color:#587098;border-color:#dfe6ef}
  .dev-shell.light-theme .message-project-button,.dev-shell.light-theme .secondary-action{
    background:#f3f6fa!important;border-color:#dce4ed!important;color:#4c6077!important;
  }
  .dev-shell.light-theme .message-project-button:hover{background:#e8eef6!important}
  .dev-shell.light-theme .search-field,.dev-shell.light-theme .inbox-search,
  .dev-shell.light-theme .stage-form select,.dev-shell.light-theme .overview-project-select select,
  .dev-shell.light-theme .github-toolbar select,.dev-shell.light-theme .repository-input-row input,
  .dev-shell.light-theme .assistant-composer textarea,.dev-shell.light-theme .search-field input,
  .dev-shell.light-theme input,.dev-shell.light-theme textarea,.dev-shell.light-theme select{
    color:#2a374c!important;background-color:#fff!important;border-color:#dce3eb!important;
  }
  .dev-shell.light-theme .search-field:focus-within,.dev-shell.light-theme .inbox-search:focus-within,
  .dev-shell.light-theme .repository-input-row input:focus,.dev-shell.light-theme .assistant-composer:focus-within{
    border-color:#8dbca2!important;box-shadow:0 0 0 3px rgba(36,132,86,.1)!important;
  }
  .dev-shell.light-theme input::placeholder,.dev-shell.light-theme textarea::placeholder{color:#929dae!important}
  .dev-shell.light-theme .theme-toggle{color:#4c5d76!important;background:rgba(255,255,255,.68)!important;border-color:rgba(255,255,255,.9)!important}
  .dev-shell.light-theme .page-footer{border-color:#dce3ec!important}
  .dev-shell:not(.light-theme)>.sidebar{
    position:sticky;isolation:isolate;overflow:hidden;
    background:linear-gradient(155deg,rgba(18,34,27,.84),rgba(8,20,14,.82) 50%,rgba(10,26,18,.9))!important;
    border-right-color:rgba(189,226,203,.12)!important;
    box-shadow:14px 0 48px rgba(0,0,0,.18),inset -1px 0 rgba(255,255,255,.08)!important;
    backdrop-filter:blur(34px) saturate(165%);-webkit-backdrop-filter:blur(34px) saturate(165%);
  }
  .dev-shell:not(.light-theme)>.sidebar::before{
    position:absolute;z-index:-1;inset:0;pointer-events:none;content:"";
    background:radial-gradient(ellipse at 10% 0%,rgba(214,255,228,.11),transparent 31%),
      linear-gradient(112deg,rgba(255,255,255,.055),transparent 35%,rgba(105,220,157,.035) 72%,transparent);
  }
  .dev-shell>.sidebar>.sidebar-brand-row,.dev-shell>.sidebar>.workspace-switch,
  .dev-shell>.sidebar>.sidebar-navigation,.dev-shell>.sidebar>.sidebar-bottom{position:relative;z-index:1}
  .dev-shell:not(.light-theme) .workspace-switch,.dev-shell:not(.light-theme) .system-status{
    border-color:rgba(188,229,202,.16)!important;
    background:linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.025))!important;
    box-shadow:0 12px 30px rgba(0,0,0,.18),inset 0 1px rgba(255,255,255,.15),inset 0 -1px rgba(0,0,0,.08)!important;
    backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);
  }
  .dev-shell:not(.light-theme) .nav-item:hover{
    background:linear-gradient(105deg,rgba(255,255,255,.09),rgba(255,255,255,.025))!important;
    border-color:rgba(255,255,255,.1)!important;box-shadow:inset 0 1px rgba(255,255,255,.08);
  }
  .dev-shell:not(.light-theme) .nav-item.active{
    background:linear-gradient(105deg,rgba(110,147,255,.27),rgba(84,116,190,.12) 70%,rgba(255,255,255,.035))!important;
    border-color:rgba(179,199,255,.17)!important;
    box-shadow:inset 2px 0 #a9bcff,0 9px 26px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.12)!important;
    backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);
  }
  .dev-shell .nav-item{
    position:relative;isolation:isolate;overflow:hidden;
    transition:transform .24s cubic-bezier(.2,.8,.2,1),background .24s ease,border-color .24s ease,box-shadow .24s ease,color .2s ease;
  }
  .dev-shell .nav-item::before{
    position:absolute;z-index:-1;inset:0;content:"";
    background:linear-gradient(105deg,transparent 12%,rgba(255,255,255,.13) 48%,transparent 82%);
    transform:translateX(-125%);transition:transform .58s cubic-bezier(.2,.8,.2,1);
  }
  .dev-shell .nav-item>*{position:relative;z-index:1}
  .dev-shell .nav-item:hover::before,.dev-shell .nav-item:focus-visible::before{transform:translateX(125%)}
  .dev-shell .nav-item:hover{transform:translateX(3px)}
  .dev-shell .nav-item:active{transform:translateX(1px) scale(.985)}
  .dev-shell .nav-icon{transition:transform .24s cubic-bezier(.2,.8,.2,1),color .2s ease}
  .dev-shell .nav-item:hover .nav-icon{transform:scale(1.12)}
  .dev-shell .nav-item.active .nav-icon{transform:scale(1.04)}
  .dev-shell .nav-item:focus-visible{outline:2px solid rgba(114,151,255,.78);outline-offset:2px}
  .dev-shell.light-theme .nav-item::before{
    background:linear-gradient(105deg,transparent 12%,rgba(255,255,255,.86) 48%,transparent 82%);
  }
  .dev-shell.light-theme .nav-item:hover{box-shadow:0 8px 22px rgba(48,68,98,.09),inset 0 1px rgba(255,255,255,.95)}
  .dev-shell.light-theme .nav-item:focus-visible{outline-color:rgba(77,112,190,.68)}

  .dev-shell.light-theme .project-overview-panel,
  .dev-shell.light-theme .full-panel{
    background:linear-gradient(145deg,#fff,#f9fbfd)!important;
    border-color:#e0e6ed!important;
    box-shadow:0 16px 42px rgba(36,54,77,.065),inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .project-overview-panel .panel-heading h2,
  .dev-shell.light-theme .full-panel .panel-heading h2{color:#202d41!important}
  .dev-shell.light-theme .project-overview-panel .panel-heading p,
  .dev-shell.light-theme .full-panel .panel-heading p{color:#6c788c!important}
  .dev-shell.light-theme .overview-content{color:#26364b}
  .dev-shell.light-theme .overview-summary h3{color:#243249!important}
  .dev-shell.light-theme .overview-summary p,.dev-shell.light-theme .overview-facts small,
  .dev-shell.light-theme .repository-form>p{color:#6d7a8e!important}
  .dev-shell.light-theme .overview-facts{
    background:linear-gradient(145deg,#f7f9fc,#f1f4f8)!important;
    border-color:#e0e6ed!important;
    box-shadow:inset 0 1px #fff;
  }
  .dev-shell.light-theme .overview-facts>div{border-color:#e6ebf1}
  .dev-shell.light-theme .overview-facts strong{color:#2b3950!important}
  .dev-shell.light-theme .overview-project-select{color:#56647a!important}
  .dev-shell.light-theme .overview-project-select select,
  .dev-shell.light-theme .github-toolbar select{
    background-color:#fff!important;color:#2a374c!important;border-color:#dce3eb!important;
  }
  .dev-shell.light-theme .repository-form>label,
  .dev-shell.light-theme .github-toolbar label{color:#45536b!important}
  .dev-shell.light-theme .repository-input-row input{
    background:#fff!important;color:#2a374c!important;border-color:#dce3eb!important;
  }
  .dev-shell.light-theme .repository-input-row input::placeholder{color:#929dae!important}
  .dev-shell.light-theme .project-actions .message-project-button{
    color:#36516b!important;background:linear-gradient(145deg,#fff,#f2f6f9)!important;
    border-color:#d8e2e9!important;box-shadow:0 3px 10px rgba(39,60,80,.045),inset 0 1px #fff;
    transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease;
  }
  .dev-shell.light-theme .project-actions .message-project-button:hover{
    transform:translateY(-1px);background:#eaf2ee!important;border-color:#c7dfd0!important;
    box-shadow:0 7px 16px rgba(39,93,63,.1),inset 0 1px #fff;
  }
  .dev-shell.light-theme .project-actions .message-project-button:active{transform:translateY(0) scale(.98)}
  .dev-shell.light-theme .table-wrap{background:transparent!important;border-color:#e4e9ef!important}
  .dev-shell.light-theme .table-wrap table{background:transparent!important}
  .dev-shell.light-theme .table-wrap table th{background:#f6f8fb!important;color:#748197!important;border-bottom-color:#e2e8ee!important}
  .dev-shell.light-theme .table-wrap table td{background:transparent!important;color:#56647a!important;border-bottom-color:#e9edf2!important}
  .dev-shell.light-theme .table-wrap table tr:hover td{background:#f7f9fb!important}
  .dev-shell.light-theme .project-cell strong,.dev-shell.light-theme .owner-cell strong{color:#29374c!important}
  .dev-shell.light-theme .project-cell small,.dev-shell.light-theme .owner-cell small{color:#758197!important}
  .dev-shell.light-theme .project-glyph{background:#eaf0f8!important;color:#526a95!important;border-color:#dce5f0!important}
  .dev-shell.light-theme .table-progress>div{background:#e6ebf1!important}
  .dev-shell.light-theme .table-progress>span{color:#53627a!important}
  .dev-shell.light-theme .status-in_progress{background:#e9efff!important;color:#526ab5!important}
  .dev-shell.light-theme .status-review{background:#f1eafe!important;color:#7959ad!important}
  .dev-shell.light-theme .status-planning{background:#e5f4ef!important;color:#347b67!important}
  .dev-shell.light-theme .status-complete{background:#f7f1df!important;color:#806b32!important}
  .dev-shell.light-theme .status-paused{background:#fbeaed!important;color:#a95566!important}
  .dev-shell.light-theme .stage-form select{
    background:#fff!important;color:#43516a!important;border-color:#dce3eb!important;
  }
  .dev-shell.light-theme .stage-form select:focus-visible{outline-color:#468d67}
  .dev-shell.light-theme .empty-state,.dev-shell.light-theme .table-empty{
    background:#f8fafc!important;color:#647188!important;border-color:#e0e6ed!important;
  }
  .dev-shell.light-theme .empty-state strong{color:#2b3950!important}

  .dev-shell.light-theme .messages-page{
    background:linear-gradient(145deg,#fff,#f9fbfd)!important;border-color:#e0e6ed!important;
  }
  .dev-shell.light-theme .messages-page>.panel-heading{
    background:linear-gradient(145deg,#fff,#fbfcfe)!important;border-bottom-color:#e4e9ef!important;
  }
  .dev-shell.light-theme .messages-page>.panel-heading h2{color:#202d41!important}
  .dev-shell.light-theme .messages-page>.panel-heading p{color:#6d7a8e!important}
  .dev-shell.light-theme .messages-page .subtle-pill{
    background:#f2f7f4!important;border-color:#dbe9e0!important;color:#3b7856!important;
  }
  .dev-shell.light-theme .messenger-shell{background:#f7f9fb!important;border-color:#e0e6ed!important}
  .dev-shell.light-theme .messenger-inbox{background:#f7f9fb!important;border-right-color:#e3e8ef!important}
  .dev-shell.light-theme .inbox-heading{border-bottom-color:#e5eaf0}
  .dev-shell.light-theme .inbox-heading h3{color:#26354b!important}
  .dev-shell.light-theme .composer-kicker{color:#78869a!important}
  .dev-shell.light-theme .inbox-count{
    background:#edf2f8!important;border-color:#dfe6ef!important;color:#587098!important;
  }
  .dev-shell.light-theme .inbox-search{
    background:#fff!important;border-color:#dfe5ec!important;color:#8591a1!important;
    box-shadow:inset 0 1px 2px rgba(38,54,70,.025);
  }
  .dev-shell.light-theme .inbox-search input{
    background:transparent!important;color:#29374c!important;border:0!important;
  }
  .dev-shell.light-theme .inbox-search input::placeholder{color:#929dae!important}
  .dev-shell.light-theme .inbox-list{background:#f7f9fb!important;scrollbar-color:#d0d9e3 transparent}
  .dev-shell.light-theme .inbox-contact{background:transparent!important;border-color:transparent!important;color:#35445e!important}
  .dev-shell.light-theme .inbox-contact:hover{
    background:linear-gradient(100deg,#fff,#f4f7fa)!important;border-color:#e4eaf0!important;
  }
  .dev-shell.light-theme .inbox-contact.active{
    background:linear-gradient(105deg,#edf3ff,#f9fbff)!important;border-color:#dce6fb!important;
    box-shadow:inset 2px 0 #6681d0,0 5px 16px rgba(55,79,122,.06)!important;
  }
  .dev-shell.light-theme .contact-avatar{
    background:linear-gradient(145deg,#fff,#eaf1f7)!important;border-color:#dfe7ed!important;color:#52718d!important;
  }
  .dev-shell.light-theme .contact-topline strong{color:#28374d!important}
  .dev-shell.light-theme .contact-topline time,.dev-shell.light-theme .contact-project,
  .dev-shell.light-theme .contact-snippet{color:#77849a!important}
  .dev-shell.light-theme .messenger-thread{
    background:radial-gradient(ellipse at 55% 38%,rgba(44,145,94,.035),transparent 60%),#fbfcfd!important;
  }
  .dev-shell.light-theme .chat-header{
    background:rgba(255,255,255,.88)!important;border-bottom-color:#e3e8ef!important;
  }
  .dev-shell.light-theme .chat-recipient strong{color:#27364d!important}
  .dev-shell.light-theme .chat-recipient span{color:#78859a!important}
  .dev-shell.light-theme .chat-presence{color:#758297!important}
  .dev-shell.light-theme .chat-presence i{background:#38a876}
  .dev-shell.light-theme .chat-history{
    background-color:#fbfcfd!important;background-image:radial-gradient(#8d9ca912 .7px,transparent .7px)!important;
  }
  .dev-shell.light-theme .chat-day-label{color:#748197!important;border-color:#e4e9ef!important}
  .dev-shell.light-theme .chat-day-label span{
    background:#f0f3f7!important;border-color:#e1e7ed!important;color:#748197!important;
  }
  .dev-shell.light-theme .chat-bubble{
    background:linear-gradient(145deg,#fff,#f5f7fa)!important;border-color:#e1e7ed!important;
    color:#34435a!important;box-shadow:0 5px 16px rgba(32,51,74,.055)!important;
  }
  .dev-shell.light-theme .chat-bubble.sent{
    background:linear-gradient(145deg,#eaf1ff,#e3ecfc)!important;border-color:#d3e0f6!important;color:#293b5e!important;
  }
  .dev-shell.light-theme .bubble-author,.dev-shell.light-theme .chat-bubble time{color:#78859a!important}
  .dev-shell.light-theme .chat-welcome strong{color:#29374c!important}
  .dev-shell.light-theme .chat-welcome p,.dev-shell.light-theme .inbox-empty{color:#78859a!important}
  .dev-shell.light-theme .messenger-no-selection{
    background:#fbfcfd!important;color:#29374c!important;
  }
  .dev-shell.light-theme .messenger-no-selection strong{color:#29374c!important}
  .dev-shell.light-theme .messenger-no-selection p{color:#78859a!important}
  .dev-shell.light-theme .welcome-avatar{background:#e8eff8!important;color:#506b94!important}
  .dev-shell.light-theme .chat-composer{
    background:rgba(255,255,255,.88)!important;border-color:#e0e6ed!important;
    box-shadow:0 8px 25px rgba(36,54,77,.07),inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .chat-composer textarea{
    background:transparent!important;border:0!important;color:#29374c!important;
  }
  .dev-shell.light-theme .chat-composer textarea::placeholder{color:#929dae!important}
  .dev-shell.light-theme .chat-compose-footer{color:#758197!important;border-top-color:#e7ebf0!important}
  .dev-shell.light-theme .message-alert.success{background:#e9f6ee!important;border-color:#cce8d6!important;color:#28794d!important}
  .dev-shell.light-theme .message-alert.error{background:#fff0ee!important;border-color:#f0cfcb!important;color:#a84d45!important}
  @media(prefers-reduced-motion:reduce){
    .dev-shell .nav-item,.dev-shell .nav-item::before,.dev-shell .nav-icon,
    .dev-shell .project-actions .message-project-button{transition:none!important}
  }
  @media(prefers-reduced-transparency:reduce){
    .dev-shell.light-theme .sidebar,.dev-shell.light-theme .topbar,.dev-shell.light-theme .workspace-switch,
    .dev-shell.light-theme .system-status,.dev-shell.light-theme .nav-item.active{backdrop-filter:none;-webkit-backdrop-filter:none}
  }
  @media(max-width:800px){.dev-shell>.sidebar{padding-inline:8px}.dev-shell .workspace-switch{margin-inline:0}}
  @media(prefers-reduced-motion:reduce){.dev-shell .nav-item,.dev-shell .workspace-switch,.dev-shell .profile-mini,.dev-shell .client-link,.dev-shell .primary-button,.dev-shell .outline-button{transition:none!important}}
  .dev-shell>.sidebar{
    box-sizing:border-box;width:264px;flex:0 0 264px;min-width:0;
    padding:18px 13px 14px;gap:0;
    transition:width .28s cubic-bezier(.2,.8,.2,1),flex-basis .28s cubic-bezier(.2,.8,.2,1),padding .28s ease;
  }
  .dev-shell>.sidebar.collapsed{width:82px;flex-basis:82px;padding:18px 10px 14px}
  .dev-shell .sidebar-brand-row{display:flex;align-items:center;gap:8px;min-height:48px;margin:0 0 22px}
  .dev-shell .brand{flex:1;min-width:0;gap:10px;padding:0 4px 0 7px;overflow:hidden}
  .dev-shell .brand-logo{width:31px;height:31px;flex:0 0 31px;object-fit:contain}
  .dev-shell .brand-copy{white-space:nowrap}
  .dev-shell .sidebar-toggle{
    display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;
    padding:0;border:1px solid rgba(147,164,194,.22);border-radius:11px;
    background:rgba(255,255,255,.045);color:#a9b6cd;
    transition:background .2s ease,border-color .2s ease,color .2s ease,transform .2s ease;
  }
  .dev-shell .sidebar-toggle svg{width:17px;height:17px}
  .dev-shell .sidebar-toggle:hover{background:rgba(130,158,220,.13);border-color:rgba(150,174,227,.4);color:#eaf0ff;transform:translateY(-1px)}
  .dev-shell .sidebar-toggle:focus-visible{outline:2px solid #829eff;outline-offset:2px}
  .dev-shell .workspace-switch{
    box-sizing:border-box;min-width:0;min-height:58px;margin:0 0 20px;padding:9px;
    border-radius:13px;gap:10px;transition:padding .2s ease,background .2s ease;
  }
  .dev-shell .workspace-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px}
  .dev-shell .workspace-icon img{width:20px;height:20px;object-fit:contain}
  .dev-shell .switch-chevron{display:grid;place-items:center}
  .dev-shell .switch-chevron svg{width:15px;height:15px}
  .dev-shell .sidebar-navigation{display:flex;flex-direction:column;gap:4px;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(136,155,188,.3) transparent}
  .dev-shell .sidebar-navigation .nav-label{
    padding:0 11px;margin:16px 0 4px;font-size:9px;font-weight:700;
    letter-spacing:1.35px;text-transform:uppercase;white-space:nowrap;
  }
  .dev-shell .sidebar-navigation .nav-label:first-child{margin-top:0}
  .dev-shell .nav-item{
    box-sizing:border-box;width:100%;height:46px;flex:0 0 46px;
    display:flex;align-items:center;gap:11px;padding:0 8px;border-radius:12px;
    font-size:12px;font-weight:550;text-align:left;
  }
  .dev-shell .nav-icon{
    width:34px;height:34px;flex:0 0 34px;border-radius:10px;
    display:grid;place-items:center;background:rgba(139,158,193,.08);color:#9aa9c4;
  }
  .dev-shell .nav-icon svg{width:19px;height:19px}
  .dev-shell .nav-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dev-shell .nav-count{margin-left:auto}
  .dev-shell .sidebar-bottom{margin-top:auto;padding-top:14px}
  .dev-shell .system-status{box-sizing:border-box;min-height:54px;padding:10px;border-radius:12px}
  .dev-shell .profile-mini{min-width:0;gap:10px;padding:12px 5px}
  .dev-shell .avatar{width:34px;height:34px;flex:0 0 34px}
  .dev-shell .profile-name{overflow:hidden}
  .dev-shell .client-link{display:flex;align-items:center;gap:9px;min-height:38px;padding:9px 8px;border-radius:10px}
  .dev-shell .client-link svg{width:16px;height:16px;flex:0 0 16px}
  .dev-shell>.sidebar.collapsed .sidebar-brand-row{flex-direction:column;gap:13px;margin-bottom:22px}
  .dev-shell>.sidebar.collapsed .brand{flex:none;width:100%;justify-content:center;padding:0}
  .dev-shell>.sidebar.collapsed .brand-copy,
  .dev-shell>.sidebar.collapsed .workspace-name,
  .dev-shell>.sidebar.collapsed .switch-chevron,
  .dev-shell>.sidebar.collapsed .nav-label,
  .dev-shell>.sidebar.collapsed .nav-text,
  .dev-shell>.sidebar.collapsed .profile-name,
  .dev-shell>.sidebar.collapsed .profile-menu,
  .dev-shell>.sidebar.collapsed .system-status span:nth-child(2),
  .dev-shell>.sidebar.collapsed .system-status .status-dot,
  .dev-shell>.sidebar.collapsed .client-link span{display:none}
  .dev-shell>.sidebar.collapsed .sidebar-toggle{width:36px;height:36px;flex-basis:36px}
  .dev-shell>.sidebar.collapsed .workspace-switch{justify-content:center;margin-inline:0;padding:8px}
  .dev-shell>.sidebar.collapsed .nav-item{justify-content:center;padding:0}
  .dev-shell>.sidebar.collapsed .nav-count{position:absolute;top:2px;right:2px;min-width:15px;margin:0;padding:1px 4px;font-size:9px}
  .dev-shell>.sidebar.collapsed .nav-icon{width:40px;height:40px;flex-basis:40px;border-radius:12px}
  .dev-shell>.sidebar.collapsed .system-status{min-height:42px;justify-content:center;padding:0;border-color:transparent;background:transparent;box-shadow:none}
  .dev-shell>.sidebar.collapsed .pulse{width:9px;height:9px}
  .dev-shell>.sidebar.collapsed .profile-mini{justify-content:center;padding:10px 0}
  .dev-shell>.sidebar.collapsed .client-link{justify-content:center;padding:10px 0}
  .dev-shell.light-theme>.sidebar{
    background:linear-gradient(160deg,rgba(255,255,255,.94),rgba(246,249,252,.9) 58%,rgba(239,244,249,.94))!important;
    border-right:1px solid rgba(203,214,227,.72)!important;
    box-shadow:8px 0 30px rgba(38,55,78,.055),inset -1px 0 rgba(255,255,255,.95)!important;
    backdrop-filter:blur(28px) saturate(155%);-webkit-backdrop-filter:blur(28px) saturate(155%);
  }
  .dev-shell.light-theme .sidebar-toggle{background:rgba(255,255,255,.72);border-color:#dfe6ef;color:#65748c}
  .dev-shell.light-theme .sidebar-toggle:hover{background:#fff;border-color:#bdcce1;color:#425c91;box-shadow:0 5px 15px rgba(46,68,101,.1)}
  .dev-shell.light-theme .nav-icon{background:#f0f3f8;color:#71809a}
  .dev-shell.light-theme .nav-item.active .nav-icon{background:#e7edfb;color:#526fca!important}
  .dev-shell.light-theme .nav-item.active{box-shadow:inset 3px 0 #6884d4,0 5px 16px rgba(62,86,130,.075)!important}
  .dev-shell.light-theme .nav-item:hover .nav-icon{background:#fff;color:#526fca}
  .dev-shell.light-theme .assistant-header .subtle-pill{
    background:#eef4f0!important;border:1px solid #dce9df!important;color:#4d735b!important;
    box-shadow:none!important;
  }
  .dev-shell>.sidebar{
    --menu-accent:#00c982;--menu-accent-bright:#32e3a0;
    background:linear-gradient(165deg,#101a22 0%,#0c151c 54%,#0a1218 100%)!important;
    border-right:1px solid rgba(140,178,160,.15)!important;
    box-shadow:10px 0 36px rgba(1,12,9,.22),inset -1px 0 rgba(255,255,255,.035)!important;
    backdrop-filter:none;-webkit-backdrop-filter:none;
  }
  .dev-shell>.sidebar::before{
    position:absolute;z-index:0;inset:0;pointer-events:none;content:"";
    background:radial-gradient(ellipse at 0 0,rgba(0,201,130,.09),transparent 38%);
  }
  .dev-shell .sidebar-brand-row{position:relative;z-index:1}
  .dev-shell .brand-logo{filter:drop-shadow(0 0 12px rgba(0,201,130,.2))}
  .dev-shell .brand-copy strong{letter-spacing:2px}
  .dev-shell .brand-copy small{color:#859a91}
  .dev-shell .sidebar-toggle{
    border-color:rgba(153,184,169,.18);border-radius:12px;
    background:rgba(232,246,238,.045);color:#a2b7ac;
  }
  .dev-shell .sidebar-toggle:hover{
    border-color:rgba(50,227,160,.42);background:rgba(0,201,130,.12);
    color:#caffea;box-shadow:0 5px 18px rgba(0,201,130,.1);
  }
  .dev-shell .workspace-switch{
    border-color:rgba(145,181,160,.17)!important;
    background:linear-gradient(130deg,rgba(0,201,130,.095),rgba(255,255,255,.035) 72%)!important;
    box-shadow:inset 0 1px rgba(255,255,255,.055),0 8px 22px rgba(0,0,0,.12)!important;
  }
  .dev-shell .workspace-switch:hover{border-color:rgba(50,227,160,.3)!important}
  .dev-shell .workspace-icon{
    background:rgba(0,201,130,.12)!important;border:1px solid rgba(50,227,160,.16)!important;
  }
  .dev-shell .workspace-name strong{color:#e1eee7}
  .dev-shell .workspace-name small,.dev-shell .switch-chevron{color:#91a69b}
  .dev-shell .sidebar-navigation .nav-label{
    color:#7e9589!important;letter-spacing:1.55px;
  }
  .dev-shell .sidebar-navigation .nav-label:not(:first-child){border-top:1px solid rgba(158,184,169,.1);padding-top:15px}
  .dev-shell .nav-item{
    position:relative;border:1px solid transparent!important;border-radius:12px;
    color:#a8b8af!important;background:transparent!important;
    transition:background .2s ease,border-color .2s ease,color .2s ease,transform .2s ease,box-shadow .2s ease;
  }
  .dev-shell .nav-item::before{display:none}
  .dev-shell .nav-icon{
    background:rgba(182,211,193,.075)!important;color:#9aafa3!important;
    transition:background .2s ease,color .2s ease,transform .2s ease;
  }
  .dev-shell .nav-icon svg{width:18px;height:18px;stroke-width:1.75}
  .dev-shell .nav-item:hover{
    transform:translateX(2px);border-color:rgba(147,182,160,.13)!important;
    background:rgba(235,249,240,.055)!important;color:#edf8f1!important;
    box-shadow:none!important;
  }
  .dev-shell .nav-item:hover .nav-icon{background:rgba(0,201,130,.14)!important;color:#55e8ae!important;transform:none}
  .dev-shell .nav-item.active{
    border-color:rgba(50,227,160,.19)!important;
    background:linear-gradient(100deg,rgba(0,201,130,.19),rgba(0,201,130,.085))!important;
    color:#d9ffed!important;
    box-shadow:inset 3px 0 #20d895,0 5px 16px rgba(0,0,0,.1)!important;
  }
  .dev-shell .nav-item.active .nav-icon{
    background:rgba(0,201,130,.19)!important;color:#55e8ae!important;transform:none;
  }
  .dev-shell .nav-count{
    border:1px solid rgba(50,227,160,.22);border-radius:7px;
    background:rgba(0,201,130,.15)!important;color:#8df2c5!important;
    padding:2px 7px;font-weight:650;
  }
  .dev-shell .system-status{
    border-color:rgba(145,181,160,.17)!important;
    background:rgba(233,247,238,.035)!important;
    box-shadow:inset 0 1px rgba(255,255,255,.045)!important;
  }
  .dev-shell .pulse,.dev-shell .status-dot{background:#21d994!important}
  .dev-shell .system-status strong{color:#dcebe2}
  .dev-shell .system-status small{color:#879a90}
  .dev-shell .profile-mini{border-top-color:rgba(145,181,160,.15)!important}
  .dev-shell .avatar{border-color:rgba(50,227,160,.38)!important;background:rgba(0,201,130,.12)!important;color:#91f0c4!important}
  .dev-shell .profile-name strong{color:#dcebe2}
  .dev-shell .profile-name small,.dev-shell .profile-menu{color:#8da197}
  .dev-shell .client-link{color:#91a89a!important}
  .dev-shell .client-link:hover{background:rgba(0,201,130,.09)!important;color:#bdffdd!important}
  .dev-shell.light-theme>.sidebar{
    --menu-accent:#079b67;--menu-accent-bright:#087f59;
    background:linear-gradient(165deg,#f7faf8 0%,#f0f6f2 54%,#eaf2ed 100%)!important;
    border-right:1px solid #d8e5dd!important;
    box-shadow:8px 0 28px rgba(38,72,52,.055),inset -1px 0 rgba(255,255,255,.9)!important;
  }
  .dev-shell.light-theme>.sidebar::before{
    background:radial-gradient(ellipse at 0 0,rgba(0,201,130,.085),transparent 40%);
  }
  .dev-shell.light-theme .brand-copy small{color:#73877b!important}
  .dev-shell.light-theme .sidebar-toggle{border-color:#d6e2da;background:#fff9;color:#536c5d}
  .dev-shell.light-theme .sidebar-toggle:hover{border-color:#9bd5b8;background:#e9f7ef;color:#087f59;box-shadow:0 5px 15px rgba(33,110,70,.1)}
  .dev-shell.light-theme .workspace-switch{
    border-color:#dce8e0!important;
    background:linear-gradient(130deg,rgba(226,246,235,.88),rgba(255,255,255,.84) 76%)!important;
    box-shadow:0 5px 16px rgba(44,82,58,.045),inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .workspace-switch:hover{border-color:#b6ddc7!important}
  .dev-shell.light-theme .workspace-icon{background:#e2f3e9!important;border-color:#d0e9da!important}
  .dev-shell.light-theme .workspace-name strong{color:#263b30!important}
  .dev-shell.light-theme .workspace-name small,.dev-shell.light-theme .switch-chevron{color:#74887c!important}
  .dev-shell.light-theme .sidebar-navigation .nav-label{color:#75877c!important}
  .dev-shell.light-theme .sidebar-navigation .nav-label:not(:first-child){border-color:#dce7df}
  .dev-shell.light-theme .nav-item{color:#52675a!important}
  .dev-shell.light-theme .nav-icon{background:#e9efeb!important;color:#74887c!important}
  .dev-shell.light-theme .nav-item:hover{
    border-color:#dce9e0!important;background:rgba(255,255,255,.8)!important;
    color:#244a36!important;box-shadow:0 4px 12px rgba(43,84,58,.05)!important;
  }
  .dev-shell.light-theme .nav-item:hover .nav-icon{background:#e1f3e8!important;color:#078354!important}
  .dev-shell.light-theme .nav-item.active{
    border-color:#c6e8d4!important;
    background:linear-gradient(100deg,#e2f5e9,#f4fbf6)!important;
    color:#126b46!important;
    box-shadow:inset 3px 0 #079b67,0 5px 14px rgba(39,109,68,.07)!important;
  }
  .dev-shell.light-theme .nav-item.active .nav-icon{background:#d3efdf!important;color:#078354!important}
  .dev-shell.light-theme .nav-count{border-color:#bfe3ce;background:#e1f4e8!important;color:#19794f!important}
  .dev-shell.light-theme .system-status{
    border-color:#d7e7dc!important;background:rgba(255,255,255,.68)!important;
    box-shadow:inset 0 1px #fff!important;
  }
  .dev-shell.light-theme .system-status strong,.dev-shell.light-theme .profile-name strong{color:#30493a!important}
  .dev-shell.light-theme .system-status small,.dev-shell.light-theme .profile-name small,.dev-shell.light-theme .profile-menu{color:#788b7e!important}
  .dev-shell.light-theme .avatar{border-color:#b7dfc7!important;background:#e1f3e8!important;color:#26734d!important}
  .dev-shell.light-theme .profile-mini{border-top-color:#dce7df!important}
  .dev-shell.light-theme .client-link{color:#637a6b!important}
  .dev-shell.light-theme .client-link:hover{background:#e6f5eb!important;color:#087f59!important}
  .dev-shell>.sidebar{
    background:#101a17!important;border-right:1px solid #26352e!important;
    box-shadow:4px 0 18px rgba(8,26,17,.12)!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell>.sidebar::before{display:none!important}
  .dev-shell>.sidebar .sidebar-toggle,
  .dev-shell>.sidebar .workspace-switch,
  .dev-shell>.sidebar .nav-item,
  .dev-shell>.sidebar .nav-icon,
  .dev-shell>.sidebar .system-status{
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell .sidebar-toggle{
    background:#1b2922!important;border:1px solid #34483b!important;
    border-radius:10px!important;color:#b3c5b8!important;box-shadow:none!important;
  }
  .dev-shell .sidebar-toggle:hover{
    background:#244333!important;border-color:#397857!important;color:#c4f5d9!important;
    box-shadow:0 2px 6px rgba(0,0,0,.16)!important;transform:none!important;
  }
  .dev-shell .workspace-switch{
    background:#19251f!important;border:1px solid #2b3b31!important;
    border-radius:12px!important;box-shadow:none!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell .workspace-switch:hover{background:#1e3026!important;border-color:#3a6249!important}
  .dev-shell .workspace-icon{background:#21372a!important;border-color:#31543e!important}
  .dev-shell .nav-item{
    background:transparent!important;border-color:transparent!important;
    border-radius:10px!important;box-shadow:none!important;transform:none!important;
  }
  .dev-shell .nav-item::before{display:none!important}
  .dev-shell .nav-item:hover{
    background:#1c2b22!important;border-color:#2a4032!important;
    box-shadow:none!important;transform:none!important;
  }
  .dev-shell .nav-icon{background:#1c2922!important;border-radius:9px!important}
  .dev-shell .nav-item:hover .nav-icon{background:#263d2e!important}
  .dev-shell .nav-item.active{
    background:#20392a!important;border-color:#31533d!important;
    background-image:none!important;box-shadow:inset 3px 0 #12a66a!important;color:#d4f5e1!important;
  }
  .dev-shell .nav-item.active .nav-icon{background:#2b4d37!important;color:#67dda0!important}
  .dev-shell .nav-count{background:#284532!important;border-color:#3a6749!important;color:#b9ebc9!important}
  .dev-shell .system-status{
    background:#17231c!important;border-color:#2a3b30!important;box-shadow:none!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell:not(.light-theme) .workspace-switch{background:#19251f!important;background-image:none!important}
  .dev-shell:not(.light-theme) .system-status{background:#17231c!important;background-image:none!important}
  .dev-shell:not(.light-theme) .nav-item.active{
    background:#20392a!important;background-image:none!important;
    border-color:#31533d!important;box-shadow:inset 3px 0 #12a66a!important;
  }
  .dev-shell .profile-mini{border-top-color:#28372e!important}
  .dev-shell .avatar{background:#20382a!important;border-color:#356347!important;color:#b8edca!important;box-shadow:none!important}
  .dev-shell .client-link:hover{background:#1d3024!important}
  .dev-shell.light-theme>.sidebar{
    background:#f2f6f3!important;border-right:1px solid #d9e2dc!important;
    box-shadow:3px 0 14px rgba(34,71,47,.045)!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell.light-theme .sidebar-toggle{
    background:#fff!important;border-color:#d6e1d9!important;color:#607568!important;
    box-shadow:0 1px 2px rgba(24,54,34,.04)!important;
  }
  .dev-shell.light-theme .sidebar-toggle:hover{
    background:#e6f3ea!important;border-color:#a9d3b8!important;color:#087f59!important;
    box-shadow:0 2px 5px rgba(24,54,34,.07)!important;
  }
  .dev-shell.light-theme .workspace-switch{
    background:#fff!important;border-color:#d9e4dc!important;box-shadow:none!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell.light-theme .workspace-switch:hover{background:#f5faf6!important;border-color:#b7d8c2!important}
  .dev-shell.light-theme .workspace-icon{background:#e7f2ea!important;border-color:#d4e7da!important}
  .dev-shell.light-theme .nav-item:hover{
    background:#e9f1eb!important;border-color:#d9e5dc!important;box-shadow:none!important;
  }
  .dev-shell.light-theme .nav-icon{background:#e5ece7!important}
  .dev-shell.light-theme .nav-item:hover .nav-icon{background:#d8ebde!important}
  .dev-shell.light-theme .nav-item.active{
    background:#e0f0e5!important;border-color:#c9e2d1!important;
    background-image:none!important;box-shadow:inset 3px 0 #079b67!important;
  }
  .dev-shell.light-theme .nav-item.active .nav-icon{background:#d0e8d7!important}
  .dev-shell.light-theme .nav-count{background:#e1f1e5!important;border-color:#c8e2d0!important}
  .dev-shell.light-theme .system-status{
    background:#fff!important;border-color:#dbe5de!important;box-shadow:none!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  .dev-shell.light-theme .avatar{background:#e4f0e8!important;box-shadow:none!important}
  .dev-shell.light-theme .client-link:hover{background:#e5f0e8!important}
  @media(max-width:800px){
    .dev-shell>.sidebar:not(.collapsed){width:238px;flex-basis:238px;padding-inline:11px}
    .dev-shell>.sidebar.collapsed{width:72px;flex-basis:72px;padding-inline:8px}
    .dev-shell>.sidebar:not(.collapsed) .brand-copy,
    .dev-shell>.sidebar:not(.collapsed) .workspace-name,
    .dev-shell>.sidebar:not(.collapsed) .switch-chevron,
    .dev-shell>.sidebar:not(.collapsed) .sidebar-navigation .nav-label,
    .dev-shell>.sidebar:not(.collapsed) .profile-name,
    .dev-shell>.sidebar:not(.collapsed) .profile-menu,
    .dev-shell>.sidebar:not(.collapsed) .client-link{display:flex}
    .dev-shell>.sidebar:not(.collapsed) .sidebar-navigation .nav-label{display:block}
    .dev-shell>.sidebar:not(.collapsed) .nav-text,
    .dev-shell>.sidebar:not(.collapsed) .nav-count{display:block}
    .dev-shell>.sidebar:not(.collapsed) .system-status{display:flex}
    .dev-shell>.sidebar:not(.collapsed) .nav-item{justify-content:flex-start;padding-inline:8px}
  }
  @media(prefers-reduced-motion:reduce){
    .dev-shell>.sidebar,.dev-shell .sidebar-toggle,.dev-shell .workspace-switch{transition:none!important}
  }
</style>
