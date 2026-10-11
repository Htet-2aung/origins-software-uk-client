<script lang="ts">
  export let form;
  let busy = false;
</script>

<svelte:head>
  <title>Developer sign in · Origins</title>
  <meta name="description" content="Secure access to the Origins engineering workspace." />
  <meta name="theme-color" content="#07110d" />
</svelte:head>

<div class="login-shell">
  <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
  <header class="topline"><a href="/" aria-label="Origins home"><img src="/images/origins-logo.png" alt="Origins logo" /></a><span class="topline-tag"><i></i> INTERNAL ACCESS</span></header>
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
      <div class="card-intro"><span class="eyebrow">DEVELOPER CONSOLE</span><h2 id="login-heading">Welcome<br/><em>back.</em></h2><p>Sign in with your approved Origins team account.</p></div>
      {#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}
      <form method="POST" on:submit={() => busy = true}>
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
</style>
