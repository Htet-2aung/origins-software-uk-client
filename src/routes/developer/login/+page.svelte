<script lang="ts">
  import { onMount } from 'svelte';
  export let form;
  let theme = 'dark';
  let busy = false;

  onMount(() => {
    const saved = localStorage.getItem('origins-portal-theme')
      ?? localStorage.getItem('origins-developer-theme')
      ?? localStorage.getItem('origins-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('origins-portal-theme', theme);
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  }
</script>

<svelte:head>
  <title>Developer sign in · Origins</title>
  <meta name="description" content="Secure access to the Origins engineering workspace." />
  <meta name="theme-color" content="#07110d" />
</svelte:head>

<div class:light-mode={theme === 'light'} class="login-shell">
  <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
  <header class="topline"><a href="/" aria-label="Origins home"><img src="/images/origins-logo.png" alt="Origins logo" /></a><div class="topline-actions"><span class="topline-tag"><i></i> INTERNAL ACCESS</span><button class="login-theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onclick={toggleTheme}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button></div></header>
  <main class="layout">
    <section class="story">
      <div class="story-kicker"><span>ORIGINS / ENGINEERING</span><span class="line"></span><span>01 — 04</span></div>
      <h1>Make the<br/>complex <em>work.</em></h1>
      <p class="story-copy">One workspace for shipping better software. Monitor delivery, investigate issues, explore operational data and connect your team’s knowledge.</p>
      <div class="feature-list">
        <div class="feature"><span class="feature-index">01</span><div><strong>Delivery intelligence</strong><small>Project health, milestones and operational metrics.</small></div><span class="feature-arrow">↗</span></div>
        <div class="feature"><span class="feature-index">02</span><div><strong>AI-assisted engineering</strong><small>OpenClaw workflows and connected team knowledge.</small></div><span class="feature-arrow">↗</span></div>
        <div class="feature"><span class="feature-index">03</span><div><strong>Private by design</strong><small>Access is verified against your internal account role.</small></div><span class="feature-arrow">↗</span></div>
      </div>
      <div class="story-foot"><span class="pulse"></span> BUILT FOR THE PEOPLE WHO BUILD</div>
    </section>
    <section class="login-card" aria-labelledby="login-heading">
      <div class="card-top"><span class="card-icon">⌘</span><span class="secure-label"><span></span> SECURE SIGN IN</span></div>
      <div class="card-intro"><span class="eyebrow">DEVELOPER CONSOLE · INTERNAL ACCESS</span><h2 id="login-heading">Welcome<br/><em>back.</em></h2><p>Your engineering workspace, delivery signals and project tools are one sign-in away.</p></div>
      {#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}
      <form method="POST" onsubmit={() => busy = true}>
        <label for="email">Work email</label><div class="input-wrap"><span>✉</span><input id="email" name="email" type="email" autocomplete="username" placeholder="you@company.com" value={form?.email ?? ''} required maxlength="320" /></div>
        <div class="password-label"><label for="password">Password</label><a href="/forgot-password">Forgot password?</a></div><div class="input-wrap"><span>⌑</span><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required maxlength="1024" /></div>
        <button type="submit" disabled={busy}>{busy ? 'Verifying access…' : 'Enter developer workspace'} <span>↗</span></button>
      </form>
      <div class="trust-note"><span>✓</span><p><strong>Protected workspace</strong><small>Only authorized internal accounts can continue.</small></p></div>
      <a class="client-link" href="/login">Need the client portal? <strong>Go to client sign in ↗</strong></a>
    </section>
  </main>
  <footer><span>© ORIGINS SOFTWARE</span><span>ENGINEERING PLATFORM</span><span>ACCESS LOGGED &amp; PROTECTED</span></footer>
</div>

<style>
  :global(body){margin:0;background:#07110d;color:#f5faf7;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .login-shell{min-height:100svh;position:relative;isolation:isolate;overflow:hidden;padding:28px clamp(20px,5vw,76px) 22px;background:radial-gradient(ellipse at 8% 8%,rgba(0,212,126,.10),transparent 34%),radial-gradient(ellipse at 90% 90%,rgba(0,169,101,.08),transparent 35%),#07110d;display:flex;flex-direction:column;box-sizing:border-box}
  .ambient{position:absolute;z-index:-1;border:1px solid rgba(0,212,126,.13);border-radius:50%;pointer-events:none}.ambient-one{width:560px;height:560px;right:-290px;top:14%;box-shadow:0 0 0 45px rgba(0,212,126,.018),0 0 0 90px rgba(0,212,126,.012)}.ambient-two{width:320px;height:320px;left:-220px;bottom:3%;box-shadow:0 0 0 35px rgba(0,212,126,.018)}
  .topline{display:flex;align-items:center;justify-content:space-between;gap:20px;max-width:1440px;width:100%;margin:0 auto 24px}.topline>a{display:flex;align-items:center}.topline img{width:158px;height:auto;max-height:66px;object-fit:contain;object-position:left center}.topline-tag{display:flex;align-items:center;gap:9px;color:#91a39a;font-size:9px;letter-spacing:.17em;font-weight:700}.topline-tag i,.secure-label span{width:7px;height:7px;border-radius:50%;background:#00d47e;box-shadow:0 0 12px #00d47e55}
  .layout{width:100%;max-width:1280px;margin:auto;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.75fr);align-items:center;gap:clamp(38px,8vw,130px);padding:26px 0 48px}.story{max-width:650px}.story-kicker{display:flex;align-items:center;gap:13px;color:#7e9388;font-size:9px;letter-spacing:.16em;font-weight:700}.story-kicker .line{width:48px;height:1px;background:#00a965}.story h1{font-size:clamp(56px,7.4vw,104px);line-height:.92;letter-spacing:-.085em;margin:32px 0 26px;font-weight:650}.story h1 em,.card-intro h2 em{font-family:Georgia,serif;color:#00d47e;font-weight:400;letter-spacing:-.07em}.story-copy{max-width:490px;color:#a0b0a7;font-size:14px;line-height:1.9;margin:0}.feature-list{margin-top:38px;border-top:1px solid #26372e}.feature{display:grid;grid-template-columns:34px 1fr 20px;gap:15px;align-items:center;padding:17px 0;border-bottom:1px solid #26372e}.feature-index{font-size:10px;color:#00d47e;font-variant-numeric:tabular-nums}.feature>div{display:grid;gap:5px}.feature strong{font-size:12px;font-weight:600;color:#eaf2ed}.feature small{font-size:11px;color:#83958a;line-height:1.5}.feature-arrow{color:#567164;font-size:15px}.story-foot{display:flex;align-items:center;gap:10px;margin-top:25px;color:#71857a;font-size:8px;letter-spacing:.16em}.pulse{width:6px;height:6px;background:#00d47e;border-radius:50%;box-shadow:0 0 10px #00d47e66}
  .login-card{width:100%;max-width:440px;justify-self:end;padding:clamp(26px,3.4vw,42px);border:1px solid #2a3b31;border-radius:18px;background:linear-gradient(145deg,rgba(19,38,28,.97),rgba(9,22,15,.98));box-shadow:0 28px 100px #0005;box-sizing:border-box;position:relative}.login-card:before{content:"";position:absolute;top:-1px;left:28px;right:28px;height:2px;background:linear-gradient(90deg,transparent,#00d47e,transparent)}.card-top{display:flex;justify-content:space-between;align-items:center}.card-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #345442;border-radius:10px;color:#00d47e;font-size:21px;background:#10291c}.secure-label{display:flex;align-items:center;gap:8px;font-size:8px;letter-spacing:.13em;color:#8ba094}.secure-label span{width:5px;height:5px}.card-intro{margin:31px 0 25px}.eyebrow{color:#00b970;font-size:9px;letter-spacing:.17em;font-weight:750}.card-intro h2{font-size:44px;line-height:.98;letter-spacing:-.07em;margin:12px 0}.card-intro h2 em{color:#00d47e}.card-intro p{font-size:12px;color:#8fa197;line-height:1.7;margin:12px 0 0}.error{border:1px solid #85464b;background:#351d22;color:#ffc7c7;border-radius:9px;padding:12px;font-size:11px;line-height:1.6;margin-bottom:17px}form{display:grid;gap:8px}label{font-size:10px;font-weight:650;color:#dce7df;margin:7px 0 2px}.input-wrap{display:flex;align-items:center;gap:10px;padding:0 13px;border:1px solid #34483b;background:#09170f;border-radius:9px;color:#688575}.input-wrap:focus-within{border-color:#00a965;box-shadow:0 0 0 3px #00d47e18}.input-wrap>span{font-size:14px}.input-wrap input{width:100%;min-width:0;border:0;outline:0;background:transparent;padding:14px 0;color:#f5faf7;font-size:12px}.input-wrap input::placeholder{color:#5e7567}.password-label{display:flex;align-items:center;justify-content:space-between;margin-top:7px}.password-label a{font-size:10px;color:#00d47e;text-decoration:none}.password-label a:hover{color:#78f0bb}form button{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;border:0;border-radius:9px;padding:15px 16px;background:#00d47e;color:#062014;font-weight:750;font-size:11px;cursor:pointer}form button:hover{background:#43e99e;transform:translateY(-1px)}form button:disabled{opacity:.65;cursor:wait;transform:none}.trust-note{display:flex;gap:11px;align-items:center;margin-top:23px;padding:13px;border:1px solid #2b4234;border-radius:9px;background:#0c1c12}.trust-note>span{display:grid;place-items:center;width:23px;height:23px;border-radius:7px;background:#153c27;color:#00d47e}.trust-note p{display:grid;gap:4px;margin:0}.trust-note strong{font-size:10px;color:#cbd9d0}.trust-note small{font-size:9px;color:#809589;line-height:1.5}.client-link{display:block;margin-top:22px;padding-top:18px;border-top:1px solid #293b30;color:#84978b;font-size:10px;line-height:1.8;text-decoration:none}.client-link strong{display:block;color:#d7e4db;font-weight:600;margin-top:4px}.client-link:hover strong{color:#00d47e}footer{width:100%;max-width:1440px;margin:0 auto;display:flex;justify-content:space-between;gap:15px;color:#5c7264;font-size:8px;letter-spacing:.13em}
  @media(max-width:900px){.layout{grid-template-columns:1fr minmax(320px,.85fr);gap:30px}.story h1{font-size:clamp(52px,7vw,76px)}.story-copy{font-size:12px}.feature small{font-size:10px}.login-card{padding:26px}}
  @media(max-width:700px){.login-shell{padding:20px 18px}.topline{margin-bottom:10px}.topline img{width:132px}.layout{grid-template-columns:1fr;gap:28px;padding:25px 0}.story{max-width:none}.story h1{font-size:clamp(55px,13vw,78px);margin:22px 0 16px}.story-copy{font-size:12px}.feature-list{margin-top:22px}.feature{padding:12px 0}.feature:nth-child(n+3){display:none}.story-foot{margin-top:17px}.login-card{justify-self:stretch;max-width:none;padding:25px}.card-intro{margin:23px 0 20px}.card-intro h2{font-size:38px}footer{flex-wrap:wrap;font-size:7px}footer span:last-child{display:none}}
  @media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
  .topline-actions{display:flex;align-items:center;gap:10px}
  .login-theme-toggle{
    display:inline-flex;align-items:center;gap:8px;padding:9px 12px;
    border:1px solid #ffffff18;border-radius:999px;background:#ffffff09;color:#e0ebe4;
    font:650 10px Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;
    box-shadow:inset 0 1px #ffffff15,0 8px 22px #0002;
    backdrop-filter:blur(20px) saturate(155%);-webkit-backdrop-filter:blur(20px) saturate(155%);
    transition:transform .2s ease,background .2s ease,border-color .2s ease;
  }
  .login-theme-toggle span:first-child{font-size:15px}
  .login-theme-toggle:hover{transform:translateY(-1px);background:#ffffff14;border-color:#ffffff32}
  .login-shell.light-mode{
    color:#202b3b;
    background:radial-gradient(ellipse at 8% 8%,rgba(42,157,108,.1),transparent 34%),radial-gradient(ellipse at 90% 90%,rgba(65,138,190,.07),transparent 35%),#f4f6f8;
    color-scheme:light;
  }
  :global(body:has(.login-shell.light-mode)){background:#f4f6f8;color:#202b3b}
  .login-shell.light-mode .ambient{border-color:rgba(52,143,107,.12)}
  .login-shell.light-mode .topline-tag{color:#617186;border-color:rgba(255,255,255,.9);background:rgba(255,255,255,.65);box-shadow:inset 0 1px #fff,0 8px 24px rgba(42,60,80,.06)}
  .login-shell.light-mode .story-kicker{color:#748197}
  .login-shell.light-mode .story h1{color:#202d40}
  .login-shell.light-mode .story h1 em,.login-shell.light-mode .card-intro h2 em{color:#258a5a}
  .login-shell.light-mode .story-copy{color:#637188}
  .login-shell.light-mode .feature-list,.login-shell.light-mode .feature{border-color:#e0e6ec}
  .login-shell.light-mode .feature strong{color:#2d3a4d}
  .login-shell.light-mode .feature small{color:#738096}
  .login-shell.light-mode .feature-index,.login-shell.light-mode .feature-arrow{color:#31825b}
  .login-shell.light-mode .story-foot, .login-shell.light-mode footer{color:#7d899a}
  .login-shell.light-mode .pulse{background:#2aa16a;box-shadow:0 0 10px #2aa16a45}
  .login-shell.light-mode .login-card{
    border-color:rgba(255,255,255,.94);
    background:linear-gradient(145deg,rgba(255,255,255,.93),rgba(250,252,254,.86));
    color:#202b3b;box-shadow:0 30px 90px rgba(38,57,78,.13),inset 0 1px rgba(255,255,255,.98);
    backdrop-filter:blur(32px) saturate(175%);-webkit-backdrop-filter:blur(32px) saturate(175%);
  }
  .login-shell.light-mode .card-icon{border-color:#dce7e0;background:linear-gradient(145deg,#fff,#edf5f0);color:#29875a}
  .login-shell.light-mode .secure-label{color:#748197}
  .login-shell.light-mode .eyebrow{color:#288457}
  .login-shell.light-mode .card-intro h2{color:#202b3b}
  .login-shell.light-mode .card-intro p{color:#68758a}
  .login-shell.light-mode .login-card label{color:#425168}
  .login-shell.light-mode .input-wrap{border-color:#dce3e9;background:rgba(255,255,255,.78);color:#78879a}
  .login-shell.light-mode .input-wrap:focus-within{border-color:#58a87d;background:#fff;box-shadow:0 0 0 4px rgba(38,138,88,.1)}
  .login-shell.light-mode .input-wrap input{color:#202b3b}
  .login-shell.light-mode .input-wrap input::placeholder{color:#9aa4b1}
  .login-shell.light-mode .password-label a{color:#258552}
  .login-shell.light-mode form button{background:linear-gradient(135deg,#2eb878,#15965f);color:#fff;box-shadow:0 10px 24px rgba(23,145,90,.2)}
  .login-shell.light-mode form button:hover{background:linear-gradient(135deg,#35c481,#159a61);box-shadow:0 13px 29px rgba(23,145,90,.24)}
  .login-shell.light-mode .trust-note{border-color:#e1e8e4;background:linear-gradient(135deg,rgba(255,255,255,.84),rgba(241,247,243,.75))}
  .login-shell.light-mode .trust-note>span{background:#e5f4eb;color:#268451}
  .login-shell.light-mode .trust-note strong{color:#35445a}
  .login-shell.light-mode .trust-note small{color:#788599}
  .login-shell.light-mode .client-link{border-top-color:#e2e8ed;color:#748197}
  .login-shell.light-mode .client-link strong{color:#35445a}
  .login-shell.light-mode .client-link:hover strong{color:#218552}
  .login-shell.light-mode .login-theme-toggle{border-color:rgba(255,255,255,.95);background:rgba(255,255,255,.72);color:#4b5c72;box-shadow:inset 0 1px #fff,0 8px 24px rgba(42,60,80,.08)}
  .login-shell.light-mode .login-theme-toggle:hover{background:rgba(255,255,255,.94);border-color:#d9e2ea}
  @media(max-width:700px){.topline-actions{gap:7px}.topline-tag{padding:7px 9px}.login-theme-toggle{padding:8px 10px}.login-theme-toggle span:last-child{display:none}}
  @media(prefers-reduced-transparency:reduce){.login-shell.light-mode .login-card,.login-shell.light-mode .login-theme-toggle{backdrop-filter:none;-webkit-backdrop-filter:none}}
  .topline-tag{padding:9px 12px;border:1px solid #ffffff12;border-radius:999px;background:#ffffff08;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  .login-card{border-color:#ffffff20;border-radius:22px;background:linear-gradient(145deg,#173323df,#0c1c13eF);backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);box-shadow:0 30px 110px #0007,inset 0 1px #ffffff18}
  .login-card:after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(135deg,#ffffff0d,transparent 36%);mask:linear-gradient(#000,transparent 70%)}
  .card-icon{border-color:#ffffff20;border-radius:12px;background:linear-gradient(145deg,#ffffff16,#ffffff06);box-shadow:inset 0 1px #ffffff1a}
  .input-wrap{border-color:#ffffff1b;border-radius:11px;background:#07130dbb;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease}
  .input-wrap:focus-within{background:#07130dee;border-color:#00d47e88;box-shadow:0 0 0 4px #00d47e16}
  form button{border-radius:11px;background:linear-gradient(120deg,#36e99a,#00bd70);box-shadow:0 10px 26px #00d47e25,inset 0 1px #ffffff55;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
  form button:hover{background:linear-gradient(120deg,#62f1ae,#12cf80);box-shadow:0 14px 32px #00d47e35,inset 0 1px #ffffff66}
  .trust-note{border-color:#ffffff16;border-radius:12px;background:linear-gradient(135deg,#ffffff0c,#ffffff04)}
  @media(max-width:700px){.login-card{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}}
</style>
